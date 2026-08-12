import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'
import sensible from './plugins/sensible.js'
import support from './plugins/support.js'
import root from './routes/root.js'
import authRoutes from './routes/api/auth/index.js'
import ingestRoutes from './routes/api/ingest/polymarket.js'

export interface AppOptions extends FastifyServerOptions {}

const options: AppOptions = {}

// Routes/plugins are registered explicitly here rather than via
// @fastify/autoload's runtime directory scanning. Vercel's build bundles
// only statically-imported files; nothing ever `import`s files inside
// plugins/ or routes/ directly (autoload discovers them via fs.readdir at
// runtime), so on Vercel they were silently missing from the deployed
// bundle — "ENOENT: no such file or directory, scandir '.../src/plugins'".
// fastify-cli's own local dev runner (`fastify start`) validates the plugin
// signature by argument count and requires exactly 2 — keep the unused
// second param even though nothing here needs it.
const app: FastifyPluginAsync<AppOptions> = async (fastify, _opts): Promise<void> => {
  await fastify.register(sensible)
  await fastify.register(support)
  await fastify.register(root)
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(ingestRoutes, { prefix: '/api/ingest' })
}

export default app
export { app, options }
