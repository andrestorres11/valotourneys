import type { HenrikPlayer } from '@/types'

const HENRIK_BASE = 'https://api.henrikdev.xyz/valorant'
const API_KEY = process.env.HENRIK_API_KEY!

const headers = {
  'Authorization': API_KEY,
  'Content-Type': 'application/json',
}

// Map Henrik rank strings to our Rank enum
const RANK_MAP: Record<string, string> = {
  'Iron 1': 'IRON_1', 'Iron 2': 'IRON_2', 'Iron 3': 'IRON_3',
  'Bronze 1': 'BRONZE_1', 'Bronze 2': 'BRONZE_2', 'Bronze 3': 'BRONZE_3',
  'Silver 1': 'SILVER_1', 'Silver 2': 'SILVER_2', 'Silver 3': 'SILVER_3',
  'Gold 1': 'GOLD_1', 'Gold 2': 'GOLD_2', 'Gold 3': 'GOLD_3',
  'Platinum 1': 'PLATINUM_1', 'Platinum 2': 'PLATINUM_2', 'Platinum 3': 'PLATINUM_3',
  'Diamond 1': 'DIAMOND_1', 'Diamond 2': 'DIAMOND_2', 'Diamond 3': 'DIAMOND_3',
  'Ascendant 1': 'ASCENDANT_1', 'Ascendant 2': 'ASCENDANT_2', 'Ascendant 3': 'ASCENDANT_3',
  'Immortal 1': 'IMMORTAL_1', 'Immortal 2': 'IMMORTAL_2', 'Immortal 3': 'IMMORTAL_3',
  'Radiant': 'RADIANT',
  'Unranked': 'UNRANKED',
}

export function mapRank(rankStr: string | null | undefined): string {
  if (!rankStr) return 'UNRANKED'
  return RANK_MAP[rankStr] ?? 'UNRANKED'
}

export async function fetchPlayerAccount(gameName: string, tagLine: string) {
  const res = await fetch(
    `${HENRIK_BASE}/v1/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers, next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

export async function fetchPlayerMMR(gameName: string, tagLine: string, region = 'na') {
  const res = await fetch(
    `${HENRIK_BASE}/v2/mmr/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers, next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

export async function fetchPlayerMatches(gameName: string, tagLine: string, region = 'na', size = 10) {
  const res = await fetch(
    `${HENRIK_BASE}/v3/matches/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?mode=competitive&size=${size}`,
    { headers, next: { revalidate: 300 } }
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function getFullPlayerStats(gameName: string, tagLine: string, region = 'na'): Promise<HenrikPlayer | null> {
  try {
    const [account, mmr, matches] = await Promise.all([
      fetchPlayerAccount(gameName, tagLine),
      fetchPlayerMMR(gameName, tagLine, region),
      fetchPlayerMatches(gameName, tagLine, region, 10),
    ])

    if (!account) return null

    // Aggregate stats from matches
    let kills = 0, deaths = 0, assists = 0, wins = 0, losses = 0
    let headshots = 0, totalShots = 0
    const agentCount: Record<string, number> = {}

    const seen = new Set<string>()
    for (const match of matches) {
      if (seen.has(match.metadata?.matchid)) continue
      seen.add(match.metadata?.matchid)

      const allPlayers = match.players?.all_players ?? []
      const me = allPlayers.find(
        (p: { name: string; tag: string }) =>
          p.name?.toLowerCase() === gameName.toLowerCase() &&
          p.tag?.toLowerCase() === tagLine.toLowerCase()
      )
      if (!me) continue

      kills   += me.stats?.kills   ?? 0
      deaths  += me.stats?.deaths  ?? 0
      assists += me.stats?.assists  ?? 0
      headshots  += me.stats?.headshots ?? 0
      totalShots += (me.stats?.headshots ?? 0) + (me.stats?.bodyshots ?? 0) + (me.stats?.legshots ?? 0)

      const agent = me.character
      if (agent) agentCount[agent] = (agentCount[agent] ?? 0) + 1

      // Check win/loss
      const myTeam = me.team?.toLowerCase()
      const winnerTeam = match.teams?.red?.has_won ? 'red' : 'blue'
      if (myTeam === winnerTeam) wins++
      else losses++
    }

    const favoriteAgent = Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const headshotPct = totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0

    const currentRankStr = mmr?.current_data?.currenttierpatched ?? 'Unranked'
    const peakRankStr    = mmr?.highest_rank?.patched_tier ?? 'Unranked'

    return {
      name: account.name,
      tag:  account.tag,
      currentRank:   mapRank(currentRankStr),
      peakRank:      mapRank(peakRankStr),
      kills, deaths, assists, wins, losses,
      headshotPct,
      favoriteAgent: favoriteAgent ?? 'Desconocido',
    }
  } catch (err) {
    console.error('[Henrik] Error fetching player stats:', err)
    return null
  }
}
