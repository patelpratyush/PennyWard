'use client'
import { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { AlertTriangle, Landmark, Link2, RefreshCw, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import {
  usePlaidItems, useCreateLinkToken, useExchangePlaidToken, useSyncPlaidItem, useUnlinkPlaidItem,
} from '@/hooks/queries/usePlaid'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

/** R9.1: "Connect a bank" button — creates a Link token, opens Plaid Link,
 * exchanges the resulting public_token for a real (encrypted) access token
 * on success. `itemId` set means this is a re-link (update mode) for an
 * item flagged ITEM_LOGIN_REQUIRED rather than a brand-new connection. */
function PlaidConnectButton({ itemId, label }: { itemId?: string; label: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const createLinkToken = useCreateLinkToken()
  const exchangeToken = useExchangePlaidToken()

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      if (!publicToken) return
      exchangeToken.mutate(
        { publicToken, institutionName: metadata.institution?.name ?? undefined },
        {
          onSuccess: (res) => toast.success(`${metadata.institution?.name ?? 'Bank'} connected — ${res.accountsLinked} account${res.accountsLinked === 1 ? '' : 's'}, ${res.transactionsSynced} transactions synced.`),
          onError: () => toast.error('Could not finish connecting this bank.'),
        },
      )
      setLinkToken(null)
    },
    onExit: () => setLinkToken(null),
  })

  useEffect(() => { if (linkToken && ready) open() }, [linkToken, ready, open])

  const start = () => {
    createLinkToken.mutate(itemId, {
      onSuccess: (data) => setLinkToken(data.linkToken),
      onError: () => toast.error('Could not start the bank connection.'),
    })
  }

  return (
    <Button onClick={start} disabled={createLinkToken.isPending} variant={itemId ? 'outline' : 'default'} size={itemId ? 'sm' : 'default'}>
      <Link2 className="mr-1.5 h-4 w-4" />{label}
    </Button>
  )
}

/** R9.5: lists connected banks with a manual sync/refresh button and an
 * ITEM_LOGIN_REQUIRED "fix connection" banner (re-link via update-mode Link
 * instead of silently failing every future sync). */
export function PlaidItemsCard() {
  const { data: items = [], isLoading } = usePlaidItems()
  const syncItem = useSyncPlaidItem()
  const unlinkItem = useUnlinkPlaidItem()

  if (isLoading) return null

  return (
    <Card className="mb-4 shadow-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Landmark className="h-4 w-4" />Connected banks</p>
          <PlaidConnectButton label={items.length === 0 ? 'Connect a bank' : 'Connect another bank'} />
        </div>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No banks connected yet — link one to sync transactions and balances automatically.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{item.institutionName ?? 'Bank'}</p>
              <p className="text-xs text-muted-foreground">{item.accounts.length} account{item.accounts.length === 1 ? '' : 's'} · connected {formatDate(item.createdAt, 'MMM d, yyyy')}</p>
              {item.status === 'login_required' && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5" />Connection needs attention</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {item.status === 'login_required' ? (
                <PlaidConnectButton itemId={item.id} label="Fix connection" />
              ) : (
                <Button
                  variant="outline" size="sm" disabled={syncItem.isPending}
                  onClick={() => syncItem.mutate(item.id, {
                    onSuccess: (res) => toast.success(`${res.synced} transaction${res.synced === 1 ? '' : 's'} synced.`),
                    onError: () => toast.error('Sync failed — try again in a moment.'),
                  })}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Sync
                </Button>
              )}
              <Button
                variant="ghost" size="sm" className="text-muted-foreground"
                onClick={() => unlinkItem.mutate(item.id, {
                  onSuccess: () => toast.success('Bank disconnected. Your transaction history is kept.'),
                  onError: () => toast.error('Could not disconnect this bank.'),
                })}
              >
                <Unlink className="mr-1.5 h-3.5 w-3.5" />Disconnect
              </Button>
            </div>
          </div>
        ))}
        {items.some((i) => i.status === 'login_required') && (
          <Badge variant="outline" className="text-warning">Some connections need re-authentication</Badge>
        )}
      </CardContent>
    </Card>
  )
}

export { PlaidConnectButton }
