import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuthErrorHandling } from '@/lib/withAuth'

/**
 * Real account deletion — every domain row is scoped by `userId` with
 * `onDelete: Cascade`, so deleting the User row cascades through accounts,
 * transactions, budgets, debts, scenarios, categorization rules, and
 * household memberships in one statement. Order matters: delete the Postgres
 * row first (while the session can still prove ownership), then the Supabase
 * Auth user last — that step is irreversible and ends the session.
 */
export const DELETE = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()

  await db.user.delete({ where: { id: userId } })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    // The Postgres row is already gone at this point — the account is
    // functionally deleted (every domain query is userId-scoped and the row
    // no longer exists), even though the auth.users row lingers. Surface the
    // failure rather than silently swallowing it, but don't imply nothing happened.
    return NextResponse.json({ error: 'Data deleted, but the auth account could not be removed. Contact support.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
