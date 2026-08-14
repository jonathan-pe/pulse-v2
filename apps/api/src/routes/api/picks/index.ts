import { type FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../../../lib/require-auth.js'
import { deletePick, listOpenMarketsWithPicks, upsertPick } from '../../../lib/picks.js'

const picksRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.addHook('preHandler', requireAuth)

  fastify.get<{ Querystring: { league?: string } }>('/markets', async (request, reply) => {
    const events = await listOpenMarketsWithPicks(request.user!.id, request.query.league)
    return reply.send({ events })
  })

  fastify.post<{ Body: { marketId?: string; outcomeIndex?: number } }>('/picks', async (request, reply) => {
    const { marketId, outcomeIndex } = request.body
    if (typeof marketId !== 'string' || (outcomeIndex !== 0 && outcomeIndex !== 1)) {
      return reply.status(400).send({ error: 'marketId and outcomeIndex (0 or 1) are required' })
    }
    const result = await upsertPick(request.user!.id, marketId, outcomeIndex)
    if (!result.ok) return reply.status(result.status).send({ error: result.error })
    return reply.send({ pick: result.pick })
  })

  fastify.delete<{ Params: { marketId: string } }>('/picks/:marketId', async (request, reply) => {
    const result = await deletePick(request.user!.id, request.params.marketId)
    if (!result.ok) return reply.status(result.status).send({ error: result.error })
    return reply.status(204).send()
  })
}

export default picksRoutes
