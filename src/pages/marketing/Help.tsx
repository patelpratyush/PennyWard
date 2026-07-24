import { useState } from 'react'
import { Link } from 'react-router'
import { Calculator, CreditCard, FileUp, Goal, Landmark, LifeBuoy, PiggyBank, Receipt, Search, Wallet } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const topics = [
  { icon: Receipt, title: 'Transactions', desc: 'Adding, editing, splitting, and importing transactions.' },
  { icon: Wallet, title: 'Budgets', desc: 'Monthly budgets, rollover, and money left to assign.' },
  { icon: FileUp, title: 'CSV import', desc: 'Column mapping, duplicates, and error reports.' },
  { icon: Calculator, title: 'Loan calculators', desc: 'Car loans, extra payments, and amortization.' },
  { icon: CreditCard, title: 'Debt payoff', desc: 'Snowball vs. avalanche and saved plans.' },
  { icon: PiggyBank, title: 'Goals', desc: 'Savings targets, contributions, and milestones.' },
  { icon: Landmark, title: 'Accounts', desc: 'Balances, net-worth inclusion, and archiving.' },
  { icon: Goal, title: 'Bills & reminders', desc: 'Recurrence, autopay, and the payment calendar.' },
]

const articles: [string, string, string][] = [
  ['Getting started', 'How do I set up FinPilot for the first time?', 'Create an account, complete the seven-step onboarding (goals, preferences, accounts, data, debts, budget), and your dashboard fills in automatically. You can also load sample data to explore first.'],
  ['CSV import', 'Which CSV formats are supported?', 'Any CSV with a date column and either a signed amount column or separate debit/credit columns. You map the columns yourself, so almost every bank export works.'],
  ['CSV import', 'How does duplicate detection work?', 'FinPilot compares account, date, amount, and merchant text. Likely duplicates are shown for review — you can skip them, import them anyway, or inspect each one.'],
  ['Budgets', 'What does “money left to assign” mean?', 'It is your expected monthly income minus the amounts budgeted across categories and your savings target. When it reaches zero, every dollar has a job.'],
  ['Loans', 'How are extra payments applied?', 'Extra monthly payments go entirely to principal. FinPilot recalculates the schedule, showing interest saved and how many months earlier you will pay the loan off.'],
  ['Debt payoff', 'Snowball or avalanche — which should I pick?', 'Avalanche minimizes interest by attacking the highest APR first. Snowball pays the smallest balance first for quicker wins. The planner shows both side by side so you can compare real dates and dollars.'],
  ['Accounts', 'Can I exclude an account from net worth?', 'Yes. Open the account menu and toggle “Include in net worth.” The balance still appears on the Accounts page.'],
  ['Data', 'Where is my data stored in this demo?', 'Everything is stored in your browser’s local storage. Use Settings → Data to export a JSON backup, restore it, or reset to sample data.'],
]

export default function Help() {
  const [query, setQuery] = useState('')
  const filtered = articles.filter(([t, q, a]) =>
    `${t} ${q} ${a}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Help center</h1>
          <p className="mt-3 text-muted-foreground">Guides and answers for every part of FinPilot.</p>
          <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles…" className="h-12 pl-10" />
          </div>
        </div>

        {!query && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((t) => (
              <Card key={t.title} className="shadow-card transition-shadow hover:shadow-lift">
                <CardContent className="p-4">
                  <t.icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-2 text-sm font-semibold">{t.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-bold">{query ? `Results for “${query}”` : 'Popular articles'}</h2>
          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No articles matched. Try a different search, or <Link to="/contact" className="text-primary hover:underline">contact us</Link>.</p>
          ) : (
            <Accordion type="single" collapsible className="mt-4">
              {filtered.map(([topic, q, a], i) => (
                <AccordionItem key={i} value={`art-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    <span><span className="mr-2 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{topic}</span>{q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  )
}
