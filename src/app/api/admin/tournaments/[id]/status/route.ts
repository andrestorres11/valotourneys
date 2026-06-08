import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { TournamentStatus } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { status } = await req.json()

    const validStatuses: TournamentStatus[] = [
      'DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'
    ]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json(tournament)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
