# apps/api

Guidance specific to the API package. See the repo-root `CLAUDE.md` for overall structure, commands, and conventions.

### Database access (`src/db/index.ts`)

Uses Neon's HTTP driver (`drizzle-orm/neon-http`), not a pooled `pg` client — matches Vercel's guidance for Marketplace-provisioned Neon (stateless per-query, no connection lifecycle). `getDb()` is a lazy singleton so the connection string isn't evaluated at module-import time. Env var is `PULSE_PG_DATABASE_URL`, **not** `DATABASE_URL`. Do not wrap the db object in a Proxy — better-auth's Drizzle adapter inspects it directly and a Proxy breaks that.

### Fastify on Vercel (`api/index.ts`, `src/plugin.ts`)

Two load-bearing deviations from Fastify defaults, both because of prior production breakage:

1. Routes/plugins are registered **explicitly** in `plugin.ts` rather than via `@fastify/autoload`'s directory scanning — Vercel's build only bundles statically-imported files, so autoload's `fs.readdir`-based discovery silently produced ENOENTs in production. When adding a new route or plugin, register it explicitly in `plugin.ts`.
2. `api/index.ts` is a hand-written Node.js request handler (`export default async function handler(req, res)`), deliberately bypassing Vercel's "Fastify" framework preset — that preset's static analysis for detecting the server entrypoint was unreliable (intermittent `INTERNAL_FUNCTION_INVOCATION_FAILED`). All API traffic is routed through this single function via `vercel.json`'s rewrite (`/api/:path*` → `/api`); there is deliberately only one Vercel Function for the whole API.

### Polymarket ingestion (`src/lib/ingestion/polymarket.ts`, `src/lib/polymarket/gamma-client.ts`)

Pulls sports markets (moneyline/spreads/totals) from Polymarket's Gamma API per league (nba/wnba/mlb/nfl/nhl — fixed rows seeded via `pnpm --filter @pulse/api exec tsx src/db/seed-leagues.ts` or equivalent, not ingested). Two passes per league:

1. **Discovery** — pages `closed=false` events for the league's tag slug, upserts events/teams/markets. Bounded to games starting within `DISCOVERY_WINDOW_DAYS` (14) to avoid writing Polymarket's season-long-open markets months in advance; team identity is anchored to the event's single moneyline market since spread/total markets can list outcomes in either order.
2. **Recheck** — because discovery only ever queries `closed=false`, a market that resolves would otherwise silently vanish from future discovery queries forever. This pass re-fetches everything still tracked as not-`resolved` in that league and updates status/prices. Uses Gamma's singular `/markets/:id` endpoint (bounded concurrency), one request per market — the batch `/markets?id=` endpoint is implicitly filtered by closed state server-side (no `closed` param behaves like `closed=false`) and silently omits exactly the markets this pass exists to catch, so it can't be used here.

Triggered externally by `.github/workflows/ingest.yml` (cron every 5 min), one GitHub Actions matrix job per league hitting `POST /api/ingest/:league` in parallel, guarded by a shared-secret bearer token (`INGEST_SECRET`) rather than session auth. The unscoped `POST /api/ingest` (all leagues, sequential) exists only for manual/local testing — production always uses the per-league route.
