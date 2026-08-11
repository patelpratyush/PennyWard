import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { getPlaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'
import { encryptToken } from '@/lib/plaidCrypto'
import { mapPlaidAccountType, plaidBalanceToAppBalance } from '@/lib/plaidAccountType'
import { syncPlaidItem } from '@/lib/plaidSync'

const schema = z.object({ publicToken: z.string().min(1), institutionName: z.string().optional() })

/** R9.1/R9.3: exchanges Link's public_token for a real access_token
 * (encrypted before it ever touches the database — see lib/plaidCrypto.ts),
 * creates the PlaidItem row, and maps every account Plaid returns to a new
 * FinancialAccount. Runs the first transactions sync inline so the user
 * sees real transactions immediately rather than an empty account. */
export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId } = await getRequiredSession()
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { publicToken, institutionName } = parsed.data

  const client = getPlaidClient()
  const exchange = await client.itemPublicTokenExchange({ public_token: publicToken })
  const accessToken = exchange.data.access_token
  const plaidItemId = exchange.data.item_id

  const { data: accountsData } = await client.accountsGet({ access_token: accessToken })

  const item = await db.plaidItem.create({
    data: {
      userId, plaidItemId, accessTokenEncrypted: encryptToken(accessToken),
      institutionName: institutionName ?? null,
    },
  })

  await db.financialAccount.createMany({
    data: accountsData.accounts.map((a) => {
      const type = mapPlaidAccountType(a.type, a.subtype)
      return {
        userId, name: a.name, institution: institutionName ?? 'Bank', type,
        balance: plaidBalanceToAppBalance(a.balances.current ?? 0, type),
        plaidItemDbId: item.id, plaidAccountId: a.account_id,
      }
    }),
  })

  const result = await syncPlaidItem(item.id).catch(() => ({ synced: 0 }))

  return NextResponse.json({ itemId: item.id, accountsLinked: accountsData.accounts.length, transactionsSynced: result.synced }, { status: 201 })
})
