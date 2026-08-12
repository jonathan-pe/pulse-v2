import { type FastifyPluginAsync } from 'fastify'
import type { Response as UndiciResponse } from 'undici-types'
import { auth } from '../../../lib/auth.js'

// Registered under routes/api/auth/, so @fastify/autoload prefixes this to
// /api/auth — combined with the /* below, matches better-auth's expected
// /api/auth/* path exactly (and our apps/web rewrite's /api/* prefix).
//
// Per better-auth's official Fastify integration guide: reconstruct a
// standard Request from the already-parsed Fastify request rather than
// using toNodeHandler (that's the Express-specific pattern — Fastify wraps
// Node's raw req/res differently, so this is the framework's own documented
// approach, not a workaround).
//
// fromNodeHeaders is loaded via dynamic import, not a static one: better-
// auth/node resolves to a genuine .mjs file, and Vercel's build bundles this
// package as CommonJS — a static `import` compiles to `require()`, which
// Node refuses for an ES Module (ERR_REQUIRE_ESM) in that environment, even
// though it resolves fine in local dev. Dynamic import is Node's own
// sanctioned interop path for loading ESM from CJS. Cached at module scope
// so it only actually happens once, not per-request.
const fromNodeHeadersPromise = import('better-auth/node').then((m) => m.fromNodeHeaders)

const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/*',
    async handler(request, reply) {
      try {
        const fromNodeHeaders = await fromNodeHeadersPromise
        const url = new URL(request.url, `http://${request.headers.host}`)
        const headers = fromNodeHeaders(request.headers)

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })

        // Same Vercel-build ambient-Response-type workaround as gamma-client.ts.
        const response = (await auth.handler(req)) as unknown as UndiciResponse

        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        return reply.send(response.body ? await response.text() : null)
      } catch (error) {
        fastify.log.error(error, 'better-auth handler error')
        return reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        })
      }
    },
  })
}

export default authRoutes
