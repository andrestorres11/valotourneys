import { prisma } from '@/lib/prisma'
import { GAME_MODE_LABELS } from '@/types'
import type { GameMode, MatchStatus } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function LiveEvents() {
  // Get tournaments IN_PROGRESS with active matches
  const tournaments = await prisma.tournament.findMany({
    where: { status: 'IN_PROGRESS' },
    include: {
      phases: {
        where: { isCompleted: false },
        orderBy: { order: 'asc' },
        take: 1,
        include: {
          matches: {
            where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] } },
            orderBy: [{ bracketRound: 'asc' }, { bracketPosition: 'asc' }],
            take: 6,
          },
          groups: {
            include: {
              matches: {
                where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] } },
                take: 4,
              },
            },
          },
        },
      },
      registrations: {
        include: { team: { select: { id: true, name: true, tag: true } } },
      },
    },
    take: 3,
  })

  // Also get recently completed matches (last 2h)
  const recentCompleted = await prisma.match.findMany({
    where: {
      status: 'COMPLETED',
      playedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    include: {
      phase: {
        include: {
          tournament: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { playedAt: 'desc' },
    take: 5,
  })

  if (tournaments.length === 0 && recentCompleted.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="section-heading">🔴 En vivo</h2>

      {tournaments.map(tournament => {
        const phase    = tournament.phases[0]
        const teamMap  = Object.fromEntries(tournament.registrations.map(r => [r.team.id, r.team]))

        // Gather all matches from phase
        const matches = phase
          ? [
              ...phase.matches,
              ...phase.groups.flatMap(g => g.matches),
            ]
          : []

        return (
          <div key={tournament.id} className="valo-card overflow-hidden">
            {/* Tournament header */}
            <div className="px-4 py-3 bg-valo-red/10 border-b border-valo-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-valo-red animate-pulse" />
                <Link href={`/tournaments/${tournament.id}`} className="text-white font-bold hover:text-valo-red transition-colors">
                  {tournament.name}
                </Link>
                <span className="text-xs text-valo-text bg-valo-border px-2 py-0.5 rounded">
                  {GAME_MODE_LABELS[tournament.gameMode as GameMode]}
                </span>
              </div>
              {phase && (
                <span className="text-valo-text text-xs">{phase.name}</span>
              )}
            </div>

            {/* Matches */}
            <div className="divide-y divide-valo-border/50">
              {matches.length === 0 ? (
                <div className="px-4 py-3 text-valo-text text-sm">Próximos partidos por anunciar...</div>
              ) : (
                matches.map(match => {
                  const t1      = match.team1Id ? teamMap[match.team1Id] : null
                  const t2      = match.team2Id ? teamMap[match.team2Id] : null
                  const isLive  = match.status === 'IN_PROGRESS'
                  const isDone  = match.status === 'COMPLETED'

                  return (
                    <div key={match.id} className={`px-4 py-3 flex items-center gap-3 ${isLive ? 'bg-valo-red/5' : ''}`}>
                      {/* Status indicator */}
                      <div className="w-14 shrink-0 text-center">
                        {isLive ? (
                          <span className="text-xs font-bold text-valo-red flex items-center gap-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-valo-red animate-pulse" />
                            LIVE
                          </span>
                        ) : isDone ? (
                          <span className="text-xs text-valo-text">FIN</span>
                        ) : (
                          <span className="text-xs text-valo-text">
                            {match.scheduledAt
                              ? new Date(match.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                              : 'Próximo'}
                          </span>
                        )}
                      </div>

                      {/* Team 1 */}
                      <div className={`flex-1 text-right text-sm font-semibold truncate ${
                        isDone && match.winnerId === match.team1Id ? 'text-white' : 'text-valo-text'
                      }`}>
                        {t1 ? (
                          <span>
                            {['SOLO','DUO','TRIO'].includes(t1.tag) ? t1.name.split('_')[0] : t1.name}
                            <span className="font-mono text-xs ml-1 opacity-50">[{t1.tag}]</span>
                          </span>
                        ) : 'TBD'}
                      </div>

                      {/* Score */}
                      <div className="shrink-0 text-center min-w-[60px]">
                        {isDone || isLive ? (
                          <span className="font-mono font-bold text-white text-sm">
                            {match.team1Score} – {match.team2Score}
                          </span>
                        ) : (
                          <span className="text-valo-text text-sm">vs</span>
                        )}
                      </div>

                      {/* Team 2 */}
                      <div className={`flex-1 text-left text-sm font-semibold truncate ${
                        isDone && match.winnerId === match.team2Id ? 'text-white' : 'text-valo-text'
                      }`}>
                        {t2 ? (
                          <span>
                            <span className="font-mono text-xs mr-1 opacity-50">[{t2.tag}]</span>
                            {['SOLO','DUO','TRIO'].includes(t2.tag) ? t2.name.split('_')[0] : t2.name}
                          </span>
                        ) : 'TBD'}
                      </div>

                      {/* Winner badge */}
                      {isDone && match.winnerId && (
                        <div className="shrink-0 w-16 text-right">
                          <span className="text-xs text-valo-gold">🏆</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}

      {/* Recently completed */}
      {recentCompleted.length > 0 && (
        <div className="valo-card overflow-hidden">
          <div className="px-4 py-3 border-b border-valo-border">
            <span className="text-valo-text text-sm font-semibold">⏱ Resultados recientes</span>
          </div>
          <div className="divide-y divide-valo-border/50">
            {recentCompleted.map(match => (
              <div key={match.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="text-valo-text text-xs truncate">
                  {match.phase.tournament.name}
                </span>
                <span className="font-mono text-white text-sm font-bold shrink-0">
                  {match.team1Score} – {match.team2Score}
                </span>
                <span className="text-valo-text/60 text-xs shrink-0">
                  {match.playedAt
                    ? `hace ${Math.round((Date.now() - new Date(match.playedAt).getTime()) / 60000)}min`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}