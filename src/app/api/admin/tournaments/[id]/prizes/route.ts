// /api/admin/tournaments/[id]/prizes
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PrizeType } from '@prisma/client'

// GET - list prizes of a tournament
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const prizes = await prisma.tournamentPrize.findMany({
      where: { tournamentId: params.id },
      orderBy: { position: 'asc' },
    })
    return NextResponse.json(prizes)
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

// POST - create or replace all prizes
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { prizes } = await req.json() as {
      prizes: Array<{
        position: number
        label: string
        prizeType: PrizeType
        amount?: number
        currency?: string
        description?: string
      }>
    }

    if (!Array.isArray(prizes) || prizes.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un premio' }, { status: 400 })
    }

    // Replace all prizes for this tournament
    await prisma.$transaction([
      prisma.tournamentPrize.deleteMany({ where: { tournamentId: params.id } }),
      prisma.tournamentPrize.createMany({
        data: prizes.map(p => ({
          tournamentId: params.id,
          position:    p.position,
          label:       p.label,
          prizeType:   p.prizeType,
          amount:      p.amount ?? null,
          currency:    p.currency ?? 'COP',
          description: p.description ?? null,
        })),
      }),
    ])

    const created = await prisma.tournamentPrize.findMany({
      where: { tournamentId: params.id },
      orderBy: { position: 'asc' },
    })

    return NextResponse.json(created)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    console.error('[prizes]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH - assign winner to a prize
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { prizeId, winnerId } = await req.json()

    const prize = await prisma.tournamentPrize.update({
      where: { id: prizeId, tournamentId: params.id },
      data: { winnerId, paidAt: winnerId ? new Date() : null },
    })

    return NextResponse.json(prize)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
