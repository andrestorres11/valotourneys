// POST /api/tournaments/[id]/payment
// El jugador (capitán) sube su comprobante de pago
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

const MAX_SIZE_MB = 5

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: 'Sin perfil de jugador' }, { status: 400 })

    const body = await req.json()
    const { base64, mimeType, note } = body as {
      base64: string
      mimeType: string
      note?: string
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, PDF.' }, { status: 400 })
    }

    // Validate size (~base64 is 4/3 of original)
    const estimatedMB = (base64.length * 0.75) / 1024 / 1024
    if (estimatedMB > MAX_SIZE_MB) {
      return NextResponse.json({ error: `El archivo es demasiado grande. Máximo ${MAX_SIZE_MB}MB.` }, { status: 400 })
    }

    // Find team registration
    const teamMember = await prisma.teamMember.findFirst({
      where: { playerId: user.player.id, isCapitan: true },
    })
    if (!teamMember) {
      return NextResponse.json({ error: 'Solo el capitán del equipo puede subir el comprobante' }, { status: 403 })
    }

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_teamId: { tournamentId: params.id, teamId: teamMember.teamId } },
    })
    if (!registration) {
      return NextResponse.json({ error: 'Tu equipo no está inscrito en este torneo' }, { status: 404 })
    }
    if (registration.paymentStatus === 'APPROVED') {
      return NextResponse.json({ error: 'Tu pago ya fue aprobado. No es necesario subir otro comprobante.' }, { status: 400 })
    }

    // Delete old proof if exists
    if (registration.paymentProofId) {
      await deleteFromCloudinary(registration.paymentProofId).catch(() => {})
    }

    // Upload to Cloudinary
    const { url, publicId } = await uploadToCloudinary(
      base64,
      mimeType,
      `valotourneys/payments/${params.id}`
    )

    // Update registration
    const updated = await prisma.tournamentRegistration.update({
      where: { id: registration.id },
      data: {
        paymentStatus:   'SUBMITTED',
        paymentProofUrl: url,
        paymentProofId:  publicId,
        paymentNote:     note ?? null,
        reviewedAt:      null,
        rejectionReason: null,
      },
    })

    return NextResponse.json({ success: true, registration: updated })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    console.error('[upload payment]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
