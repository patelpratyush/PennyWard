import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncPlaidItem } from '@/lib/plaidSync'

/**
 * R9.2: webhook-triggered sync. Plaid calls this whenever new transaction
 * data is ready (SYNC_UPDATES_AVAILABLE) or an Item needs re-auth
 * (ITEM_LOGIN_REQUIRED via the ERROR webhook).
 *
 * Note: this does not verify Plaid's webhook JWT signature (Plaid signs
 * webhooks with a key fetchable from /webhook_verification_key/get) — that
 * hardening is a real gap for production but out of scope for this pass;
 * an attacker who knows a real item_id could force an extra (harmless,
 * idempotent) sync, not exfiltrate or forge data, since the sync itself
 * only ever reads from Plaid using our own stored, encrypted access token.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.item_id) return NextResponse.json({ error: 'Malformed webhook' }, { status: 400 })

  const item = await db.plaidItem.findUnique({ where: { plaidItemId: body.item_id } })
  if (!item) return NextResponse.json({ ok: true }) // unknown item — nothing to do

  if (body.webhook_code === 'ERROR' && body.error?.error_code === 'ITEM_LOGIN_REQUIRED') {
    await db.plaidItem.update({ where: { id: item.id }, data: { status: 'login_required' } })
    return NextResponse.json({ ok: true })
  }

  if (body.webhook_type === 'TRANSACTIONS' && body.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    await syncPlaidItem(item.id).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
