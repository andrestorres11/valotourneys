import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/teams/invite — captain invites a player
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil de jugador' }, { status: 400 })

    const { targetPlayerId, message } = await req.json()
    if (!targetPlayerId) return NextResponse.json({ error: 'Jugador requerido' }, { status: 400 })

    // Verify sender is a captain
    const captainMembership = await prisma.teamMember.findFirst({
      where: { playerId: user.player.id, isCapitan: true },
      include: { team: true },
    })
    if (!captainMembership) {
      return NextResponse.json({ error: 'Solo los capitanes pueden enviar invitaciones' }, { status: 403 })
    }

    const team = captainMembership.team

    // Check team is not full (5 members)
    const memberCount = await prisma.teamMember.count({ where: { teamId: team.id } })
    if (memberCount >= 5) {
      return NextResponse.json({ error: 'Tu equipo ya tiene 5 jugadores' }, { status: 400 })
    }

    // Check target player exists
    const targetPlayer = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      include: { teamMembers: true },
    })
    if (!targetPlayer) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })

    // Check target is not already in a team
    if (targetPlayer.teamMembers.length > 0) {
      return NextResponse.json({ error: 'Este jugador ya pertenece a un equipo' }, { status: 409 })
    }

    // Check no pending invite already exists
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId:     team.id,
        receiverId: targetPlayerId,
        status:     'PENDING',
      },
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'Ya enviaste una invitación pendiente a este jugador' }, { status: 409 })
    }

    // Create invite (expires in 48h)
    const invite = await prisma.teamInvite.create({
      data: {
        teamId:     team.id,
        senderId:   user.player.id,
        receiverId: targetPlayerId,
        message:    message ?? null,
        expiresAt:  new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
      include: {
        team:     { select: { name: true, tag: true } },
        receiver: { include: { user: { select: { username: true } } } },
      },
    })

    return NextResponse.json(invite, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[invite]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/teams/invite — get my pending invites (as receiver)
export async function GET() {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json([])

    const invites = await prisma.teamInvite.findMany({
      where: {
        receiverId: user.player.id,
        status:     'PENDING',
        expiresAt:  { gt: new Date() },
      },
      include: {
        team:   { include: { members: { include: { player: { include: { user: { select: { username: true } } } } } } } },
        sender: { include: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invites)
  } catch {
    return NextResponse.json([])
  }
}
