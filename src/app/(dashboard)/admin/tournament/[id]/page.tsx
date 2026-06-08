import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { TOURNAMENT_STATUS_LABELS, GAME_MODE_LABELS, RANK_LABELS } from '@/types'
import type { TournamentStatus, GameMode, Rank, PaymentStatus } from '@prisma/client'
import { AdminPaymentsPanel } from '@/components/AdminPaymentsPanel'
import { AdminPrizesManager } from '@/components/AdminPrizesManager'
import { AdminPaymentConfig } from './AdminPaymentConfig'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminTournamentDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      registrations: {
        include: { team: true },
        orderBy: { registeredAt: 'asc' },
      },
      prizes: { orderBy: { position: 'asc' } },
    },
  })
  if (!tournament) notFound()

  const teams = tournament.registrations.map(r => r.team)

  const submitted = tournament.registrations.filter(r => r.paymentStatus === 'SUBMITTED').length
  const approved  = tournament.registrations.filter(r => r.paymentStatus === 'APPROVED').length

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin" className="text-valo-text hover:text-white text-sm mt-1 transition-colors">
          ← Volver
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="text-xs font-semibold text-valo-red bg-valo-red/10 border border-valo-red/30 px-2 py-0.5 rounded">
              {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
            </span>
            <span className="text-xs text-valo-text">{GAME_MODE_LABELS[tournament.gameMode as GameMode]}</span>
          </div>
          <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
          <p className="text-valo-text text-sm mt-0.5">
            {tournament.registrations.length}/{tournament.maxTeams} equipos ·
            Rango: {RANK_LABELS[tournament.minRank as Rank]} – {RANK_LABELS[tournament.maxRank as Rank]}
          </p>
        </div>
      </div>

      {/* Payment summary badge */}
      {tournament.hasPaidEntry && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-blue-400/10 border border-blue-400/30 rounded px-3 py-1.5 text-blue-400 text-sm">
            📤 {submitted} por revisar
          </div>
          <div className="bg-green-400/10 border border-green-400/30 rounded px-3 py-1.5 text-green-400 text-sm">
            ✅ {approved} aprobados
          </div>
          <div className="bg-valo-gold/10 border border-valo-gold/30 rounded px-3 py-1.5 text-valo-gold text-sm font-semibold">
            💰 Recaudado: {new Intl.NumberFormat('es-CO', {
              style: 'currency', currency: tournament.entryCurrency ?? 'COP', maximumFractionDigits: 0,
            }).format(approved * (tournament.entryFee ?? 0))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {/* 1. Payment configuration */}
        <section>
          <h2 className="section-heading text-lg">💳 Configuración de inscripción</h2>
          <AdminPaymentConfig tournament={{
            id:                  tournament.id,
            hasPaidEntry:        tournament.hasPaidEntry,
            entryFee:            tournament.entryFee,
            entryCurrency:       tournament.entryCurrency,
            paymentInstructions: tournament.paymentInstructions,
            paymentRecipient:    tournament.paymentRecipient,
          }} />
        </section>

        {/* 2. Payments review */}
        {tournament.hasPaidEntry && (
          <section>
            <h2 className="section-heading text-lg">📋 Comprobantes de pago</h2>
            <AdminPaymentsPanel
              tournamentId={tournament.id}
              registrations={tournament.registrations.map(r => ({
                id:              r.id,
                paymentStatus:   r.paymentStatus as PaymentStatus,
                paymentProofUrl: r.paymentProofUrl,
                paymentNote:     r.paymentNote,
                rejectionReason: r.rejectionReason,
                reviewedAt:      r.reviewedAt?.toISOString() ?? null,
                registeredAt:    r.registeredAt.toISOString(),
                team:            { id: r.team.id, name: r.team.name, tag: r.team.tag },
              }))}
              entryFee={tournament.entryFee}
              currency={tournament.entryCurrency}
            />
          </section>
        )}

        {/* 3. Prizes */}
        <section>
          <h2 className="section-heading text-lg">🏅 Premios</h2>
          <AdminPrizesManager
            tournamentId={tournament.id}
            initialPrizes={tournament.prizes.map(p => ({
              id:          p.id,
              position:    p.position,
              label:       p.label,
              prizeType:   p.prizeType,
              amount:      p.amount,
              currency:    p.currency,
              description: p.description,
              winnerId:    p.winnerId,
              paidAt:      p.paidAt?.toISOString() ?? null,
            }))}
            teams={teams.map(t => ({ id: t.id, name: t.name }))}
          />
        </section>
      </div>
    </div>
  )
}
