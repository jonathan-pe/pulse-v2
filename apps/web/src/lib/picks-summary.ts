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
