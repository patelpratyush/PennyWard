import { db } from './db'
import { getPlaidClient } from './plaid'
import { decryptToken } from './plaidCrypto'
import { mapPlaidAccountType, plaidBalanceToAppBalance } from './plaidAccountType'
import { normalizePayee } from './payeeNormalize'
import { importHash } from './importHash'
import { round2 } from './format'

/**
 * R9.2/R9.4/R9.5: cursor-based incremental sync for one Plaid Item.
 * Stateless-resume — the cursor persisted on PlaidItem is Plaid's own
 * opaque continuation token, so a partial failure just resumes from the
 * last successfully-processed page on the next call, never reprocessing
 * or skipping pages.
 */
export async function syncPlaidItem(plaidItemDbId: string) {
  const item = await db.plaidItem.findUniqueOrThrow({ where: { id: plaidItemDbId } })
  const client = getPlaidClient()
  const accessToken = decryptToken(item.accessTokenEncrypted)

  let cursor = item.cursor ?? undefined
  let hasMore = true
  const added: import('plaid').Transaction[] = []
  const modified: import('plaid').Transaction[] = []
  const removed: import('plaid').RemovedTransaction[] = []

  try {
    while (hasMore) {
      const resp = await client.transactionsSync({ access_token: accessToken, cursor, count: 100 })
      added.push(...resp.data.added)
      modified.push(...resp.data.modified)
      removed.push(...resp.data.removed)
      hasMore = resp.data.has_more
      cursor = resp.data.next_cursor
    }
  } catch (err) {
    // R9.5: a revoked/expired login surfaces here as an ITEM_LOGIN_REQUIRED
    // Plaid error — mark the item so the UI can prompt a "fix connection"
    // re-link instead of silently failing every sync forever.
    const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code
    if (code === 'ITEM_LOGIN_REQUIRED') {
      await db.plaidItem.update({ where: { id: plaidItemDbId }, data: { status: 'login_required' } })
      return { synced: 0, loginRequired: true }
    }
    await db.plaidItem.update({ where: { id: plaidItemDbId }, data: { status: 'error' } })
    throw err
  }

  // Map Plaid account_id -> our FinancialAccount, lazily creating any new
  // account Plaid reports that we haven't seen yet (the user can add
  // accounts within an existing Item's Link session after the initial
  // connect — R9.3 "account auto-created and mapped").
  const existingAccounts = await db.financialAccount.findMany({ where: { plaidItemDbId } })
  const accountByPlaidId = new Map(existingAccounts.filter((a) => a.plaidAccountId).map((a) => [a.plaidAccountId!, a]))
  const unmappedIds = [...new Set([...added, ...modified].map((t) => t.account_id))].filter((id) => !accountByPlaidId.has(id))

  if (unmappedIds.length > 0) {
    const { data } = await client.accountsGet({ access_token: accessToken })
    for (const plaidAccount of data.accounts) {
      if (!unmappedIds.includes(plaidAccount.account_id)) continue
      const accountType = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype)
      const created = await db.financialAccount.create({
        data: {
          userId: item.userId, name: plaidAccount.name, institution: item.institutionName ?? 'Bank',
          type: accountType, balance: plaidBalanceToAppBalance(plaidAccount.balances.current ?? 0, accountType),
          plaidItemDbId, plaidAccountId: plaidAccount.account_id,
        },
      })
      accountByPlaidId.set(plaidAccount.account_id, created)
    }
  }

  for (const t of [...added, ...modified]) {
    const account = accountByPlaidId.get(t.account_id)
    if (!account || t.pending) continue // pending transactions aren't final — Plaid re-sends them as `modified` once posted

    const merchant = t.merchant_name ?? t.name
    // Plaid normalizes sign across every institution: positive = money out
    // (expense), negative = money in (income) — unlike raw bank CSVs, no
    // per-account-type flip is needed here (see imports.golden.test.ts for
    // the CSV case where it is needed).
    const type = t.amount > 0 ? 'expense' as const : 'income' as const
    const amount = round2(Math.abs(t.amount))
    const payeeNorm = normalizePayee(merchant)
    const hash = importHash(account.id, t.date, amount, payeeNorm)

    const byPlaidId = await db.transaction.findUnique({ where: { plaidTransactionId: t.transaction_id } })
    if (byPlaidId) {
      await db.transaction.update({
        where: { id: byPlaidId.id },
        data: { type, amount, merchant, date: new Date(t.date) },
      })
      continue
    }
    // R9.4: the same real-world charge may already exist from a prior CSV
    // import — attach this sync to that row instead of creating a duplicate.
    const byImportHash = await db.transaction.findUnique({ where: { userId_importHash: { userId: item.userId, importHash: hash } } })
    if (byImportHash) {
      await db.transaction.update({
        where: { id: byImportHash.id },
        data: { plaidTransactionId: t.transaction_id, source: 'plaid' },
      })
      continue
    }
    await db.transaction.create({
      data: {
        userId: item.userId, accountId: account.id, type, amount, merchant, date: new Date(t.date),
        source: 'plaid', plaidTransactionId: t.transaction_id, importHash: hash,
      },
    })
  }

  for (const r of removed) {
    await db.transaction.deleteMany({ where: { plaidTransactionId: r.transaction_id } })
  }

  // Refresh balances for every account under this item.
  const { data: balancesData } = await client.accountsGet({ access_token: accessToken })
  await Promise.all(balancesData.accounts.map(async (plaidAccount) => {
    const account = accountByPlaidId.get(plaidAccount.account_id)
    if (!account) return
    await db.financialAccount.update({
      where: { id: account.id },
      data: { balance: plaidBalanceToAppBalance(plaidAccount.balances.current ?? 0, account.type), lastUpdated: new Date() },
    })
  }))

  await db.plaidItem.update({ where: { id: plaidItemDbId }, data: { cursor, status: 'active' } })

  return { synced: added.length + modified.length, removed: removed.length, loginRequired: false }
}
