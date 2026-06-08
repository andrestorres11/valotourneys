import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRankInRange, RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/tournaments/[id]/register
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { teamId } = await req.json()

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

    // Load team with members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { include: { player: true } },
      },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    // Check user is captain
    const isCaptain = team.members.some(m => m.isCapitan && m.player.userId === user.id)
    if (!isCaptain) {
      return NextResponse.json({ error: 'Solo el capitán puede inscribir el equipo' }, { status: 403 })
    }

    // Check team has enough members
    if (team.members.length < tournament.teamSize) {
      return NextResponse.json({
        error: `El equipo necesita ${tournament.teamSize} jugadores. Actualmente tiene ${team.members.length}.`,
      }, { status: 400 })
    }

    // Validate ranks of all members
    const invalidMembers: string[] = []
    for (const member of team.members) {
      const rank = member.player.currentRank as Rank
      if (!member.player.riotId) {
        invalidMembers.push(`${member.player.gameName ?? 'Jugador'} (sin Riot ID verificado)`)
        continue
      }
      if (!isRankInRange(rank, tournament.minRank as Rank, tournament.maxRank as Rank)) {
        invalidMembers.push(
          `${member.player.gameName}#${member.player.tagLine} (${RANK_LABELS[rank]} — fuera del rango permitido)`
        )
      }
    }

    if (invalidMembers.length > 0) {
      return NextResponse.json({
        error: `Los siguientes jugadores no cumplen el requisito de rango (${RANK_LABELS[tournament.minRank as Rank]} – ${RANK_LABELS[tournament.maxRank as Rank]}):\n${invalidMembers.join('\n')}`,
      }, { status: 400 })
    }

    // Check team not already registered
    const existing = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })
    if (existing) return NextResponse.json({ error: 'El equipo ya está inscrito' }, { status: 409 })

    // Register!
    const registration = await prisma.tournamentRegistration.create({
      data: { tournamentId: params.id, teamId },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[register tournament]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE - unregister from tournament
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
      return NextResponse.json({ error: 'No se puede retirar la inscripción en este momento' }, { status: 400 })
    }

    await prisma.tournamentRegistration.delete({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId } },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
