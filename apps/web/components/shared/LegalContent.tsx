'use client'
import { Card, CardContent } from '@/components/ui/card'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function LegalContent({ kind }: { kind: 'privacy' | 'terms' }) {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {kind === 'privacy' ? 'Privacy policy' : 'Terms of service'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026 · Fictional demo document</p>
        <Card className="mt-8 shadow-card">
          <CardContent className="p-6 sm:p-8">
            {kind === 'privacy' ? (
              <>
                <Section title="1. What we collect">
                  <p>FinPilot stores the financial information you enter: accounts, transactions, budgets, debts, goals, bills, and preferences. In this demo, all of it lives in your browser’s local storage and never reaches a server.</p>
                  <p>In the production service, we collect your name, email, and the data you add to the app. Optional bank connections are handled by Plaid — FinPilot receives read-only transaction and balance data, never your bank credentials.</p>
                </Section>
                <Section title="2. What we never do">
                  <p>We never sell, rent, or trade your personal financial data. We never show third-party advertising inside the product. We never use your transaction data to train models without explicit consent.</p>
                </Section>
                <Section title="3. How data is protected">
                  <p>Production data is encrypted in transit (TLS) and at rest. Access follows least-privilege principles. See the Security page for details.</p>
                </Section>
                <Section title="4. Your controls">
                  <p>You can export all of your data (CSV or JSON) and delete your account at any time from Settings → Data. Deletion removes your data from our systems within 30 days, except where law requires retention.</p>
                </Section>
                <Section title="5. Contact">
                  <p>Privacy questions: privacy@finpilot.example.</p>
                </Section>
              </>
            ) : (
              <>
                <Section title="1. The service">
                  <p>FinPilot provides personal-finance tracking, budgeting, loan calculation, and planning tools. FinPilot is not a bank, lender, broker, or financial advisor, and does not provide investment, tax, or legal advice.</p>
                </Section>
                <Section title="2. Your responsibilities">
                  <p>You are responsible for the accuracy of the data you enter and for decisions you make based on the calculations provided. Calculations are estimates — verify figures with your lender or institution before acting.</p>
                </Section>
                <Section title="3. Subscriptions">
                  <p>Paid plans renew automatically until cancelled. You can cancel at any time; access continues until the end of the current billing period. Annual plans are refundable within 30 days of purchase.</p>
                </Section>
                <Section title="4. Acceptable use">
                  <p>Do not misuse the service, attempt to access other users’ data, or use FinPilot for unlawful purposes.</p>
                </Section>
                <Section title="5. Liability">
                  <p>The service is provided “as is.” To the maximum extent permitted by law, FinPilot is not liable for indirect or consequential damages arising from use of the service.</p>
                </Section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
