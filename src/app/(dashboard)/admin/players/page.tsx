import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'
import Link from 'next/link'
import { AdminPlayerActions } from './AdminPlayerActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Jugadores' }

export default async function AdminPlayersPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const players = await prisma.player.findMany({
    include: {
      user: { select: { username: true, email: true, role: true, createdAt: true } },
      teamMembers: {
        include: { team: { select: { id: true, name: true, tag: true, captainId: true } } },
      },
      freeAgentProfile: { select: { isActive: true, roles: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const total     = players.length
  const withRiot  = players.filter(p => p.riotId).length
  const inTeam    = players.filter(p => p.teamMembers.length > 0).length
  const freeAgent = players.filter(p => p.freeAgentProfile?.isActive).length

  function getRankColor(rank: Rank): string {
    const colors: Record<string, string> = {
      IRON: '#6B7280', BRONZE: '#92400E', SILVER: '#9CA3AF',
      GOLD: '#D4A84B', PLATINUM: '#06B6D4', DIAMOND: '#818CF8',
      ASCENDANT: '#10B981', IMMORTAL: '#EF4444', RADIANT: '#FBBF24',
      UNRANKED: '#4B5563',
    }
    return colors[rank.replace(/_[123]$/, '')] ?? '#4B5563'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-valo-text hover:text-white text-sm transition-colors">← Admin</Link>
        <h1 className="section-heading text-2xl">Jugadores registrados</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: total,     color: 'text-white' },
          { label: 'Con Riot ID', value: withRiot,  color: 'text-blue-400' },
          { label: 'En equipo',   value: inTeam,    color: 'text-green-400' },
          { label: 'Free Agents', value: freeAgent, color: 'text-valo-red' },
        ].map(s => (
          <div key={s.label} className="valo-card p-4">
            <p className="text-valo-text text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`font-bold text-2xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Players table */}
      <div className="valo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-valo-border bg-valo-darker">
                {['Jugador', 'Riot ID', 'Rango', 'Equipo', 'Estado', 'K/D', 'HS%', 'Registro', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-valo-text text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                const kd   = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : '—'
                const team = p.teamMembers[0]
                const isFa = p.freeAgentProfile?.isActive
                const isCaptain = team?.team.captainId === p.id

                return (
                  <tr key={p.id} className="border-b border-valo-border/40 hover:bg-valo-card/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{p.user.username}</p>
                        <p className="text-valo-text/60 text-xs truncate max-w-32">{p.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.riotId ? (
                        <span className="text-white font-mono text-xs">{p.gameName}#{p.tagLine}</span>
                      ) : (
                        <span className="text-valo-text/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: getRankColor(p.currentRank as Rank) }}>
                        {RANK_LABELS[p.currentRank as Rank]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {team ? (
                        <div className="flex items-center gap-1.5">
                          {isCaptain && <span className="text-valo-gold text-xs">👑</span>}
                          <span className="text-xs bg-valo-border px-2 py-0.5 rounded text-white whitespace-nowrap">
                            {team.team.name} [{team.team.tag}]
                          </span>
                        </div>
                      ) : (
                        <span className="text-valo-text/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${
                        isFa
                          ? 'bg-valo-red/10 text-valo-red border-valo-red/20'
                          : team
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-valo-border text-valo-text border-transparent'
                      }`}>
                        {isFa ? 'Free Agent' : team ? 'En equipo' : 'Sin equipo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">{kd}</td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {p.headshotPct > 0 ? `${Math.round(p.headshotPct)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-valo-text text-xs whitespace-nowrap">
                      {new Date(p.user.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <AdminPlayerActions
                        playerId={p.id}
                        playerName={p.gameName ?? p.user.username}
                        teamId={team?.team.id ?? null}
                        teamName={team?.team.name ?? null}
                        isCaptain={isCaptain}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
