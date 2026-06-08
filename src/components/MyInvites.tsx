'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RANK_LABELS } from '@/types'
import type { Rank } from '@prisma/client'

type Invite = {
  id: string
  message: string | null
  createdAt: string
  expiresAt: string
  team: {
    id: string
    name: string
    tag: string
    members: Array<{
      isCapitan: boolean
      player: { gameName: string | null; currentRank: string; user: { username: string } }
    }>
  }
  sender: { gameName: string | null; user: { username: string } }
}

export function MyInvites() {
  const router  = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<string | null>(null)
  const [msgs, setMsgs]       = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/teams/invite')
      .then(r => r.json())
      .then(d => { setInvites(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function respond(inviteId: string, action: 'accept' | 'decline') {
    setActing(inviteId)
    try {
      const res = await fetch(`/api/teams/invite/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgs(prev => ({ ...prev, [inviteId]: data.error }))
        return
      }
      if (action === 'accept') {
        setMsgs(prev => ({ ...prev, [inviteId]: '✅ ¡Te uniste al equipo!' }))
        setTimeout(() => router.refresh(), 1500)
      } else {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
      }
    } finally {
      setActing(null)
    }
  }

  if (loading) return null
  if (invites.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="section-heading text-lg">📨 Invitaciones pendientes</h2>
      {invites.map(invite => (
        <div key={invite.id} className="valo-card-accent p-4 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-bold">
                {invite.team.name}
                <span className="text-valo-text font-mono text-xs ml-2">[{invite.team.tag}]</span>
              </p>
              <p className="text-valo-text text-xs mt-0.5">
                Invitado por <span className="text-white">{invite.sender.gameName ?? invite.sender.user.username}</span>
              </p>
              {invite.message && (
                <p className="text-valo-text text-sm italic mt-1">"{invite.message}"</p>
              )}
            </div>
            <p className="text-valo-text text-xs shrink-0">
              Expira: {new Date(invite.expiresAt).toLocaleDateString('es-CO')}
            </p>
          </div>

          {/* Team members preview */}
          <div className="flex gap-2 flex-wrap">
            {invite.team.members.map((m, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded ${m.isCapitan ? 'text-valo-gold bg-valo-gold/10' : 'text-valo-text bg-valo-darker'}`}>
                {m.isCapitan ? '👑 ' : ''}{m.player.gameName ?? m.player.user.username}
                <span className="opacity-60 ml-1">{RANK_LABELS[m.player.currentRank as Rank]?.split(' ')[0]}</span>
              </span>
            ))}
            <span className="text-xs px-2 py-0.5 rounded border border-dashed border-valo-border text-valo-text/40">
              + Tú
            </span>
          </div>

          {msgs[invite.id] ? (
            <p className={`text-sm font-medium ${msgs[invite.id].startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {msgs[invite.id]}
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => respond(invite.id, 'accept')}
                disabled={acting === invite.id}
                className="bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
              >
                {acting === invite.id ? '...' : '✅ Aceptar'}
              </button>
              <button
                onClick={() => respond(invite.id, 'decline')}
                disabled={acting === invite.id}
                className="border border-red-500/40 text-red-400 hover:border-red-400 text-xs px-4 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
