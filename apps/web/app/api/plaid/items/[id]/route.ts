import { NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { db } from '@/lib/db'
import { getPlaidClient } from '@/lib/plaid'
import { decryptToken } from '@/lib/plaidCrypto'

/** Unlinks a Plaid Item: revokes the access token with Plaid, then deletes
 * the PlaidItem row. FinancialAccount rows stay (onDelete: SetNull on
 * plaidItemDbId) — the user's transaction history isn't erased by
 * disconnecting the bank feed, it just stops syncing. */
export const DELETE = withAuthErrorHandling(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await getRequiredSession()
  const { id } = await params
  const item = await db.plaidItem.findFirst({ where: { id, userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client = getPlaidClient()
  await client.itemRemove({ access_token: decryptToken(item.accessTokenEncrypted) }).catch(() => {})

  await db.plaidItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
