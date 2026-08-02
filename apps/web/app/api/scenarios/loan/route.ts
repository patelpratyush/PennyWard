import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { withAuthErrorHandling } from '@/lib/withAuth'
import { saveLoanScenarioSchema } from '@/lib/validation/loans'
import { round2 } from '@/lib/format'
import { PLAN_LIMITS, upgradeRequired } from '@/lib/plan'

function toDTO(row: Awaited<ReturnType<typeof db.loanScenario.findFirstOrThrow>>) {
  return {
    id: row.id,
    name: row.name,
    preferred: row.preferred,
    kind: row.kind,
    vehiclePrice: round2(Number(row.vehiclePrice)),
    downPayment: round2(Number(row.downPayment)),
    tradeInValue: round2(Number(row.tradeInValue)),
    tradeInOwed: round2(Number(row.tradeInOwed)),
    rebate: round2(Number(row.rebate)),
    taxRate: round2(Number(row.taxRate)),
    docFee: round2(Number(row.docFee)),
    registrationFee: round2(Number(row.registrationFee)),
    destinationFee: round2(Number(row.destinationFee)),
    dealerFees: round2(Number(row.dealerFees)),
    loanAmount: round2(Number(row.loanAmount)),
    apr: round2(Number(row.apr)),
    termMonths: row.termMonths,
    startDate: row.startDate.toISOString().slice(0, 10),
    extraMonthly: round2(Number(row.extraMonthly)),
    oneTimePayment: round2(Number(row.oneTimePayment)),
    createdAt: row.createdAt.toISOString(),
  }
}

export const GET = withAuthErrorHandling(async () => {
  const { userId } = await getRequiredSession()
  const rows = await db.loanScenario.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(toDTO))
})

export const POST = withAuthErrorHandling(async (req: Request) => {
  const { userId, plan } = await getRequiredSession()
  const parsed = saveLoanScenarioSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const limit = PLAN_LIMITS[plan].maxLoanScenarios
  if (Number.isFinite(limit)) {
    const existing = await db.loanScenario.count({ where: { userId } })
    if (existing >= limit) {
      return NextResponse.json(
        upgradeRequired(`The Free plan saves ${limit} loan scenario. Upgrade to Pro to save more.`),
        { status: 403 },
      )
    }
  }

  const row = await db.loanScenario.create({ data: { ...parsed.data, startDate: new Date(parsed.data.startDate), userId } })
  return NextResponse.json(toDTO(row), { status: 201 })
})
