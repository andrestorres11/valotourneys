import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getFullPlayerStats, mapRank } from '@/lib/henrik'
import { prisma } from '@/lib/prisma'
import type { Rank } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })

    const { riotId } = await req.json()
    if (!riotId || !riotId.includes('#')) {
      return NextResponse.json({ error: 'Riot ID inválido. Formato: Nombre#TAG' }, { status: 400 })
    }

    const [gameName, tagLine] = riotId.split('#')

    // Check if Riot ID already in use by another player
    const existing = await prisma.player.findFirst({
      where: { riotId, NOT: { userId: user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta' }, { status: 409 })
    }

    // Fetch from Henrik API
    const stats = await getFullPlayerStats(gameName, tagLine)
    if (!stats) {
      return NextResponse.json({ error: 'No se pudo encontrar ese Riot ID. Verifica que sea correcto y que la cuenta exista.' }, { status: 404 })
    }

    // Update player in DB
    const updated = await prisma.player.update({
      where: { userId: user.id },
      data: {
        riotId,
        gameName:      stats.name,
        tagLine:       stats.tag,
        currentRank:   stats.currentRank as Rank,
        peakRank:      stats.peakRank as Rank,
        kills:         stats.kills,
        deaths:        stats.deaths,
        assists:       stats.assists,
        wins:          stats.wins,
        losses:        stats.losses,
        headshotPct:   stats.headshotPct,
        favoriteAgent: stats.favoriteAgent,
        lastSyncAt:    new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[sync-riot]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
