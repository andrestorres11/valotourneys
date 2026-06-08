import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TOURNAMENT_STATUS_LABELS, GAME_MODE_LABELS } from '@/types'
import type { TournamentStatus, GameMode } from '@prisma/client'
import { AdminTournamentCard } from './AdminTournamentCard'
import { CreateTournamentForm } from './CreateTournamentForm'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { registrations: true } },
      phases: { orderBy: { order: 'asc' } },
    },
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="section-heading text-2xl">Panel de Administración</h1>
        <span className="text-xs bg-valo-red/20 text-valo-red border border-valo-red/30 px-3 py-1 rounded-full font-semibold">
          ADMIN
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Torneos totales', value: tournaments.length },
          { label: 'En curso',        value: tournaments.filter(t => t.status === 'IN_PROGRESS').length },
          { label: 'Inscripciones abiertas', value: tournaments.filter(t => t.status === 'REGISTRATION_OPEN').length },
          { label: 'Completados',     value: tournaments.filter(t => t.status === 'COMPLETED').length },
        ].map(s => (
          <div key={s.label} className="valo-card p-4">
            <p className="text-valo-text text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-white font-bold text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create tournament */}
      <div>
        <h2 className="section-heading text-xl">Crear torneo</h2>
        <CreateTournamentForm />
      </div>

      {/* Tournament list */}
      <div>
        <h2 className="section-heading text-xl">Todos los torneos</h2>
        <div className="space-y-4">
          {tournaments.map(t => (
            <AdminTournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      </div>
    </div>
  )
}
