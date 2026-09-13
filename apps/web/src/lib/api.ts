export interface MarketWithPick {
  id: string
  marketType: 'moneyline' | 'spreads' | 'totals'
  line: string | null
  outcomeAName: string
  outcomeAPrice: string
  outcomeBName: string
  outcomeBPrice: string
  volume: string
  yourPick: { outcomeIndex: number; priceAtPick: string } | null
}

export interface TeamSummary {
  name: string
  logoUrl: string | null
  color: string | null
  record: string | null
}

export interface EventWithMarkets {
  event: {
    id: string
    title: string
    startTime: string
    leagueId: string
    volume: string
    isLive: boolean
    lastSyncedAt: string
    teamA: TeamSummary
    teamB: TeamSummary
  }
  markets: MarketWithPick[]
}

export type PickOutcomeStatus = 'upcoming' | 'pending' | 'won' | 'lost'

export interface PickResult {
  pick: { id: string; outcomeIndex: number; priceAtPick: string; createdAt: string }
  market: {
    id: string
    marketType: 'moneyline' | 'spreads' | 'totals'
    line: string | null
    outcomeAName: string
    outcomeBName: string
  }
  event: {
    id: string
    title: string
    startTime: string
    leagueId: string
    teamAName: string
    teamBName: string
    teamALogoUrl: string | null
    teamAColor: string | null
    teamBLogoUrl: string | null
    teamBColor: string | null
    teamAScore: number | null
    teamBScore: number | null
  }
  status: PickOutcomeStatus
  points: number | null
}

export interface PicksStats {
  won: number
  lost: number
  pending: number
  upcoming: number
  totalPoints: number
  winRate: number | null
  brierScore: number | null
  streak: { type: 'won' | 'lost' | null; count: number }
}

export interface ListMyPicksResponse {
  picks: PickResult[]
  total: number
  page: number
  limit: number
  stats: PicksStats
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    // Fastify's JSON body parser rejects an empty body declared as JSON, so
    // only send the content-type header when there's actually a body (POST) —
    // not on bodyless requests like GET/DELETE.
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}
