import type { PickResult } from '@/lib/api'

export interface PicksSummary {
  totalPoints: number
  won: number
  lost: number
}

export function summarizePicks(picks: PickResult[]): PicksSummary {
  const totalPoints = picks.reduce((sum, p) => sum + (p.points ?? 0), 0)
  const won = picks.filter((p) => p.status === 'won').length
  const lost = picks.filter((p) => p.status === 'lost').length
  return { totalPoints, won, lost }
}

export function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : ''
  return `${sign}${points.toFixed(1)}`
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// Shared by the picks table's date column and the points-over-time chart's
// axis/tooltip — one "short month/day" formatting rule for both rather than
// two independent Intl.DateTimeFormat instances that could drift.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
