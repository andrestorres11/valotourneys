import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/teams/[teamId]/captain
export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    await requireAdmin()
    const { playerId } = await req.json()
    if (!playerId) return NextResponse.json({ error: 'playerId requerido' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: { members: true },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    const isMember = team.members.some(m => m.playerId === playerId)
    if (!isMember) return NextResponse.json({ error: 'El jugador no pertenece a este equipo' }, { status: 400 })

    // Update captain in transaction
    await prisma.$transaction([
      // Remove captain from all members
      prisma.teamMember.updateMany({
        where: { teamId: params.teamId },
        data: { isCapitan: false },
      }),
      // Set new captain
      prisma.teamMember.updateMany({
        where: { teamId: params.teamId, playerId },
        data: { isCapitan: true },
      }),
      // Update team captainId
      prisma.team.update({
        where: { id: params.teamId },
        data: { captainId: playerId },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
