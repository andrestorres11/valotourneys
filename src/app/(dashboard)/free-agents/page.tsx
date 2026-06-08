'use client'

import { useState, useEffect, useCallback } from 'react'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'
import { InviteButton } from '@/components/InviteButton'

export const dynamic = 'force-dynamic'

type FreeAgent = {
  id: string
  roles: string[]
  message: string | null
  player: {
    id: string
    gameName: string | null
    tagLine: string | null
    currentRank: string
    peakRank: string
    wins: number
    losses: number
    kills: number
    deaths: number
    headshotPct: number
    favoriteAgent: string | null
    country: string | null
    user: { username: string }
  }
}

const ROLE_ICONS: Record<string, string> = {
  duelist:    '⚔️',
  initiator:  '🧠',
  controller: '🌫️',
  sentinel:   '🛡️',
}

export default function FreeAgentsPage() {
  const [agents, setAgents]       = useState<FreeAgent[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [myProfile, setMyProfile] = useState<FreeAgent | null>(null)
  const [userIsCaptain, setUserIsCaptain] = useState(false)
  const [userHasTeam, setUserHasTeam]     = useState(false)

  const [roles, setRoles]     = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/free-agents')
      const data = await res.json()
      setAgents(Array.isArray(data.agents) ? data.agents : [])
      setMyProfile(data.myProfile ?? null)
      setUserIsCaptain(data.userIsCaptain ?? false)
      setUserHasTeam(data.userHasTeam ?? false)
      if (data.myProfile) {
        setRoles(data.myProfile.roles)
        setMessage(data.myProfile.message ?? '')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  function toggleRole(role: string) {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  async function saveProfile() {
    if (roles.length === 0) { setError('Selecciona al menos un rol'); return }
    setSaving(true); setError(''); setMsg('')
    try {
      const res = await fetch('/api/free-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('✅ Perfil publicado.')
      setShowForm(false)
      fetchAgents()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  async function removeProfile() {
    await fetch('/api/free-agents', { method: 'DELETE' })
    setMyProfile(null)
    setMsg('Perfil retirado del pool.')
    fetchAgents()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="section-heading text-2xl">Free Agents</h1>
        {myProfile ? (
          <div className="flex gap-2">
            <button onClick={() => setShowForm(!showForm)} className="border border-valo-border px-4 py-2 rounded text-sm text-white hover:border-white/40 transition-all">
              Editar perfil
            </button>
            <button onClick={removeProfile} className="border border-red-500/40 px-4 py-2 rounded text-sm text-red-400 hover:border-red-400 transition-all">
              Retirarme
            </button>
          </div>
        ) : (
          <button onClick={() => setShowForm(!showForm)} className="bg-valo-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 transition-all">
            {showForm ? 'Cancelar' : '+ Unirme al pool'}
          </button>
        )}
      </div>

      <p className="text-valo-text text-sm">{agents.length} jugador{agents.length !== 1 ? 'es' : ''} buscando equipo</p>

      {userIsCaptain && (
        <div className="bg-valo-red/5 border border-valo-red/20 rounded px-4 py-2.5 text-valo-red text-sm">
          👑 Eres capitán — puedes invitar jugadores directamente desde esta lista
        </div>
      )}

      {msg && <p className="text-green-400 text-sm">{msg}</p>}

      {showForm && (
        <div className="valo-card p-5 space-y-4 animate-fade-in">
          <h2 className="text-white font-bold">Tu perfil de Free Agent</h2>
          <div>
            <label className="text-valo-text text-xs uppercase tracking-wider block mb-2">Roles que juegas</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ROLE_ICONS).map(([role, icon]) => (
                <button key={role} onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded text-sm capitalize transition-all ${roles.includes(role) ? 'bg-valo-red text-white' : 'bg-valo-darker border border-valo-border text-valo-text hover:text-white'}`}>
                  {icon} {role}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Mensaje (opcional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
              placeholder="Busco equipo serio para torneos..."
              className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">❌ {error}</p>}
          <button onClick={saveProfile} disabled={saving}
            className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all">
            {saving ? 'Guardando...' : 'Publicar perfil'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">{[1,2,3].map(i => <div key={i} className="valo-card h-28 shimmer rounded-lg" />)}</div>
      ) : agents.length === 0 ? (
        <div className="valo-card p-12 text-center">
          <p className="text-valo-text text-lg">No hay free agents en el pool.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => {
            const kd = agent.player.deaths > 0 ? (agent.player.kills / agent.player.deaths).toFixed(2) : '0.00'
            const wr = (agent.player.wins + agent.player.losses) > 0
              ? Math.round((agent.player.wins / (agent.player.wins + agent.player.losses)) * 100) : 0
            const isMe = !!myProfile && agent.player.id === (myProfile as any).playerId

            return (
              <div key={agent.id} className={`valo-card p-5 transition-colors ${isMe ? 'border-valo-red/40' : 'hover:border-valo-red/20'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-white font-bold">
                        {agent.player.gameName ? `${agent.player.gameName}#${agent.player.tagLine}` : agent.player.user.username}
                      </span>
                      {isMe && <span className="text-xs bg-valo-red/20 text-valo-red px-2 py-0.5 rounded">Tú</span>}
                      <span className="text-xs px-2 py-0.5 rounded bg-valo-darker text-valo-text">
                        {RANK_LABELS[agent.player.currentRank as Rank]}
                      </span>
                      {agent.player.country && <span className="text-valo-text text-xs">{agent.player.country}</span>}
                    </div>

                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {agent.roles.map(role => (
                        <span key={role} className="text-xs px-2 py-0.5 bg-valo-red/10 text-valo-red border border-valo-red/20 rounded capitalize">
                          {ROLE_ICONS[role]} {role}
                        </span>
                      ))}
                    </div>

                    {agent.message && <p className="text-valo-text text-sm italic mb-3">"{agent.message}"</p>}

                    {/* Invite button - only for captains and not for own profile */}
                    {!isMe && (
                      <InviteButton
                        targetPlayerId={agent.player.id}
                        targetName={agent.player.gameName ?? agent.player.user.username}
                        userHasTeam={userHasTeam}
                        userIsCaptain={userIsCaptain}
                      />
                    )}
                  </div>

                  <div className="text-right text-xs text-valo-text space-y-1 shrink-0">
                    <p>K/D <span className="text-white font-mono">{kd}</span></p>
                    <p>WR <span className="text-white font-mono">{wr}%</span></p>
                    <p>HS <span className="text-white font-mono">{Math.round(agent.player.headshotPct)}%</span></p>
                    {agent.player.favoriteAgent && <p className="text-valo-text/60">{agent.player.favoriteAgent}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}