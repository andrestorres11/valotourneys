'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

type Member = {
  id: string
  isCapitan: boolean
  playerId: string
  player: {
    id: string
    gameName: string | null
    tagLine: string | null
    currentRank: string
    photoUrl: string | null
    kills: number
    deaths: number
    wins: number
    losses: number
    headshotPct: number
    favoriteAgent: string | null
    user: { username: string }
  }
}

type Team = {
  id: string
  name: string
  tag: string
  logoUrl: string | null
  description: string | null
  captainId: string
  status: string
  members: Member[]
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams]         = useState<Team[]>([])
  const [myTeam, setMyTeam]       = useState<Team | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch]       = useState('')

  // Create form
  const [name, setName]     = useState('')
  const [tag, setTag]       = useState('')
  const [desc, setDesc]     = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  // Action states
  const [acting, setActing] = useState<string | null>(null)
  const [confirmDisband, setConfirmDisband] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const [teamsRes, profileRes] = await Promise.all([
        fetch(`/api/teams${search ? `?search=${search}` : ''}`),
        fetch('/api/players/profile'),
      ])
      const teamsData   = await teamsRes.json()
      const profileData = await profileRes.json()

      const allTeams = Array.isArray(teamsData) ? teamsData : []
      setTeams(allTeams)

      if (profileData?.id) {
        setMyPlayerId(profileData.id)
        const found = allTeams.find((t: Team) =>
          t.members.some((m: Member) => m.player.id === profileData.id)
        )
        setMyTeam(found ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const isCaptain = myTeam ? myTeam.captainId === myPlayerId : false

  async function createTeam() {
    if (!name.trim() || !tag.trim()) { setError('Nombre y TAG son obligatorios'); return }
    setCreating(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tag, description: desc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`✅ Equipo "${data.name}" creado`)
      setShowCreate(false)
      setName(''); setTag(''); setDesc('')
      fetchTeams()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setCreating(false) }
  }

  async function leaveTeam() {
    if (!myTeam || !myPlayerId) return
    setActing('leave')
    try {
      const res = await fetch(`/api/teams/${myTeam.id}/members/${myPlayerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyTeam(null)
      setSuccess('Saliste del equipo.')
      fetchTeams()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setActing(null) }
  }

  async function kickMember(playerId: string, playerName: string) {
    if (!myTeam) return
    if (!confirm(`¿Expulsar a ${playerName} del equipo?`)) return
    setActing(playerId)
    try {
      const res = await fetch(`/api/teams/${myTeam.id}/members/${playerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`${playerName} fue expulsado del equipo.`)
      fetchTeams()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setActing(null) }
  }

  async function disbandTeam() {
    if (!myTeam) return
    setActing('disband')
    try {
      const res = await fetch(`/api/teams/${myTeam.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyTeam(null)
      setConfirmDisband(false)
      setSuccess('Equipo disuelto.')
      fetchTeams()
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setActing(null) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="section-heading text-2xl">Equipos</h1>
        {!myTeam && (
          <button
            onClick={() => { setShowCreate(!showCreate); setError('') }}
            className="bg-valo-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 transition-all"
          >
            {showCreate ? 'Cancelar' : '+ Crear equipo'}
          </button>
        )}
      </div>

      {success && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded px-4 py-2">{success}</p>}
      {error   && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-4 py-2">❌ {error}</p>}

      {/* MY TEAM PANEL */}
      {myTeam && (
        <div className="valo-card-accent p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg">{myTeam.name}</h2>
                <span className="text-xs font-mono bg-valo-border text-valo-text px-2 py-0.5 rounded">[{myTeam.tag}]</span>
                {isCaptain && <span className="text-xs bg-valo-gold/20 text-valo-gold border border-valo-gold/30 px-2 py-0.5 rounded">👑 Capitán</span>}
              </div>
              {myTeam.description && <p className="text-valo-text text-sm mt-0.5">{myTeam.description}</p>}
            </div>
            <div className="flex gap-2">
              {isCaptain ? (
                <button
                  onClick={() => setConfirmDisband(true)}
                  className="text-xs border border-red-500/40 text-red-400 px-3 py-1.5 rounded hover:border-red-400 transition-all"
                >
                  Disolver equipo
                </button>
              ) : (
                <button
                  onClick={leaveTeam}
                  disabled={acting === 'leave'}
                  className="text-xs border border-red-500/40 text-red-400 px-3 py-1.5 rounded hover:border-red-400 transition-all disabled:opacity-50"
                >
                  {acting === 'leave' ? 'Saliendo...' : 'Salir del equipo'}
                </button>
              )}
            </div>
          </div>

          {/* Disband confirm */}
          {confirmDisband && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 space-y-2 animate-fade-in">
              <p className="text-red-400 text-sm font-semibold">⚠️ ¿Seguro que quieres disolver el equipo?</p>
              <p className="text-red-300/70 text-xs">Todos los miembros serán removidos. Esta acción no se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  onClick={disbandTeam}
                  disabled={acting === 'disband'}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-1.5 rounded font-semibold disabled:opacity-50"
                >
                  {acting === 'disband' ? 'Disolviendo...' : 'Sí, disolver'}
                </button>
                <button onClick={() => setConfirmDisband(false)} className="border border-valo-border text-valo-text text-xs px-3 py-1.5 rounded hover:text-white transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            <p className="text-valo-text text-xs uppercase tracking-wider">{myTeam.members.length}/5 miembros</p>
            {myTeam.members.map(m => {
              const kd = m.player.deaths > 0 ? (m.player.kills / m.player.deaths).toFixed(2) : '—'
              const wr = (m.player.wins + m.player.losses) > 0
                ? Math.round((m.player.wins / (m.player.wins + m.player.losses)) * 100) : 0
              const isMe = m.player.id === myPlayerId

              return (
                <div key={m.id} className={`flex items-center justify-between p-3 rounded ${isMe ? 'bg-valo-red/10 border border-valo-red/20' : 'bg-valo-darker'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-valo-border flex items-center justify-center text-xs font-bold text-white">
                      {(m.player.gameName ?? m.player.user.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {m.isCapitan && <span className="text-valo-gold text-xs">👑</span>}
                        <span className="text-white text-sm font-medium">
                          {m.player.gameName ? `${m.player.gameName}#${m.player.tagLine}` : m.player.user.username}
                        </span>
                        {isMe && <span className="text-xs text-valo-red">(tú)</span>}
                      </div>
                      <span className="text-valo-text text-xs">{RANK_LABELS[m.player.currentRank as Rank]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-valo-text space-y-0.5 hidden sm:block">
                      <p>K/D <span className="text-white font-mono">{kd}</span></p>
                      <p>WR <span className="text-white font-mono">{wr}%</span></p>
                    </div>
                    {/* Captain can kick non-captain members */}
                    {isCaptain && !isMe && !m.isCapitan && (
                      <button
                        onClick={() => kickMember(m.player.id, m.player.gameName ?? m.player.user.username)}
                        disabled={acting === m.player.id}
                        className="text-xs border border-red-500/30 text-red-400/70 hover:border-red-400 hover:text-red-400 px-2 py-1 rounded transition-all disabled:opacity-40"
                        title="Expulsar del equipo"
                      >
                        {acting === m.player.id ? '...' : 'Expulsar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 5 - myTeam.members.length) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded border border-dashed border-valo-border/40">
                <div className="w-8 h-8 rounded-full border border-dashed border-valo-border flex items-center justify-center text-valo-text/30 text-xs">?</div>
                <span className="text-valo-text/30 text-sm">Lugar disponible</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && !myTeam && (
        <div className="valo-card p-5 space-y-4 animate-fade-in">
          <h2 className="text-white font-bold">Crear nuevo equipo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Team Liquid"
                className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50" />
            </div>
            <div>
              <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">TAG (máx 5) *</label>
              <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().slice(0, 5))} placeholder="TL"
                className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50" />
            </div>
          </div>
          <div>
            <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Sobre tu equipo..."
              className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50 resize-none" />
          </div>
          <button onClick={createTeam} disabled={creating}
            className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all">
            {creating ? 'Creando...' : 'Crear equipo'}
          </button>
        </div>
      )}

      {/* All teams */}
      <div>
        <h2 className="section-heading text-lg">Todos los equipos</h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar equipos..."
          className="w-full bg-valo-card border border-valo-border rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-valo-red/50 mb-4" />

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="valo-card h-20 shimmer rounded-lg" />)}</div>
        ) : teams.filter(t => t.status === 'ACTIVE').length === 0 ? (
          <div className="valo-card p-8 text-center text-valo-text">No hay equipos activos.</div>
        ) : (
          <div className="grid gap-3">
            {teams.filter(t => t.status === 'ACTIVE').map(team => (
              <div key={team.id} className={`valo-card p-4 transition-colors ${team.id === myTeam?.id ? 'border-valo-red/30' : 'hover:border-valo-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{team.name}</h3>
                      <span className="text-xs font-mono bg-valo-border text-valo-text px-1.5 py-0.5 rounded">[{team.tag}]</span>
                      {team.id === myTeam?.id && <span className="text-xs text-valo-red font-medium">Mi equipo</span>}
                    </div>
                    {team.description && <p className="text-valo-text text-xs mt-0.5">{team.description}</p>}
                  </div>
                  <span className="text-valo-text text-xs">{team.members.length}/5</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.map(m => (
                    <span key={m.id} className={`text-xs px-2 py-0.5 rounded ${m.isCapitan ? 'text-valo-gold bg-valo-gold/10' : 'text-valo-text bg-valo-darker'}`}>
                      {m.isCapitan ? '👑 ' : ''}{m.player.gameName ?? m.player.user.username}
                      <span className="opacity-50 ml-1">{RANK_LABELS[m.player.currentRank as Rank]?.split(' ')[0]}</span>
                    </span>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - team.members.length) }).map((_, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded border border-dashed border-valo-border/30 text-valo-text/30">vacante</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
