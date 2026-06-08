import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/tournaments/[id]/registrations/[regId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; regId: string } }
) {
  try {
    await requireAdmin()

    const reg = await prisma.tournamentRegistration.findUnique({
      where: { id: params.regId },
      include: { team: true },
    })
    if (!reg) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    if (reg.tournamentId !== params.id) return NextResponse.json({ error: 'No pertenece a este torneo' }, { status: 400 })

    const isTemp = ['SOLO', 'DUO', 'TRIO'].includes(reg.team.tag)

    // Delete registration first (FK)
    await prisma.tournamentRegistration.delete({ where: { id: params.regId } })

    // Clean up temp teams
    if (isTemp) {
      await prisma.teamMember.deleteMany({ where: { teamId: reg.teamId } })
      await prisma.team.delete({ where: { id: reg.teamId } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}