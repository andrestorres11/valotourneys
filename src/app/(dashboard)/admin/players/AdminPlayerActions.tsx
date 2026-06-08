'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  playerId: string
  playerName: string
  teamId: string | null
  teamName: string | null
  isCaptain: boolean
}

export function AdminPlayerActions({ playerId, playerName, teamId, teamName, isCaptain }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  async function kickFromTeam() {
    if (!teamId) return
    const action = isCaptain ? 'disolver el equipo' : `expulsar a ${playerName} de ${teamName}`
    if (!confirm(`¿Seguro que quieres ${action}?`)) return

    setLoading(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/kick/${playerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg(data.action === 'disbanded' ? '✅ Equipo disuelto' : '✅ Expulsado')
      router.refresh()
    } catch (e: unknown) {
      setMsg(`❌ ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!teamId) return <span className="text-valo-text/30 text-xs">—</span>

  if (msg) return <span className={`text-xs ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>

  return (
    <button
      onClick={kickFromTeam}
      disabled={loading}
      className={`text-xs px-2.5 py-1 rounded border transition-all disabled:opacity-50 whitespace-nowrap ${
        isCaptain
          ? 'border-orange-500/40 text-orange-400 hover:border-orange-400'
          : 'border-red-500/30 text-red-400/70 hover:border-red-400 hover:text-red-400'
      }`}
    >
      {loading ? '...' : isCaptain ? 'Disolver equipo' : 'Expulsar'}
    </button>
  )
}
