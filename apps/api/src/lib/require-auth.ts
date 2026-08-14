import { type FastifyReply, type FastifyRequest } from 'fastify'
import { auth } from './auth.js'

// Dynamic import: better-auth/node resolves to ESM, and Vercel's CJS bundling
// can't require() it statically — same fix as routes/api/auth/index.ts.
// Cached at module scope so it only actually happens once, not per-request.
const fromNodeHeadersPromise = import('better-auth/node').then((m) => m.fromNodeHeaders)

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string }
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const fromNodeHeaders = await fromNodeHeadersPromise
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (!session) {
    return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
  }
  request.user = session.user
}
