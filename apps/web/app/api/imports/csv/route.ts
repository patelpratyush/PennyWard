import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { db } from '@/lib/db'
import { getRequiredSession } from '@/lib/session'
import { normalizePayee } from '@/lib/payeeNormalize'
import { importHash } from '@/lib/importHash'
import { round2 } from '@/lib/format'
import { importRateLimit, checkRateLimit } from '@/lib/rateLimit'

const schema = z.object({
  accountId: z.string(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(5000),
  mapping: z.object({ date: z.string(), amount: z.string(), payee: z.string(), notes: z.string().optional() }),
  dateFormat: z.string().default('MM/dd/yyyy'),
})

export async function POST(req: Request) {
  const { userId } = await getRequiredSession()
  const success = await checkRateLimit(importRateLimit, userId)
  if (!success) return NextResponse.json({ error: 'Too many attempts, try again later' }, { status: 429 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { accountId, rows, mapping, dateFormat } = parsed.data

  const account = await db.financialAccount.findFirst({ where: { id: accountId, userId } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const rules = await db.categorizationRule.findMany({ where: { userId }, orderBy: { priority: 'desc' } })

  let imported = 0
  let duplicates = 0
  const review: string[] = []

  for (const row of rows) {
    const rawDate = row[mapping.date]
    const rawAmount = row[mapping.amount]
    const rawPayee = row[mapping.payee]
    if (!rawDate || !rawAmount || !rawPayee) { review.push(`Skipped incomplete row: ${JSON.stringify(row)}`); continue }

    const parsedDate = parse(rawDate, dateFormat, new Date())
    if (!isValid(parsedDate)) { review.push(`Unparseable date: ${rawDate}`); continue }

    const amount = round2(Math.abs(parseFloat(rawAmount)))
    const type = parseFloat(rawAmount) >= 0 ? 'income' : 'expense'
    const payeeNorm = normalizePayee(rawPayee)
    const dateStr = parsedDate.toISOString().slice(0, 10)
    const hash = importHash(accountId, dateStr, amount, payeeNorm)

    const dup = await db.transaction.findUnique({ where: { userId_importHash: { userId, importHash: hash } } })
    if (dup) { duplicates++; continue }

    const matchedRule = rules.find((r) =>
      r.matchType === 'contains' ? payeeNorm.includes(r.pattern.toLowerCase()) :
      r.matchType === 'equals' ? payeeNorm === r.pattern.toLowerCase() :
      new RegExp(r.pattern, 'i').test(payeeNorm))

    await db.transaction.create({
      data: {
        userId, accountId, type, amount, merchant: rawPayee, date: parsedDate,
        notes: mapping.notes != null ? (row[mapping.notes] ?? undefined) : undefined,
        source: 'csv', importHash: hash, categoryId: matchedRule?.categoryId,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, duplicates, review })
}
