import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { TOURNAMENT_STATUS_LABELS, GAME_MODE_LABELS, RANK_LABELS } from '@/types'
import type { TournamentStatus, GameMode, Rank, PaymentStatus } from '@prisma/client'
import { AdminPaymentsPanel } from '@/components/AdminPaymentsPanel'
import { AdminPrizesManager } from '@/components/AdminPrizesManager'
import { AdminPaymentConfig } from './AdminPaymentConfig'
import { AdminKickRegistration } from '@/components/AdminKickRegistration'
import { AdminStreamConfig } from '@/components/AdminStreamConfig'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminTournamentDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      registrations: {
        include: {
          team: {
            include: {
              members: {
                include: { player: { include: { user: { select: { username: true } } } } },
              },
            },
          },
        },
        orderBy: { registeredAt: 'asc' },
      },
      prizes: { orderBy: { position: 'asc' } },
      phases: {
        include: {
          matches: {
            orderBy: [{ bracketRound: 'asc' }, { bracketPosition: 'asc' }],
          },
          groups: { include: { matches: { orderBy: [{ bracketRound: 'asc' }] } } },
        },
      },
    },
  })
  if (!tournament) notFound()

  const teams     = tournament.registrations.map(r => r.team)
  const submitted = tournament.registrations.filter(r => r.paymentStatus === 'SUBMITTED').length
  const approved  = tournament.registrations.filter(r => r.paymentStatus === 'APPROVED').length

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin" className="text-valo-text hover:text-white text-sm mt-1 transition-colors">← Volver</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="text-xs font-semibold text-valo-red bg-valo-red/10 border border-valo-red/30 px-2 py-0.5 rounded">
              {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
            </span>
            <span className="text-xs text-valo-text">{GAME_MODE_LABELS[tournament.gameMode as GameMode]}</span>
          </div>
          <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
          <p className="text-valo-text text-sm mt-0.5">
            {tournament.registrations.length}/{tournament.maxTeams} · Rango: {RANK_LABELS[tournament.minRank as Rank]} – {RANK_LABELS[tournament.maxRank as Rank]}
          </p>
        </div>
      </div>

      {/* Payment summary */}
      {tournament.hasPaidEntry && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-blue-400/10 border border-blue-400/30 rounded px-3 py-1.5 text-blue-400 text-sm">📤 {submitted} por revisar</div>
          <div className="bg-green-400/10 border border-green-400/30 rounded px-3 py-1.5 text-green-400 text-sm">✅ {approved} aprobados</div>
          <div className="bg-valo-gold/10 border border-valo-gold/30 rounded px-3 py-1.5 text-valo-gold text-sm font-semibold">
            💰 {new Intl.NumberFormat('es-CO', { style: 'currency', currency: tournament.entryCurrency ?? 'COP', maximumFractionDigits: 0 }).format(approved * (tournament.entryFee ?? 0))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Registered teams */}
        <section>
          <h2 className="section-heading text-lg">👥 Equipos inscritos ({tournament.registrations.length})</h2>
          {tournament.registrations.length === 0 ? (
            <div className="valo-card p-6 text-center text-valo-text">Sin inscripciones aún.</div>
          ) : (
            <div className="space-y-3">
              {tournament.registrations.map((reg, idx) => {
                const isTemp     = ['SOLO','DUO','TRIO'].includes(reg.team.tag)
                const displayName = isTemp
                  ? (reg.team.members[0]?.player?.gameName ?? reg.team.name)
                  : reg.team.name

                return (
                  <div key={reg.id} className="valo-card p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-valo-text text-xs font-mono w-6">#{idx + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{displayName}</span>
                            <span className="text-xs font-mono bg-valo-border text-valo-text px-1.5 py-0.5 rounded">[{reg.team.tag}]</span>
                            {tournament.hasPaidEntry && (
                              <span className={`text-xs px-2 py-0.5 rounded border ${
                                reg.paymentStatus === 'APPROVED'  ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                reg.paymentStatus === 'SUBMITTED' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                reg.paymentStatus === 'REJECTED'  ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                              }`}>
                                {reg.paymentStatus === 'APPROVED' ? '✅ Aprobado' : reg.paymentStatus === 'SUBMITTED' ? '📤 Revisión' : reg.paymentStatus === 'REJECTED' ? '❌ Rechazado' : '⏳ Pendiente'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {reg.team.members.map(m => (
                              <span key={m.id} className={`text-xs px-2 py-0.5 rounded ${m.isCapitan ? 'text-valo-gold bg-valo-gold/10' : 'text-valo-text bg-valo-darker'}`}>
                                {m.isCapitan ? '👑 ' : ''}{m.player.gameName ?? m.player.user.username}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <AdminKickRegistration
                        tournamentId={tournament.id}
                        registrationId={reg.id}
                        teamName={displayName}
                        tag={reg.team.tag}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 2. Payment config */}
        <section>
          <h2 className="section-heading text-lg">💳 Configuración de inscripción</h2>
          <AdminPaymentConfig tournament={{
            id: tournament.id, hasPaidEntry: tournament.hasPaidEntry,
            entryFee: tournament.entryFee, entryCurrency: tournament.entryCurrency,
            paymentInstructions: tournament.paymentInstructions, paymentRecipient: tournament.paymentRecipient,
          }} />
        </section>

        {/* 3. Payments review */}
        {tournament.hasPaidEntry && (
          <section>
            <h2 className="section-heading text-lg">📋 Comprobantes de pago</h2>
            <AdminPaymentsPanel
              tournamentId={tournament.id}
              registrations={tournament.registrations.map(r => ({
                id: r.id, paymentStatus: r.paymentStatus as PaymentStatus,
                paymentProofUrl: r.paymentProofUrl, paymentNote: r.paymentNote,
                rejectionReason: r.rejectionReason, reviewedAt: r.reviewedAt?.toISOString() ?? null,
                registeredAt: r.registeredAt.toISOString(),
                team: { id: r.team.id, name: r.team.name, tag: r.team.tag },
              }))}
              entryFee={tournament.entryFee}
              currency={tournament.entryCurrency}
            />
          </section>
        )}

        {/* 4. Stream config */}
        {(tournament.status === 'IN_PROGRESS' || tournament.status === 'REGISTRATION_CLOSED') && (() => {
          const allMatches = tournament.phases.flatMap(p => [
            ...p.matches,
            ...p.groups.flatMap((g: any) => g.matches),
          ])
          const teamMap = Object.fromEntries(tournament.registrations.map((r: any) => [r.team.id, r.team]))
          return (
            <section>
              <h2 className="section-heading text-lg">📺 Streams y horarios</h2>
              <AdminStreamConfig
                tournamentId={tournament.id}
                tournamentStreamUrl={tournament.streamUrl ?? null}
                matches={allMatches.map((m: any) => ({
                  id: m.id,
                  team1Name: teamMap[m.team1Id]?.name ?? 'TBD',
                  team2Name: teamMap[m.team2Id]?.name ?? 'TBD',
                  bracketRound: m.bracketRound,
                  scheduledAt: m.scheduledAt?.toISOString() ?? null,
                  streamUrl: m.streamUrl ?? null,
                  status: m.status,
                }))}
              />
            </section>
          )
        })()}

        {/* 4. Prizes */}
        <section>
          <h2 className="section-heading text-lg">🏅 Premios</h2>
          <AdminPrizesManager
            tournamentId={tournament.id}
            initialPrizes={tournament.prizes.map(p => ({
              id: p.id, position: p.position, label: p.label, prizeType: p.prizeType,
              amount: p.amount, currency: p.currency, description: p.description,
              winnerId: p.winnerId, paidAt: p.paidAt?.toISOString() ?? null,
            }))}
            teams={teams.map(t => ({ id: t.id, name: t.name }))}
          />
        </section>
      </div>
    </div>
  )
}
