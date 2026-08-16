import type { Response as UndiciResponse } from 'undici-types'

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'

// Vercel's Fastify build environment resolves the ambient global `Response`
// type to something incomplete (missing status/ok/json/text — a stale
// @types/node in its own build sandbox, independent of this repo's actual
// tsconfig, which we can't influence). Casting through this explicit,
// self-contained type sidesteps that entirely — this is purely a TS
// type-resolution workaround, not a runtime concern: it's still Node's real
// global fetch either way.
function typedFetch(url: URL): Promise<UndiciResponse> {
  return fetch(url) as unknown as Promise<UndiciResponse>
}

// Only the fields ingestion actually reads. Polymarket's real payload has
// many more (volume, rewards, UMA bond, etc.) — deliberately not modeled.
export interface GammaMarket {
  id: string
  conditionId: string
  question: string
  sportsMarketType: string | null
  // Polymarket sometimes omits this entirely for moneyline markets rather
  // than sending `null` — treat missing and null the same way everywhere
  // this field is read.
  line: number | null | undefined
  outcomes: string // JSON-encoded string array, e.g. '["Team A","Team B"]'
  outcomePrices: string // JSON-encoded string array, e.g. '["0.42","0.58"]'
  // Already a plain float from Gamma, unlike outcomes/outcomePrices above.
  // No isPrimary/isMain flag exists on this payload — volume is the closest
  // signal to which alternate line the market has actually converged on.
  // Like `line` above, Polymarket sometimes omits this entirely (seen on
  // low-volume spreads markets) rather than sending 0 or null.
  volumeNum: number | null | undefined
  closed: boolean
  closedTime?: string
  umaResolutionStatus?: string
  // The actual game kickoff time. NOT `startDate` below, which is when the
  // market itself was opened for trading — Polymarket opens season-long
  // markets months ahead of the games they cover, so startDate is
  // consistently wrong for "when does this game happen."
  gameStartTime: string | null
}

export interface GammaEvent {
  id: string
  title: string
  startDate: string // market creation time, not game time — see GammaMarket.gameStartTime
  closed: boolean
  // Event-level rollup across all its markets — distinct from (and more
  // accurate than summing) each GammaMarket's own volumeNum. Used to rank
  // "popular" events, never in scoring. Like GammaMarket.volumeNum, can be
  // omitted by Polymarket entirely rather than sent as 0.
  volume: number | null | undefined
  markets: GammaMarket[]
}

const IN_SCOPE_MARKET_TYPES = new Set(['moneyline', 'spreads', 'totals'])

export function isInScopeMarketType(market: GammaMarket): boolean {
  return market.sportsMarketType !== null && IN_SCOPE_MARKET_TYPES.has(market.sportsMarketType)
}

export function parseOutcomes(market: GammaMarket): { names: [string, string]; prices: [number, number] } {
  const names = JSON.parse(market.outcomes) as [string, string]
  const prices = (JSON.parse(market.outcomePrices) as string[]).map(Number) as [number, number]
  return { names, prices }
}

async function gammaFetch<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(path, GAMMA_BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  const response = await typedFetch(url)
  if (!response.ok) {
    throw new Error(`Gamma API ${path} failed: ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as T
}

// Page size caps at 100 server-side regardless of requested limit —
// offset-paginate to get the full slate for a league.
export async function fetchGammaEvents(params: {
  tagSlug: string
  closed: boolean
  limit: number
  offset: number
}): Promise<GammaEvent[]> {
  return gammaFetch<GammaEvent[]>('/events', {
    tag_slug: params.tagSlug,
    closed: params.closed,
    limit: params.limit,
    offset: params.offset,
  })
}

// The batch list endpoint (`/markets?id=`) is implicitly filtered by closed
// state server-side — omitting `closed` behaves like `closed=false`, and
// there's no value that returns both open and closed markets together. The
// singular endpoint has no such filter: it returns a market as-is regardless
// of state, and 404s cleanly if the id genuinely doesn't exist. That makes it
// the only reliable way to ask "what's this market's status right now,"
// which is exactly what the resolution-recheck pass needs.
async function fetchGammaMarketById(id: string): Promise<GammaMarket | null> {
  const response = await typedFetch(new URL(`/markets/${id}`, GAMMA_BASE_URL))
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Gamma API /markets/${id} failed: ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as GammaMarket
}

// Used by the resolution-recheck pass (§6.2 of the ingestion spec) to catch
// markets that flipped to closed/resolved since they'd otherwise silently
// drop out of the closed=false discovery query. Bounded concurrency keeps
// this from firing hundreds of simultaneous requests at Gamma in one go.
const RECHECK_CONCURRENCY = 20

export async function fetchGammaMarketsByIds(ids: string[]): Promise<GammaMarket[]> {
  const results: GammaMarket[] = []
  for (let i = 0; i < ids.length; i += RECHECK_CONCURRENCY) {
    const batch = ids.slice(i, i + RECHECK_CONCURRENCY)
    const fetched = await Promise.all(batch.map(fetchGammaMarketById))
    for (const market of fetched) if (market) results.push(market)
  }
  return results
}
