import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { bio, country } = await req.json()

    const updated = await prisma.player.update({
      where: { userId: user.id },
      data: { bio, country },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await requireAuth()
    return NextResponse.json(user.player)
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
