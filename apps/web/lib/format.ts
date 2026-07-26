// ─── Formatting utilities (currency, dates, numbers) ─────────────────────────
import { format, parseISO, isValid } from 'date-fns'

export function formatCurrency(value: number, opts?: { decimals?: number; sign?: boolean; compact?: boolean }): string {
  const decimals = opts?.decimals ?? 2
  const abs = Math.abs(value)
  if (opts?.compact && abs >= 1000) {
    const s = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
    }).format(abs)
    return `${value < 0 ? '-' : opts?.sign && value > 0 ? '+' : ''}${s}`
  }
  const s = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(abs)
  if (value < 0) return `-${s}`
  if (opts?.sign && value > 0) return `+${s}`
  return s
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const d = parseISO(value)
  return isValid(d) ? d : new Date(value)
}

export function formatDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
  const d = parseDate(value)
  if (!isValid(d)) return '—'
  return format(d, pattern)
}

export function formatMonth(value: string | Date): string {
  return formatDate(value, 'MMMM yyyy')
}

export function formatMonthShort(value: string | Date): string {
  return formatDate(value, 'MMM yyyy')
}

export function monthKey(d: Date | string): string {
  return format(parseDate(d), 'yyyy-MM')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** CSV download helper */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
