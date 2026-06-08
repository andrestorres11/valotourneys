import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/cleanup — removes orphan SOLO/DUO/TRIO teams with no registrations
export async function GET() {
  try {
    await requireAdmin()

    // Find all temp teams
    const tempTeams = await prisma.team.findMany({
      where: { tag: { in: ['SOLO', 'DUO', 'TRIO'] } },
      include: { _count: { select: { registrations: true } } },
    })

    const orphans = tempTeams.filter(t => t._count.registrations === 0)

    let deleted = 0
    for (const team of orphans) {
      await prisma.teamMember.deleteMany({ where: { teamId: team.id } })
      await prisma.team.delete({ where: { id: team.id } }).catch(() => {})
      deleted++
    }

    return NextResponse.json({
      message: `Limpieza completada. ${deleted} equipos huérfanos eliminados.`,
      total: tempTeams.length,
      deleted,
    })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
