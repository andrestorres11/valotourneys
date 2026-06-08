'use client'

import { useState } from 'react'

type Props = {
  targetPlayerId: string
  targetName: string
  userHasTeam: boolean
  userIsCaptain: boolean
}

export function InviteButton({ targetPlayerId, targetName, userHasTeam, userIsCaptain }: Props) {
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage]   = useState('')

  if (!userHasTeam || !userIsCaptain) return null

  async function sendInvite() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlayerId, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setShowForm(false)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <span className="text-green-400 text-xs font-medium">✅ Invitación enviada</span>
    )
  }

  return (
    <div className="space-y-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs px-3 py-1.5 bg-valo-red/90 hover:bg-valo-red text-white rounded font-semibold transition-all"
        >
          + Invitar al equipo
        </button>
      ) : (
        <div className="space-y-2 animate-fade-in">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Mensaje para ${targetName} (opcional)...`}
            rows={2}
            className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-valo-red/50 resize-none"
          />
          {error && <p className="text-red-400 text-xs">❌ {error}</p>}
          <div className="flex gap-2">
            <button
              onClick={sendInvite}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-valo-red text-white rounded font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="text-xs px-3 py-1.5 border border-valo-border text-valo-text rounded hover:text-white transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
