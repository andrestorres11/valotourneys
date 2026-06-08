'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

type Member = {
  id: string
  isCapitan: boolean
  player: { id: string; gameName: string | null; tagLine: string | null; currentRank: string; username: string }
}

type FreePlayer = {
  id: string; gameName: string | null; tagLine: string | null; currentRank: string; username: string
}

type Team = {
  id: string; name: string; tag: string; logoUrl: string | null; captainId: string; members: Member[]
}

type Props = { team: Team; freePlayers: FreePlayer[] }

export function AdminTeamCard({ team, freePlayers }: Props) {
  const router = useRouter()
  const [open, setOpen]           = useState(false)
  const [editName, setEditName]   = useState(team.name)
  const [editTag, setEditTag]     = useState(team.tag)
  const [editDesc, setEditDesc]   = useState('')
  const [showEdit, setShowEdit]   = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [loading, setLoading]     = useState<string | null>(null)
  const [msg, setMsg]             = useState('')
  const [error, setError]         = useState('')

  function flash(m: string, isError = false) {
    isError ? setError(m) : setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 3000)
  }

  async function saveEdit() {
    if (!editName.trim() || !editTag.trim()) return
    setLoading('edit')
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, tag: editTag.toUpperCase().slice(0, 5) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash('✅ Equipo actualizado')
      setShowEdit(false)
      router.refresh()
    } catch (e: unknown) { flash((e as Error).message, true) }
    finally { setLoading(null) }
  }

  async function addPlayer() {
    if (!selectedPlayer) return
    setLoading('invite')
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash('✅ Jugador agregado al equipo')
      setShowInvite(false)
      setSelectedPlayer('')
      router.refresh()
    } catch (e: unknown) { flash((e as Error).message, true) }
    finally { setLoading(null) }
  }

  async function kickPlayer(playerId: string, playerName: string) {
    if (!confirm(`¿Retirar a ${playerName} del equipo?`)) return
    setLoading(playerId)
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/members/${playerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`✅ ${playerName} retirado`)
      router.refresh()
    } catch (e: unknown) { flash((e as Error).message, true) }
    finally { setLoading(null) }
  }

  async function makeCaptain(playerId: string, playerName: string) {
    if (!confirm(`¿Transferir liderazgo a ${playerName}?`)) return
    setLoading('captain_' + playerId)
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/captain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash('✅ Capitán actualizado')
      router.refresh()
    } catch (e: unknown) { flash((e as Error).message, true) }
    finally { setLoading(null) }
  }

  async function disbandTeam() {
    if (!confirm(`¿Disolver el equipo "${team.name}"? Esta acción no se puede deshacer.`)) return
    setLoading('disband')
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (e: unknown) { flash((e as Error).message, true) }
    finally { setLoading(null) }
  }

  const inp = 'w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50'
  const isFull = team.members.length >= 5

  return (
    <div className="valo-card overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-valo-card/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {team.logoUrl ? (
            <img src={team.logoUrl} alt="logo" className="w-10 h-10 rounded object-cover border border-valo-border" />
          ) : (
            <div className="w-10 h-10 rounded bg-valo-darker border border-valo-border flex items-center justify-center font-black text-valo-red">
              {team.name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{team.name}</span>
              <span className="text-xs font-mono bg-valo-border text-valo-text px-1.5 py-0.5 rounded">[{team.tag}]</span>
            </div>
            <p className="text-valo-text text-xs">{team.members.length}/5 miembros</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {msg   && <span className="text-green-400 text-xs">{msg}</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <span className="text-valo-text text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-valo-border px-5 py-4 space-y-4 animate-fade-in">

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShowEdit(!showEdit); setShowInvite(false) }}
              className="text-xs border border-valo-border text-valo-text hover:text-white px-3 py-1.5 rounded transition-all"
            >
              ✏️ Editar
            </button>
            {!isFull && (
              <button
                onClick={() => { setShowInvite(!showInvite); setShowEdit(false) }}
                className="text-xs border border-blue-500/40 text-blue-400 hover:border-blue-400 px-3 py-1.5 rounded transition-all"
              >
                + Agregar jugador
              </button>
            )}
            <button
              onClick={disbandTeam}
              disabled={loading === 'disband'}
              className="text-xs border border-red-500/30 text-red-400/70 hover:border-red-400 hover:text-red-400 px-3 py-1.5 rounded transition-all disabled:opacity-50 ml-auto"
            >
              {loading === 'disband' ? '...' : 'Disolver equipo'}
            </button>
          </div>

          {/* Edit form */}
          {showEdit && (
            <div className="bg-valo-darker rounded p-4 space-y-3 animate-fade-in">
              <p className="text-white text-sm font-semibold">Editar equipo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-valo-text text-xs block mb-1">Nombre</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="text-valo-text text-xs block mb-1">TAG (máx 5)</label>
                  <input value={editTag} onChange={e => setEditTag(e.target.value.toUpperCase().slice(0, 5))} className={inp} />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={loading === 'edit'}
                  className="bg-valo-red text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
                >
                  {loading === 'edit' ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setShowEdit(false)} className="border border-valo-border text-valo-text text-xs px-3 py-1.5 rounded hover:text-white transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Add player form */}
          {showInvite && (
            <div className="bg-valo-darker rounded p-4 space-y-3 animate-fade-in">
              <p className="text-white text-sm font-semibold">Agregar jugador al equipo</p>
              <p className="text-valo-text text-xs">
                Jugadores sin equipo disponibles: {freePlayers.length}
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedPlayer}
                  onChange={e => setSelectedPlayer(e.target.value)}
                  className={inp + ' flex-1'}
                >
                  <option value="">— Selecciona un jugador —</option>
                  {freePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.gameName ? `${p.gameName}#${p.tagLine}` : p.username} · {RANK_LABELS[p.currentRank as Rank]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPlayer}
                  disabled={!selectedPlayer || loading === 'invite'}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  {loading === 'invite' ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            {team.members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-valo-darker rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-valo-border flex items-center justify-center text-xs font-bold text-white">
                    {(m.player.gameName ?? m.player.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {m.isCapitan && <span className="text-valo-gold text-xs">👑</span>}
                      <span className="text-white text-sm">
                        {m.player.gameName ? `${m.player.gameName}#${m.player.tagLine}` : m.player.username}
                      </span>
                    </div>
                    <span className="text-valo-text text-xs">{RANK_LABELS[m.player.currentRank as Rank]}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Transfer captain */}
                  {!m.isCapitan && (
                    <button
                      onClick={() => makeCaptain(m.player.id, m.player.gameName ?? m.player.username)}
                      disabled={loading === 'captain_' + m.player.id}
                      className="text-xs border border-valo-gold/30 text-valo-gold/70 hover:border-valo-gold hover:text-valo-gold px-2 py-1 rounded transition-all disabled:opacity-40"
                      title="Hacer capitán"
                    >
                      👑
                    </button>
                  )}
                  {/* Kick */}
                  <button
                    onClick={() => kickPlayer(m.player.id, m.player.gameName ?? m.player.username)}
                    disabled={loading === m.player.id}
                    className="text-xs border border-red-500/30 text-red-400/70 hover:border-red-400 hover:text-red-400 px-2.5 py-1 rounded transition-all disabled:opacity-40"
                  >
                    {loading === m.player.id ? '...' : 'Retirar'}
                  </button>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 5 - team.members.length) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded border border-dashed border-valo-border/30">
                <div className="w-8 h-8 rounded-full border border-dashed border-valo-border/30 flex items-center justify-center text-valo-text/30 text-xs">?</div>
                <span className="text-valo-text/30 text-xs">Lugar disponible</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
