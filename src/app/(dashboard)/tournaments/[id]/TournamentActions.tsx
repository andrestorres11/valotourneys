'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

type Props = {
  tournamentId: string
  userTeam: { id: string; name: string; isCapitan: boolean } | null
  alreadyRegistered: boolean
  spotsLeft: number
  minRank: Rank
  maxRank: Rank
}

export function TournamentActions({ tournamentId, userTeam, alreadyRegistered, spotsLeft, minRank, maxRank }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function register() {
    if (!userTeam) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: userTeam.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('✅ Equipo inscrito exitosamente')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function unregister() {
    if (!userTeam) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: userTeam.id }),
      })
      if (!res.ok) throw new Error('Error al retirar la inscripción')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-right space-y-2">
      <p className="text-valo-text text-xs">
        Rango: <span className="text-white">{RANK_LABELS[minRank]} – {RANK_LABELS[maxRank]}</span>
      </p>
      <p className="text-valo-text text-xs">
        Lugares disponibles: <span className={spotsLeft <= 2 ? 'text-red-400' : 'text-white'}>{spotsLeft}</span>
      </p>

      {!userTeam ? (
        <p className="text-valo-text text-xs">Necesitas un equipo para inscribirte</p>
      ) : !userTeam.isCapitan ? (
        <p className="text-valo-text text-xs">Solo el capitán puede inscribir al equipo</p>
      ) : alreadyRegistered ? (
        <div className="space-y-1">
          <p className="text-green-400 text-xs font-semibold">✅ {userTeam.name} inscrito</p>
          <button
            onClick={unregister}
            disabled={loading}
            className="text-xs border border-red-500/40 text-red-400 px-3 py-1 rounded hover:border-red-400 transition-all disabled:opacity-50"
          >
            Retirar inscripción
          </button>
        </div>
      ) : (
        <button
          onClick={register}
          disabled={loading || spotsLeft <= 0}
          className="bg-valo-red text-white px-5 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
        >
          {loading ? 'Inscribiendo...' : spotsLeft <= 0 ? 'Torneo lleno' : `Inscribir ${userTeam.name}`}
        </button>
      )}

      {error && (
        <p className="text-red-400 text-xs max-w-xs text-right whitespace-pre-line">❌ {error}</p>
      )}
      {success && <p className="text-green-400 text-xs">{success}</p>}
    </div>
  )
}
