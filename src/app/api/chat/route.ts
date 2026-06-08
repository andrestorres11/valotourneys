import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { aliothChat } from '@/lib/groq'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 })
    }

    // Build player context for Alioth
    const player = user.player
    const playerContext = player ? {
      gameName:      player.gameName ?? undefined,
      rank:          RANK_LABELS[player.currentRank as Rank],
      kd:            player.deaths > 0 ? player.kills / player.deaths : 0,
      headshotPct:   Math.round(player.headshotPct),
      favoriteAgent: player.favoriteAgent ?? undefined,
      wins:          player.wins,
      losses:        player.losses,
    } : undefined

    const response = await aliothChat(messages, playerContext)
    return NextResponse.json({ message: response })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[Alioth chat]', error)
    return NextResponse.json({ error: 'Error generando respuesta' }, { status: 500 })
  }
}
