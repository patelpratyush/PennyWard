'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import {
  ArrowRight, Bell, Calculator, Car, CheckCircle2, Download, FileBarChart,
  Landmark, LineChart as LineChartIcon, Lock, PiggyBank, Receipt,
  ShieldCheck, SlidersHorizontal, TrendingUp, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Money } from '@/components/shared/Money'
import { calculateCarLoan } from '@/lib/finance/carLoan'

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, delay: i * 0.06 },
})

const cashflowData = [
  { m: 'Feb', income: 6250, expenses: 4180 },
  { m: 'Mar', income: 6250, expenses: 4460 },
  { m: 'Apr', income: 6250, expenses: 4020 },
  { m: 'May', income: 6250, expenses: 4310 },
  { m: 'Jun', income: 6250, expenses: 3980 },
  { m: 'Jul', income: 6250, expenses: 3420 },
]

const categoryData = [
  { name: 'Housing', value: 1650, color: 'hsl(var(--chart-1))' },
  { name: 'Transport', value: 880, color: 'hsl(var(--chart-2))' },
  { name: 'Food', value: 640, color: 'hsl(var(--chart-3))' },
  { name: 'Lifestyle', value: 410, color: 'hsl(var(--chart-6))' },
  { name: 'Utilities', value: 240, color: 'hsl(var(--chart-4))' },
]

const debtData = [
  { m: 'Feb', balance: 50200 }, { m: 'Mar', balance: 49400 }, { m: 'Apr', balance: 48600 },
  { m: 'May', balance: 47900 }, { m: 'Jun', balance: 47400 }, { m: 'Jul', balance: 46970 },
  { m: 'Aug', balance: 46200 }, { m: 'Sep', balance: 45400 },
]

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative mx-auto mt-14 max-w-5xl"
    >
      <div className="rounded-2xl border bg-card p-3 shadow-lift sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Net worth</p>
              <p className="mt-1 text-2xl font-bold tnum">-$8,810</p>
              <div className="mt-2 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={debtData}>
                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.15)" strokeWidth={2} isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Spending in July</p>
              <p className="mt-1 text-2xl font-bold tnum">$3,420</p>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={72} className="h-2" />
                <span className="text-xs font-semibold text-muted-foreground tnum">72%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">of $4,750 budget</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Emergency fund</p>
              <p className="mt-1 text-2xl font-bold tnum">$8,000 <span className="text-sm font-medium text-muted-foreground">/ $15,000</span></p>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={53} className="h-2" />
                <span className="text-xs font-semibold text-success tnum">53%</span>
              </div>
              <p className="mt-2 text-xs text-success">On track · Dec 2027</p>
            </CardContent>
          </Card>
          <Card className="shadow-none sm:col-span-2">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Cash flow</p>
              <div className="mt-1 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowData} barGap={2}>
                    <XAxis dataKey="m" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Bar dataKey="income" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Spending by category</p>
              <div className="mx-auto mt-1 h-28 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={2} strokeWidth={0}>
                      {categoryData.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="pointer-events-none absolute -inset-x-8 -top-8 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
    </motion.div>
  )
}

const trustItems = [
  { icon: Lock, title: 'Private by design', text: 'Your data stays yours. FinPilot runs on your device in this demo, with encrypted connections planned for sync.' },
  { icon: Landmark, title: 'Read-only connections', text: 'Future bank connections via Plaid will be read-only — FinPilot can never move your money.' },
  { icon: ShieldCheck, title: 'No selling data', text: 'We never sell personal financial data. Our business model is subscriptions, not advertising.' },
  { icon: CheckCircle2, title: 'Secure authentication', text: 'Modern authentication with planned two-factor support and session controls.' },
  { icon: Download, title: 'Easy export', text: 'Export every transaction, budget, and plan as CSV or JSON whenever you want.' },
  { icon: Bell, title: 'Deletion controls', text: 'Delete your account and all associated data at any time from settings.' },
]

const features = [
  { icon: Receipt, title: 'Spending tracking', text: 'Import CSV files or add transactions manually. Filter, split, tag, and search everything.' },
  { icon: Wallet, title: 'Monthly budgeting', text: 'Category budgets with rollover, suggested amounts, and clear on-track indicators.' },
  { icon: Car, title: 'Car-loan calculations', text: 'Taxes, fees, trade-ins, and extra payments — see the true cost of a vehicle before you buy.' },
  { icon: TrendingUp, title: 'Debt payoff planning', text: 'Compare snowball, avalanche, and custom strategies with real payoff dates and interest saved.' },
  { icon: PiggyBank, title: 'Savings goals', text: 'Emergency funds, vacations, and down payments with milestones and required monthly contributions.' },
  { icon: Bell, title: 'Bills & payment calendar', text: 'Recurring bills, autopay tracking, reminders, and a monthly due-date calendar.' },
  { icon: LineChartIcon, title: 'Net-worth tracking', text: 'Assets minus liabilities over time, broken down by account.' },
  { icon: SlidersHorizontal, title: 'Stock watchlists', text: 'Follow companies you care about with watchlists, notes, and price history — no trading pressure.' },
  { icon: FileBarChart, title: 'Financial reports', text: 'Monthly spending, cash flow, budget performance, and net-worth reports with CSV export.' },
  { icon: Calculator, title: 'Decision simulator', text: 'Model “what if” purchases and see the effect on monthly cash flow and long-term interest.' },
]

const testimonials = [
  { name: 'Maya R.', role: 'Nurse, paying off two car loans', initials: 'MR', quote: 'The car-loan calculator showed me the doc fees and tax rolled into financing before I signed. I negotiated $900 off because of it.' },
  { name: 'Daniel K.', role: 'New parent building an emergency fund', initials: 'DK', quote: 'Seeing the exact month my card hits zero kept me consistent. The snowball plan is simple and it just works.' },
  { name: 'Priya S.', role: 'First-time budgeter', initials: 'PS', quote: 'CSV import took ten minutes and suddenly I could see where the money actually goes. The budget view is calm, not judgy.' },
]

const faqs = [
  ['Is FinPilot secure?', 'Yes. This demo stores data only in your browser. The production service is designed around encrypted transport, read-only bank connections, and secure authentication. We never sell personal financial data.'],
  ['Can I connect my bank?', 'Bank connections through Plaid are on the roadmap and will be strictly read-only. Today, CSV import covers every major bank export format.'],
  ['How does CSV import work?', 'Upload a CSV from your bank, map the date, amount, and merchant columns, preview the rows, and FinPilot flags duplicates before importing.'],
  ['How accurate are the loan calculations?', 'FinPilot uses standard amortization math with cent-level rounding, supports extra and one-time payments, 0% APR loans, and adjusts the final payment so balances never go negative.'],
  ['Does FinPilot give financial advice?', 'No. FinPilot provides calculations, tracking, and educational information. It does not provide investment, tax, or legal advice.'],
  ['Can I cancel anytime?', 'Yes. Cancel from Settings → Subscription. Your data remains exportable, and the Free plan stays available.'],
  ['Can I export my data?', 'Yes — every report exports to CSV, and Settings → Data exports your entire workspace as JSON.'],
  ['Is there a mobile app?', 'A React Native app is planned and will use the same backend. The web app is fully responsive and works well on phones today.'],
]

export default function Landing() {
  // Live example of the financial decision simulator
  const sim = calculateCarLoan({
    vehiclePrice: 38500, downPayment: 5000, tradeInValue: 0, tradeInOwed: 0, rebate: 0,
    taxRate: 6.625, docFee: 399, registrationFee: 240, destinationFee: 1395, dealerFees: 0,
    apr: 5.99, termMonths: 60, startDate: new Date().toISOString().slice(0, 10),
    extraMonthly: 100, oneTimePayment: 0,
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div {...fade()}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Budgets · Loans · Debt payoff · Goals — one dashboard
            </Badge>
          </motion.div>
          <motion.h1 {...fade(1)} className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            Know where your money goes. <span className="text-primary">Build a plan</span> for where it should go next.
          </motion.h1>
          <motion.p {...fade(2)} className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            FinPilot helps you track spending, create budgets, calculate loans, eliminate debt, manage savings goals, and understand your financial future from one clear dashboard.
          </motion.p>
          <motion.div {...fade(3)} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link href="/sign-up">Start for free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link href="/app/dashboard">View interactive demo</Link>
            </Button>
          </motion.div>
        </div>
        <HeroPreview />
      </section>

      {/* Trust */}
      <section className="border-y bg-muted/30 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...fade()} className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Built for trust</motion.h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((t, i) => (
              <motion.div key={t.title} {...fade(i)}>
                <Card className="h-full shadow-card">
                  <CardContent className="flex gap-3 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{t.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fade()} className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything your money needs, in one place</h2>
            <p className="mt-3 text-muted-foreground">Ten focused tools that answer the questions you actually ask about your finances.</p>
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fade(i % 3)}>
                <Card className="group h-full shadow-card transition-shadow hover:shadow-lift">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision simulator */}
      <section className="border-y bg-muted/30 px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <motion.div {...fade()}>
            <Badge variant="secondary" className="mb-3">Financial decision simulator</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              “What happens if I buy a $38,500 vehicle with $5,000 down at 5.99% APR?”
            </h2>
            <p className="mt-4 text-muted-foreground">
              FinPilot runs the full math instantly — taxes, fees, financing, and the effect of extra payments — so you can decide with real numbers instead of guesses.
            </p>
            <Button asChild className="mt-6">
              <Link href="/app/loans/car-calculator">Try the car-loan calculator <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </motion.div>
          <motion.div {...fade(1)}>
            <Card className="shadow-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Live calculation — 60-month loan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount financed</span><Money value={sim.amountFinanced} className="font-semibold" /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estimated payment</span><Money value={sim.standardMonthlyPayment} className="font-semibold" /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total interest (standard)</span><Money value={sim.totalInterest + sim.interestSaved} className="font-semibold" /></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">With $100 extra per month</span><Money value={sim.standardMonthlyPayment + 100} className="font-semibold text-primary" /></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Interest saved</span><Money value={sim.interestSaved} className="font-semibold text-success" /></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Paid off</span><span className="font-semibold tnum">{sim.monthsSaved} months earlier</span></div>
                </div>
                <div className="h-24 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.schedule.filter((_, i) => i % 6 === 0)}>
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Line type="monotone" dataKey="endingBalance" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground">Estimates only. Taxes and fees vary by state and dealer.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...fade()} className="text-center text-2xl font-bold tracking-tight sm:text-3xl">People plan with FinPilot</motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...fade(i)}>
                <Card className="h-full shadow-card">
                  <CardContent className="p-5">
                    <p className="text-sm leading-relaxed">“{t.quote}”</p>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{t.initials}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-y bg-muted/30 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fade()} className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free. Upgrade when you need imports, unlimited plans, and insights.</p>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { name: 'Free', price: '$0', blurb: 'Manual tracking and basic budgeting.', cta: 'Start free' },
              { name: 'Pro', price: '$8/mo', blurb: 'CSV imports, unlimited budgets, advanced scenarios.', cta: 'Go Pro', featured: true },
              { name: 'Household', price: '$14/mo', blurb: 'Shared dashboards, budgets, and goals.', cta: 'Choose Household' },
            ].map((p, i) => (
              <motion.div key={p.name} {...fade(i)}>
                <Card className={p.featured ? 'h-full border-primary shadow-lift' : 'h-full shadow-card'}>
                  <CardContent className="p-6 text-center">
                    {p.featured && <Badge className="mb-2">Recommended</Badge>}
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="mt-2 text-3xl font-bold tnum">{p.price}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                    <Button asChild className="mt-4 w-full" variant={p.featured ? 'default' : 'outline'}>
                      <Link href="/pricing">{p.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <motion.h2 {...fade()} className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</motion.h2>
          <motion.div {...fade(1)} className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map(([q, a], i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
          <motion.div {...fade(2)} className="mt-12 rounded-2xl bg-primary p-8 text-center text-primary-foreground">
            <h3 className="text-xl font-bold">Take the pilot seat of your finances</h3>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-90">Free plan, no credit card required. Import your first CSV in minutes.</p>
            <Button asChild size="lg" variant="secondary" className="mt-5">
              <Link href="/sign-up">Start for free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
