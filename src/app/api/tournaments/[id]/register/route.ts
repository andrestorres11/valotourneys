import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRankInRange, RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Completa tu perfil primero' }, { status: 400 })

    const body = await req.json()
    const { teamId, partnerIds } = body as { teamId?: string; partnerIds?: string[] }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: { _count: { select: { registrations: true } } },
    })
    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    if (tournament.status !== 'REGISTRATION_OPEN') return NextResponse.json({ error: 'Inscripciones no abiertas' }, { status: 400 })
    if (tournament._count.registrations >= tournament.maxTeams) return NextResponse.json({ error: 'Torneo lleno' }, { status: 400 })

    const minRank = tournament.minRank as Rank
    const maxRank = tournament.maxRank as Rank

    // ── SOLO ──────────────────────────────────────────────────────────────────
    if (tournament.teamSize === 1) {
      if (!user.player.riotId) return NextResponse.json({ error: 'Vincula tu Riot ID en tu perfil primero' }, { status: 400 })
      if (!isRankInRange(user.player.currentRank as Rank, minRank, maxRank)) {
        return NextResponse.json({
          error: `Tu rango (${RANK_LABELS[user.player.currentRank as Rank]}) no cumple: ${RANK_LABELS[minRank]} – ${RANK_LABELS[maxRank]}`,
        }, { status: 400 })
      }

      // Check already registered in this tournament
      const already = await prisma.tournamentRegistration.findFirst({
        where: { tournamentId: params.id, team: { members: { some: { playerId: user.player.id } } } },
      })
      if (already) return NextResponse.json({ error: 'Ya estás inscrito en este torneo' }, { status: 409 })

      // Use gameName as display name — much cleaner
      const displayName = user.player.gameName ?? user.username ?? `Jugador_${user.player.id.slice(-4)}`
      // Make unique by appending random suffix
      const uniqueName  = `${displayName}_${Math.random().toString(36).slice(2, 7)}`

      // Create solo team — use internal ID as tag key, display name as name
      const soloTeam = await prisma.team.create({
        data: {
          name:      uniqueName,
          tag:       'SOLO',
          captainId: user.player.id,
          // Don't create member here if player already in another team
          // We create member separately with skipDuplicates
        },
      })

      // Add player as member — ignore if already in this team somehow
      await prisma.teamMember.upsert({
        where:  { teamId_playerId: { teamId: soloTeam.id, playerId: user.player.id } },
        update: {},
        create: { teamId: soloTeam.id, playerId: user.player.id, isCapitan: true },
      })

      const reg = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: soloTeam.id },
      })
      return NextResponse.json(reg, { status: 201 })
    }

    // ── DUO / TRIO ─────────────────────────────────────────────────────────────
    if (tournament.teamSize >= 2 && tournament.teamSize <= 4) {
      if (!partnerIds || partnerIds.length !== tournament.teamSize - 1) {
        return NextResponse.json({ error: `Selecciona ${tournament.teamSize - 1} compañero(s)` }, { status: 400 })
      }

      const allPlayerIds = [user.player.id, ...partnerIds]
      const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } } })
      if (players.length !== allPlayerIds.length) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })

      const invalid = players.filter(p => !isRankInRange(p.currentRank as Rank, minRank, maxRank))
      if (invalid.length > 0) return NextResponse.json({ error: `Fuera de rango: ${invalid.map(p => p.gameName ?? p.id.slice(-4)).join(', ')}` }, { status: 400 })

      for (const pid of allPlayerIds) {
        const ex = await prisma.tournamentRegistration.findFirst({
          where: { tournamentId: params.id, team: { members: { some: { playerId: pid } } } },
        })
        if (ex) {
          const p = players.find(pl => pl.id === pid)
          return NextResponse.json({ error: `${p?.gameName ?? 'Un jugador'} ya está inscrito` }, { status: 409 })
        }
      }

      const tag       = tournament.teamSize === 2 ? 'DUO' : 'TRIO'
      const groupName = `${tag}_${user.player.gameName ?? user.player.id.slice(-4)}_${Math.random().toString(36).slice(2, 6)}`
      const groupTeam = await prisma.team.create({
        data: {
          name:      groupName,
          tag,
          captainId: user.player.id,
          members:   { create: allPlayerIds.map((pid, i) => ({ playerId: pid, isCapitan: i === 0 })) },
        },
      })

      const reg = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: groupTeam.id },
      })
      return NextResponse.json(reg, { status: 201 })
    }

    // ── FULL TEAM ──────────────────────────────────────────────────────────────
    if (!teamId) return NextResponse.json({ error: 'Selecciona un equipo' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { player: true } } },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    const isCaptain = team.members.some(m => m.isCapitan && m.player.userId === user.id)
    if (!isCaptain) return NextResponse.json({ error: 'Solo el capitán puede inscribir el equipo' }, { status: 403 })
    if (team.members.length < tournament.teamSize) {
      return NextResponse.json({ error: `El equipo necesita ${tournament.teamSize} jugadores (tiene ${team.members.length})` }, { status: 400 })
    }

    const bad = team.members.filter(m => !m.player.riotId || !isRankInRange(m.player.currentRank as Rank, minRank, maxRank))
    if (bad.length > 0) return NextResponse.json({ error: `Fuera de rango o sin Riot ID: ${bad.map(m => m.player.gameName ?? '?').join(', ')}` }, { status: 400 })

    const exists = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })
    if (exists) return NextResponse.json({ error: 'El equipo ya está inscrito' }, { status: 409 })

    const reg = await prisma.tournamentRegistration.create({
      data: { tournamentId: params.id, teamId },
    })
    return NextResponse.json(reg, { status: 201 })

  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (error.code === 'P2002') return NextResponse.json({ error: 'Conflicto: ya existe un registro. Recarga e intenta de nuevo.' }, { status: 409 })
    console.error('[register]', error.code, error.message)
    return NextResponse.json({ error: error.message ?? 'Error desconocido' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const { teamId } = body
    if (!teamId) return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })

    const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    if (tournament.status !== 'REGISTRATION_OPEN') return NextResponse.json({ error: 'No se puede retirar ahora' }, { status: 400 })

    const team   = await prisma.team.findUnique({ where: { id: teamId } })
    const isTemp = team && ['SOLO', 'DUO', 'TRIO'].includes(team.tag)

    await prisma.tournamentRegistration.delete({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })

    if (isTemp) {
      await prisma.teamMember.deleteMany({ where: { teamId } })
      await prisma.team.delete({ where: { id: teamId } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[unregister]', error.message)
    return NextResponse.json({ error: error.message ?? 'Error desconocido' }, { status: 500 })
  }
}
