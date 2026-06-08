import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/matches/[id]/stream
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { streamUrl, scheduledAt, notes } = await req.json()

    const match = await prisma.match.update({
      where: { id: params.id },
      data: {
        streamUrl:   streamUrl   ?? undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        notes:       notes       ?? undefined,
      },
    })

    return NextResponse.json(match)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
