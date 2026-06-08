'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  tournamentId: string
  registrationId: string
  teamName: string
  tag: string
}

export function AdminKickRegistration({ tournamentId, registrationId, teamName, tag }: Props) {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [confirm, setConfirm]   = useState(false)
  const [msg, setMsg]           = useState('')

  async function kick() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/registrations/${registrationId}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✅ Retirado')
      router.refresh()
    } catch (e: unknown) {
      setMsg(`❌ ${(e as Error).message}`)
      setConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  if (msg) return <span className={`text-xs font-medium ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>

  if (confirm) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <span className="text-valo-text text-xs">¿Retirar a {['SOLO','DUO','TRIO'].includes(tag) ? teamName.split('_')[0] : teamName}?</span>
        <button
          onClick={kick}
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 text-white text-xs px-2.5 py-1 rounded font-semibold disabled:opacity-50 transition-all"
        >
          {loading ? '...' : 'Sí'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="border border-valo-border text-valo-text text-xs px-2 py-1 rounded hover:text-white transition-all"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs border border-red-500/30 text-red-400/70 hover:border-red-400 hover:text-red-400 px-2.5 py-1 rounded transition-all whitespace-nowrap"
    >
      Retirar inscripción
    </button>
  )
}
