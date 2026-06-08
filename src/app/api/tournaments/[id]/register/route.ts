import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRankInRange, RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/tournaments/[id]/register
// Handles solo (teamSize=1), duo/trio (teamSize 2-4), and full team (teamSize 5)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Completa tu perfil primero' }, { status: 400 })

    const body = await req.json()
    const { teamId, partnerIds } = body as {
      teamId?: string           // for full team (5v5)
      partnerIds?: string[]     // for duo/trio
    }

    // Load tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: { _count: { select: { registrations: true } } },
    })
    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json({ error: 'Las inscripciones no están abiertas' }, { status: 400 })
    }
    if (tournament._count.registrations >= tournament.maxTeams) {
      return NextResponse.json({ error: 'El torneo está lleno' }, { status: 400 })
    }

    const minRank = tournament.minRank as Rank
    const maxRank = tournament.maxRank as Rank

    // ─── SOLO (teamSize = 1) ──────────────────────────────────────────────────
    if (tournament.teamSize === 1) {
      if (!user.player.riotId) {
        return NextResponse.json({ error: 'Debes vincular tu Riot ID antes de inscribirte' }, { status: 400 })
      }
      if (!isRankInRange(user.player.currentRank as Rank, minRank, maxRank)) {
        return NextResponse.json({
          error: `Tu rango ${RANK_LABELS[user.player.currentRank as Rank]} no cumple el requisito (${RANK_LABELS[minRank]} – ${RANK_LABELS[maxRank]})`,
        }, { status: 400 })
      }

      // Create a solo "team" entry (or reuse existing solo team)
      let soloTeam = await prisma.team.findFirst({
        where: { captainId: user.player.id, tag: 'SOLO' },
      })
      if (!soloTeam) {
        soloTeam = await prisma.team.create({
          data: {
            name:      user.player.gameName ?? user.player.user?.username ?? `Player_${user.player.id.slice(-4)}`,
            tag:       'SOLO',
            captainId: user.player.id,
            members: { create: { playerId: user.player.id, isCapitan: true } },
          },
        })
      }

      // Check not already registered
      const existing = await prisma.tournamentRegistration.findUnique({
        where: { tournamentId_teamId: { tournamentId: params.id, teamId: soloTeam.id } },
      })
      if (existing) return NextResponse.json({ error: 'Ya estás inscrito en este torneo' }, { status: 409 })

      // Also check player's player-id not in any other registration for this tournament
      const playerReg = await prisma.tournamentRegistration.findFirst({
        where: {
          tournamentId: params.id,
          team: { members: { some: { playerId: user.player.id } } },
        },
      })
      if (playerReg) return NextResponse.json({ error: 'Ya estás inscrito en este torneo' }, { status: 409 })

      const registration = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: soloTeam.id },
      })
      return NextResponse.json(registration, { status: 201 })
    }

    // ─── DUO / TRIO (teamSize 2-4) ────────────────────────────────────────────
    if (tournament.teamSize >= 2 && tournament.teamSize <= 4) {
      if (!partnerIds || partnerIds.length === 0) {
        return NextResponse.json({
          error: `Este torneo requiere ${tournament.teamSize} jugadores. Selecciona ${tournament.teamSize - 1} compañero(s).`,
        }, { status: 400 })
      }
      const totalPlayers = 1 + partnerIds.length
      if (totalPlayers !== tournament.teamSize) {
        return NextResponse.json({
          error: `El torneo es ${tournament.teamSize}v${tournament.teamSize}. Necesitas exactamente ${tournament.teamSize - 1} compañero(s).`,
        }, { status: 400 })
      }

      // Load all players
      const allPlayerIds = [user.player.id, ...partnerIds]
      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIds } },
      })
      if (players.length !== allPlayerIds.length) {
        return NextResponse.json({ error: 'Uno o más jugadores no fueron encontrados' }, { status: 404 })
      }

      // Validate ranks
      const invalid = players.filter(p => !isRankInRange(p.currentRank as Rank, minRank, maxRank))
      if (invalid.length > 0) {
        return NextResponse.json({
          error: `Jugadores fuera de rango: ${invalid.map(p => p.gameName ?? p.id).join(', ')}`,
        }, { status: 400 })
      }

      // Check no one already registered in this tournament
      for (const pid of allPlayerIds) {
        const existing = await prisma.tournamentRegistration.findFirst({
          where: { tournamentId: params.id, team: { members: { some: { playerId: pid } } } },
        })
        if (existing) {
          const p = players.find(pl => pl.id === pid)
          return NextResponse.json({ error: `${p?.gameName ?? 'Un jugador'} ya está inscrito en este torneo` }, { status: 409 })
        }
      }

      // Create a temporary group team
      const groupName = `${user.player.gameName ?? 'Grupo'}_${Date.now()}`
      const groupTeam = await prisma.team.create({
        data: {
          name:      groupName,
          tag:       tournament.teamSize === 2 ? 'DUO' : 'TRIO',
          captainId: user.player.id,
          members: {
            create: allPlayerIds.map((pid, idx) => ({ playerId: pid, isCapitan: idx === 0 })),
          },
        },
      })

      const registration = await prisma.tournamentRegistration.create({
        data: { tournamentId: params.id, teamId: groupTeam.id },
      })
      return NextResponse.json(registration, { status: 201 })
    }

    // ─── FULL TEAM (teamSize 5) ────────────────────────────────────────────────
    if (!teamId) return NextResponse.json({ error: 'Selecciona un equipo para inscribir' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { player: true } } },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    const isCaptain = team.members.some(m => m.isCapitan && m.player.userId === user.id)
    if (!isCaptain) return NextResponse.json({ error: 'Solo el capitán puede inscribir el equipo' }, { status: 403 })

    if (team.members.length < tournament.teamSize) {
      return NextResponse.json({
        error: `El equipo necesita ${tournament.teamSize} jugadores. Actualmente tiene ${team.members.length}.`,
      }, { status: 400 })
    }

    const invalidMembers: string[] = []
    for (const member of team.members) {
      if (!member.player.riotId) {
        invalidMembers.push(`${member.player.gameName ?? 'Jugador'} (sin Riot ID)`)
        continue
      }
      if (!isRankInRange(member.player.currentRank as Rank, minRank, maxRank)) {
        invalidMembers.push(`${member.player.gameName}#${member.player.tagLine} (${RANK_LABELS[member.player.currentRank as Rank]})`)
      }
    }
    if (invalidMembers.length > 0) {
      return NextResponse.json({
        error: `Jugadores fuera del rango permitido (${RANK_LABELS[minRank]} – ${RANK_LABELS[maxRank]}):\n${invalidMembers.join('\n')}`,
      }, { status: 400 })
    }

    const existing = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })
    if (existing) return NextResponse.json({ error: 'El equipo ya está inscrito' }, { status: 409 })

    const registration = await prisma.tournamentRegistration.create({
      data: { tournamentId: params.id, teamId },
    })
    return NextResponse.json(registration, { status: 201 })

  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[register]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

// DELETE - unregister
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { teamId } = await req.json()

    const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json({ error: 'No se puede retirar en este momento' }, { status: 400 })
    }

    await prisma.tournamentRegistration.delete({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })

    // If it was a solo/duo/trio temp team, disband it
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (team && ['SOLO','DUO','TRIO'].includes(team.tag)) {
      await prisma.teamMember.deleteMany({ where: { teamId } })
      await prisma.team.delete({ where: { id: teamId } })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
