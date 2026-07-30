'use client'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--rule)] py-8 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-4">
        <span className="fig text-sm text-[var(--ink-3)]">{String(n).padStart(2, '0')}</span>
        <h2 className="display text-[1.375rem] leading-tight sm:text-[1.5rem]">{title}</h2>
      </div>
      <div className="mt-4 max-w-2xl space-y-3 pl-[2.4rem] text-[0.9375rem] leading-relaxed text-[var(--ink-2)]">
        {children}
      </div>
    </section>
  )
}

export function LegalContent({ kind }: { kind: 'privacy' | 'terms' }) {
  return (
    <div className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[900px]">
        <div className="kicker flex items-center gap-3 text-[var(--ink-3)]">
          <span className="inline-block h-px w-10 bg-[var(--rust)]" />
          Legal
        </div>
        <h1 className="display mt-6 text-[2.75rem] leading-[0.96] sm:text-[3.5rem]">
          {kind === 'privacy' ? (
            <>Privacy <span className="display-i">policy.</span></>
          ) : (
            <>Terms of <span className="display-i">service.</span></>
          )}
        </h1>
        <p className="kicker mt-4 text-[var(--ink-3)]">
          Last updated: July 2026 · Fictional demo document
        </p>

        <div className="mt-14 border border-[var(--ink)] bg-[var(--paper-2)] px-6 py-2 sm:px-9">
          {kind === 'privacy' ? (
            <>
              <Section n={1} title="What we collect">
                <p>Pennyward stores the financial information you enter: accounts, transactions, budgets, debts, goals, bills, and preferences. In this demo, all of it lives in your browser’s local storage and never reaches a server.</p>
                <p>In the production service, we collect your name, email, and the data you add to the app. Optional bank connections are handled by Plaid — Pennyward receives read-only transaction and balance data, never your bank credentials.</p>
              </Section>
              <Section n={2} title="What we never do">
                <p>We never sell, rent, or trade your personal financial data. We never show third-party advertising inside the product. We never use your transaction data to train models without explicit consent.</p>
              </Section>
              <Section n={3} title="How data is protected">
                <p>Production data is encrypted in transit (TLS) and at rest. Access follows least-privilege principles. See the Security page for details.</p>
              </Section>
              <Section n={4} title="Your controls">
                <p>You can export all of your data (CSV or JSON) and delete your account at any time from Settings → Data. Deletion removes your data from our systems within 30 days, except where law requires retention.</p>
              </Section>
              <Section n={5} title="Contact">
                <p>Privacy questions: privacy@pennyward.example.</p>
              </Section>
            </>
          ) : (
            <>
              <Section n={1} title="The service">
                <p>Pennyward provides personal-finance tracking, budgeting, loan calculation, and planning tools. Pennyward is not a bank, lender, broker, or financial advisor, and does not provide investment, tax, or legal advice.</p>
              </Section>
              <Section n={2} title="Your responsibilities">
                <p>You are responsible for the accuracy of the data you enter and for decisions you make based on the calculations provided. Calculations are estimates — verify figures with your lender or institution before acting.</p>
              </Section>
              <Section n={3} title="Subscriptions">
                <p>Paid plans renew automatically until cancelled. You can cancel at any time; access continues until the end of the current billing period. Annual plans are refundable within 30 days of purchase.</p>
              </Section>
              <Section n={4} title="Acceptable use">
                <p>Do not misuse the service, attempt to access other users’ data, or use Pennyward for unlawful purposes.</p>
              </Section>
              <Section n={5} title="Liability">
                <p>The service is provided “as is.” To the maximum extent permitted by law, Pennyward is not liable for indirect or consequential damages arising from use of the service.</p>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
