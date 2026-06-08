import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const body = await req.json()

    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: {
        hasPaidEntry:        body.hasPaidEntry ?? false,
        entryFee:            body.entryFee ?? null,
        entryCurrency:       body.entryCurrency ?? 'COP',
        paymentRecipient:    body.paymentRecipient ?? null,
        paymentInstructions: body.paymentInstructions ?? null,
      },
    })

    return NextResponse.json(tournament)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
