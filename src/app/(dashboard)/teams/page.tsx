'use client'

import { useState, useEffect, useCallback } from 'react'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

export const dynamic = 'force-dynamic'

type Member = {
  id: string
  isCapitan: boolean
  player: {
    gameName: string | null
    tagLine: string | null
    currentRank: string
    photoUrl: string | null
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
  members: Member[]
}

export default function TeamsPage() {
  const [teams, setTeams]       = useState<Team[]>([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch]     = useState('')

  // Create form state
  const [name, setName]         = useState('')
  const [tag, setTag]           = useState('')
  const [desc, setDesc]         = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teams${search ? `?search=${search}` : ''}`)
      const data = await res.json()
      setTeams(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchTeams() }, [fetchTeams])

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
      setSuccess(`✅ Equipo "${data.name}" creado exitosamente`)
      setShowCreate(false)
      setName(''); setTag(''); setDesc('')
      fetchTeams()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="section-heading text-2xl">Equipos</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setError('') }}
          className="bg-valo-red text-white px-4 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 transition-all"
        >
          {showCreate ? 'Cancelar' : '+ Crear equipo'}
        </button>
      </div>

      {success && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded px-4 py-2">{success}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="valo-card p-5 space-y-4 animate-fade-in">
          <h2 className="text-white font-bold">Crear nuevo equipo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Nombre del equipo *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Team Liquid"
                className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50"
              />
            </div>
            <div>
              <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">TAG (máx 5 chars) *</label>
              <input
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="TL"
                className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50"
              />
            </div>
          </div>
          <div>
            <label className="text-valo-text text-xs uppercase tracking-wider block mb-1.5">Descripción</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Cuéntanos sobre tu equipo..."
              rows={2}
              className="w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50 resize-none"
            />
          </div>
          {error && <p className="text-red-400 text-sm">❌ {error}</p>}
          <button
            onClick={createTeam}
            disabled={creating}
            className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
          >
            {creating ? 'Creando...' : 'Crear equipo'}
          </button>
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Buscar equipos..."
        className="w-full bg-valo-card border border-valo-border rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-valo-red/50"
      />

      {/* Teams list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="valo-card h-24 shimmer rounded-lg" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="valo-card p-12 text-center">
          <p className="text-valo-text text-lg">No se encontraron equipos.</p>
          <p className="text-valo-text/60 text-sm mt-1">¡Crea el primero!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map(team => (
            <div key={team.id} className="valo-card p-5 hover:border-valo-red/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg">{team.name}</h2>
                    <span className="text-xs font-mono bg-valo-border text-valo-text px-2 py-0.5 rounded">
                      [{team.tag}]
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-valo-text text-sm mt-0.5">{team.description}</p>
                  )}
                </div>
                <span className="text-valo-text text-sm">{team.members.length}/5 jugadores</span>
              </div>

              {/* Members */}
              <div className="flex flex-wrap gap-2">
                {team.members.map(m => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs ${
                      m.isCapitan ? 'bg-valo-gold/20 text-valo-gold border border-valo-gold/30' : 'bg-valo-darker text-valo-text'
                    }`}
                  >
                    {m.isCapitan && <span>👑</span>}
                    <span>{m.player.gameName ?? m.player.user.username}</span>
                    <span className="opacity-60">{RANK_LABELS[m.player.currentRank as Rank]?.split(' ')[0]}</span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - team.members.length) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-valo-darker/50 text-valo-text/30 border border-dashed border-valo-border/40">
                    Vacante
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
