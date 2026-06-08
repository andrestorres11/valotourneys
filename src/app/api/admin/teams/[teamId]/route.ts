import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    await requireAdmin()
    const { name, tag } = await req.json()

    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!tag?.trim())  return NextResponse.json({ error: 'TAG requerido' }, { status: 400 })

    // Check name not taken by another team
    const existing = await prisma.team.findFirst({
      where: { name, NOT: { id: params.teamId } },
    })
    if (existing) return NextResponse.json({ error: 'Ese nombre ya está en uso' }, { status: 409 })

    const team = await prisma.team.update({
      where: { id: params.teamId },
      data: { name, tag: tag.toUpperCase().slice(0, 5) },
    })

    return NextResponse.json(team)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    await requireAdmin()

    await prisma.team.update({ where: { id: params.teamId }, data: { status: 'DISBANDED' } })
    await prisma.teamMember.deleteMany({ where: { teamId: params.teamId } })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
