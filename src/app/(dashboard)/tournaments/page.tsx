import { prisma } from '@/lib/prisma'
import { TOURNAMENT_STATUS_LABELS, GAME_MODE_LABELS, RANK_LABELS } from '@/types'
import Link from 'next/link'
import type { TournamentStatus, GameMode, Rank } from '@prisma/client'

export const metadata = { title: 'Torneos' }

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { not: 'DRAFT' } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { registrations: true } } },
  })

  const statusColor: Record<TournamentStatus, string> = {
    DRAFT:                 'bg-gray-500/20 text-gray-400',
    REGISTRATION_OPEN:     'bg-green-500/20 text-green-400',
    REGISTRATION_CLOSED:   'bg-yellow-500/20 text-yellow-400',
    IN_PROGRESS:           'bg-blue-500/20 text-blue-400',
    COMPLETED:             'bg-purple-500/20 text-purple-400',
    CANCELLED:             'bg-red-500/20 text-red-400',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <h1 className="section-heading text-2xl">Torneos</h1>

      {tournaments.length === 0 ? (
        <div className="valo-card p-12 text-center">
          <p className="text-valo-text text-lg">No hay torneos disponibles aún.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tournaments.map(t => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="valo-card p-5 hover:border-valo-red/40 transition-colors block group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-white font-bold text-lg group-hover:text-valo-red transition-colors">
                      {t.name}
                    </h2>
                    <span className={`status-badge ${statusColor[t.status]}`}>
                      {TOURNAMENT_STATUS_LABELS[t.status]}
                    </span>
                    <span className="mode-badge bg-valo-border text-valo-text">
                      {GAME_MODE_LABELS[t.gameMode as GameMode]}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-valo-text text-sm mb-3 line-clamp-1">{t.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-valo-text text-xs flex-wrap">
                    <span>
                      📊 Rango: {RANK_LABELS[t.minRank as Rank]} – {RANK_LABELS[t.maxRank as Rank]}
                    </span>
                    <span>
                      👥 {t._count.registrations}/{t.maxTeams} equipos
                    </span>
                    <span>
                      🎮 {t.teamSize}v{t.teamSize}
                    </span>
                    {t.prizePool && <span>🏅 {t.prizePool}</span>}
                  </div>
                </div>
                <span className="text-valo-red text-xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
