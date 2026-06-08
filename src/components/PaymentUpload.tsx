'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentStatus } from '@prisma/client'

type Props = {
  tournamentId: string
  paymentStatus: PaymentStatus
  paymentProofUrl: string | null
  rejectionReason: string | null
  entryFee: number | null
  currency: string | null
  paymentInstructions: string | null
  paymentRecipient: string | null
  teamName: string
}

const STATUS_INFO: Record<PaymentStatus, { label: string; color: string; icon: string }> = {
  PENDING:   { label: 'Pendiente de pago',     color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: '⏳' },
  SUBMITTED: { label: 'Comprobante enviado',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',    icon: '📤' },
  APPROVED:  { label: 'Pago aprobado',         color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: '✅' },
  REJECTED:  { label: 'Comprobante rechazado', color: 'text-red-400 bg-red-400/10 border-red-400/30',       icon: '❌' },
}

export function PaymentUpload({
  tournamentId, paymentStatus, paymentProofUrl,
  rejectionReason, entryFee, currency,
  paymentInstructions, paymentRecipient, teamName,
}: Props) {
  const router     = useRouter()
  const fileRef    = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote]       = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const info = STATUS_INFO[paymentStatus]
  const canUpload = paymentStatus === 'PENDING' || paymentStatus === 'REJECTED'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Archivo demasiado grande. Máximo 5MB.'); return }
    setFile(f)
    setError('')

    // Preview for images
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  async function upload() {
    if (!file) { setError('Selecciona un archivo primero'); return }
    setUploading(true); setError(''); setSuccess('')

    try {
      // Convert to base64
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload  = e => res((e.target?.result as string).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const response = await fetch(`/api/tournaments/${tournamentId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type, note }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setSuccess('✅ Comprobante enviado. El admin lo revisará pronto.')
      setFile(null)
      setPreview(null)
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="valo-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-white font-bold">💳 Inscripción de {teamName}</h3>
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium ${info.color}`}>
        <span>{info.icon}</span>
        {info.label}
      </div>

      {/* Rejection reason */}
      {paymentStatus === 'REJECTED' && rejectionReason && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
          <p className="text-red-400 text-sm font-semibold mb-1">Motivo del rechazo:</p>
          <p className="text-red-300 text-sm">{rejectionReason}</p>
          <p className="text-red-400/70 text-xs mt-2">Por favor sube un nuevo comprobante.</p>
        </div>
      )}

      {/* Payment instructions */}
      {canUpload && (
        <div className="bg-valo-darker rounded p-4 space-y-2">
          <p className="text-white text-sm font-semibold">Instrucciones de pago</p>
          {entryFee && (
            <p className="text-valo-gold font-bold text-lg">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency ?? 'COP', maximumFractionDigits: 0 }).format(entryFee)}
            </p>
          )}
          {paymentRecipient && (
            <div className="flex items-center gap-2">
              <span className="text-valo-text text-xs">Número/cuenta:</span>
              <code className="text-white text-sm bg-valo-card px-2 py-0.5 rounded select-all">
                {paymentRecipient}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(paymentRecipient)}
                className="text-valo-text hover:text-white text-xs transition-colors"
                title="Copiar"
              >
                📋
              </button>
            </div>
          )}
          {paymentInstructions && (
            <pre className="text-valo-text text-xs whitespace-pre-wrap font-sans leading-relaxed">
              {paymentInstructions}
            </pre>
          )}
        </div>
      )}

      {/* Current proof (if submitted or approved) */}
      {paymentProofUrl && paymentStatus !== 'REJECTED' && (
        <div>
          <p className="text-valo-text text-xs uppercase tracking-wider mb-2">Comprobante actual</p>
          {paymentProofUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
            <a href={paymentProofUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={paymentProofUrl}
                alt="Comprobante de pago"
                className="max-h-48 rounded border border-valo-border hover:opacity-90 transition-opacity cursor-pointer"
              />
            </a>
          ) : (
            <a
              href={paymentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-valo-red text-sm hover:underline"
            >
              📄 Ver comprobante (PDF)
            </a>
          )}
        </div>
      )}

      {/* Upload form */}
      {canUpload && (
        <div className="space-y-3">
          <p className="text-valo-text text-xs uppercase tracking-wider">
            {paymentStatus === 'REJECTED' ? 'Subir nuevo comprobante' : 'Subir comprobante'}
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-valo-red/50 bg-valo-red/5'
                : 'border-valo-border hover:border-valo-red/40 hover:bg-valo-red/5'
            }`}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-36 mx-auto rounded" />
            ) : (
              <>
                <p className="text-3xl mb-2">{file ? '📄' : '📤'}</p>
                <p className="text-white text-sm font-medium">
                  {file ? file.name : 'Haz clic para seleccionar'}
                </p>
                <p className="text-valo-text text-xs mt-1">JPG, PNG, PDF · Máximo 5MB</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div>
            <label className="text-valo-text text-xs block mb-1.5">
              Nota para el admin (opcional)
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Pago realizado hoy a las 3pm desde Nequi"
              className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50"
            />
          </div>

          {error   && <p className="text-red-400 text-sm">❌ {error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            onClick={upload}
            disabled={!file || uploading}
            className="w-full bg-valo-red text-white py-2.5 rounded font-semibold text-sm hover:bg-valo-red/90 disabled:opacity-40 transition-all"
          >
            {uploading ? 'Subiendo...' : 'Enviar comprobante'}
          </button>
        </div>
      )}

      {paymentStatus === 'APPROVED' && (
        <p className="text-green-400 text-sm">
          🎉 Tu inscripción está confirmada. ¡Buena suerte en el torneo!
        </p>
      )}
    </div>
  )
}
