import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/teams/[id] — disband team (captain only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const team = await prisma.team.findUnique({ where: { id: params.id } })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    if (team.captainId !== user.player.id) {
      return NextResponse.json({ error: 'Solo el capitán puede disolver el equipo' }, { status: 403 })
    }

    // Soft delete — mark as DISBANDED
    await prisma.team.update({
      where: { id: params.id },
      data: { status: 'DISBANDED' },
    })

    // Remove all members
    await prisma.teamMember.deleteMany({ where: { teamId: params.id } })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/teams/[id] — get team details
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            player: {
              include: { user: { select: { username: true } } },
            },
          },
        },
      },
    })
    if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    return NextResponse.json(team)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
