import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import {
  ArrowRight, Bell, Calculator, Car, CreditCard, FileBarChart, Goal,
  Landmark, LineChart, PiggyBank, Receipt, ShieldCheck, TrendingUp, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const spark = [
  { v: 10 }, { v: 14 }, { v: 12 }, { v: 18 }, { v: 16 }, { v: 22 }, { v: 20 }, { v: 26 },
]

const sections = [
  { id: 'dashboard', icon: LineChart, title: 'Dashboard', text: 'A calm morning briefing: net worth, cash flow, budget progress, upcoming bills, goals, and rules-based insights — all in one glance.',
    bullets: ['Six summary cards with trends and sparklines', 'Income vs. expenses chart with period controls', 'Customizable, reorderable widgets'] },
  { id: 'transactions', icon: Receipt, title: 'Transactions', text: 'Every dollar, accounted for. Add manually, import CSVs, split across categories, tag, filter, and bulk-edit.',
    bullets: ['Powerful filters: account, category, amount, tags', 'Split transactions and transfers', 'Bulk category updates and delete'] },
  { id: 'budgeting', icon: Wallet, title: 'Budgeting', text: 'A monthly budget workspace with grouped categories, rollover, suggested amounts, and money-left-to-assign.',
    bullets: ['On-track / near-limit / over-budget statuses', 'Copy last month, reorder categories', 'Detail drawer with spending trends'] },
  { id: 'accounts', icon: Landmark, title: 'Accounts', text: 'Checking, savings, credit cards, loans, and investments grouped cleanly with balance history and stats.',
    bullets: ['Include or exclude from net worth', 'Manual balance adjustments', 'Per-account inflow and outflow stats'] },
  { id: 'car-loans', icon: Car, title: 'Car loans', text: 'The most complete car calculator: taxes, fees, trade-in equity, rebates, extra payments, and affordability.',
    bullets: ['Cash due at signing and amount financed', 'Standard vs. accelerated payoff charts', 'Transportation-cost affordability check'] },
  { id: 'loans', icon: Calculator, title: 'General loans', text: 'Personal, student, and fixed-rate installment loans with full amortization schedules.',
    bullets: ['Extra and one-time payment modeling', 'Year-grouped amortization tables', 'CSV export and print'] },
  { id: 'debt-payoff', icon: CreditCard, title: 'Debt payoff', text: 'Snowball, avalanche, or your own order. See your debt-free date, interest saved, and month-by-month allocation.',
    bullets: ['Strategy comparison table', 'Payoff timeline and milestones', 'Saved plans you can revisit'] },
  { id: 'goals', icon: PiggyBank, title: 'Goals', text: 'Emergency funds, vacations, and down payments with required monthly contributions and milestone celebrations.',
    bullets: ['On-track detection', 'Contribution history', 'Completion estimates'] },
  { id: 'bills', icon: Bell, title: 'Bills', text: 'A monthly calendar of due dates, autopay status, reminders, and income events.',
    bullets: ['Weekly to annual recurrence', 'Mark paid or skip an occurrence', 'Overdue section'] },
  { id: 'stocks', icon: TrendingUp, title: 'Stocks', text: 'Informational watchlists with notes and price history — designed for awareness, not day-trading.',
    bullets: ['Search by company or ticker', 'Multiple watchlists with notes', 'Educational disclaimer throughout'] },
  { id: 'reports', icon: FileBarChart, title: 'Reports', text: 'Monthly spending, cash flow, budget performance, and net-worth reports — all exportable.',
    bullets: ['Date, account, and category filters', 'Charts plus data tables', 'CSV export and print'] },
  { id: 'security', icon: ShieldCheck, title: 'Security', text: 'Private by design with read-only connections planned, easy export, and full deletion controls.',
    bullets: ['No selling personal data', 'Two-factor authentication roadmap', 'Session management'] },
]

export default function Features() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">Product tour</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Every tool your money needs</h1>
          <p className="mt-3 text-muted-foreground">Twelve focused features that work together — from daily spending to long-term debt freedom.</p>
        </motion.div>

        <div className="mt-14 space-y-6">
          {sections.map((s, i) => (
            <motion.section
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              className="scroll-mt-24"
            >
              <Card className="overflow-hidden shadow-card">
                <div className={`grid items-stretch md:grid-cols-2 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold">{s.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    <ul className="mt-4 space-y-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <Goal className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {/* Coded UI preview */}
                  <div className="flex items-center justify-center border-t bg-muted/40 p-6 md:border-l md:border-t-0">
                    <Card className="w-full max-w-sm shadow-none">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{s.title} preview</span>
                          <Badge variant="secondary" className="text-[10px]">Live UI</Badge>
                        </div>
                        <div className="text-2xl font-bold tnum">{['$4,820.40', '$1,330 left', '$46,970', '53%'][i % 4]}</div>
                        <Progress value={[72, 53, 41, 66][i % 4]} className="h-2" />
                        <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spark}>
                              <Area type="monotone" dataKey="v" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-2 flex-1 rounded bg-muted" />
                          <div className="h-2 w-1/3 rounded bg-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </Card>
            </motion.section>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button asChild size="lg">
            <Link to="/sign-up">Start for free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
