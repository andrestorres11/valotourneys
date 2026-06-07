import type { Rank, GameMode, TournamentStatus, PhaseType, MatchStatus, Role, TeamStatus } from '@prisma/client'

// ─── RE-EXPORTS ──────────────────────────────────────────────────────────────
export type { Rank, GameMode, TournamentStatus, PhaseType, MatchStatus, Role, TeamStatus }

// ─── RANK UTILITIES ──────────────────────────────────────────────────────────
export const RANK_ORDER: Record<Rank, number> = {
  UNRANKED: 0,
  IRON_1: 1, IRON_2: 2, IRON_3: 3,
  BRONZE_1: 4, BRONZE_2: 5, BRONZE_3: 6,
  SILVER_1: 7, SILVER_2: 8, SILVER_3: 9,
  GOLD_1: 10, GOLD_2: 11, GOLD_3: 12,
  PLATINUM_1: 13, PLATINUM_2: 14, PLATINUM_3: 15,
  DIAMOND_1: 16, DIAMOND_2: 17, DIAMOND_3: 18,
  ASCENDANT_1: 19, ASCENDANT_2: 20, ASCENDANT_3: 21,
  IMMORTAL_1: 22, IMMORTAL_2: 23, IMMORTAL_3: 24,
  RADIANT: 25,
}

export const RANK_LABELS: Record<Rank, string> = {
  UNRANKED: 'Sin rango',
  IRON_1: 'Hierro 1', IRON_2: 'Hierro 2', IRON_3: 'Hierro 3',
  BRONZE_1: 'Bronce 1', BRONZE_2: 'Bronce 2', BRONZE_3: 'Bronce 3',
  SILVER_1: 'Plata 1', SILVER_2: 'Plata 2', SILVER_3: 'Plata 3',
  GOLD_1: 'Oro 1', GOLD_2: 'Oro 2', GOLD_3: 'Oro 3',
  PLATINUM_1: 'Platino 1', PLATINUM_2: 'Platino 2', PLATINUM_3: 'Platino 3',
  DIAMOND_1: 'Diamante 1', DIAMOND_2: 'Diamante 2', DIAMOND_3: 'Diamante 3',
  ASCENDANT_1: 'Ascendente 1', ASCENDANT_2: 'Ascendente 2', ASCENDANT_3: 'Ascendente 3',
  IMMORTAL_1: 'Inmortal 1', IMMORTAL_2: 'Inmortal 2', IMMORTAL_3: 'Inmortal 3',
  RADIANT: 'Radiante',
}

export const RANK_COLORS: Record<string, string> = {
  IRON: '#6B7280',
  BRONZE: '#92400E',
  SILVER: '#9CA3AF',
  GOLD: '#D4A84B',
  PLATINUM: '#06B6D4',
  DIAMOND: '#818CF8',
  ASCENDANT: '#10B981',
  IMMORTAL: '#EF4444',
  RADIANT: '#FBBF24',
  UNRANKED: '#4B5563',
}

export function getRankTier(rank: Rank): string {
  return rank.replace(/_[123]$/, '')
}

export function getRankColor(rank: Rank): string {
  const tier = getRankTier(rank)
  return RANK_COLORS[tier] ?? '#4B5563'
}

export function isRankInRange(rank: Rank, min: Rank, max: Rank): boolean {
  return RANK_ORDER[rank] >= RANK_ORDER[min] && RANK_ORDER[rank] <= RANK_ORDER[max]
}

// ─── GAME MODES ──────────────────────────────────────────────────────────────
export const GAME_MODE_LABELS: Record<GameMode, string> = {
  COMPETITIVE: 'Competitivo',
  UNRATED: 'Sin clasificar',
  SPIKE_RUSH: 'Spike Rush',
  DEATHMATCH: 'Deathmatch',
  ESCALATION: 'Escalation',
  REPLICATION: 'Replication',
}

// ─── TOURNAMENT STATUS ───────────────────────────────────────────────────────
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: 'Borrador',
  REGISTRATION_OPEN: 'Inscripciones abiertas',
  REGISTRATION_CLOSED: 'Inscripciones cerradas',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export const TOURNAMENT_STATUS_COLORS: Record<TournamentStatus, string> = {
  DRAFT: 'text-gray-400 bg-gray-400/10',
  REGISTRATION_OPEN: 'text-green-400 bg-green-400/10',
  REGISTRATION_CLOSED: 'text-yellow-400 bg-yellow-400/10',
  IN_PROGRESS: 'text-blue-400 bg-blue-400/10',
  COMPLETED: 'text-purple-400 bg-purple-400/10',
  CANCELLED: 'text-red-400 bg-red-400/10',
}

// ─── PHASE TYPES ─────────────────────────────────────────────────────────────
export const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  GROUP_STAGE: 'Fase de grupos',
  ROUND_OF_16: 'Octavos de final',
  QUARTERFINALS: 'Cuartos de final',
  SEMIFINALS: 'Semifinales',
  FINALS: 'Finales',
  GRAND_FINALS: 'Gran Final',
}

// ─── EXTENDED TYPES ──────────────────────────────────────────────────────────
export type PlayerWithUser = {
  id: string
  riotId: string | null
  gameName: string | null
  tagLine: string | null
  currentRank: Rank
  peakRank: Rank
  photoUrl: string | null
  bio: string | null
  country: string | null
  kills: number
  deaths: number
  assists: number
  wins: number
  losses: number
  headshotPct: number
  favoriteAgent: string | null
  user: { username: string; email: string }
}

export type TeamWithMembers = {
  id: string
  name: string
  tag: string
  logoUrl: string | null
  description: string | null
  status: TeamStatus
  captainId: string
  members: Array<{
    id: string
    isCapitan: boolean
    player: PlayerWithUser
  }>
}

export type TournamentWithDetails = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  gameMode: GameMode
  status: TournamentStatus
  minRank: Rank
  maxRank: Rank
  maxTeams: number
  teamSize: number
  registrationStart: Date | null
  registrationEnd: Date | null
  startDate: Date | null
  endDate: Date | null
  prizePool: string | null
  rules: string | null
  _count: { registrations: number }
  phases: Array<{ id: string; type: PhaseType; name: string; order: number; isCompleted: boolean }>
}

export type MatchWithTeams = {
  id: string
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  team1Score: number
  team2Score: number
  status: MatchStatus
  scheduledAt: Date | null
  bracketRound: number | null
  bracketPosition: number | null
}

// ─── API RESPONSES ───────────────────────────────────────────────────────────
export type ApiResponse<T> = {
  data?: T
  error?: string
  message?: string
}

// ─── HENRIK API TYPES ────────────────────────────────────────────────────────
export type HenrikPlayer = {
  name: string
  tag: string
  currentRank: string
  peakRank: string
  kills: number
  deaths: number
  assists: number
  wins: number
  losses: number
  headshotPct: number
  favoriteAgent: string
}
