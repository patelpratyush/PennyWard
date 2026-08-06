import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'

/**
 * Full account data export (PRD F14). Dumps every Postgres-backed table
 * scoped to the caller, alongside the legacy client-only backup (bills,
 * profile prefs, notifications) which the client merges in separately —
 * see app/app/settings/[section]/page.tsx's exportBackup().
 */
export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()

  const [
    accounts, balanceSnapshots, categories, transactions, budgets,
    debts, payoffScenarios, loanScenarios, goals, holdings,
    recurringSeries, categorizationRules,
  ] = await Promise.all([
    db.financialAccount.findMany({ where: { userId } }),
    db.balanceSnapshot.findMany({ where: { userId } }),
    db.category.findMany({ where: { userId } }),
    db.transaction.findMany({ where: { userId } }),
    db.budget.findMany({ where: { userId }, include: { entries: true } }),
    db.debt.findMany({ where: { userId } }),
    db.payoffScenario.findMany({ where: { userId } }),
    db.loanScenario.findMany({ where: { userId } }),
    db.goal.findMany({ where: { userId }, include: { contributions: true } }),
    db.holding.findMany({ where: { userId } }),
    db.recurringSeries.findMany({ where: { userId } }),
    db.categorizationRule.findMany({ where: { userId } }),
  ])

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    userId,
    accounts, balanceSnapshots, categories, transactions, budgets,
    debts, payoffScenarios, loanScenarios, goals, holdings,
    recurringSeries, categorizationRules,
  })
})
