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

All from repo root via Turborepo unless noted (`pnpm turbo <task>` for build/lint/check-types/test).

Per-package, run from that package's directory (or `pnpm --filter <name> <script>`):

- `apps/web`: `pnpm dev` (Vite on :5173, strict port), `pnpm build` (`vite build && tsc -b`), `pnpm lint` (oxlint)
- `apps/api`: `pnpm dev` (builds TS then runs `fastify start` with watch, on :3000), `pnpm test` (`node --test` via `c8`+`ts-node`, single dir glob `test/**/*.ts`), `pnpm db:generate` / `db:push` / `db:studio` (drizzle-kit)
- `packages/shared`, `packages/schemas`: `pnpm build`, `pnpm test` (build to `dist/` then `node --test dist/**/*.test.js` — tests run against compiled JS, not source)

To run a single test in `apps/api`, target the file directly after building:
```
cd apps/api && npm run build:ts && node --test dist/<path-to>.test.js
```

New DB migrations: edit `apps/api/src/db/schema.ts`, then `pnpm db:generate` (writes to `apps/api/drizzle/`) and `pnpm db:push`.

## Architecture notes

Package-specific notes live alongside their code: see `apps/api/CLAUDE.md` (database access, Fastify-on-Vercel deviations, Polymarket ingestion) and `packages/shared/CLAUDE.md` (scoring). Cross-cutting notes stay here.

### Env vars and Turborepo

`turbo.json`'s `build` task has an explicit `env` allowlist (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INGEST_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PULSE_PG_*`). Turbo strips any env var not listed here from the build/runtime on Vercel even if it's set in the Vercel project's env store — a new env var must be added to this list or it will silently disappear in production, not just fail loudly.

### Auth (`apps/api/src/lib/auth.ts`, `apps/web/src/lib/auth-client.ts`)

better-auth, email+OTP (not the default magic-link flow) plus Google OAuth/One Tap, backed by the Drizzle adapter against the schema in `apps/api/src/db/schema.ts` (`user`/`session`/`account`/`verification` tables — auto-generated shape, don't hand-edit without regenerating via better-auth's schema tooling if it drifts). `baseURL` is the public browser-facing origin (`app.playpulse.co`), not the API origin — better-auth's generated links must point where users actually are. Email sending isn't wired up yet; OTPs are logged to console (`sendVerificationOTP`) pending a Resend integration.

Sign-up always requires OTP verification before the session is created. Sign-in (`apps/web/src/routes/sign-in.tsx`) tries email+password first and only drops into the OTP step reactively, on an `EMAIL_NOT_VERIFIED` error from `signIn.email` — so the OTP UI (`components/auth/otp-step.tsx`) is shared between both flows rather than being sign-up-specific. `useAuth()` (`apps/web/src/hooks/useAuth.ts`) is the one hook that should be used for session/user state in components — it wraps `authClient.useSession()` alongside the sign-in/up/out/oneTap actions.

## Conventions

- Comments in this codebase are used specifically to record *why*, especially prior production incidents and constraints that aren't derivable from reading the code (see the files above for the pattern) — match that style rather than describing what code does.
- `packages/schemas` is meant to become the shared Zod validation layer consumed by both `apps/api` (via `@fastify/type-provider-zod`) and `apps/web`, generated from `apps/api/src/db/schema.ts` — check whether it's still a stub before assuming schemas exist there.
