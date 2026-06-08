'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Prize = {
  id: string
  position: number
  label: string
  prizeType: string
  amount: number | null
  currency: string | null
  description: string | null
  winnerId: string | null
  paidAt: string | null
}

type Team = { id: string; name: string }

type Props = {
  tournamentId: string
  initialPrizes: Prize[]
  teams: Team[]
}

const PRIZE_TYPES = [
  { value: 'CASH',      label: '💵 Efectivo' },
  { value: 'TRANSFER',  label: '🏦 Transferencia' },
  { value: 'GIFT_CARD', label: '🎁 Gift card' },
  { value: 'PRODUCT',   label: '📦 Producto' },
  { value: 'OTHER',     label: '🏅 Otro' },
]

const POSITION_LABELS = ['', '🥇 1er lugar', '🥈 2do lugar', '🥉 3er lugar', '4to lugar', '5to lugar']

type PrizeRow = {
  position: number
  label: string
  prizeType: string
  amount: string
  currency: string
  description: string
}

export function AdminPrizesManager({ tournamentId, initialPrizes, teams }: Props) {
  const router  = useRouter()
  const [prizes, setPrizes] = useState<PrizeRow[]>(
    initialPrizes.length > 0
      ? initialPrizes.map(p => ({
          position:    p.position,
          label:       p.label,
          prizeType:   p.prizeType,
          amount:      p.amount?.toString() ?? '',
          currency:    p.currency ?? 'COP',
          description: p.description ?? '',
        }))
      : [
          { position: 1, label: '🥇 Campeón',    prizeType: 'CASH', amount: '', currency: 'COP', description: '' },
          { position: 2, label: '🥈 Subcampeón', prizeType: 'CASH', amount: '', currency: 'COP', description: '' },
        ]
  )
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  // Winner assignment
  const [winners, setWinners] = useState<Record<string, string>>(
    Object.fromEntries(initialPrizes.filter(p => p.winnerId).map(p => [p.id, p.winnerId!]))
  )
  const [assigning, setAssigning] = useState<string | null>(null)

  function addRow() {
    const nextPos = Math.max(...prizes.map(p => p.position), 0) + 1
    setPrizes(prev => [...prev, {
      position: nextPos,
      label: POSITION_LABELS[nextPos] ?? `${nextPos}to lugar`,
      prizeType: 'CASH', amount: '', currency: 'COP', description: '',
    }])
  }

  function removeRow(index: number) {
    setPrizes(prev => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof PrizeRow, value: string) {
    setPrizes(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  async function savePrizes() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/prizes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prizes: prizes.map(p => ({
            position:    p.position,
            label:       p.label,
            prizeType:   p.prizeType,
            amount:      p.amount ? parseFloat(p.amount) : undefined,
            currency:    p.currency,
            description: p.description || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('✅ Premios guardados')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function assignWinner(prizeId: string, teamId: string) {
    setAssigning(prizeId)
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/prizes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizeId, winnerId: teamId || null }),
      })
      if (!res.ok) throw new Error()
      setWinners(prev => ({ ...prev, [prizeId]: teamId }))
      router.refresh()
    } finally {
      setAssigning(null)
    }
  }

  const inp = 'bg-valo-darker border border-valo-border rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-valo-red/50'

  return (
    <div className="space-y-5">
      {/* Prize rows editor */}
      <div className="space-y-3">
        {prizes.map((prize, idx) => (
          <div key={idx} className="valo-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Premio #{idx + 1}</span>
              <button
                onClick={() => removeRow(idx)}
                className="text-valo-text hover:text-red-400 text-xs transition-colors"
              >
                Eliminar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-valo-text text-xs block mb-1">Posición</label>
                <input
                  type="number"
                  value={prize.position}
                  onChange={e => updateRow(idx, 'position', e.target.value)}
                  min={1}
                  className={inp + ' w-full'}
                />
              </div>
              <div>
                <label className="text-valo-text text-xs block mb-1">Nombre del premio</label>
                <input
                  value={prize.label}
                  onChange={e => updateRow(idx, 'label', e.target.value)}
                  placeholder="Campeón"
                  className={inp + ' w-full'}
                />
              </div>
              <div>
                <label className="text-valo-text text-xs block mb-1">Tipo</label>
                <select value={prize.prizeType} onChange={e => updateRow(idx, 'prizeType', e.target.value)} className={inp + ' w-full'}>
                  {PRIZE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-valo-text text-xs block mb-1">Moneda</label>
                <select value={prize.currency} onChange={e => updateRow(idx, 'currency', e.target.value)} className={inp + ' w-full'}>
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              {['CASH','TRANSFER','GIFT_CARD'].includes(prize.prizeType) && (
                <div>
                  <label className="text-valo-text text-xs block mb-1">Monto</label>
                  <input
                    type="number"
                    value={prize.amount}
                    onChange={e => updateRow(idx, 'amount', e.target.value)}
                    placeholder="50000"
                    className={inp + ' w-full'}
                  />
                </div>
              )}
              <div className={['CASH','TRANSFER','GIFT_CARD'].includes(prize.prizeType) ? '' : 'col-span-2'}>
                <label className="text-valo-text text-xs block mb-1">Descripción (opcional)</label>
                <input
                  value={prize.description}
                  onChange={e => updateRow(idx, 'description', e.target.value)}
                  placeholder="Detalles del premio..."
                  className={inp + ' w-full'}
                />
              </div>
            </div>

            {/* Winner assignment (only on saved prizes) */}
            {initialPrizes.find(p => p.position === prize.position) && (
              <div>
                <label className="text-valo-text text-xs block mb-1">Asignar ganador</label>
                <div className="flex gap-2">
                  <select
                    value={winners[initialPrizes.find(p => p.position === prize.position)!.id] ?? ''}
                    onChange={e => {
                      const prizeId = initialPrizes.find(p => p.position === prize.position)!.id
                      assignWinner(prizeId, e.target.value)
                    }}
                    className={inp + ' flex-1'}
                    disabled={assigning !== null}
                  >
                    <option value="">— Sin asignar —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {winners[initialPrizes.find(p => p.position === prize.position)!.id] && (
                    <span className="text-green-400 text-xs self-center">✅ Asignado</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className="border border-dashed border-valo-border text-valo-text hover:text-white hover:border-white/40 w-full py-2.5 rounded text-sm transition-all"
      >
        + Agregar premio
      </button>

      {error   && <p className="text-red-400 text-sm">❌ {error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      <button
        onClick={savePrizes}
        disabled={saving || prizes.length === 0}
        className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
      >
        {saving ? 'Guardando...' : 'Guardar premios'}
      </button>
    </div>
  )
}
