'use client'
import { useMemo } from 'react'
import { AlertTriangle, Ban, Check, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { useRecurring, useRecurringAction } from '@/hooks/queries/useRecurring'
import { PageHeader } from '@/components/shared/Misc'
import { EmptyState, LoadingSkeleton } from '@/components/shared/States'
import { Money } from '@/components/shared/Money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate, round2 } from '@/lib/format'
import type { Cadence } from '@/lib/finance/recurring'

const CADENCE_LABEL: Record<Cadence, string> = { weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', annual: 'Annual' }
const OCCURRENCES_PER_YEAR: Record<Cadence, number> = { weekly: 52, biweekly: 26, monthly: 12, annual: 1 }

export default function Subscriptions() {
  const { data: series = [], isLoading } = useRecurring()
  const action = useRecurringAction()

  const expenses = useMemo(() => series.filter((s) => s.type === 'expense'), [series])
  const annualTotal = useMemo(
    () => round2(expenses.reduce((sum, s) => sum + s.avgAmount * OCCURRENCES_PER_YEAR[s.cadence], 0)),
    [expenses])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Subscriptions" description="Recurring charges detected from your transaction history." />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Recurring charges detected from your transaction history — nothing here is billed by Pennyward."
      />

      {expenses.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-6 w-6" />}
          title="No recurring charges detected yet"
          description="As you add transactions, Pennyward looks for payees with a consistent amount and cadence."
        />
      ) : (
        <>
          <Card className="mb-4 shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">Estimated annual cost</p>
                <Money value={annualTotal} className="mt-1 block text-2xl font-bold" decimals={0} />
              </div>
              <p className="text-sm text-muted-foreground">{expenses.length} recurring charge{expenses.length === 1 ? '' : 's'}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {expenses.map((s) => (
              <Card key={s.payeeNorm} className="shadow-card">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{s.displayName}</p>
                      <Badge variant="outline">{CADENCE_LABEL[s.cadence]}</Badge>
                      {s.confirmed && <Badge className="bg-success-muted text-success"><Check className="mr-1 h-3 w-3" />Confirmed</Badge>}
                      {s.priceIncreased && (
                        <Badge className="bg-warning-muted text-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {formatCurrency(s.previousAmount ?? 0, { decimals: 2 })} → {formatCurrency(s.lastAmount, { decimals: 2 })}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Next expected {formatDate(s.nextExpected, 'MMM d, yyyy')} · {s.occurrences} occurrences seen
                    </p>
                  </div>
                  <Money value={s.avgAmount} className="text-lg font-bold" />
                  <div className="flex gap-1.5">
                    {!s.confirmed && (
                      <Button
                        variant="outline" size="sm"
                        onClick={() => action.mutate({ payeeNorm: s.payeeNorm, cadence: s.cadence, action: 'confirm' }, {
                          onSuccess: () => toast.success(`${s.displayName} confirmed as recurring.`),
                          onError: () => toast.error('Could not confirm this series.'),
                        })}
                      >
                        <Check className="mr-1.5 h-4 w-4" />Confirm
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm" className="text-muted-foreground"
                      onClick={() => action.mutate({ payeeNorm: s.payeeNorm, cadence: s.cadence, action: 'dismiss' }, {
                        onSuccess: () => toast.success(`${s.displayName} dismissed.`),
                        onError: () => toast.error('Could not dismiss this series.'),
                      })}
                    >
                      <Ban className="mr-1.5 h-4 w-4" />Not recurring
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
