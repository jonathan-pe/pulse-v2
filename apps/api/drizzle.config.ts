import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // PULSE_PG_DATABASE_URL, not DATABASE_URL — see src/db/index.ts for why.
    url: process.env.PULSE_PG_DATABASE_URL!,
  },
})
