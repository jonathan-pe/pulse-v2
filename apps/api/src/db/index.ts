import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

// Neon's HTTP driver, not a pg pool — matches Vercel's current guidance for
// Marketplace-provisioned Neon (stateless per-query requests, no connection
// lifecycle to manage). See ADR: Hosting & DevOps.
//
// Lazy singleton: avoids evaluating the connection string at module-import
// time. Do NOT wrap this in a Proxy — better-auth's Drizzle adapter inspects
// the db object directly, and a Proxy silently breaks that.
function createDb() {
  const sql = neon(process.env.PULSE_PG_DATABASE_URL!)
  return drizzle(sql, { schema })
}

let _db: ReturnType<typeof createDb> | null = null

export function getDb() {
  if (!_db) _db = createDb()
  return _db
}
