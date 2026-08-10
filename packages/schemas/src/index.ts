/**
 * Zod schemas — single source of truth for API validation + types.
 *
 * Intentionally empty for now. Most schemas here will be generated from
 * Drizzle table definitions via `drizzle-zod` once the DB schema exists
 * (apps/api's Drizzle + Neon setup), then refined as needed. Consumed by
 * apps/api via @fastify/type-provider-zod and imported directly by
 * apps/web for response typing + client-side validation.
 */

export const SCHEMAS_PACKAGE_READY = true
