import { type FastifyPluginAsync } from 'fastify'
import type { PickOutcomeStatus } from '@pulse/shared'
import { optionalAuth, requireAuth } from '../../../lib/require-auth.js'
import {
  deletePick,
  getPicksAnalytics,
  listMyPicks,
  listOpenMarketsWithPicks,
  upsertPick,
  type ListMyPicksParams,
  type PicksAnalyticsFilters,
} from '../../../lib/picks.js'

const STATUSES: PickOutcomeStatus[] = ['upcoming', 'pending', 'won', 'lost']
const MARKET_TYPES = ['moneyline', 'spreads', 'totals'] as const
const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

interface FilterQuery {
  league?: string
  marketType?: string
  from?: string
  to?: string
}

interface ListPicksQuery extends FilterQuery {
  page?: string
  limit?: string
  sort?: string
  status?: string
}

// Shared by both /picks and /picks/analytics — league/marketType/from/to
// mean the same thing on each.
function parseFilterQuery(query: FilterQuery): PicksAnalyticsFilters {
  const marketType = query.marketType
    ?.split(',')
    .filter((value): value is (typeof MARKET_TYPES)[number] => MARKET_TYPES.includes(value as (typeof MARKET_TYPES)[number]))
  const league = query.league?.split(',').filter(Boolean)

  const from = query.from ? new Date(query.from) : undefined
  const to = query.to ? new Date(query.to) : undefined

  return {
    league: league?.length ? league : undefined,
    marketType: marketType?.length ? marketType : undefined,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  }
}

function parseListPicksQuery(query: ListPicksQuery): ListMyPicksParams {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)
  // limit=all is for internal call sites that need a full unpaginated record
  // (e.g. per-league win/loss counts on the home page) — the My Picks table
  // itself never sends it.
  const limit =
    query.limit === 'all'
      ? Number.POSITIVE_INFINITY
      : Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))

  const [sortByRaw, sortDirRaw] = (query.sort ?? 'date:desc').split(':')
  const sortBy = sortByRaw === 'points' || sortByRaw === 'odds' ? sortByRaw : 'date'
  const sortDir = sortDirRaw === 'asc' ? 'asc' : 'desc'

  const status = query.status
    ?.split(',')
    .filter((value): value is PickOutcomeStatus => STATUSES.includes(value as PickOutcomeStatus))

  return {
    page,
    limit,
    sortBy,
    sortDir,
    status: status?.length ? status : undefined,
    ...parseFilterQuery(query),
  }
}

const picksRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Querystring: { league?: string } }>('/markets', { preHandler: optionalAuth }, async (request, reply) => {
    const events = await listOpenMarketsWithPicks(request.user?.id, request.query.league)
    return reply.send({ events })
  })

  fastify.get<{ Querystring: ListPicksQuery }>('/picks', { preHandler: requireAuth }, async (request, reply) => {
    const params = parseListPicksQuery(request.query)
    const { picks, total, stats } = await listMyPicks(request.user!.id, params)
    return reply.send({ picks, total, page: params.page, limit: params.limit, stats })
  })

  fastify.get<{ Querystring: FilterQuery }>('/picks/analytics', { preHandler: requireAuth }, async (request, reply) => {
    const filters = parseFilterQuery(request.query)
    const analytics = await getPicksAnalytics(request.user!.id, filters)
    return reply.send(analytics)
  })

  fastify.post<{ Body: { marketId?: string; outcomeIndex?: number } }>(
    '/picks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { marketId, outcomeIndex } = request.body
      if (typeof marketId !== 'string' || (outcomeIndex !== 0 && outcomeIndex !== 1)) {
        return reply.status(400).send({ error: 'marketId and outcomeIndex (0 or 1) are required' })
      }
      const result = await upsertPick(request.user!.id, marketId, outcomeIndex)
      if (!result.ok) return reply.status(result.status).send({ error: result.error })
      return reply.send({ pick: result.pick })
    },
  )

  fastify.delete<{ Params: { marketId: string } }>(
    '/picks/:marketId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = await deletePick(request.user!.id, request.params.marketId)
      if (!result.ok) return reply.status(result.status).send({ error: result.error })
      return reply.status(204).send()
    },
  )
}

export default picksRoutes
