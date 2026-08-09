import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { loadEnvLocal } from './env'

const FIXTURE_PATH = path.resolve(__dirname, '.test-user.json')

/** Deletes the Playwright test user from both Postgres (cascades through
 * every domain table the test touched — debts, etc.) and Supabase Auth,
 * mirroring DELETE /api/account's two-step real-account-deletion order, so
 * repeated runs don't accumulate throwaway accounts or debts. */
export default async function globalTeardown() {
  if (!existsSync(FIXTURE_PATH)) return
  loadEnvLocal()
  const { userId } = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))

  const prisma = new PrismaClient()
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  await prisma.$disconnect()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
  unlinkSync(FIXTURE_PATH)
}
