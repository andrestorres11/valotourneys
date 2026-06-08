import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import {
  RANK_LABELS, GAME_MODE_LABELS, TOURNAMENT_STATUS_LABELS,
  PHASE_TYPE_LABELS, formatDate
} from '@/types'
import type { Rank, GameMode, TournamentStatus, PhaseType, MatchStatus } from '@prisma/client'
import { TournamentActions } from './TournamentActions'
import { PaymentUpload } from '@/components/PaymentUpload'

export const dynamic = 'force-dynamic'

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const [tournament, user] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          orderBy: { registeredAt: 'asc' },
          include: {
            team: {
              include: {
                members: {
                  include: { player: { include: { user: { select: { username: true } } } } },
                },
              },
            },
          },
        },
        phases: {
          orderBy: { order: 'asc' },
          include: {
            groups: {
              include: {
                standings: true,
                matches: true,
              },
            },
            matches: {
              orderBy: [{ bracketRound: 'asc' }, { bracketPosition: 'asc' }],
            },
          },
        },
        prizes: { orderBy: { position: 'asc' } },
      },
    }),
    getCurrentUser(),
  ])

  if (!tournament) notFound()

  const spotsLeft = tournament.maxTeams - tournament._count.registrations
  const isOpen    = tournament.status === 'REGISTRATION_OPEN'

  const userTeam = user?.player
    ? await prisma.teamMember.findFirst({
        where: { playerId: user.player.id },
        include: { team: true },
      })
    : null

  const alreadyRegistered = userTeam
    ? tournament.registrations.some(r => r.teamId === userTeam.teamId)
    : false

  const statusColors: Record<TournamentStatus, string> = {
    DRAFT:                'bg-gray-500/20 text-gray-400',
    REGISTRATION_OPEN:    'bg-green-500/20 text-green-400',
    REGISTRATION_CLOSED:  'bg-yellow-500/20 text-yellow-400',
    IN_PROGRESS:          'bg-blue-500/20 text-blue-400',
    COMPLETED:            'bg-purple-500/20 text-purple-400',
    CANCELLED:            'bg-red-500/20 text-red-400',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="valo-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`status-badge ${statusColors[tournament.status as TournamentStatus]}`}>
                {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
              </span>
              <span className="mode-badge bg-valo-border text-valo-text">
                {GAME_MODE_LABELS[tournament.gameMode as GameMode]}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-valo-text">{tournament.description}</p>
            )}
          </div>

          {isOpen && user && (
            <TournamentActions
              tournamentId={tournament.id}
              teamSize={tournament.teamSize}
              userTeam={userTeam ? { id: userTeam.teamId, name: userTeam.team.name, isCapitan: userTeam.isCapitan } : null}
              alreadyRegistered={alreadyRegistered}
              spotsLeft={spotsLeft}
              minRank={tournament.minRank as Rank}
              maxRank={tournament.maxRank as Rank}
              userPlayerId={user.player?.id ?? null}
              userRank={user.player?.currentRank ?? null}
              userRiotId={user.player?.riotId ?? null}
              userGameName={user.player?.gameName ?? null}
            />
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-valo-border">
          {[
            { label: 'Equipos',         value: `${tournament._count.registrations}/${tournament.maxTeams}` },
            { label: 'Formato',         value: `${tournament.teamSize}v${tournament.teamSize}` },
            { label: 'Rango permitido', value: `${RANK_LABELS[tournament.minRank as Rank]?.split(' ')[0]} – ${RANK_LABELS[tournament.maxRank as Rank]}` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-valo-text text-xs uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-white font-semibold text-sm">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Entry fee badge */}
        {tournament.hasPaidEntry && tournament.entryFee && (
          <div className="mt-4 pt-4 border-t border-valo-border">
            <span className="inline-flex items-center gap-2 bg-valo-gold/10 border border-valo-gold/30 text-valo-gold text-sm px-3 py-1.5 rounded">
              💳 Inscripción con pago:{' '}
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: tournament.entryCurrency ?? 'COP',
                maximumFractionDigits: 0,
              }).format(tournament.entryFee)}
            </span>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-valo-border">
          {[
            { label: 'Inicio inscripciones', value: formatDate(tournament.registrationStart) },
            { label: 'Fin inscripciones',    value: formatDate(tournament.registrationEnd) },
            { label: 'Inicio del torneo',    value: formatDate(tournament.startDate) },
          ].map(s => (
            <div key={s.label}>
              <p className="text-valo-text text-xs uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-white text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prizes */}
      {tournament.prizes.length > 0 && (
        <div className="valo-card p-5">
          <h2 className="text-white font-bold mb-4">🏅 Premios</h2>
          <div className="grid gap-3">
            {tournament.prizes.map(prize => (
              <div key={prize.id} className="flex items-center justify-between py-2 border-b border-valo-border/50 last:border-0">
                <div>
                  <span className="text-white font-semibold">{prize.label}</span>
                  {prize.description && (
                    <p className="text-valo-text text-xs mt-0.5">{prize.description}</p>
                  )}
                </div>
                <div className="text-right">
                  {prize.amount ? (
                    <span className="text-valo-gold font-bold">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: prize.currency ?? 'COP',
                        maximumFractionDigits: 0,
                      }).format(prize.amount)}
                    </span>
                  ) : (
                    <span className="text-valo-text text-sm">{prize.prizeType}</span>
                  )}
                  {prize.winnerId && (
                    <p className="text-green-400 text-xs mt-0.5">
                      🏆 {tournament.registrations.find(r => r.teamId === prize.winnerId)?.team.name ?? 'Asignado'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment upload for registered captain */}
      {userTeam && alreadyRegistered && tournament.hasPaidEntry && (() => {
        const myReg = tournament.registrations.find(r => r.teamId === userTeam.teamId)
        if (!myReg) return null
        return (
          <PaymentUpload
            tournamentId={tournament.id}
            paymentStatus={myReg.paymentStatus as any}
            paymentProofUrl={myReg.paymentProofUrl}
            rejectionReason={myReg.rejectionReason}
            entryFee={tournament.entryFee}
            currency={tournament.entryCurrency}
            paymentInstructions={tournament.paymentInstructions}
            paymentRecipient={tournament.paymentRecipient}
            teamName={userTeam.team.name}
          />
        )
      })()}

      {/* Registered teams */}
      <div>
        <h2 className="section-heading">Equipos inscritos ({tournament._count.registrations})</h2>
        {tournament.registrations.length === 0 ? (
          <div className="valo-card p-8 text-center text-valo-text">
            Aún no hay equipos inscritos. ¡Sé el primero!
          </div>
        ) : (
          <div className="grid gap-3">
            {tournament.registrations.map(reg => (
              <div key={reg.id} className="valo-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">
                      {["SOLO","DUO","TRIO"].includes(reg.team.tag)
                        ? (reg.team.members[0]?.player?.gameName ?? reg.team.name.split("_")[0])
                        : reg.team.name}
                    </span>
                    <span className="text-xs font-mono bg-valo-border text-valo-text px-1.5 py-0.5 rounded">
                      [{reg.team.tag}]
                    </span>
                    {tournament.hasPaidEntry && (
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        reg.paymentStatus === 'APPROVED'  ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                        reg.paymentStatus === 'SUBMITTED' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                        reg.paymentStatus === 'REJECTED'  ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                        'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                      }`}>
                        {reg.paymentStatus === 'APPROVED'  ? '✅ Pago aprobado' :
                         reg.paymentStatus === 'SUBMITTED' ? '📤 En revisión' :
                         reg.paymentStatus === 'REJECTED'  ? '❌ Rechazado' :
                         '⏳ Pago pendiente'}
                      </span>
                    )}
                  </div>
                  <span className="text-valo-text text-xs">{reg.team.members.length} jugadores</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {reg.team.members.map(m => (
                    <span key={m.id} className={`text-xs px-2 py-0.5 rounded ${
                      m.isCapitan ? 'text-valo-gold bg-valo-gold/10' : 'text-valo-text bg-valo-darker'
                    }`}>
                      {m.isCapitan ? '👑 ' : ''}{m.player.gameName ?? m.player.user.username}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phases & Brackets */}
      {tournament.phases.length > 0 && (
        <div>
          <h2 className="section-heading">Fases del torneo</h2>
          <div className="space-y-6">
            {tournament.phases.map(phase => (
              <div key={phase.id} className="valo-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-white font-bold">{phase.name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-valo-border text-valo-text rounded">
                    {PHASE_TYPE_LABELS[phase.type as PhaseType]}
                  </span>
                  {phase.isCompleted && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Completada</span>
                  )}
                </div>

                {phase.type === 'GROUP_STAGE' && phase.groups.map(group => (
                  <div key={group.id} className="mb-4">
                    <h4 className="text-valo-text text-sm font-semibold mb-2">{group.name}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-valo-text text-xs uppercase">
                            <th className="text-left py-1 pr-4">Equipo</th>
                            <th className="text-center px-2">PJ</th>
                            <th className="text-center px-2">G</th>
                            <th className="text-center px-2">P</th>
                            <th className="text-center px-2">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.standings
                            .sort((a, b) => b.points - a.points)
                            .map((s, idx) => {
                              const team = tournament.registrations.find(r => r.teamId === s.teamId)?.team
                              return (
                                <tr key={s.id} className={`border-t border-valo-border/50 ${idx < 2 ? 'text-white' : 'text-valo-text'}`}>
                                  <td className="py-1.5 pr-4 font-medium">{team?.name ?? '—'}</td>
                                  <td className="text-center px-2">{s.played}</td>
                                  <td className="text-center px-2 text-green-400">{s.wins}</td>
                                  <td className="text-center px-2 text-red-400">{s.losses}</td>
                                  <td className="text-center px-2 font-bold">{s.points}</td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {phase.type !== 'GROUP_STAGE' && phase.matches.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                      {Array.from(new Set(phase.matches.map(m => m.bracketRound))).sort((a,b) => (a??0)-(b??0)).map(round => (
                        <div key={round} className="flex flex-col gap-4">
                          <p className="text-valo-text text-xs uppercase tracking-wider mb-2">Ronda {round}</p>
                          {phase.matches
                            .filter(m => m.bracketRound === round)
                            .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
                            .map(match => {
                              const t1 = tournament.registrations.find(r => r.teamId === match.team1Id)?.team
                              const t2 = tournament.registrations.find(r => r.teamId === match.team2Id)?.team
                              return (
                                <div key={match.id} className="bracket-match">
                                  <div className={`bracket-team ${match.winnerId === match.team1Id ? 'winner' : 'text-valo-text'}`}>
                                    <span>{t1?.name ?? 'TBD'}</span>
                                    {match.status === 'COMPLETED' && <span className="font-mono">{match.team1Score}</span>}
                                  </div>
                                  <div className="border-t border-valo-border/40 my-1" />
                                  <div className={`bracket-team ${match.winnerId === match.team2Id ? 'winner' : 'text-valo-text'}`}>
                                    <span>{t2?.name ?? 'TBD'}</span>
                                    {match.status === 'COMPLETED' && <span className="font-mono">{match.team2Score}</span>}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {tournament.rules && (
        <div className="valo-card p-5">
          <h2 className="text-white font-bold mb-3">📋 Reglamento</h2>
          <pre className="text-valo-text text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {tournament.rules}
          </pre>
        </div>
      )}
    </div>
  )
}