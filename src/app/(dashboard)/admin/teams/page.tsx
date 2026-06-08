import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'
import Link from 'next/link'
import { AdminTeamCard } from './AdminTeamCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Equipos' }

export default async function AdminTeamsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const [teams, freePlayers] = await Promise.all([
    prisma.team.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          include: {
            player: {
              include: { user: { select: { username: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Players without a team
    prisma.player.findMany({
      where: { teamMembers: { none: {} } },
      include: { user: { select: { username: true } } },
      orderBy: { currentRank: 'desc' },
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-valo-text hover:text-white text-sm transition-colors">← Admin</Link>
        <h1 className="section-heading text-2xl">Gestión de equipos</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="valo-card p-4">
          <p className="text-valo-text text-xs uppercase tracking-wider mb-1">Equipos activos</p>
          <p className="text-white font-bold text-2xl">{teams.length}</p>
        </div>
        <div className="valo-card p-4">
          <p className="text-valo-text text-xs uppercase tracking-wider mb-1">Jugadores en equipo</p>
          <p className="text-white font-bold text-2xl">{teams.reduce((a, t) => a + t.members.length, 0)}</p>
        </div>
        <div className="valo-card p-4">
          <p className="text-valo-text text-xs uppercase tracking-wider mb-1">Sin equipo</p>
          <p className="text-valo-red font-bold text-2xl">{freePlayers.length}</p>
        </div>
      </div>

      {/* Teams */}
      {teams.length === 0 ? (
        <div className="valo-card p-8 text-center text-valo-text">No hay equipos activos.</div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => (
            <AdminTeamCard
              key={team.id}
              team={{
                id:        team.id,
                name:      team.name,
                tag:       team.tag,
                logoUrl:   team.logoUrl,
                captainId: team.captainId,
                members:   team.members.map(m => ({
                  id:        m.id,
                  isCapitan: m.isCapitan,
                  player: {
                    id:          m.player.id,
                    gameName:    m.player.gameName,
                    tagLine:     m.player.tagLine,
                    currentRank: m.player.currentRank,
                    username:    m.player.user.username,
                  },
                })),
              }}
              freePlayers={freePlayers.map(p => ({
                id:          p.id,
                gameName:    p.gameName,
                tagLine:     p.tagLine,
                currentRank: p.currentRank,
                username:    p.user.username,
              }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
