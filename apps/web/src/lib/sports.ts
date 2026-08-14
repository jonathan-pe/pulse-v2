export const SPORTS = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'baseball', label: 'Baseball' },
] as const

export type SportId = (typeof SPORTS)[number]['id']

export const LEAGUES = [
  { id: 'nba', label: 'NBA', sport: 'basketball' },
  { id: 'nfl', label: 'NFL', sport: 'football' },
  { id: 'nhl', label: 'NHL', sport: 'hockey' },
  { id: 'mlb', label: 'MLB', sport: 'baseball' },
  { id: 'wnba', label: 'WNBA', sport: 'basketball' },
] as const satisfies { id: string; label: string; sport: SportId }[]

export type LeagueId = (typeof LEAGUES)[number]['id']

export function isSportId(value: string): value is SportId {
  return SPORTS.some((s) => s.id === value)
}

export function findLeague(id: string) {
  return LEAGUES.find((l) => l.id === id)
}
