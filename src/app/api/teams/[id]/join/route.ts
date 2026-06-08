import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - player requests to join a team
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const { message } = await req.json().catch(() => ({ message: null }))

    // Check player not already in a team
    const existing = await prisma.teamMember.findFirst({ where: { playerId: user.player.id } })
    if (existing) return NextResponse.json({ error: 'Ya perteneces a un equipo' }, { status: 409 })

    // Check team exists and has space
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: true },
    })
    if (!team || team.status !== 'ACTIVE') return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    if (team.members.length >= 5) return NextResponse.json({ error: 'El equipo ya está completo' }, { status: 400 })

    // Check no pending invite/request already
    const pendingInvite = await prisma.teamInvite.findFirst({
      where: { teamId: params.id, receiverId: user.player.id, status: 'PENDING' },
    })
    if (pendingInvite) return NextResponse.json({ error: 'Ya tienes una solicitud pendiente para este equipo' }, { status: 409 })

    // Create invite FROM player TO captain (reverse direction — senderId = player, receiverId = captain's player)
    // We reuse TeamInvite but with a note that it's a join request (message starts with [REQUEST])
    const invite = await prisma.teamInvite.create({
      data: {
        teamId:     params.id,
        senderId:   user.player.id,
        receiverId: team.captainId, // captain receives the request
        message:    message ? `[SOLICITUD] ${message}` : '[SOLICITUD] Quiero unirme al equipo',
        expiresAt:  new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json(invite, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[join request]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET - get pending join requests for captain's team
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json([])

    // Verify user is captain
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, playerId: user.player.id, isCapitan: true },
    })
    if (!membership) return NextResponse.json({ error: 'Solo el capitán puede ver solicitudes' }, { status: 403 })

    const requests = await prisma.teamInvite.findMany({
      where: {
        teamId:    params.id,
        status:    'PENDING',
        expiresAt: { gt: new Date() },
        message:   { startsWith: '[SOLICITUD]' },
      },
      include: {
        sender: {
          include: {
            user:            { select: { username: true } },
            freeAgentProfile: { select: { roles: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch {
    return NextResponse.json([])
  }
}
