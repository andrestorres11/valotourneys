import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RANK_LABELS, TOURNAMENT_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { MyInvites } from '@/components/MyInvites'
import { LiveEvents } from '@/components/LiveEvents'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [tournaments, freeAgents] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.freeAgent.count({ where: { isActive: true } }),
  ])

  const player = user.player
  const hasRiotId = !!player?.riotId

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* WELCOME */}
      <div>
        <h1 className="text-3xl font-black text-white">
          Bienvenido, <span className="text-valo-red">{user.username}</span> 👋
        </h1>
        <p className="text-valo-text mt-1">
          {hasRiotId
            ? `Conectado como ${player?.gameName}#${player?.tagLine} · ${RANK_LABELS[player!.currentRank]}`
            : 'Conecta tu Riot ID para participar en torneos'}
        </p>
      </div>

      {/* ALERT: no Riot ID */}
      {!hasRiotId && (
        <div className="valo-card-accent p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">⚠️ Completa tu perfil</p>
            <p className="text-valo-text text-sm mt-0.5">Necesitas vincular tu Riot ID para inscribirte en torneos y verificar tu rango.</p>
          </div>
          <Link href="/profile" className="bg-valo-red text-white text-sm px-4 py-2 rounded font-semibold hover:bg-valo-red/90 transition-all whitespace-nowrap ml-4">
            Ir al perfil →
          </Link>
        </div>
      )}

      {/* STATS CARDS */}
      {player && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Rango actual', value: RANK_LABELS[player.currentRank] },
            { label: 'K/D', value: player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : '0.00' },
            { label: 'Winrate', value: `${player.wins + player.losses > 0 ? Math.round((player.wins / (player.wins + player.losses)) * 100) : 0}%` },
            { label: 'HS%', value: `${Math.round(player.headshotPct)}%` },
          ].map(s => (
            <div key={s.label} className="valo-card p-4">
              <p className="text-valo-text text-xs uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-white font-bold text-xl">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* LIVE EVENTS */}
      <LiveEvents />

      {/* ACTIVE TOURNAMENTS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-heading">Torneos activos</h2>
          <Link href="/tournaments" className="text-valo-red text-sm hover:underline">Ver todos →</Link>
        </div>
        {tournaments.length === 0 ? (
          <div className="valo-card p-8 text-center text-valo-text">No hay torneos activos en este momento.</div>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="valo-card p-4 flex items-center justify-between hover:border-valo-red/40 transition-colors block">
                <div>
                  <p className="text-white font-semibold">{t.name}</p>
                  <p className="text-valo-text text-sm mt-0.5">
                    {t._count.registrations}/{t.maxTeams} equipos · {TOURNAMENT_STATUS_LABELS[t.status]}
                  </p>
                </div>
                <span className="text-valo-red text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* INVITATIONS */}
      <MyInvites />

      {/* FREE AGENTS */}
      <div className="valo-card p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">🔍 Pool de Free Agents</p>
          <p className="text-valo-text text-sm">{freeAgents} jugadores buscando equipo ahora mismo</p>
        </div>
        <Link href="/free-agents" className="border border-valo-border px-4 py-2 rounded text-sm text-white hover:border-white/40 transition-all">
          Ver jugadores
        </Link>
      </div>
    </div>
  )
}