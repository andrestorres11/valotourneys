// PATCH /api/admin/registrations/[id]/review
// Admin aprueba o rechaza un comprobante de pago
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const { action, reason } = await req.json() as {
      action: 'approve' | 'reject'
      reason?: string
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }
    if (action === 'reject' && !reason?.trim()) {
      return NextResponse.json({ error: 'Debes indicar el motivo del rechazo' }, { status: 400 })
    }

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: params.id },
      include: { team: true, tournament: true },
    })
    if (!registration) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    if (registration.paymentStatus === 'PENDING') {
      return NextResponse.json({ error: 'El equipo aún no ha subido ningún comprobante' }, { status: 400 })
    }

    const updated = await prisma.tournamentRegistration.update({
      where: { id: params.id },
      data: {
        paymentStatus:   action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedAt:      new Date(),
        reviewedBy:      admin.id,
        rejectionReason: action === 'reject' ? reason : null,
      },
      include: {
        team: true,
        tournament: { select: { name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    console.error('[review payment]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
