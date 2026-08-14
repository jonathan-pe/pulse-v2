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

export interface EventWithMarkets {
  event: { id: string; title: string; startTime: string; leagueId: string }
  markets: MarketWithPick[]
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
