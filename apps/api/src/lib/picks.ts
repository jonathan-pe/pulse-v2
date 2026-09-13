import { and, desc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { brierScore, calculatePoints, scorePick, type PickOutcomeStatus } from '@pulse/shared'
import { getDb } from '../db/index.js'
import { event, market, pick, team } from '../db/schema.js'

const teamA = alias(team, 'pick_team_a')
const teamB = alias(team, 'pick_team_b')
const openTeamA = alias(team, 'open_team_a')
const openTeamB = alias(team, 'open_team_b')

export interface TeamSummary {
  name: string
  logoUrl: string | null
  color: string | null
  record: string | null
}

// market.status only flips when the ingestion cron notices Polymarket closed
// it, so relying on status alone would let a pick through for up to ~5
// minutes after a game has actually started. event.startTime needs no
// polling — comparing against it closes that gap regardless of cron timing.
export function marketIsOpenForPicks(
  marketRow: { status: string },
  eventRow: { startTime: Date },
  now = new Date(),
): boolean {
  if (marketRow.status !== 'scheduled') return false
  if (now >= eventRow.startTime) return false
  return true
}

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
  event: {
    id: string
    title: string
    startTime: Date
    leagueId: string
    volume: string
    isLive: boolean
    lastSyncedAt: Date
    teamA: TeamSummary
    teamB: TeamSummary
  }
  markets: MarketWithPick[]
}

// Shared by listOpenMarketsWithPicks (browsing) — userId is optional so
// signed-out visitors get the same query with yourPick always null, rather
// than a separate public endpoint duplicating this filtering.
async function fetchOpenEvents(userId: string | undefined, leagueId?: string): Promise<Map<string, EventWithMarkets>> {
  const db = getDb()
  const now = new Date()

  const rows = await db
    .select({
      event,
      market,
      pick,
      teamA: { name: openTeamA.name, logoUrl: openTeamA.logoUrl, color: openTeamA.color, record: openTeamA.record },
      teamB: { name: openTeamB.name, logoUrl: openTeamB.logoUrl, color: openTeamB.color, record: openTeamB.record },
    })
    .from(event)
    .innerJoin(market, eq(market.eventId, event.id))
    .innerJoin(openTeamA, eq(openTeamA.id, event.teamAId))
    .innerJoin(openTeamB, eq(openTeamB.id, event.teamBId))
    .leftJoin(pick, and(eq(pick.marketId, market.id), userId ? eq(pick.userId, userId) : sql`false`))
    .where(
      and(ne(event.status, 'resolved'), ne(market.status, 'resolved'), leagueId ? eq(event.leagueId, leagueId) : undefined),
    )

  // This view is for making new picks, not reviewing old ones — anything no
  // longer actionable is dropped entirely rather than shown disabled. Seeing
  // what you're already locked into is the future My Picks page's job.
  const eventsById = new Map<string, EventWithMarkets>()
  for (const row of rows) {
    if (!marketIsOpenForPicks(row.market, row.event, now)) continue

    let entry = eventsById.get(row.event.id)
    if (!entry) {
      entry = { event: { ...row.event, teamA: row.teamA, teamB: row.teamB }, markets: [] }
      eventsById.set(row.event.id, entry)
    }
    entry.markets.push({
      id: row.market.id,
      marketType: row.market.marketType,
      line: row.market.line,
      outcomeAName: row.market.outcomeAName,
      outcomeAPrice: row.market.outcomeAPrice,
      outcomeBName: row.market.outcomeBName,
      outcomeBPrice: row.market.outcomeBPrice,
      volume: row.market.volume,
      yourPick: row.pick ? { outcomeIndex: row.pick.outcomeIndex, priceAtPick: row.pick.priceAtPick } : null,
    })
  }
  return eventsById
}

export async function listOpenMarketsWithPicks(userId: string | undefined, leagueId?: string): Promise<EventWithMarkets[]> {
  const eventsById = await fetchOpenEvents(userId, leagueId)
  return [...eventsById.values()].sort((a, b) => a.event.startTime.getTime() - b.event.startTime.getTime())
}

async function loadMarketWithEvent(marketId: string) {
  const db = getDb()
  const [row] = await db
    .select({ market, event })
    .from(market)
    .innerJoin(event, eq(market.eventId, event.id))
    .where(eq(market.id, marketId))
  return row ?? null
}

export type PickMutationResult =
  | { ok: true; pick: typeof pick.$inferSelect }
  | { ok: false; status: 404 | 409; error: string }

export async function upsertPick(userId: string, marketId: string, outcomeIndex: 0 | 1): Promise<PickMutationResult> {
  const row = await loadMarketWithEvent(marketId)
  if (!row) return { ok: false, status: 404, error: 'Market not found' }
  if (!marketIsOpenForPicks(row.market, row.event)) {
    return { ok: false, status: 409, error: 'Market is locked' }
  }

  const db = getDb()
  const priceAtPick = outcomeIndex === 0 ? row.market.outcomeAPrice : row.market.outcomeBPrice
  const [saved] = await db
    .insert(pick)
    .values({ userId, marketId, outcomeIndex, priceAtPick })
    .onConflictDoUpdate({
      target: [pick.userId, pick.marketId],
      set: { outcomeIndex, priceAtPick, updatedAt: new Date() },
    })
    .returning()

  return { ok: true, pick: saved }
}

export type PickDeleteResult = { ok: true } | { ok: false; status: 404 | 409; error: string }

export async function deletePick(userId: string, marketId: string): Promise<PickDeleteResult> {
  const row = await loadMarketWithEvent(marketId)
  if (!row) return { ok: false, status: 404, error: 'Market not found' }
  if (!marketIsOpenForPicks(row.market, row.event)) {
    return { ok: false, status: 409, error: 'Market is locked' }
  }

  const db = getDb()
  await db.delete(pick).where(and(eq(pick.userId, userId), eq(pick.marketId, marketId)))
  return { ok: true }
}

// Called once a market's status flips to 'resolved' (from ingestion). Only
// touches rows still unsettled, so it's safe to call redundantly — a market
// re-observed as already-resolved on a later sync just finds nothing to do.
// Loops per-row rather than a single SQL UPDATE...CASE so the scoring math
// lives in exactly one place (@pulse/shared), not duplicated in SQL.
export async function settlePicksForMarket(marketId: string, resolvedOutcomeIndex: number): Promise<void> {
  const db = getDb()
  const unsettled = await db
    .select({ id: pick.id, outcomeIndex: pick.outcomeIndex, priceAtPick: pick.priceAtPick })
    .from(pick)
    .where(and(eq(pick.marketId, marketId), isNull(pick.settledStatus)))

  for (const row of unsettled) {
    const isCorrect = row.outcomeIndex === resolvedOutcomeIndex
    const points = calculatePoints(Number(row.priceAtPick), isCorrect)
    await db
      .update(pick)
      .set({ settledStatus: isCorrect ? 'won' : 'lost', points: String(points), settledAt: new Date() })
      .where(eq(pick.id, row.id))
  }
}

export interface PickResult {
  pick: { id: string; outcomeIndex: number; priceAtPick: string; createdAt: Date }
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
    startTime: Date
    leagueId: string
    teamAName: string
    teamBName: string
    teamALogoUrl: string | null
    teamAColor: string | null
    teamBLogoUrl: string | null
    teamBColor: string | null
    // Final score, teamA/teamB order — null until the real-world game ends,
    // independent of (and generally set before) market resolution.
    teamAScore: number | null
    teamBScore: number | null
  }
  status: PickOutcomeStatus
  points: number | null
}

export interface ListMyPicksParams {
  page: number
  limit: number
  sortBy: 'date' | 'points' | 'odds'
  sortDir: 'asc' | 'desc'
  status?: PickOutcomeStatus[]
  league?: string[]
  marketType?: Array<'moneyline' | 'spreads' | 'totals'>
  from?: Date
  to?: Date
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

export interface ListMyPicksResult {
  picks: PickResult[]
  total: number
  stats: PicksStats
}

function computeStats(results: PickResult[]): PicksStats {
  const stats: PicksStats = {
    won: 0,
    lost: 0,
    pending: 0,
    upcoming: 0,
    totalPoints: 0,
    winRate: null,
    brierScore: null,
    streak: { type: null, count: 0 },
  }

  const brierInputs: Array<{ p: number; isCorrect: boolean }> = []
  for (const result of results) {
    stats[result.status] += 1
    if (result.status === 'won' || result.status === 'lost') {
      stats.totalPoints += result.points ?? 0
      brierInputs.push({ p: Number(result.pick.priceAtPick), isCorrect: result.status === 'won' })
    }
  }

  const settled = stats.won + stats.lost
  if (settled > 0) {
    stats.winRate = stats.won / settled
    stats.brierScore = brierInputs.reduce((sum, input) => sum + brierScore(input), 0) / brierInputs.length
  }

  // results is already sorted most-recent-first when default date:desc sort
  // is in effect; streak is meaningless under other sorts so we re-derive it
  // from event.startTime regardless of the requested sort/filter order.
  const byDateDesc = [...results].sort((a, b) => b.event.startTime.getTime() - a.event.startTime.getTime())
  for (const result of byDateDesc) {
    if (result.status !== 'won' && result.status !== 'lost') continue
    if (stats.streak.type === null) {
      stats.streak = { type: result.status, count: 1 }
    } else if (stats.streak.type === result.status) {
      stats.streak.count += 1
    } else {
      break
    }
  }

  return stats
}

// Unlike listOpenMarketsWithPicks, this is the "review what happened" view —
// it includes every pick regardless of lock/resolution state. Settled picks
// read their cached settledStatus/points (written once by
// settlePicksForMarket); upcoming/pending are still scored live since they
// were never persisted (see settledStatus's column comment on `pick`). Only
// league/marketType/date can be pushed into the SQL WHERE clause; status
// filtering, points/status sorting, and all stats are derived in JS over the
// full filtered set before slicing out the requested page.
export async function listMyPicks(userId: string, params: ListMyPicksParams): Promise<ListMyPicksResult> {
  const db = getDb()
  const rows = await db
    .select({
      pick,
      market,
      event,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamALogoUrl: teamA.logoUrl,
      teamAColor: teamA.color,
      teamBLogoUrl: teamB.logoUrl,
      teamBColor: teamB.color,
    })
    .from(pick)
    .innerJoin(market, eq(pick.marketId, market.id))
    .innerJoin(event, eq(market.eventId, event.id))
    .innerJoin(teamA, eq(event.teamAId, teamA.id))
    .innerJoin(teamB, eq(event.teamBId, teamB.id))
    .where(
      and(
        eq(pick.userId, userId),
        params.league?.length ? inArray(event.leagueId, params.league) : undefined,
        params.marketType?.length ? inArray(market.marketType, params.marketType) : undefined,
        params.from ? gte(event.startTime, params.from) : undefined,
        params.to ? lte(event.startTime, params.to) : undefined,
      ),
    )
    .orderBy(desc(event.startTime))

  let results: PickResult[] = rows.map((row) => ({
    pick: row.pick,
    market: row.market,
    event: {
      ...row.event,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamALogoUrl: row.teamALogoUrl,
      teamAColor: row.teamAColor,
      teamBLogoUrl: row.teamBLogoUrl,
      teamBColor: row.teamBColor,
    },
    // Settled picks use the cached columns settlePicksForMarket() wrote;
    // upcoming/pending (settledStatus still null) are derived live since
    // they can flip every ingestion cycle and were never persisted.
    ...(row.pick.settledStatus !== null
      ? { status: row.pick.settledStatus, points: Number(row.pick.points) }
      : scorePick({
          outcomeIndex: row.pick.outcomeIndex,
          priceAtPick: Number(row.pick.priceAtPick),
          marketStatus: row.market.status,
          resolvedOutcomeIndex: row.market.resolvedOutcomeIndex,
          eventStartTime: row.event.startTime,
        })),
  }))

  // Stats reflect league/marketType/date filters but not the status filter —
  // filtering the table to "won" and seeing a 100% win rate tile would be
  // meaningless, so stats are computed before status narrows the rows.
  const stats = computeStats(results)

  if (params.status?.length) {
    const statusSet = new Set(params.status)
    results = results.filter((result) => statusSet.has(result.status))
  }

  const dir = params.sortDir === 'asc' ? 1 : -1
  results = results.sort((a, b) => {
    if (params.sortBy === 'points') {
      return ((a.points ?? 0) - (b.points ?? 0)) * dir
    }
    if (params.sortBy === 'odds') {
      return (Number(a.pick.priceAtPick) - Number(b.pick.priceAtPick)) * dir
    }
    return (a.event.startTime.getTime() - b.event.startTime.getTime()) * dir
  })

  const total = results.length
  const start = Number.isFinite(params.limit) ? (params.page - 1) * params.limit : 0
  const page = results.slice(start, start + params.limit)

  return { picks: page, total, stats }
}
