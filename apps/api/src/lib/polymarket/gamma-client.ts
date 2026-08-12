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

// Repeated `id=` params, not comma-joined — used for the resolution-recheck
// pass (§6.2 of the ingestion spec) to catch markets that flipped to
// closed/resolved since they'd otherwise silently drop out of the
// closed=false discovery query.
export async function fetchGammaMarketsByIds(ids: string[]): Promise<GammaMarket[]> {
  if (ids.length === 0) return []
  const url = new URL('/markets', GAMMA_BASE_URL)
  for (const id of ids) url.searchParams.append('id', id)
  const response = await typedFetch(url)
  if (!response.ok) {
    throw new Error(`Gamma API /markets failed: ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as GammaMarket[]
}
