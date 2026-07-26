'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/stores/useStore'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free', name: 'Free', monthly: 0, annual: 0,
    blurb: 'Everything you need to start tracking.',
    features: ['Manual financial accounts', 'Manual transactions', 'Basic budgeting', 'Basic loan calculator', 'One saved debt-payoff plan', 'One stock watchlist', 'Basic reports'],
  },
  {
    id: 'pro', name: 'Pro', monthly: 8, annual: 76,
    blurb: 'Imports, unlimited plans, and deeper insight.',
    features: ['Everything in Free', 'CSV transaction imports', 'Unlimited budgets', 'Advanced loan scenarios', 'Unlimited debt-payoff plans', 'Savings goals', 'Advanced reports', 'Unlimited watchlists', 'Financial insights', 'Data exports'],
    recommended: true,
  },
  {
    id: 'household', name: 'Household', monthly: 14, annual: 134,
    blurb: 'Plan together with shared visibility.',
    features: ['Everything in Pro', 'Shared household dashboard', 'Shared budgets', 'Shared goals', 'Multiple members', 'Permission controls'],
  },
] as const

const comparison: [string, boolean | string, boolean | string, boolean | string][] = [
  ['Manual accounts & transactions', true, true, true],
  ['Budgets', 'Basic', 'Unlimited', 'Unlimited'],
  ['Loan calculator', 'Basic', 'Advanced scenarios', 'Advanced scenarios'],
  ['CSV transaction import', false, true, true],
  ['Debt-payoff plans', '1', 'Unlimited', 'Unlimited'],
  ['Savings goals', false, true, true],
  ['Reports', 'Basic', 'Advanced', 'Advanced'],
  ['Stock watchlists', '1', 'Unlimited', 'Unlimited'],
  ['Financial insights', false, true, true],
  ['Data export (CSV / JSON)', false, true, true],
  ['Shared household dashboard', false, false, true],
  ['Multiple members & permissions', false, false, true],
]

const faqs = [
  ['Can I switch plans later?', 'Yes — upgrade or downgrade at any time from Settings → Subscription. Changes are prorated.'],
  ['What happens to my data if I downgrade?', 'Nothing is deleted. Features beyond the Free tier become read-only until you upgrade again.'],
  ['Is there a free trial for Pro?', 'Yes, Pro includes a 14-day free trial. No credit card required to start.'],
  ['How does annual billing work?', 'Annual plans are billed once per year and save about 20% versus monthly billing.'],
]

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-success" />
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
  return <span className="text-xs font-medium">{v}</span>
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true)
  const currentPlan = useStore((s) => s.profile.plan)

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pricing that scales with your plan</h1>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when you want imports, unlimited plans, and shared household budgeting.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={cn('text-sm', !annual && 'font-semibold')}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
            <span className={cn('text-sm', annual && 'font-semibold')}>Annual</span>
            <Badge variant="secondary" className="bg-success-muted text-success">Save ~20%</Badge>
          </div>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.map((p, i) => {
            const price = annual ? p.annual : p.monthly * 12
            const isCurrent = currentPlan === p.id
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className={cn('relative h-full shadow-card', 'recommended' in p && p.recommended && 'border-primary shadow-lift')}>
                  {'recommended' in p && p.recommended && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>
                  )}
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold">{p.name}</h2>
                      {isCurrent && <Badge variant="secondary">Current plan</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-extrabold tnum">${annual ? p.annual : p.monthly}</span>
                      <span className="text-sm text-muted-foreground">{p.monthly === 0 ? ' forever' : annual ? ' / year' : ' / month'}</span>
                      {annual && p.monthly > 0 && (
                        <p className="mt-1 text-xs text-success">${(p.monthly * 12 - price).toFixed(0)} saved vs monthly</p>
                      )}
                    </div>
                    <ul className="mt-5 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-6 w-full" variant={'recommended' in p && p.recommended ? 'default' : 'outline'} disabled={isCurrent}>
                      <Link href="/sign-up">{isCurrent ? 'Your plan' : p.monthly === 0 ? 'Start free' : `Choose ${p.name}`}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Comparison table */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-16">
          <h2 className="text-center text-2xl font-bold">Compare plans</h2>
          <Card className="mt-6 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Feature</TableHead>
                    <TableHead className="text-center">Free</TableHead>
                    <TableHead className="text-center">Pro</TableHead>
                    <TableHead className="text-center">Household</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.map(([feature, f, p, h]) => (
                    <TableRow key={feature as string}>
                      <TableCell className="text-sm">{feature}</TableCell>
                      <TableCell className="text-center"><Cell v={f} /></TableCell>
                      <TableCell className="text-center"><Cell v={p} /></TableCell>
                      <TableCell className="text-center"><Cell v={h} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>

        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-2xl font-bold">Pricing FAQ</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map(([q, a], i) => (
              <AccordionItem key={i} value={`pfaq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">{q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  )
}
