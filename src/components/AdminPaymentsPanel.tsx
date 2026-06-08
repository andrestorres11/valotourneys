'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentStatus } from '@prisma/client'

type Registration = {
  id: string
  paymentStatus: PaymentStatus
  paymentProofUrl: string | null
  paymentNote: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  registeredAt: string
  team: { id: string; name: string; tag: string }
}

type Props = {
  tournamentId: string
  registrations: Registration[]
  entryFee: number | null
  currency: string | null
  onKick?: (regId: string) => void
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING:   'Sin comprobante',
  SUBMITTED: 'Por revisar',
  APPROVED:  'Aprobado',
  REJECTED:  'Rechazado',
}
const STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING:   'text-gray-400  bg-gray-400/10  border-gray-400/30',
  SUBMITTED: 'text-blue-400  bg-blue-400/10  border-blue-400/30',
  APPROVED:  'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED:  'text-red-400   bg-red-400/10   border-red-400/30',
}

export function AdminPaymentsPanel({ tournamentId, registrations, entryFee, currency }: Props) {
  const router = useRouter()
  const [loading, setLoading]     = useState<string | null>(null)
  const [rejection, setRejection] = useState<Record<string, string>>({})
  const [showReject, setShowReject] = useState<string | null>(null)
  const [lightbox, setLightbox]   = useState<string | null>(null)
  const [error, setError]         = useState('')

  // Counters
  const pending   = registrations.filter(r => r.paymentStatus === 'PENDING').length
  const submitted = registrations.filter(r => r.paymentStatus === 'SUBMITTED').length
  const approved  = registrations.filter(r => r.paymentStatus === 'APPROVED').length
  const total     = approved * (entryFee ?? 0)

  async function review(registrationId: string, action: 'approve' | 'reject') {
    const reason = rejection[registrationId]?.trim()
    if (action === 'reject' && !reason) {
      setError('Escribe el motivo del rechazo primero')
      return
    }
    setLoading(registrationId); setError('')
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowReject(null)
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Sin comprobante', value: pending,   color: 'text-gray-400' },
          { label: 'Por revisar',     value: submitted, color: 'text-blue-400' },
          { label: 'Aprobados',       value: approved,  color: 'text-green-400' },
          {
            label: 'Recaudado',
            value: new Intl.NumberFormat('es-CO', {
              style: 'currency', currency: currency ?? 'COP', maximumFractionDigits: 0,
            }).format(total),
            color: 'text-valo-gold',
          },
        ].map(s => (
          <div key={s.label} className="valo-card p-3 text-center">
            <p className="text-valo-text text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">❌ {error}</p>}

      {/* Registrations list */}
      <div className="space-y-3">
        {registrations
          .sort((a, b) => {
            const order: Record<PaymentStatus, number> = { SUBMITTED: 0, PENDING: 1, REJECTED: 2, APPROVED: 3 }
            return order[a.paymentStatus] - order[b.paymentStatus]
          })
          .map(reg => (
            <div key={reg.id} className="valo-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-white font-bold">{reg.team.name}</span>
                  <span className="text-valo-text text-xs ml-2">[{reg.team.tag}]</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded border font-medium ${STATUS_COLORS[reg.paymentStatus]}`}>
                  {STATUS_LABELS[reg.paymentStatus]}
                </span>
              </div>

              {/* Proof preview */}
              {reg.paymentProofUrl && (
                <div className="space-y-2">
                  <p className="text-valo-text text-xs">Comprobante:</p>
                  {reg.paymentProofUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <img
                      src={reg.paymentProofUrl}
                      alt="Comprobante"
                      className="max-h-40 rounded border border-valo-border cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={() => setLightbox(reg.paymentProofUrl)}
                    />
                  ) : (
                    <a
                      href={reg.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-valo-red text-sm hover:underline"
                    >
                      📄 Ver comprobante (PDF)
                    </a>
                  )}
                  {reg.paymentNote && (
                    <p className="text-valo-text text-xs italic">"{reg.paymentNote}"</p>
                  )}
                </div>
              )}

              {/* Rejection reason shown */}
              {reg.paymentStatus === 'REJECTED' && reg.rejectionReason && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                  Motivo: {reg.rejectionReason}
                </p>
              )}

              {/* Actions */}
              {reg.paymentStatus === 'SUBMITTED' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(reg.id, 'approve')}
                      disabled={loading === reg.id}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
                    >
                      {loading === reg.id ? '...' : '✅ Aprobar'}
                    </button>
                    <button
                      onClick={() => setShowReject(showReject === reg.id ? null : reg.id)}
                      className="border border-red-500/40 text-red-400 hover:border-red-400 text-xs px-4 py-1.5 rounded font-semibold transition-all"
                    >
                      ❌ Rechazar
                    </button>
                  </div>

                  {showReject === reg.id && (
                    <div className="flex gap-2 animate-fade-in">
                      <input
                        value={rejection[reg.id] ?? ''}
                        onChange={e => setRejection(prev => ({ ...prev, [reg.id]: e.target.value }))}
                        placeholder="Motivo del rechazo..."
                        className="flex-1 bg-valo-darker border border-red-500/30 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-400"
                      />
                      <button
                        onClick={() => review(reg.id, 'reject')}
                        disabled={loading === reg.id}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Re-approve if rejected */}
              {reg.paymentStatus === 'REJECTED' && reg.paymentProofUrl && (
                <button
                  onClick={() => review(reg.id, 'approve')}
                  disabled={loading === reg.id}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
                >
                  Aprobar de todas formas
                </button>
              )}

              {reg.paymentStatus === 'APPROVED' && reg.reviewedAt && (
                <p className="text-green-400/60 text-xs">
                  Aprobado el {new Date(reg.reviewedAt).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Comprobante ampliado" className="max-w-full max-h-full rounded-lg" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl bg-valo-dark/80 w-10 h-10 rounded-full hover:bg-valo-red/80 transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
