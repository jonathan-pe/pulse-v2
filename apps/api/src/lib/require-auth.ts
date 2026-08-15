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

async function getSessionUser(request: FastifyRequest) {
  const fromNodeHeaders = await fromNodeHeadersPromise
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  return session?.user
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getSessionUser(request)
  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
  }
  request.user = user
}

// For routes that personalize when a session exists but must still work
// signed-out (public event browsing) — never rejects, just leaves
// request.user undefined.
export async function optionalAuth(request: FastifyRequest) {
  request.user = await getSessionUser(request)
}
