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
    if (tournament.status !== 'REGISTRATION_OPEN') return NextResponse.json({ error: 'Las inscripciones no están abiertas' }, { status: 400 })
    if (tournament._count.registrations >= tournament.maxTeams) return NextResponse.json({ error: 'El torneo está lleno' }, { status: 400 })

    const minRank = tournament.minRank as Rank
    const maxRank = tournament.maxRank as Rank

    // ── SOLO ─────────────────────────────────────────────────────────────────
    if (tournament.teamSize === 1) {
      if (!user.player.riotId) return NextResponse.json({ error: 'Vincula tu Riot ID en tu perfil primero' }, { status: 400 })
      if (!isRankInRange(user.player.currentRank as Rank, minRank, maxRank)) {
        return NextResponse.json({ error: `Tu rango (${RANK_LABELS[user.player.currentRank as Rank]}) no cumple el requisito: ${RANK_LABELS[minRank]} – ${RANK_LABELS[maxRank]}` }, { status: 400 })
      }

      // Check already registered
      const already = await prisma.tournamentRegistration.findFirst({
        where: { tournamentId: params.id, team: { members: { some: { playerId: user.player.id } } } },
      })
      if (already) return NextResponse.json({ error: 'Ya estás inscrito en este torneo' }, { status: 409 })

      // Create unique solo team name using playerId to avoid duplicates
      const soloName = `${user.player.gameName ?? user.player.id.slice(-6)}_${params.id.slice(-4)}`

      // Check if this exact solo team already exists (retry case)
      let soloTeam = await prisma.team.findFirst({
        where: { captainId: user.player.id, name: soloName },
      })

      if (!soloTeam) {
        soloTeam = await prisma.team.create({
          data: {
            name:      soloName,
            tag:       'SOLO',
            captainId: user.player.id,
            members:   { create: { playerId: user.player.id, isCapitan: true } },
          },
        })
      }

      const registration = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: soloTeam.id },
      })
      return NextResponse.json(registration, { status: 201 })
    }

    // ── DUO / TRIO ────────────────────────────────────────────────────────────
    if (tournament.teamSize >= 2 && tournament.teamSize <= 4) {
      if (!partnerIds || partnerIds.length !== tournament.teamSize - 1) {
        return NextResponse.json({ error: `Selecciona exactamente ${tournament.teamSize - 1} compañero(s)` }, { status: 400 })
      }

      const allPlayerIds = [user.player.id, ...partnerIds]
      const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } } })
      if (players.length !== allPlayerIds.length) return NextResponse.json({ error: 'Uno o más jugadores no encontrados' }, { status: 404 })

      const invalid = players.filter(p => !isRankInRange(p.currentRank as Rank, minRank, maxRank))
      if (invalid.length > 0) return NextResponse.json({ error: `Fuera de rango: ${invalid.map(p => p.gameName ?? p.id).join(', ')}` }, { status: 400 })

      for (const pid of allPlayerIds) {
        const ex = await prisma.tournamentRegistration.findFirst({
          where: { tournamentId: params.id, team: { members: { some: { playerId: pid } } } },
        })
        if (ex) {
          const p = players.find(pl => pl.id === pid)
          return NextResponse.json({ error: `${p?.gameName ?? 'Un jugador'} ya está inscrito` }, { status: 409 })
        }
      }

      const groupTag  = tournament.teamSize === 2 ? 'DUO' : 'TRIO'
      const groupName = `${user.player.gameName ?? user.player.id.slice(-6)}_${groupTag}_${Date.now()}`
      const groupTeam = await prisma.team.create({
        data: {
          name:      groupName,
          tag:       groupTag,
          captainId: user.player.id,
          members:   { create: allPlayerIds.map((pid, i) => ({ playerId: pid, isCapitan: i === 0 })) },
        },
      })

      const registration = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: groupTeam.id },
      })
      return NextResponse.json(registration, { status: 201 })
    }

    // ── FULL TEAM ─────────────────────────────────────────────────────────────
    if (!teamId) return NextResponse.json({ error: 'Selecciona un equipo' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { player: true } } },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    const isCaptain = team.members.some(m => m.isCapitan && m.player.userId === user.id)
    if (!isCaptain) return NextResponse.json({ error: 'Solo el capitán puede inscribir el equipo' }, { status: 403 })
    if (team.members.length < tournament.teamSize) return NextResponse.json({ error: `El equipo necesita ${tournament.teamSize} jugadores (tiene ${team.members.length})` }, { status: 400 })

    const badMembers = team.members.filter(m =>
      !m.player.riotId || !isRankInRange(m.player.currentRank as Rank, minRank, maxRank)
    )
    if (badMembers.length > 0) {
      return NextResponse.json({ error: `Jugadores fuera de rango: ${badMembers.map(m => m.player.gameName ?? '?').join(', ')}` }, { status: 400 })
    }

    const exists = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })
    if (exists) return NextResponse.json({ error: 'El equipo ya está inscrito' }, { status: 409 })

    const registration = await prisma.tournamentRegistration.create({
      data: { tournamentId: params.id, teamId },
    })
    return NextResponse.json(registration, { status: 201 })

  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // Return actual error message so we can debug
    console.error('[register POST]', error.message, error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { teamId } = await req.json()
    if (!teamId) return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })

    const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    if (tournament.status !== 'REGISTRATION_OPEN') return NextResponse.json({ error: 'No se puede retirar en este momento' }, { status: 400 })

    const team = await prisma.team.findUnique({ where: { id: teamId } })
    const isTemp = team && ['SOLO', 'DUO', 'TRIO'].includes(team.tag)

    // Delete registration first (FK)
    await prisma.tournamentRegistration.delete({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })

    // Clean up temp teams
    if (isTemp) {
      await prisma.teamMember.deleteMany({ where: { teamId } })
      await prisma.team.delete({ where: { id: teamId } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[register DELETE]', error.message, error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}