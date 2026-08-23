import type { PickOutcomeStatus } from '@/lib/api'

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 50

export type SortField = 'date' | 'points' | 'odds'
export type SortDir = 'asc' | 'desc'
export type MarketType = 'moneyline' | 'spreads' | 'totals'

// All fields optional so routes can `<Link to="/picks">` without supplying
// search — validateMyPicksSearch below always fills concrete defaults for
// page/limit/sortBy/sortDir at runtime regardless.
export interface MyPicksSearch {
  page?: number
  limit?: number
  sortBy?: SortField
  sortDir?: SortDir
  status?: PickOutcomeStatus
  league?: string
  marketType?: MarketType
  from?: string
  to?: string
}

const SORT_FIELDS: SortField[] = ['date', 'points', 'odds']
const STATUSES: PickOutcomeStatus[] = ['upcoming', 'pending', 'won', 'lost']
const MARKET_TYPES: MarketType[] = ['moneyline', 'spreads', 'totals']

// TanStack Router's validateSearch — keeps page/sort/filters as the URL's
// source of truth so they survive refresh and the back button.
export function validateMyPicksSearch(search: Record<string, unknown>): MyPicksSearch {
  const page = Math.max(1, Number(search.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(search.limit) || DEFAULT_LIMIT))
  const sortBy = SORT_FIELDS.includes(search.sortBy as SortField) ? (search.sortBy as SortField) : 'date'
  const sortDir = search.sortDir === 'asc' ? 'asc' : 'desc'
  const status = STATUSES.includes(search.status as PickOutcomeStatus) ? (search.status as PickOutcomeStatus) : undefined
  const marketType = MARKET_TYPES.includes(search.marketType as MarketType) ? (search.marketType as MarketType) : undefined
  const league = typeof search.league === 'string' ? search.league : undefined
  const from = typeof search.from === 'string' ? search.from : undefined
  const to = typeof search.to === 'string' ? search.to : undefined

  return { page, limit, sortBy, sortDir, status, league, marketType, from, to }
}

export function myPicksSearchToQueryString(search: MyPicksSearch): string {
  const params = new URLSearchParams()
  params.set('page', String(search.page ?? 1))
  params.set('limit', String(search.limit ?? DEFAULT_LIMIT))
  params.set('sort', `${search.sortBy ?? 'date'}:${search.sortDir ?? 'desc'}`)
  if (search.status) params.set('status', search.status)
  if (search.league) params.set('league', search.league)
  if (search.marketType) params.set('marketType', search.marketType)
  if (search.from) params.set('from', search.from)
  if (search.to) params.set('to', search.to)
  return params.toString()
}
