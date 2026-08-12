import 'dotenv/config'
import { getDb } from './index.js'
import { league } from './schema.js'

// Fixed, one-time seed — not something ingestion writes to. Re-run is safe
// (upsert on id), but this never needs to run on a schedule.
const LEAGUES = [
  { id: 'nba', name: 'NBA', polymarketTagSlug: 'nba' },
  { id: 'wnba', name: 'WNBA', polymarketTagSlug: 'wnba' },
  { id: 'mlb', name: 'MLB', polymarketTagSlug: 'mlb' },
  { id: 'nfl', name: 'NFL', polymarketTagSlug: 'nfl' },
  { id: 'nhl', name: 'NHL', polymarketTagSlug: 'nhl' },
]

async function main() {
  const db = getDb()
  for (const row of LEAGUES) {
    await db
      .insert(league)
      .values(row)
      .onConflictDoUpdate({ target: league.id, set: { name: row.name, polymarketTagSlug: row.polymarketTagSlug } })
  }
  console.log(`Seeded ${LEAGUES.length} leagues.`)
}

main()
