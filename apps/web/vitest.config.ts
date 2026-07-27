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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
