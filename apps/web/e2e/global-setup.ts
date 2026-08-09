import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './env'

const FIXTURE_PATH = path.resolve(__dirname, '.test-user.json')

/**
 * Creates a pre-confirmed test user via the Supabase admin API before the
 * suite runs. The real public sign-up form requires clicking an email
 * confirmation link, which a headless browser can't do without an inbox —
 * this is the standard, environment-independent way to get an equivalent
 * "account exists and is usable" starting state, so the spec itself still
 * exercises the real sign-in UI end-to-end.
 */
export default async function globalSetup() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local) to run the Playwright smoke test.')
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const email = `e2e-smoke-${Date.now()}@pennyward-test.local`
  const password = 'PlaywrightSmoke!2026'

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`Failed to create Playwright test user: ${error?.message}`)

  writeFileSync(FIXTURE_PATH, JSON.stringify({ userId: data.user.id, email, password }))
}
