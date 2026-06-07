import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/matches/[id]/result
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { team1Score, team2Score, winnerId } = await req.json()

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: { phase: true },
    })
    if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })

    // Update match
    const updated = await prisma.match.update({
      where: { id: params.id },
      data: {
        team1Score,
        team2Score,
        winnerId,
        status:   'COMPLETED',
        playedAt: new Date(),
      },
    })

    // If group stage: update standings
    if (match.groupId) {
      const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id

      if (winnerId) {
        await prisma.$transaction([
          // Winner
          prisma.groupStanding.updateMany({
            where: { groupId: match.groupId!, teamId: winnerId },
            data: {
              played:    { increment: 1 },
              wins:      { increment: 1 },
              roundsWon: { increment: Math.max(team1Score, team2Score) },
              roundsLost:{ increment: Math.min(team1Score, team2Score) },
              points:    { increment: 3 },
            },
          }),
          // Loser
          prisma.groupStanding.updateMany({
            where: { groupId: match.groupId!, teamId: loserId! },
            data: {
              played:    { increment: 1 },
              losses:    { increment: 1 },
              roundsWon: { increment: Math.min(team1Score, team2Score) },
              roundsLost:{ increment: Math.max(team1Score, team2Score) },
            },
          }),
        ])
      }
    }

    // If elimination: advance winner to next match
    if (match.nextMatchId && winnerId) {
      const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } })
      if (nextMatch) {
        const isSlot1 = nextMatch.team1Id === null
        await prisma.match.update({
          where: { id: match.nextMatchId },
          data: isSlot1 ? { team1Id: winnerId } : { team2Id: winnerId },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    console.error('[match result]', error)
    return NextResponse.json({ error: 'Error actualizando resultado' }, { status: 500 })
  }
}
