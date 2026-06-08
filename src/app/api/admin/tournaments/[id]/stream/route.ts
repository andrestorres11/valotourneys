import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { streamUrl } = await req.json()

    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: { streamUrl: streamUrl ?? null },
    })

    return NextResponse.json(tournament)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
