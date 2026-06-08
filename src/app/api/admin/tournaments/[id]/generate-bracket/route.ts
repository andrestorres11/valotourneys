import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateGroupName, distributeIntoGroups } from '@/lib/utils'
import type { PhaseType } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { type, groupCount } = await req.json() as { type: PhaseType; groupCount?: number }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        registrations: { include: { team: true } },
        phases: true,
      },
    })

    if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })

    const teams = tournament.registrations.map(r => r.team)
    if (teams.length < 2) return NextResponse.json({ error: 'Se necesitan al menos 2 equipos' }, { status: 400 })

    const phaseOrder = tournament.phases.length

    if (type === 'GROUP_STAGE') {
      const numGroups = groupCount ?? Math.ceil(teams.length / 4)
      const grouped   = distributeIntoGroups(teams, numGroups)

      // Create phase first, then groups separately to avoid deep nesting type issues
      const phase = await prisma.phase.create({
        data: {
          tournamentId: params.id,
          type:         'GROUP_STAGE',
          name:         'Fase de grupos',
          order:        phaseOrder,
        },
      })

      for (let idx = 0; idx < grouped.length; idx++) {
        const groupTeams = grouped[idx]
        const group = await prisma.group.create({
          data: {
            phaseId: phase.id,
            name:    generateGroupName(idx),
            order:   idx,
          },
        })

        // Create standings
        await prisma.groupStanding.createMany({
          data: groupTeams.map(t => ({ groupId: group.id, teamId: t.id })),
        })

        // Create round-robin matches
        const matchData = buildRoundRobin(groupTeams.map(t => t.id), group.id, phase.id)
        await prisma.match.createMany({ data: matchData })
      }

      const fullPhase = await prisma.phase.findUnique({
        where: { id: phase.id },
        include: { groups: { include: { matches: true, standings: true } } },
      })

      return NextResponse.json(fullPhase, { status: 201 })
    }

    // Elimination bracket
    const rounds    = Math.ceil(Math.log2(teams.length))
    const matchData = buildEliminationMatches(teams.map(t => t.id), rounds, params.id)

    const phase = await prisma.phase.create({
      data: {
        tournamentId: params.id,
        type,
        name:  getPhaseLabel(type, teams.length),
        order: phaseOrder,
      },
    })

    await prisma.match.createMany({
      data: matchData.map(m => ({ ...m, phaseId: phase.id })),
    })

    const fullPhase = await prisma.phase.findUnique({
      where: { id: phase.id },
      include: { matches: true },
    })

    return NextResponse.json(fullPhase, { status: 201 })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
    console.error('[generate-bracket]', error)
    return NextResponse.json({ error: 'Error generando bracket' }, { status: 500 })
  }
}

function buildRoundRobin(teamIds: string[], groupId: string, phaseId: string) {
  const matches = []
  let pos = 0
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        phaseId,
        groupId,
        team1Id:         teamIds[i],
        team2Id:         teamIds[j],
        bracketRound:    1,
        bracketPosition: pos++,
      })
    }
  }
  return matches
}

function buildEliminationMatches(teamIds: string[], rounds: number, _tournamentId: string) {
  const matches: Array<{
    team1Id: string | null
    team2Id: string | null
    bracketRound: number
    bracketPosition: number
  }> = []

  let pos = 0
  for (let i = 0; i < teamIds.length; i += 2) {
    matches.push({
      team1Id:         teamIds[i]     ?? null,
      team2Id:         teamIds[i + 1] ?? null,
      bracketRound:    1,
      bracketPosition: pos++,
    })
  }

  for (let r = 2; r <= rounds; r++) {
    const count = Math.pow(2, rounds - r)
    for (let p = 0; p < count; p++) {
      matches.push({ team1Id: null, team2Id: null, bracketRound: r, bracketPosition: p })
    }
  }

  return matches
}

function getPhaseLabel(type: PhaseType, teamCount: number): string {
  const map: Partial<Record<PhaseType, string>> = {
    ROUND_OF_16:   'Octavos de final',
    QUARTERFINALS: 'Cuartos de final',
    SEMIFINALS:    'Semifinales',
    FINALS:        'Final',
    GRAND_FINALS:  'Gran Final',
  }
  return map[type] ?? `Eliminación (${teamCount} equipos)`
}