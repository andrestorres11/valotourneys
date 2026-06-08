'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOURNAMENT_STATUS_LABELS, GAME_MODE_LABELS } from '@/types'
import type { TournamentStatus, GameMode, PhaseType } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Phase = { id: string; type: string; name: string; order: number; isCompleted: boolean }
type Tournament = {
  id: string; name: string; status: string; gameMode: string
  maxTeams: number; teamSize: number
  _count: { registrations: number }
  phases: Phase[]
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT:               ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN:   ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['IN_PROGRESS', 'REGISTRATION_OPEN'],
  IN_PROGRESS:         ['COMPLETED', 'CANCELLED'],
  COMPLETED:           [],
  CANCELLED:           [],
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', REGISTRATION_OPEN: 'Abrir inscripciones',
  REGISTRATION_CLOSED: 'Cerrar inscripciones', IN_PROGRESS: 'Iniciar torneo',
  COMPLETED: 'Marcar completado', CANCELLED: 'Cancelar',
}

export function AdminTournamentCard({ tournament }: { tournament: Tournament }) {
  const router = useRouter()
  const [loading, setLoading]  = useState(false)
  const [genLoading, setGen]   = useState(false)
  const [error, setError]      = useState('')
  const [showGen, setShowGen]  = useState(false)
  const [groupCount, setGroupCount] = useState(4)
  const [phaseType, setPhaseType]   = useState<PhaseType>('GROUP_STAGE')

  const transitions = STATUS_TRANSITIONS[tournament.status] ?? []

  async function changeStatus(newStatus: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function generateBracket() {
    setGen(true); setError('')
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/generate-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: phaseType, groupCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowGen(false)
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setGen(false)
    }
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'text-gray-400', REGISTRATION_OPEN: 'text-green-400',
    REGISTRATION_CLOSED: 'text-yellow-400', IN_PROGRESS: 'text-blue-400',
    COMPLETED: 'text-purple-400', CANCELLED: 'text-red-400',
  }

  return (
    <div className="valo-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${statusColors[tournament.status]}`}>
              ● {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
            </span>
            <span className="text-xs text-valo-text">
              {GAME_MODE_LABELS[tournament.gameMode as GameMode]}
            </span>
          </div>
          <h3 className="text-white font-bold text-lg">{tournament.name}</h3>
          <p className="text-valo-text text-sm">
            {tournament._count.registrations}/{tournament.maxTeams} equipos · {tournament.teamSize}v{tournament.teamSize}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/admin/tournament/${tournament.id}`} className="text-valo-red text-sm hover:underline font-medium">Gestionar →</Link>
          <Link href={`/tournaments/${tournament.id}`} className="text-valo-text text-sm hover:text-white">Ver pública</Link>
        </div>
      </div>

      {/* Phases */}
      {tournament.phases.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tournament.phases.map(p => (
            <span
              key={p.id}
              className={`text-xs px-2 py-0.5 rounded border ${
                p.isCompleted
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-valo-border text-valo-text'
              }`}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">❌ {error}</p>}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap items-center pt-1 border-t border-valo-border/50">
        {/* Status transitions */}
        {transitions.map(next => (
          <button
            key={next}
            onClick={() => changeStatus(next)}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded font-medium transition-all disabled:opacity-50 ${
              next === 'CANCELLED'
                ? 'border border-red-500/40 text-red-400 hover:border-red-400'
                : 'bg-valo-red/90 text-white hover:bg-valo-red'
            }`}
          >
            {STATUS_LABELS[next] ?? next}
          </button>
        ))}

        {/* Generate bracket - only when registration closed or in progress */}
        {(tournament.status === 'REGISTRATION_CLOSED' || tournament.status === 'IN_PROGRESS') && (
          <button
            onClick={() => setShowGen(!showGen)}
            className="text-xs px-3 py-1.5 rounded border border-valo-border text-valo-text hover:text-white hover:border-white/40 transition-all"
          >
            🏆 Generar fase
          </button>
        )}
      </div>

      {/* Bracket generator */}
      {showGen && (
        <div className="bg-valo-darker rounded p-4 space-y-3 animate-fade-in">
          <p className="text-white text-sm font-semibold">Generar nueva fase</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-valo-text text-xs block mb-1">Tipo de fase</label>
              <select
                value={phaseType}
                onChange={e => setPhaseType(e.target.value as PhaseType)}
                className="w-full bg-valo-card border border-valo-border rounded px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                <option value="GROUP_STAGE">Fase de grupos</option>
                <option value="QUARTERFINALS">Cuartos de final</option>
                <option value="SEMIFINALS">Semifinales</option>
                <option value="FINALS">Final</option>
                <option value="GRAND_FINALS">Gran Final</option>
              </select>
            </div>
            {phaseType === 'GROUP_STAGE' && (
              <div>
                <label className="text-valo-text text-xs block mb-1">Número de grupos</label>
                <input
                  type="number"
                  value={groupCount}
                  onChange={e => setGroupCount(parseInt(e.target.value))}
                  min={2} max={8}
                  className="w-full bg-valo-card border border-valo-border rounded px-2 py-1.5 text-white text-xs focus:outline-none"
                />
              </div>
            )}
          </div>
          <button
            onClick={generateBracket}
            disabled={genLoading}
            className="bg-valo-red text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all"
          >
            {genLoading ? 'Generando...' : 'Generar'}
          </button>
        </div>
      )}
    </div>
  )
}
