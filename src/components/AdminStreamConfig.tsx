'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Match = {
  id: string
  team1Name: string
  team2Name: string
  bracketRound: number | null
  scheduledAt: string | null
  streamUrl: string | null
  status: string
}

type Props = {
  tournamentId: string
  tournamentStreamUrl: string | null
  matches: Match[]
}

export function AdminStreamConfig({ tournamentId, tournamentStreamUrl, matches }: Props) {
  const router = useRouter()
  const [tourStream, setTourStream] = useState(tournamentStreamUrl ?? '')
  const [matchStreams, setMatchStreams] = useState<Record<string, string>>(
    Object.fromEntries(matches.map(m => [m.id, m.streamUrl ?? '']))
  )
  const [matchSchedules, setMatchSchedules] = useState<Record<string, string>>(
    Object.fromEntries(matches.map(m => [m.id, m.scheduledAt ? new Date(m.scheduledAt).toISOString().slice(0, 16) : '']))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [msgs, setMsgs]     = useState<Record<string, string>>({})

  async function saveTournamentStream() {
    setSaving('tournament')
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/stream`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl: tourStream || null }),
      })
      if (!res.ok) throw new Error()
      setMsgs(p => ({ ...p, tournament: '✅ Guardado' }))
      router.refresh()
    } catch {
      setMsgs(p => ({ ...p, tournament: '❌ Error' }))
    } finally {
      setSaving(null)
    }
  }

  async function saveMatchStream(matchId: string) {
    setSaving(matchId)
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/stream`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl:   matchStreams[matchId]   || null,
          scheduledAt: matchSchedules[matchId] || null,
        }),
      })
      if (!res.ok) throw new Error()
      setMsgs(p => ({ ...p, [matchId]: '✅ Guardado' }))
      router.refresh()
    } catch {
      setMsgs(p => ({ ...p, [matchId]: '❌ Error' }))
    } finally {
      setSaving(null)
    }
  }

  const inp = 'w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50'
  const activeMatches = matches.filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED')

  return (
    <div className="space-y-5">
      {/* Tournament general stream */}
      <div className="valo-card p-4 space-y-3">
        <p className="text-white text-sm font-semibold">📺 Stream general del torneo</p>
        <p className="text-valo-text text-xs">Link de Twitch, YouTube o cualquier plataforma donde se transmita el torneo.</p>
        <div className="flex gap-2">
          <input
            value={tourStream}
            onChange={e => setTourStream(e.target.value)}
            placeholder="https://twitch.tv/tu_canal"
            className={inp + ' flex-1'}
          />
          <button
            onClick={saveTournamentStream}
            disabled={saving === 'tournament'}
            className="bg-valo-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {saving === 'tournament' ? '...' : 'Guardar'}
          </button>
        </div>
        {msgs.tournament && <p className={`text-xs ${msgs.tournament.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msgs.tournament}</p>}
      </div>

      {/* Per-match streams */}
      {activeMatches.length > 0 && (
        <div className="space-y-3">
          <p className="text-valo-text text-xs uppercase tracking-wider font-semibold">Stream por partido</p>
          {activeMatches.map(match => (
            <div key={match.id} className="valo-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">
                    {match.team1Name} <span className="text-valo-text">vs</span> {match.team2Name}
                  </p>
                  {match.bracketRound && (
                    <p className="text-valo-text text-xs">Ronda {match.bracketRound}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  match.status === 'IN_PROGRESS' ? 'bg-valo-red/20 text-valo-red' : 'bg-valo-border text-valo-text'
                }`}>
                  {match.status === 'IN_PROGRESS' ? '🔴 En vivo' : 'Próximo'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-valo-text text-xs block mb-1">Link del stream</label>
                  <input
                    value={matchStreams[match.id] ?? ''}
                    onChange={e => setMatchStreams(p => ({ ...p, [match.id]: e.target.value }))}
                    placeholder="https://twitch.tv/..."
                    className={inp}
                  />
                </div>
                <div>
                  <label className="text-valo-text text-xs block mb-1">Hora programada</label>
                  <input
                    type="datetime-local"
                    value={matchSchedules[match.id] ?? ''}
                    onChange={e => setMatchSchedules(p => ({ ...p, [match.id]: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveMatchStream(match.id)}
                  disabled={saving === match.id}
                  className="bg-valo-red text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
                >
                  {saving === match.id ? '...' : 'Guardar'}
                </button>
                {matchStreams[match.id] && (
                  <a
                    href={matchStreams[match.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-valo-red text-xs hover:underline"
                  >
                    Ver stream →
                  </a>
                )}
                {msgs[match.id] && (
                  <p className={`text-xs ${msgs[match.id].startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                    {msgs[match.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeMatches.length === 0 && (
        <p className="text-valo-text text-sm">No hay partidos activos para configurar stream.</p>
      )}
    </div>
  )
}
