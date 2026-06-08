import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAuth()

    const [agents, myProfile] = await Promise.all([
      prisma.freeAgent.findMany({
        where: { isActive: true },
        include: {
          player: {
            include: { user: { select: { username: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      user.player
        ? prisma.freeAgent.findUnique({ where: { playerId: user.player.id } })
        : null,
    ])

    return NextResponse.json({ agents, myProfile })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Completa tu perfil primero' }, { status: 400 })

    const { roles, message } = await req.json()
    if (!roles || roles.length === 0) return NextResponse.json({ error: 'Selecciona al menos un rol' }, { status: 400 })

    const profile = await prisma.freeAgent.upsert({
      where: { playerId: user.player.id },
      update: { roles, message, isActive: true },
      create: { playerId: user.player.id, roles, message },
    })

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await prisma.freeAgent.updateMany({
      where: { playerId: user.player.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
