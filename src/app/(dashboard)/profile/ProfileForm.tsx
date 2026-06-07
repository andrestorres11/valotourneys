'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'

type ProfileFormProps = {
  player: {
    id: string
    riotId: string | null
    gameName: string | null
    tagLine: string | null
    currentRank: string
    peakRank: string
    photoUrl: string | null
    bio: string | null
    country: string | null
    kills: number
    deaths: number
    wins: number
    losses: number
    headshotPct: number
    favoriteAgent: string | null
  } | null
  username: string
}

export function ProfileForm({ player, username }: ProfileFormProps) {
  const router = useRouter()
  const [riotId, setRiotId]   = useState(player?.riotId ?? '')
  const [bio, setBio]         = useState(player?.bio ?? '')
  const [country, setCountry] = useState(player?.country ?? '')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')

  async function syncRiotId() {
    if (!riotId.includes('#')) { setError('Formato inválido. Usa: NombreJugador#TAG'); return }
    setSyncing(true); setError(''); setMsg('')
    try {
      const res = await fetch('/api/players/sync-riot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riotId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error sincronizando')
      setMsg(`✅ Sincronizado: ${data.gameName}#${data.tagLine} — ${RANK_LABELS[data.currentRank as keyof typeof RANK_LABELS] ?? data.currentRank}`)
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  async function saveProfile() {
    setSaving(true); setError(''); setMsg('')
    try {
      const res = await fetch('/api/players/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, country }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✅ Perfil actualizado')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const kd = player && player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : '0.00'
  const wr = player && (player.wins + player.losses) > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="section-heading text-2xl">Mi perfil</h1>

      {/* Stats (if synced) */}
      {player?.riotId && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Rango', value: RANK_LABELS[player.currentRank as keyof typeof RANK_LABELS] ?? player.currentRank },
            { label: 'K/D', value: kd },
            { label: 'Winrate', value: `${wr}%` },
            { label: 'HS%', value: `${Math.round(player.headshotPct)}%` },
          ].map(s => (
            <div key={s.label} className="valo-card p-3 text-center">
              <p className="text-valo-text text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-white font-bold text-lg mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* RIOT ID */}
      <div className="valo-card p-5 space-y-3">
        <h2 className="text-white font-bold">🎮 Riot ID</h2>
        <p className="text-valo-text text-sm">Vincula tu cuenta de Valorant para verificar tu rango automáticamente.</p>
        <div className="flex gap-2">
          <input
            value={riotId}
            onChange={e => setRiotId(e.target.value)}
            placeholder="NombreJugador#TAG"
            className="flex-1 bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm placeholder-valo-text/50 focus:outline-none focus:border-valo-red/50"
          />
          <button
            onClick={syncRiotId}
            disabled={syncing}
            className="bg-valo-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
        {player?.favoriteAgent && (
          <p className="text-valo-text text-xs">Agente favorito: <span className="text-white">{player.favoriteAgent}</span></p>
        )}
      </div>

      {/* BIO & COUNTRY */}
      <div className="valo-card p-5 space-y-4">
        <h2 className="text-white font-bold">✏️ Información</h2>
        <div>
          <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">País</label>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Colombia"
            className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm placeholder-valo-text/50 focus:outline-none focus:border-valo-red/50"
          />
        </div>
        <div>
          <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Cuéntales a otros jugadores sobre ti..."
            rows={3}
            className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm placeholder-valo-text/50 focus:outline-none focus:border-valo-red/50 resize-none"
          />
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {msg   && <p className="text-green-400 text-sm">{msg}</p>}
      {error && <p className="text-red-400 text-sm">❌ {error}</p>}
    </div>
  )
}
