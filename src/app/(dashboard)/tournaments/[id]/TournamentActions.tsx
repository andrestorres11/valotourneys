'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

type Props = {
  tournamentId: string
  teamSize: number
  userTeam: { id: string; name: string; isCapitan: boolean } | null
  alreadyRegistered: boolean
  spotsLeft: number
  minRank: Rank
  maxRank: Rank
  userPlayerId: string | null
  userRank: string | null
  userRiotId: string | null
  userGameName: string | null
}

type FreePlayer = {
  id: string
  gameName: string | null
  tagLine: string | null
  currentRank: string
  user: { username: string }
}

export function TournamentActions({
  tournamentId, teamSize, userTeam, alreadyRegistered,
  spotsLeft, minRank, maxRank, userPlayerId, userRank, userRiotId, userGameName,
}: Props) {
  const router  = useRouter()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [partners, setPartners] = useState<string[]>([])
  const [allPlayers, setAllPlayers] = useState<FreePlayer[]>([])

  // For duo/trio: load eligible players
  useEffect(() => {
    if (teamSize >= 2 && teamSize <= 4) {
      fetch('/api/players/eligible?tournamentId=' + tournamentId)
        .then(r => r.json())
        .then(d => setAllPlayers(Array.isArray(d) ? d : []))
        .catch(() => {})
    }
  }, [teamSize, tournamentId])

  function togglePartner(playerId: string) {
    setPartners(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : prev.length < teamSize - 1
        ? [...prev, playerId]
        : prev
    )
  }

  async function register(teamId?: string) {
    setLoading(true); setError(''); setSuccess('')
    try {
      const body: Record<string, unknown> = {}
      if (teamSize === 1)                          body.solo = true
      else if (teamSize >= 2 && teamSize <= 4)     body.partnerIds = partners
      else if (teamId)                             body.teamId = teamId

      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('✅ ¡Inscripción exitosa!')
      router.refresh()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  async function unregister(teamId: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      router.refresh()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const rankLabel  = `${RANK_LABELS[minRank]} – ${RANK_LABELS[maxRank]}`
  const userInRange = userRank ? (
    RANK_LABELS[minRank] && RANK_LABELS[maxRank]
  ) : false

  return (
    <div className="space-y-3 text-right">
      <div className="text-valo-text text-xs space-y-0.5">
        <p>📊 Rango: <span className="text-white">{rankLabel}</span></p>
        <p>👥 Formato: <span className="text-white">{teamSize === 1 ? 'Individual' : teamSize === 2 ? 'Dúo' : teamSize === 3 ? 'Trío' : `${teamSize}v${teamSize}`}</span></p>
        <p>🎯 Lugares: <span className={spotsLeft <= 2 ? 'text-red-400' : 'text-white'}>{spotsLeft}</span></p>
      </div>

      {/* Already registered */}
      {alreadyRegistered && userTeam && (
        <div className="space-y-1.5">
          <p className="text-green-400 text-xs font-semibold">✅ Inscrito como {userTeam.name}</p>
          <button
            onClick={() => unregister(userTeam.id)}
            disabled={loading}
            className="text-xs border border-red-500/40 text-red-400 px-3 py-1 rounded hover:border-red-400 transition-all disabled:opacity-50"
          >
            Retirar inscripción
          </button>
        </div>
      )}

      {/* SOLO */}
      {!alreadyRegistered && teamSize === 1 && (
        <div className="space-y-2">
          {!userRiotId ? (
            <p className="text-yellow-400 text-xs">⚠️ Vincula tu Riot ID en tu perfil primero</p>
          ) : (
            <>
              <p className="text-valo-text text-xs">Inscribiéndote como: <span className="text-white">{userGameName}</span></p>
              <button
                onClick={() => register()}
                disabled={loading || spotsLeft <= 0}
                className="bg-valo-red text-white px-5 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
              >
                {loading ? 'Inscribiendo...' : spotsLeft <= 0 ? 'Torneo lleno' : 'Inscribirme'}
              </button>
            </>
          )}
        </div>
      )}

      {/* DUO / TRIO */}
      {!alreadyRegistered && teamSize >= 2 && teamSize <= 4 && (
        <div className="space-y-3 text-left">
          <div className="valo-card p-4 space-y-3">
            <p className="text-white text-sm font-semibold">
              Selecciona {teamSize - 1} compañero{teamSize > 2 ? 's' : ''} para tu {teamSize === 2 ? 'dúo' : 'trío'}
            </p>
            <p className="text-valo-text text-xs">{partners.length}/{teamSize - 1} seleccionado{partners.length !== 1 ? 's' : ''}</p>

            {allPlayers.length === 0 ? (
              <p className="text-valo-text/60 text-xs">No hay otros jugadores disponibles con el rango requerido.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {allPlayers.filter(p => p.id !== userPlayerId).map(p => {
                  const selected = partners.includes(p.id)
                  const maxed    = partners.length >= teamSize - 1 && !selected
                  return (
                    <button
                      key={p.id}
                      onClick={() => !maxed && togglePartner(p.id)}
                      disabled={maxed}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${
                        selected
                          ? 'bg-valo-red/20 border border-valo-red/50 text-white'
                          : maxed
                          ? 'bg-valo-darker border border-valo-border/30 text-valo-text/40 cursor-not-allowed'
                          : 'bg-valo-darker border border-valo-border text-valo-text hover:border-valo-red/30 hover:text-white'
                      }`}
                    >
                      <span>{p.gameName ? `${p.gameName}#${p.tagLine}` : p.user.username}</span>
                      <span className="text-xs opacity-70">{RANK_LABELS[p.currentRank as Rank]}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => register()}
              disabled={loading || partners.length !== teamSize - 1 || spotsLeft <= 0}
              className="w-full bg-valo-red text-white py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Inscribiendo...' : spotsLeft <= 0 ? 'Torneo lleno' : `Inscribir ${teamSize === 2 ? 'dúo' : 'trío'}`}
            </button>
          </div>
        </div>
      )}

      {/* TEAM 5v5 */}
      {!alreadyRegistered && teamSize >= 5 && (
        <div className="space-y-2">
          {!userTeam ? (
            <p className="text-valo-text text-xs">Necesitas un equipo para inscribirte</p>
          ) : !userTeam.isCapitan ? (
            <p className="text-valo-text text-xs">Solo el capitán puede inscribir al equipo</p>
          ) : (
            <button
              onClick={() => register(userTeam.id)}
              disabled={loading || spotsLeft <= 0}
              className="bg-valo-red text-white px-5 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Inscribiendo...' : spotsLeft <= 0 ? 'Torneo lleno' : `Inscribir ${userTeam.name}`}
            </button>
          )}
        </div>
      )}

      {error   && <p className="text-red-400 text-xs max-w-xs text-right whitespace-pre-line">❌ {error}</p>}
      {success && <p className="text-green-400 text-xs">{success}</p>}
    </div>
  )
}
