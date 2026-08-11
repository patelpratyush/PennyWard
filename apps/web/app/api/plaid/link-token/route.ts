import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { getPlaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'
import { decryptToken } from '@/lib/plaidCrypto'

/**
 * R9.1: creates a Plaid Link token for the authenticated user. If `itemId`
 * (our PlaidItem.id) is provided, creates it in "update mode" against that
 * Item's existing access token instead — the re-link flow for R9.5's
 * ITEM_LOGIN_REQUIRED banner, which reuses the same Link UI to refresh
 * credentials rather than creating a brand-new Item.
 */
export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const { itemId } = await req.json().catch(() => ({ itemId: undefined }))

  const client = getPlaidClient()
  let access_token: string | undefined
  if (itemId) {
    const item = await db.plaidItem.findFirst({ where: { id: itemId, userId } })
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    access_token = decryptToken(item.accessTokenEncrypted)
  }

  const { data } = await client.linkTokenCreate({
    client_name: 'Pennyward',
    language: 'en',
    country_codes: [CountryCode.Us],
    user: { client_user_id: userId },
    products: access_token ? undefined : [Products.Transactions],
    access_token,
  })

  return NextResponse.json({ linkToken: data.link_token })
})
