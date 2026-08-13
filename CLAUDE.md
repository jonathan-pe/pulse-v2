# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pulse — a free, points-based prediction game with performance analytics. Users pick outcomes on real sports markets (moneyline/spreads/totals sourced from Polymarket) and are scored on points won/lost plus calibration (Brier score).

## Repo structure

pnpm + Turborepo monorepo:

- `apps/web` — React 19 SPA (Vite, TanStack Router + Query, Tailwind v4, shadcn `base-nova` style). Deployed as its own Vercel project (`pulse-v2-web`).
- `apps/api` — Fastify API (Drizzle ORM + Neon Postgres, better-auth). Deployed as its own Vercel project (`pulse-v2-api`), at `api.playpulse.co`.
- `packages/shared` — framework-free scoring logic (points formula, Brier calibration). Plain `node --test`.
- `packages/schemas` — Zod schemas, intended as the single source of truth for API validation + types (currently a stub; will eventually generate from Drizzle schema via `drizzle-zod`).

apps/web and apps/api are two **separate Vercel projects**, not one deployment — `apps/web/vercel.json` rewrites `/api/:path*` to `https://api.playpulse.co/api/:path*` in production, and `vite.config.ts`'s dev-server proxy does the same to `localhost:3000` locally. This keeps the browser on a single same-origin API in both environments (no CORS / cross-site cookies to configure), which is why better-auth's client and cookie config don't need cross-origin handling.

## Commands

All from repo root via Turborepo unless noted:

```
pnpm install                    # install everything
pnpm turbo build                # build all packages (respects dependency graph)
pnpm turbo lint                 # oxlint (web) etc.
pnpm turbo check-types          # tsc -b / tsc --noEmit per package
pnpm turbo test                 # run all package tests
```

Per-package, run from that package's directory (or `pnpm --filter <name> <script>`):

- `apps/web`: `pnpm dev` (Vite on :5173, strict port), `pnpm build` (`vite build && tsc -b`), `pnpm lint` (oxlint)
- `apps/api`: `pnpm dev` (builds TS then runs `fastify start` with watch, on :3000), `pnpm test` (`node --test` via `c8`+`ts-node`, single dir glob `test/**/*.ts`), `pnpm db:generate` / `db:push` / `db:studio` (drizzle-kit)
- `packages/shared`, `packages/schemas`: `pnpm build`, `pnpm test` (build to `dist/` then `node --test dist/**/*.test.js` — tests run against compiled JS, not source)

To run a single test in `apps/api`, target the file directly after building:
```
cd apps/api && npm run build:ts && node --test dist/<path-to>.test.js
```

New DB migrations: edit `apps/api/src/db/schema.ts`, then `pnpm db:generate` (writes to `apps/api/drizzle/`, not yet created — no migrations have been generated yet) and `pnpm db:push`.

## Architecture notes

### Env vars and Turborepo

`turbo.json`'s `build` task has an explicit `env` allowlist (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INGEST_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PULSE_PG_*`). Turbo strips any env var not listed here from the build/runtime on Vercel even if it's set in the Vercel project's env store — a new env var must be added to this list or it will silently disappear in production, not just fail loudly.

### Database access (`apps/api/src/db/index.ts`)

Uses Neon's HTTP driver (`drizzle-orm/neon-http`), not a pooled `pg` client — matches Vercel's guidance for Marketplace-provisioned Neon (stateless per-query, no connection lifecycle). `getDb()` is a lazy singleton so the connection string isn't evaluated at module-import time. Env var is `PULSE_PG_DATABASE_URL`, **not** `DATABASE_URL`. Do not wrap the db object in a Proxy — better-auth's Drizzle adapter inspects it directly and a Proxy breaks that.

### Fastify on Vercel (`apps/api/api/index.ts`, `apps/api/src/plugin.ts`)

Two load-bearing deviations from Fastify defaults, both because of prior production breakage:

1. Routes/plugins are registered **explicitly** in `plugin.ts` rather than via `@fastify/autoload`'s directory scanning — Vercel's build only bundles statically-imported files, so autoload's `fs.readdir`-based discovery silently produced ENOENTs in production. When adding a new route or plugin, register it explicitly in `plugin.ts`.
2. `apps/api/api/index.ts` is a hand-written Node.js request handler (`export default async function handler(req, res)`), deliberately bypassing Vercel's "Fastify" framework preset — that preset's static analysis for detecting the server entrypoint was unreliable (intermittent `INTERNAL_FUNCTION_INVOCATION_FAILED`). All API traffic is routed through this single function via `vercel.json`'s rewrite (`/api/:path*` → `/api`); there is deliberately only one Vercel Function for the whole API.

### Auth (`apps/api/src/lib/auth.ts`, `apps/web/src/lib/auth-client.ts`)

better-auth, email+OTP (not the default magic-link flow) plus Google OAuth/One Tap, backed by the Drizzle adapter against the schema in `apps/api/src/db/schema.ts` (`user`/`session`/`account`/`verification` tables — auto-generated shape, don't hand-edit without regenerating via better-auth's schema tooling if it drifts). `baseURL` is the public browser-facing origin (`app.playpulse.co`), not the API origin — better-auth's generated links must point where users actually are. Email sending isn't wired up yet; OTPs are logged to console (`sendVerificationOTP`) pending a Resend integration.

Sign-up always requires OTP verification before the session is created. Sign-in (`apps/web/src/routes/sign-in.tsx`) tries email+password first and only drops into the OTP step reactively, on an `EMAIL_NOT_VERIFIED` error from `signIn.email` — so the OTP UI (`components/auth/otp-step.tsx`) is shared between both flows rather than being sign-up-specific. `useAuth()` (`apps/web/src/hooks/useAuth.ts`) is the one hook that should be used for session/user state in components — it wraps `authClient.useSession()` alongside the sign-in/up/out/oneTap actions.

### Polymarket ingestion (`apps/api/src/lib/ingestion/polymarket.ts`, `apps/api/src/lib/polymarket/gamma-client.ts`)

Pulls sports markets (moneyline/spreads/totals) from Polymarket's Gamma API per league (nba/wnba/mlb/nfl/nhl — fixed rows seeded via `pnpm --filter @pulse/api exec tsx src/db/seed-leagues.ts` or equivalent, not ingested). Two passes per league:

1. **Discovery** — pages `closed=false` events for the league's tag slug, upserts events/teams/markets. Bounded to games starting within `DISCOVERY_WINDOW_DAYS` (14) to avoid writing Polymarket's season-long-open markets months in advance; team identity is anchored to the event's single moneyline market since spread/total markets can list outcomes in either order.
2. **Recheck** — because discovery only ever queries `closed=false`, a market that resolves would otherwise silently vanish from future discovery queries forever. This pass re-fetches (by ID, batched) everything still tracked as not-`resolved` in that league and updates status/prices.

Triggered externally by `.github/workflows/ingest.yml` (cron every 5 min), one GitHub Actions matrix job per league hitting `POST /api/ingest/:league` in parallel, guarded by a shared-secret bearer token (`INGEST_SECRET`) rather than session auth. The unscoped `POST /api/ingest` (all leagues, sequential) exists only for manual/local testing — production always uses the per-league route.

### Scoring (`packages/shared`)

Points and calibration are independent and never feed into each other:
- **Points** (`points.ts`): win = `k / p`, loss = `-lossMultiplier * k * p`, where `p` is the Polymarket implied probability of the picked outcome at pick time and `k = 10`. Favorites (`p` near 1) win few points but lose many if wrong; longshots are the reverse.
- **Calibration** (`calibration.ts`): plain Brier score (`(outcome - p)²`) and its mean, tracked purely for analytics — never affects points.

Worked constants/values in both come from an ADR ("Scoring, Points Formula & Calibration") that isn't in this repo; treat `packages/shared/src/points.test.ts`'s worked examples as the source of truth if the two ever disagree.

## Conventions

- Comments in this codebase are used specifically to record *why*, especially prior production incidents and constraints that aren't derivable from reading the code (see the files above for the pattern) — match that style rather than describing what code does.
- `packages/schemas` is meant to become the shared Zod validation layer consumed by both `apps/api` (via `@fastify/type-provider-zod`) and `apps/web`, generated from `apps/api/src/db/schema.ts` — check whether it's still a stub before assuming schemas exist there.
