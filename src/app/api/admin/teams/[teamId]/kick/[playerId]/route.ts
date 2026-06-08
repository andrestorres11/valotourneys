import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/teams/[teamId]/kick/[playerId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { teamId: string; playerId: string } }
) {
  try {
    await requireAdmin()

    const member = await prisma.teamMember.findFirst({
      where: { teamId: params.teamId, playerId: params.playerId },
      include: { team: true },
    })
    if (!member) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })

    // Don't allow kicking the captain via admin (would leave team leaderless)
    if (member.team.captainId === params.playerId) {
      // Disband team instead
      await prisma.$transaction([
        prisma.teamMember.deleteMany({ where: { teamId: params.teamId } }),
        prisma.team.update({ where: { id: params.teamId }, data: { status: 'DISBANDED' } }),
      ])
      return NextResponse.json({ success: true, action: 'disbanded' })
    }

    await prisma.teamMember.deleteMany({
      where: { teamId: params.teamId, playerId: params.playerId },
    })

    return NextResponse.json({ success: true, action: 'kicked' })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
