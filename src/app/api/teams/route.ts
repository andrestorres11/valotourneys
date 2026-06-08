import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - list teams
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  const teams = await prisma.team.findMany({
    where: {
      status: 'ACTIVE',
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      members: {
        include: { player: { include: { user: { select: { username: true } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(teams)
}

// POST - create team
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Completa tu perfil primero' }, { status: 400 })

    const { name, tag, description } = await req.json()

    // Validate
    if (!name || name.length < 3) return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
    if (!tag  || tag.length > 5)  return NextResponse.json({ error: 'El TAG debe tener máximo 5 caracteres' }, { status: 400 })

    // Check if player already in a team
    const existingMember = await prisma.teamMember.findFirst({
      where: { playerId: user.player.id },
    })
    if (existingMember) return NextResponse.json({ error: 'Ya perteneces a un equipo' }, { status: 409 })

    const team = await prisma.team.create({
      data: {
        name,
        tag: tag.toUpperCase(),
        description,
        captainId: user.player.id,
        members: {
          create: { playerId: user.player.id, isCapitan: true },
        },
      },
      include: {
        members: { include: { player: { include: { user: { select: { username: true } } } } } },
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Ese nombre o TAG ya está en uso' }, { status: 409 })
    console.error('[POST /teams]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
