import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - admin adds a player directly to a team
export async function POST(
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
    if (team.members.length >= 5) return NextResponse.json({ error: 'El equipo ya está completo (5/5)' }, { status: 400 })

    // Check player not already in another team
    const existing = await prisma.teamMember.findFirst({ where: { playerId } })
    if (existing) return NextResponse.json({ error: 'Este jugador ya pertenece a un equipo' }, { status: 409 })

    const member = await prisma.teamMember.create({
      data: { teamId: params.teamId, playerId, isCapitan: false },
      include: { player: { include: { user: { select: { username: true } } } } },
    })

    // Deactivate free agent profile if active
    await prisma.freeAgent.updateMany({
      where: { playerId },
      data: { isActive: false },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
