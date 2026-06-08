import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/teams/[id]/join/[inviteId] — captain accepts or rejects
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; inviteId: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const { action } = await req.json() as { action: 'accept' | 'reject' }

    // Verify captain
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, playerId: user.player.id, isCapitan: true },
    })
    if (!membership) return NextResponse.json({ error: 'Solo el capitán puede responder solicitudes' }, { status: 403 })

    const invite = await prisma.teamInvite.findUnique({
      where: { id: params.inviteId },
      include: { team: { include: { members: true } } },
    })
    if (!invite) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (invite.teamId !== params.id) return NextResponse.json({ error: 'Solicitud no pertenece a este equipo' }, { status: 400 })
    if (invite.status !== 'PENDING') return NextResponse.json({ error: 'Esta solicitud ya fue respondida' }, { status: 400 })

    if (action === 'reject') {
      await prisma.teamInvite.update({ where: { id: params.inviteId }, data: { status: 'DECLINED' } })
      return NextResponse.json({ success: true, action: 'rejected' })
    }

    // Accept — check space
    if (invite.team.members.length >= 5) {
      await prisma.teamInvite.update({ where: { id: params.inviteId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'El equipo ya está completo' }, { status: 400 })
    }

    // Check player not already in another team
    const alreadyInTeam = await prisma.teamMember.findFirst({ where: { playerId: invite.senderId } })
    if (alreadyInTeam) {
      await prisma.teamInvite.update({ where: { id: params.inviteId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'El jugador ya se unió a otro equipo' }, { status: 409 })
    }

    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: params.id, playerId: invite.senderId, isCapitan: false },
      }),
      prisma.teamInvite.update({
        where: { id: params.inviteId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.freeAgent.updateMany({
        where: { playerId: invite.senderId },
        data: { isActive: false },
      }),
    ])

    return NextResponse.json({ success: true, action: 'accepted' })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
