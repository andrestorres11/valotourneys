'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  tournament: {
    id: string
    hasPaidEntry: boolean
    entryFee: number | null
    entryCurrency: string | null
    paymentInstructions: string | null
    paymentRecipient: string | null
  }
}

export function AdminPaymentConfig({ tournament }: Props) {
  const router = useRouter()
  const [hasPaid, setHasPaid]   = useState(tournament.hasPaidEntry)
  const [fee, setFee]           = useState(tournament.entryFee?.toString() ?? '')
  const [currency, setCurrency] = useState(tournament.entryCurrency ?? 'COP')
  const [recipient, setRecipient] = useState(tournament.paymentRecipient ?? '')
  const [instructions, setInstructions] = useState(tournament.paymentInstructions ?? '')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [error, setError]       = useState('')

  async function save() {
    setSaving(true); setMsg(''); setError('')
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/payment-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasPaidEntry:        hasPaid,
          entryFee:            hasPaid && fee ? parseFloat(fee) : null,
          entryCurrency:       currency,
          paymentRecipient:    hasPaid ? recipient : null,
          paymentInstructions: hasPaid ? instructions : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✅ Configuración guardada')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50'

  return (
    <div className="valo-card p-5 space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Inscripción con pago</p>
          <p className="text-valo-text text-xs mt-0.5">
            Los equipos deberán subir un comprobante de pago para ser aceptados
          </p>
        </div>
        <button
          onClick={() => setHasPaid(!hasPaid)}
          className={`relative w-12 h-6 rounded-full transition-all ${hasPaid ? 'bg-valo-red' : 'bg-valo-border'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${hasPaid ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {hasPaid && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-valo-text text-xs block mb-1.5">Valor de inscripción</label>
              <input
                type="number"
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="50000"
                className={inp}
              />
            </div>
            <div>
              <label className="text-valo-text text-xs block mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={inp}>
                <option value="COP">COP (Peso colombiano)</option>
                <option value="USD">USD (Dólar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-valo-text text-xs block mb-1.5">
              Número/cuenta de destino
            </label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="Ej: 3001234567 (Nequi)"
              className={inp}
            />
            <p className="text-valo-text/60 text-xs mt-1">
              Este número se mostrará al jugador para que haga la transferencia
            </p>
          </div>

          <div>
            <label className="text-valo-text text-xs block mb-1.5">Instrucciones de pago</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              placeholder={`Ej:\n1. Transfiere el valor exacto por Nequi al número indicado\n2. Referencia: nombre de tu equipo\n3. Sube la captura de pantalla del comprobante\n4. El admin aprobará en máximo 24 horas`}
              className={inp + ' resize-none'}
            />
          </div>
        </div>
      )}

      {msg   && <p className="text-green-400 text-sm">{msg}</p>}
      {error && <p className="text-red-400 text-sm">❌ {error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
