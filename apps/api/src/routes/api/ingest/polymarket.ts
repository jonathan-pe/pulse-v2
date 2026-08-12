import { type FastifyPluginAsync } from 'fastify'
import { getLeague, runIngestion, runIngestionForLeague } from '../../../lib/ingestion/polymarket.js'

// Guarded by a shared secret since this is called externally by GitHub
// Actions cron, not routed through better-auth's session cookies.
const ingestPolymarketRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (authHeader !== `Bearer ${process.env.INGEST_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  // Per-league — what the GitHub Actions job matrix calls, one parallel job
  // per league.
  fastify.post<{ Params: { league: string } }>('/:league', async (request, reply) => {
    const leagueRow = await getLeague(request.params.league)
    if (!leagueRow) {
      return reply.status(404).send({ error: `Unknown league: ${request.params.league}` })
    }
    const result = await runIngestionForLeague(leagueRow)
    return reply.send({ ok: true, result })
  })

  // All leagues, sequential — manual/local testing only.
  fastify.post('/', async (_request, reply) => {
    const results = await runIngestion()
    return reply.send({ ok: true, results })
  })
}

export default ingestPolymarketRoute
