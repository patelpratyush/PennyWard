'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Download,
  FileUp, FileWarning, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/stores/useStore'
import { PageHeader } from '@/components/shared/Misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadCSV, formatCurrency, round2 } from '@/lib/format'
import { cn } from '@/lib/utils'

const steps = ['Upload', 'Account', 'Map columns', 'Preview', 'Duplicates', 'Confirm', 'Done']

const mapFields = [
  { key: 'date', label: 'Transaction date', required: true },
  { key: 'postedDate', label: 'Posted date', required: false },
  { key: 'merchant', label: 'Merchant', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'amount', label: 'Signed amount', required: false },
  { key: 'debit', label: 'Debit (money out)', required: false },
  { key: 'credit', label: 'Credit (money in)', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'externalId', label: 'External identifier', required: false },
] as const

type MapKey = typeof mapFields[number]['key']

interface ParsedRow {
  raw: Record<string, string>
  date: string
  amount: number
  type: 'income' | 'expense'
  merchant: string
  description?: string
  categoryName?: string
  notes?: string
  valid: boolean
  issues: string[]
  duplicate: boolean
  include: boolean
}

const DATE_PATTERNS = [
  /^(\d{4})-(\d{2})-(\d{2})$/, // yyyy-mm-dd
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // mm/dd/yyyy
  /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // mm-dd-yyyy
]

function parseDateValue(v: string): string | null {
  const s = v.trim()
  if (!s) return null
  let m = s.match(DATE_PATTERNS[0])
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(DATE_PATTERNS[1]) ?? s.match(DATE_PATTERNS[2])
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function parseAmountValue(v: string): number | null {
  const s = v.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? round2(Math.abs(n)) : null
}

const SAMPLE_CSV = `Date,Description,Amount,Category
2026-07-01,Payroll Deposit,3125.00,Paycheck
2026-07-02,Whole Foods Market,−86.42,Groceries
2026-07-03,Shell,−45.10,Fuel
2026-07-05,Starbucks,−6.75,Coffee
2026-07-08,Xfinity Internet,−69.99,Internet`

export default function TransactionsImport() {
  const router = useRouter()
  const { accounts, transactions, pushNotification } = useStore()
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [accountId, setAccountId] = useState('')
  const [mapping, setMapping] = useState<Record<MapKey, string>>({
    date: '', postedDate: '', merchant: '', description: '', amount: '', debit: '', credit: '', category: '', notes: '', externalId: '',
  })
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<{ imported: number; duplicates: number; review: string[]; clientErrors: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hdrs = res.meta.fields ?? []
        setHeaders(hdrs)
        setRawRows(res.data)
        // Auto-guess mappings
        const guess = (candidates: string[]) =>
          hdrs.find((h) => candidates.some((c) => h.toLowerCase().includes(c))) ?? ''
        setMapping({
          date: guess(['date', 'posted']),
          postedDate: guess(['posted date']),
          merchant: guess(['merchant', 'payee', 'name']),
          description: guess(['description', 'memo', 'details']),
          amount: guess(['amount']),
          debit: guess(['debit', 'withdrawal']),
          credit: guess(['credit', 'deposit']),
          category: guess(['category']),
          notes: guess(['note']),
          externalId: guess(['id', 'reference']),
        })
        toast.success(`Parsed ${res.data.length} rows from ${file.name}.`)
        setStep(2)
      },
      error: () => toast.error('We could not read that file. Make sure it is a valid CSV.'),
    })
  }

  const useSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    handleFile(new File([blob], 'sample-transactions.csv', { type: 'text/csv' }))
  }

  const mappingValid = mapping.date && (mapping.amount || (mapping.debit && mapping.credit))

  const buildRows = () => {
    const get = (r: Record<string, string>, key: MapKey) => (mapping[key] ? (r[mapping[key]] ?? '').trim() : '')
    const existing = new Set(transactions.map((t) => `${t.accountId}|${t.date}|${t.amount}|${t.merchant.toLowerCase()}`))
    const seen = new Set<string>()
    const parsed: ParsedRow[] = rawRows.map((r) => {
      const issues: string[] = []
      const date = parseDateValue(get(r, 'date'))
      if (!date) issues.push('Invalid or missing date')
      let amount: number | null = null
      let type: 'income' | 'expense' = 'expense'
      if (mapping.amount) {
        const raw = get(r, 'amount')
        amount = parseAmountValue(raw)
        const negative = /^-|^(\(.*\))$/.test(raw.replace(/[$,\s]/g, ''))
        type = negative ? 'expense' : 'income'
      } else {
        const debit = parseAmountValue(get(r, 'debit'))
        const credit = parseAmountValue(get(r, 'credit'))
        if (debit && debit > 0) { amount = debit; type = 'expense' }
        else if (credit && credit > 0) { amount = credit; type = 'income' }
      }
      if (!amount || amount <= 0) issues.push('Missing or invalid amount')
      const merchant = get(r, 'merchant') || get(r, 'description') || 'Imported transaction'
      const key = `${accountId}|${date}|${amount}|${merchant.toLowerCase()}`
      const duplicate = !!date && !!amount && (existing.has(key) || seen.has(key))
      seen.add(key)
      return {
        raw: r, date: date ?? '', amount: amount ?? 0, type, merchant,
        description: get(r, 'description') || undefined,
        categoryName: get(r, 'category') || undefined,
        notes: get(r, 'notes') || undefined,
        valid: issues.length === 0, issues, duplicate, include: !duplicate,
      }
    })
    setRows(parsed)
    setStep(4)
  }

  const validRows = rows.filter((r) => r.valid)
  const invalidRows = rows.filter((r) => !r.valid)
  const dupRows = validRows.filter((r) => r.duplicate)
  const importable = validRows.filter((r) => !r.duplicate || r.include)
  const totalIncome = round2(importable.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0))
  const totalExpenses = round2(importable.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0))

  const doImport = async () => {
    // Normalize into the wire shape the /api/imports/csv route expects: a single
    // signed-amount column and a single payee column, regardless of how the
    // source CSV split debit/credit or merchant/description.
    const rowsPayload = importable.map((r) => ({
      date: r.date,
      amount: String(r.type === 'expense' ? -r.amount : r.amount),
      merchant: r.merchant,
      notes: r.notes ?? '',
    }))
    setImporting(true)
    try {
      const res = await fetch('/api/imports/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          rows: rowsPayload,
          mapping: { date: 'date', amount: 'amount', payee: 'merchant', notes: 'notes' },
          dateFormat: 'yyyy-MM-dd',
        }),
      })
      if (!res.ok) {
        toast.error('Import failed. Please check your data and try again.')
        return
      }
      const body = (await res.json()) as { imported: number; duplicates: number; review: string[] }
      setResult({ imported: body.imported, duplicates: body.duplicates, review: body.review, clientErrors: invalidRows.length })
      pushNotification({ type: 'import', title: 'CSV import completed', message: `${body.imported} transactions were imported from ${fileName}.` })
      setStep(7)
    } catch {
      toast.error('Import failed. Please check your connection and try again.')
    } finally {
      setImporting(false)
    }
  }

  const exportErrors = () => {
    downloadCSV('finpilot-import-errors.csv', ['Row', 'Issues', 'Raw data'],
      invalidRows.map((r, i) => [i + 1, r.issues.join('; '), JSON.stringify(r.raw)]))
  }

  const canNext =
    (step === 2 && !!accountId) ||
    (step === 3 && mappingValid) ||
    step === 4 ||
    step === 5 ||
    step === 6

  const next = async () => {
    if (step === 3) buildRows()
    else if (step === 6) await doImport()
    else setStep(step + 1)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Import transactions from CSV" description="A guided import with column mapping, validation, and duplicate detection." />

      {/* Stepper */}
      <ol className="mb-8 flex flex-wrap items-center gap-2" aria-label="Import progress">
        {steps.map((s, i) => {
          const n = i + 1
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                n < step && 'border-primary bg-primary text-primary-foreground',
                n === step && 'border-primary text-primary',
                n > step && 'text-muted-foreground',
              )}>
                {n < step ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn('text-xs font-medium', n === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
              {n < 7 && <span className="h-px w-4 bg-border" />}
            </li>
          )
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
          {/* STEP 1 — upload */}
          {step === 1 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div
                  role="button" tabIndex={0}
                  aria-label="Upload a CSV file"
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDragging(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) handleFile(f)
                  }}
                  className={cn(
                    'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                    dragging ? 'border-primary bg-accent' : 'hover:border-primary/60 hover:bg-muted/40',
                  )}
                >
                  <FileUp className="h-10 w-10 text-primary" />
                  <p className="mt-3 font-semibold">Drag and drop your CSV here</p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse your files</p>
                  <input
                    ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    aria-label="Choose CSV file"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <p>Works with exports from most banks. One signed amount column, or separate debit/credit columns.</p>
                  <Button variant="ghost" size="sm" onClick={useSample}>
                    <Sparkles className="mr-1.5 h-4 w-4" />Try a sample CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 — account */}
          {step === 2 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold">Which account received these transactions?</h2>
                <p className="mt-1 text-sm text-muted-foreground">File: {fileName} · {rawRows.length} rows parsed</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {accounts.filter((a) => !a.archived).map((a) => (
                    <button key={a.id} onClick={() => setAccountId(a.id)}
                      className={cn('flex min-h-[52px] items-center justify-between rounded-xl border p-3 text-left transition-all hover:shadow-card', accountId === a.id && 'border-primary bg-accent ring-1 ring-primary')}
                      aria-pressed={accountId === a.id}>
                      <span>
                        <span className="block text-sm font-medium">{a.name}</span>
                        <span className="text-xs text-muted-foreground">{a.institution}</span>
                      </span>
                      {accountId === a.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3 — mapping */}
          {step === 3 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold">Map your columns</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Match FinPilot fields to columns in your file. A date column plus either a signed amount or debit+credit columns are required.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mapFields.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-sm font-medium">
                        {f.label}{f.required && <span className="text-destructive"> *</span>}
                      </label>
                      <Select value={mapping[f.key] || 'none'} onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === 'none' ? '' : v })}>
                        <SelectTrigger aria-label={`Map ${f.label}`}><SelectValue placeholder="Not mapped" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not mapped</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                {!mappingValid && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-warning-muted px-3 py-2 text-sm text-warning">
                    <AlertCircle className="h-4 w-4" />Map a transaction date plus a signed amount column (or debit and credit columns) to continue.
                  </p>
                )}
                {rawRows[0] && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">First row preview</p>
                    <p className="mt-1 truncate font-mono text-xs">{JSON.stringify(rawRows[0])}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 4 — preview */}
          {step === 4 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Preview parsed rows</h2>
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-success-muted text-success">{validRows.length} valid</Badge>
                    <Badge className="bg-destructive/10 text-destructive">{invalidRows.length} invalid</Badge>
                  </div>
                </div>
                <div className="mt-4 max-h-96 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} className={cn(!r.valid && 'bg-destructive/5', r.valid && r.duplicate && 'bg-warning-muted/40')}>
                          <TableCell className="text-xs text-muted-foreground tnum">{i + 1}</TableCell>
                          <TableCell className="text-sm tnum">{r.date || '—'}</TableCell>
                          <TableCell className="max-w-44 truncate text-sm">{r.merchant}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge></TableCell>
                          <TableCell className="text-right text-sm tnum">{r.amount ? formatCurrency(r.amount) : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {!r.valid ? (
                              <span className="flex items-center gap-1 text-destructive"><FileWarning className="h-3.5 w-3.5" />{r.issues[0]}</span>
                            ) : r.duplicate ? (
                              <span className="text-warning">Possible duplicate</span>
                            ) : (
                              <span className="text-success">Ready</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {invalidRows.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    We could not read {invalidRows.length} rows because of invalid dates or amounts. They will be skipped; you can download an error report at the end.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 5 — duplicates */}
          {step === 5 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold">Possible duplicates</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dupRows.length} rows match existing transactions (same account, date, amount, and merchant). Unchecked rows are skipped.
                </p>
                {dupRows.length === 0 ? (
                  <p className="mt-6 rounded-lg bg-success-muted px-4 py-6 text-center text-sm text-success">
                    No duplicates found — everything looks new.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y rounded-lg border">
                    {dupRows.map((r) => {
                      const idx = rows.indexOf(r)
                      return (
                        <li key={idx} className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={r.include}
                            onCheckedChange={(v) => setRows(rows.map((x, j) => (j === idx ? { ...x, include: v === true } : x)))}
                            aria-label={`Import duplicate ${r.merchant}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.merchant}</p>
                            <p className="text-xs text-muted-foreground tnum">{r.date}</p>
                          </div>
                          <span className="text-sm tnum">{formatCurrency(r.amount)}</span>
                          <Badge variant="outline" className="text-[10px]">{r.include ? 'Will import' : 'Skip'}</Badge>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 6 — confirm */}
          {step === 6 && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold">Review and import</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Total rows', value: String(rows.length) },
                    { label: 'Valid rows', value: String(validRows.length) },
                    { label: 'Invalid rows', value: String(invalidRows.length) },
                    { label: 'Duplicates', value: String(dupRows.length) },
                    { label: 'Total income', value: formatCurrency(totalIncome) },
                    { label: 'Total expenses', value: formatCurrency(totalExpenses) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="mt-0.5 font-bold tnum">{s.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{importable.length} transactions</span> will be imported into{' '}
                  <span className="font-semibold text-foreground">{accounts.find((a) => a.id === accountId)?.name}</span>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* STEP 7 — done */}
          {step === 7 && result && (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center p-10 text-center">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 15 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-success-muted">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </motion.div>
                <h2 className="mt-4 text-xl font-bold">Import complete</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.imported} imported · {result.duplicates} duplicates · {result.clientErrors} errors
                </p>
                {result.review.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.review.length} row{result.review.length === 1 ? '' : 's'} flagged for review during import.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button onClick={() => router.push('/app/transactions')}>View transactions<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                  {result.clientErrors > 0 && (
                    <Button variant="outline" onClick={exportErrors}><Download className="mr-1.5 h-4 w-4" />Download error report</Button>
                  )}
                  <Button variant="ghost" onClick={() => { setStep(1); setRows([]); setResult(null); setFileName('') }}>Import another file</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      {step > 1 && step < 7 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />Back
          </Button>
          <Button onClick={next} disabled={!canNext || importing}>
            {step === 6 ? (importing ? 'Importing…' : `Import ${importable.length} transactions`) : 'Continue'}<ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
      {step === 1 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Prefer typing? <Link href="/app/transactions?add=1" className="text-primary hover:underline">Add a transaction manually</Link>
        </p>
      )}
    </div>
  )
}
