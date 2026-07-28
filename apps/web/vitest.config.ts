import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'node:path'

// Load apps/web/.env.test (DATABASE_URL pointed at the `test` schema on the
// live Supabase database) so DB-touching tests hit the right database.
const testEnv = loadEnv('test', __dirname, '')
for (const [key, value] of Object.entries(testEnv)) {
  if (process.env[key] === undefined) process.env[key] = value
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Test files share a single live Postgres test schema and reuse hardcoded
    // user ids (e.g. 'user_test'). Running files in parallel races their
    // beforeEach cleanup/seed steps against each other's in-flight requests,
    // so force sequential file execution for reliability.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
