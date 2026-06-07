import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { GameMode, Rank, TournamentStatus } from '@prisma/client'

// GET - list tournaments (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as TournamentStatus | null
  const mode   = searchParams.get('mode') as GameMode | null

  const tournaments = await prisma.tournament.findMany({
    where: {
      ...(status ? { status } : { status: { not: 'DRAFT' } }),
      ...(mode   ? { gameMode: mode } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { registrations: true } },
      phases: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(tournaments)
}

// POST - create tournament (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const user = await requireAdmin()

    const tournament = await prisma.tournament.create({
      data: {
        name:              body.name,
        description:       body.description,
        gameMode:          body.gameMode as GameMode,
        minRank:           (body.minRank ?? 'UNRANKED') as Rank,
        maxRank:           (body.maxRank ?? 'RADIANT') as Rank,
        maxTeams:          body.maxTeams ?? 16,
        teamSize:          body.teamSize ?? 5,
        prizePool:         body.prizePool,
        rules:             body.rules,
        registrationStart: body.registrationStart ? new Date(body.registrationStart) : null,
        registrationEnd:   body.registrationEnd   ? new Date(body.registrationEnd)   : null,
        startDate:         body.startDate          ? new Date(body.startDate)          : null,
        endDate:           body.endDate            ? new Date(body.endDate)            : null,
        status:            'DRAFT',
        createdById:       user.id,
      },
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (error.message === 'Forbidden')    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    console.error('[POST /tournaments]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
