import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/teams/[id]/members/[playerId]
// - Captain can kick any member
// - Member can leave (using their own playerId)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: true },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    const isSelf    = params.playerId === user.player.id
    const isCaptain = team.captainId === user.player.id

    // Must be self (leaving) or captain (kicking)
    if (!isSelf && !isCaptain) {
      return NextResponse.json({ error: 'Solo el capitán puede expulsar miembros' }, { status: 403 })
    }

    // Captain cannot leave (must disband or transfer first)
    if (isSelf && isCaptain) {
      return NextResponse.json({
        error: 'El capitán no puede salirse. Primero disuelve el equipo o transfiere el liderazgo.',
      }, { status: 400 })
    }

    // Cannot kick the captain
    if (!isSelf && params.playerId === team.captainId) {
      return NextResponse.json({ error: 'No puedes expulsar al capitán' }, { status: 400 })
    }

    // Remove member
    await prisma.teamMember.deleteMany({
      where: { teamId: params.id, playerId: params.playerId },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[kick/leave]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
