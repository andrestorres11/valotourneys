import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/cleanup
// Removes duplicate SOLO/DUO/TRIO teams — keeps only the one with most registrations per player
export async function GET() {
  try {
    await requireAdmin()

    const tempTeams = await prisma.team.findMany({
      where: { tag: { in: ['SOLO', 'DUO', 'TRIO'] } },
      include: {
        members:       { select: { playerId: true } },
        _count:        { select: { registrations: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group SOLO teams by captainId — keep only the one with registrations (or newest)
    const soloByPlayer = new Map<string, typeof tempTeams>()
    for (const team of tempTeams.filter(t => t.tag === 'SOLO')) {
      const key = team.captainId
      if (!soloByPlayer.has(key)) soloByPlayer.set(key, [])
      soloByPlayer.get(key)!.push(team)
    }

    let deleted = 0
    for (const [, teams] of soloByPlayer) {
      if (teams.length <= 1) continue
      // Keep the one with most registrations, or if tie, the newest
      teams.sort((a, b) => b._count.registrations - a._count.registrations || b.createdAt.getTime() - a.createdAt.getTime())
      const toDelete = teams.slice(1).filter(t => t._count.registrations === 0)
      for (const team of toDelete) {
        await prisma.teamMember.deleteMany({ where: { teamId: team.id } })
        await prisma.team.delete({ where: { id: team.id } }).catch(() => {})
        deleted++
      }
    }

    // Also delete any SOLO/DUO/TRIO with no members and no registrations
    const orphans = tempTeams.filter(t =>
      t.members.length === 0 && t._count.registrations === 0
    )
    for (const team of orphans) {
      await prisma.team.delete({ where: { id: team.id } }).catch(() => {})
      deleted++
    }

    return NextResponse.json({
      message: `Limpieza completa. ${deleted} equipos duplicados/huérfanos eliminados.`,
      deleted,
    })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}