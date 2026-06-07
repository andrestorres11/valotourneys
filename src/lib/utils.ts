import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatKD(kills: number, deaths: number): string {
  if (deaths === 0) return kills.toFixed(2)
  return (kills / deaths).toFixed(2)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Generate bracket rounds given N teams
export function generateBracket(teamCount: number): number {
  return Math.ceil(Math.log2(teamCount))
}

// Generate group names (A, B, C, ...)
export function generateGroupName(index: number): string {
  return `Grupo ${String.fromCharCode(65 + index)}`
}

// Distribute teams into N groups
export function distributeIntoGroups<T>(teams: T[], groupCount: number): T[][] {
  const groups: T[][] = Array.from({ length: groupCount }, () => [])
  teams.forEach((team, i) => groups[i % groupCount].push(team))
  return groups
}
