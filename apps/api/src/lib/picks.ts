import { and, desc, eq, ne } from 'drizzle-orm'
import { scorePick, type PickOutcomeStatus } from '@pulse/shared'
import { getDb } from '../db/index.js'
import { event, market, pick } from '../db/schema.js'

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
  event: { id: string; title: string; startTime: Date; leagueId: string }
  markets: MarketWithPick[]
}

export async function listOpenMarketsWithPicks(userId: string, leagueId?: string): Promise<EventWithMarkets[]> {
  const db = getDb()
  const now = new Date()

  const rows = await db
    .select({ event, market, pick })
    .from(event)
    .innerJoin(market, eq(market.eventId, event.id))
    .leftJoin(pick, and(eq(pick.marketId, market.id), eq(pick.userId, userId)))
    .where(
      and(ne(event.status, 'resolved'), ne(market.status, 'resolved'), leagueId ? eq(event.leagueId, leagueId) : undefined),
    )
    .orderBy(event.startTime)

  // This view is for making new picks, not reviewing old ones — anything no
  // longer actionable is dropped entirely rather than shown disabled. Seeing
  // what you're already locked into is the future My Picks page's job.
  const eventsById = new Map<string, EventWithMarkets>()
  for (const row of rows) {
    if (!marketIsOpenForPicks(row.market, row.event, now)) continue

    let entry = eventsById.get(row.event.id)
    if (!entry) {
      entry = { event: row.event, markets: [] }
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
  return [...eventsById.values()]
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

export interface PickResult {
  pick: { id: string; outcomeIndex: number; priceAtPick: string; createdAt: Date }
  market: {
    id: string
    marketType: 'moneyline' | 'spreads' | 'totals'
    line: string | null
    outcomeAName: string
    outcomeBName: string
  }
  event: { id: string; title: string; startTime: Date; leagueId: string }
  status: PickOutcomeStatus
  points: number | null
}

// Unlike listOpenMarketsWithPicks, this is the "review what happened" view —
// it includes every pick regardless of lock/resolution state, scored on read
// from data ingestion already writes (market.resolvedOutcomeIndex), rather
// than a separately persisted result.
export async function listMyPicks(userId: string): Promise<PickResult[]> {
  const db = getDb()
  const rows = await db
    .select({ pick, market, event })
    .from(pick)
    .innerJoin(market, eq(pick.marketId, market.id))
    .innerJoin(event, eq(market.eventId, event.id))
    .where(eq(pick.userId, userId))
    .orderBy(desc(event.startTime))

  return rows.map((row) => ({
    pick: row.pick,
    market: row.market,
    event: row.event,
    ...scorePick({
      outcomeIndex: row.pick.outcomeIndex,
      priceAtPick: Number(row.pick.priceAtPick),
      marketStatus: row.market.status,
      resolvedOutcomeIndex: row.market.resolvedOutcomeIndex,
      eventStartTime: row.event.startTime,
    }),
  }))
}
