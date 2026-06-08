import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRankInRange } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/players/eligible?tournamentId=xxx
// Returns players eligible for duo/trio registration (right rank, not already registered)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) return NextResponse.json([])

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        registrations: {
          include: { team: { include: { members: { select: { playerId: true } } } } },
        },
      },
    })
    if (!tournament) return NextResponse.json([])

    // Get all player IDs already in this tournament
    const registeredPlayerIds = new Set<string>()
    for (const reg of tournament.registrations) {
      for (const member of reg.team.members) {
        registeredPlayerIds.add(member.playerId)
      }
    }

    const minRank = tournament.minRank as Rank
    const maxRank = tournament.maxRank as Rank

    // Get all players with riot ID and correct rank, not already registered
    const players = await prisma.player.findMany({
      where: {
        riotId:  { not: null },
        id: { notIn: Array.from(registeredPlayerIds) },
      },
      include: { user: { select: { username: true } } },
      orderBy: { currentRank: 'desc' },
      take: 100,
    })

    // Filter by rank
    const eligible = players.filter(p =>
      isRankInRange(p.currentRank as Rank, minRank, maxRank) &&
      p.id !== user.player?.id
    )

    return NextResponse.json(eligible.map(p => ({
      id:          p.id,
      gameName:    p.gameName,
      tagLine:     p.tagLine,
      currentRank: p.currentRank,
      user:        { username: p.user.username },
    })))
  } catch {
    return NextResponse.json([])
  }
}
