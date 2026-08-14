import { ne, eq, and } from 'drizzle-orm'
import { getDb } from '../../db/index.js'
import { league, team, event, market } from '../../db/schema.js'
import {
  fetchGammaEvents,
  fetchGammaMarketsByIds,
  isInScopeMarketType,
  parseOutcomes,
  type GammaEvent,
  type GammaMarket,
} from '../polymarket/gamma-client.js'

const PAGE_SIZE = 100

// Gamma API has no server-side date filter, so discovery still pages through
// every currently-open event for a league (Polymarket keeps season-long
// markets open for months). This window bounds what actually gets WRITTEN —
// the expensive part — to games happening soon. Games already in progress
// (gameStartTime in the past, not yet resolved) are always kept; there's no
// lower bound, only an upper one.
const DISCOVERY_WINDOW_DAYS = 14

function isWithinDiscoveryWindow(gameStartTime: string | null): boolean {
  if (gameStartTime === null) return false
  const cutoff = Date.now() + DISCOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return new Date(gameStartTime).getTime() <= cutoff
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function upsertTeam(leagueId: string, name: string): Promise<string> {
  const db = getDb()
  const [row] = await db
    .insert(team)
    .values({ leagueId, name })
    .onConflictDoUpdate({
      target: [team.leagueId, team.name],
      set: { name },
    })
    .returning({ id: team.id })
  return row.id
}

function deriveMarketStatus(raw: GammaMarket): 'scheduled' | 'closed' | 'resolved' {
  if (raw.closed && raw.umaResolutionStatus === 'resolved') return 'resolved'
  if (raw.closed) return 'closed'
  return 'scheduled'
}

async function upsertEventWithMarkets(leagueId: string, raw: GammaEvent, markets: GammaMarket[]) {
  const db = getDb()

  // Different markets on the same event can list outcomes in different
  // orders (e.g. "Spread: Team A (-1.5)" vs "Spread: Team B (-1.5)"), so team
  // identity for the event is anchored to the moneyline market specifically
  // — exactly one per event, outcomes in a stable order matching the title.
  const moneyline = markets.find((m) => m.sportsMarketType === 'moneyline')
  if (!moneyline) return
  if (!isWithinDiscoveryWindow(moneyline.gameStartTime)) return

  const { names: moneylineNames } = parseOutcomes(moneyline)
  const teamAId = await upsertTeam(leagueId, moneylineNames[0])
  const teamBId = await upsertTeam(leagueId, moneylineNames[1])

  const gameStartTime = new Date(moneyline.gameStartTime!)
  const eventStatus = raw.closed ? 'closed' : 'scheduled'
  const [eventRow] = await db
    .insert(event)
    .values({
      externalId: raw.id,
      leagueId,
      teamAId,
      teamBId,
      title: raw.title,
      startTime: gameStartTime,
      status: eventStatus,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: event.externalId,
      set: { title: raw.title, startTime: gameStartTime, status: eventStatus, lastSyncedAt: new Date() },
    })
    .returning({ id: event.id })

  for (const rawMarket of markets) {
    await upsertMarketRow(eventRow.id, rawMarket)
  }
}

async function upsertMarketRow(eventId: string, raw: GammaMarket) {
  const db = getDb()
  const { names, prices } = parseOutcomes(raw)
  const status = deriveMarketStatus(raw)
  const resolvedOutcomeIndex = status === 'resolved' ? (prices[0] > prices[1] ? 0 : 1) : null

  await db
    .insert(market)
    .values({
      externalId: raw.id,
      conditionId: raw.conditionId,
      eventId,
      marketType: raw.sportsMarketType as 'moneyline' | 'spreads' | 'totals',
      line: raw.line == null ? null : String(raw.line),
      outcomeAName: names[0],
      outcomeAPrice: String(prices[0]),
      outcomeBName: names[1],
      outcomeBPrice: String(prices[1]),
      status,
      resolvedOutcomeIndex,
      volume: String(raw.volumeNum),
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: market.externalId,
      set: {
        outcomeAPrice: String(prices[0]),
        outcomeBPrice: String(prices[1]),
        status,
        resolvedOutcomeIndex,
        volume: String(raw.volumeNum),
        lastSyncedAt: new Date(),
      },
    })
}

async function discoverLeague(leagueRow: { id: string; polymarketTagSlug: string }) {
  let offset = 0
  while (true) {
    const events = await fetchGammaEvents({
      tagSlug: leagueRow.polymarketTagSlug,
      closed: false,
      limit: PAGE_SIZE,
      offset,
    })
    if (events.length === 0) break

    for (const raw of events) {
      const inScopeMarkets = raw.markets.filter(isInScopeMarketType)
      if (inScopeMarkets.length === 0) continue // e.g. futures-only events
      await upsertEventWithMarkets(leagueRow.id, raw, inScopeMarkets)
    }
    offset += PAGE_SIZE
  }
}

// Discovery only ever queries closed=false, so a market that resolves would
// otherwise silently drop out of that query forever. This pass re-checks
// everything we're still tracking as not-yet-resolved, batched by ID.
//
// Scoped to a single league: this runs once per league (matrix job), and an
// unscoped recheck would redundantly re-fetch every OTHER league's
// unresolved markets from Polymarket on every one of the 5 parallel runs.
async function recheckUnresolvedMarkets(leagueId: string) {
  const db = getDb()
  const tracked = await db
    .select({ id: market.id, externalId: market.externalId, status: market.status })
    .from(market)
    .innerJoin(event, eq(market.eventId, event.id))
    .where(and(ne(market.status, 'resolved'), eq(event.leagueId, leagueId)))

  for (const batch of chunk(tracked, PAGE_SIZE)) {
    const fresh = await fetchGammaMarketsByIds(batch.map((m) => m.externalId))
    const freshById = new Map(fresh.map((m) => [m.id, m]))

    for (const trackedRow of batch) {
      const raw = freshById.get(trackedRow.externalId)
      if (!raw) continue // market no longer returned by Polymarket — leave as-is
      const status = deriveMarketStatus(raw)
      if (status === trackedRow.status) continue
      const { prices } = parseOutcomes(raw)
      const resolvedOutcomeIndex = status === 'resolved' ? (prices[0] > prices[1] ? 0 : 1) : null
      await db
        .update(market)
        .set({
          outcomeAPrice: String(prices[0]),
          outcomeBPrice: String(prices[1]),
          status,
          resolvedOutcomeIndex,
          volume: String(raw.volumeNum),
          lastSyncedAt: new Date(),
        })
        .where(eq(market.id, trackedRow.id))
    }
  }
}

export interface LeagueIngestionResult {
  league: string
  ok: boolean
  error?: string
}

export async function getLeague(leagueId: string) {
  const db = getDb()
  const [row] = await db.select().from(league).where(eq(league.id, leagueId))
  return row ?? null
}

// Single league — used by the per-league route (/api/ingest/:league), which
// is what the GitHub Actions job matrix actually calls, one parallel job per
// league.
export async function runIngestionForLeague(leagueRow: {
  id: string
  polymarketTagSlug: string
}): Promise<LeagueIngestionResult> {
  try {
    await discoverLeague(leagueRow)
    await recheckUnresolvedMarkets(leagueRow.id)
    return { league: leagueRow.id, ok: true }
  } catch (err) {
    return { league: leagueRow.id, ok: false, error: String(err) }
  }
}

// All leagues, sequential — kept for manual/local testing (workflow_dispatch
// without a league input, or a single curl). Production cron uses the
// per-league route so leagues run in parallel instead.
export async function runIngestion(): Promise<LeagueIngestionResult[]> {
  const db = getDb()
  const leagues = await db.select().from(league)
  const results: LeagueIngestionResult[] = []
  for (const leagueRow of leagues) {
    results.push(await runIngestionForLeague(leagueRow))
  }
  return results
}
