import { type FastifyPluginAsync } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
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
const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/*',
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`)
        const headers = fromNodeHeaders(request.headers)

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })

        const response = await auth.handler(req)

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
