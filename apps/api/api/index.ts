import type { IncomingMessage, ServerResponse } from 'node:http'
import Fastify from 'fastify'
import app, { options } from '../src/plugin.js'

// Explicit Vercel Node.js function, deliberately bypassing Vercel's
// "Fastify" framework preset — that preset auto-detects a server entrypoint
// via static analysis of a `fastify.listen(...)` call, which proved
// unreliable in practice (intermittent INTERNAL_FUNCTION_INVOCATION_FAILED
// across otherwise-identical deployments, with no application-level error
// to debug). This uses Fastify's own documented serverless integration
// pattern instead — a plain Node.js request handler — which is the same
// well-established contract any Node app on Vercel relies on, not a
// framework-specific detection heuristic.
//
// All real traffic is already scoped under /api/* (apps/web's rewrite and
// the ingestion cron both target /api/...), so this is the only function
// this project needs. A [...slug].ts catch-all filename was tried first,
// but only matched single-segment paths in practice (/api/foo worked,
// /api/auth/get-session didn't) — routed here explicitly instead via
// vercel.json's rewrites, which is the same well-tested mechanism already
// used for apps/web's proxy to this API.
const fastify = Fastify({ logger: true })
const ready = fastify.register(app, options).ready()

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready
  fastify.server.emit('request', req, res)
}
