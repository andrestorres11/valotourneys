import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/teams/invite/[id] — accept or decline
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const { action } = await req.json() as { action: 'accept' | 'decline' }
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { id: params.id },
      include: { team: { include: { members: true } } },
    })

    if (!invite) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    if (invite.receiverId !== user.player.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    if (invite.status !== 'PENDING') return NextResponse.json({ error: 'Esta invitación ya fue respondida' }, { status: 400 })
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 })

    if (action === 'decline') {
      await prisma.teamInvite.update({
        where: { id: params.id },
        data: { status: 'DECLINED' },
      })
      return NextResponse.json({ success: true, action: 'declined' })
    }

    // Accept — check team still has space
    if (invite.team.members.length >= 5) {
      await prisma.teamInvite.update({ where: { id: params.id }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'El equipo ya está completo' }, { status: 400 })
    }

    // Check player not already in another team
    const existing = await prisma.teamMember.findFirst({
      where: { playerId: user.player.id },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ya perteneces a un equipo' }, { status: 409 })
    }

    // Add to team + update invite + deactivate free agent profile
    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: invite.teamId, playerId: user.player.id, isCapitan: false },
      }),
      prisma.teamInvite.update({
        where: { id: params.id },
        data: { status: 'ACCEPTED' },
      }),
      // Cancel other pending invites for this player
      prisma.teamInvite.updateMany({
        where: { receiverId: user.player.id, status: 'PENDING', id: { not: params.id } },
        data: { status: 'EXPIRED' },
      }),
      // Deactivate free agent profile
      prisma.freeAgent.updateMany({
        where: { playerId: user.player.id },
        data: { isActive: false },
      }),
    ])

    return NextResponse.json({ success: true, action: 'accepted', teamId: invite.teamId })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[invite response]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
