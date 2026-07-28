import { createHash } from 'crypto'

export function importHash(accountId: string, date: string, amount: number, payeeNorm: string): string {
  return createHash('sha256').update(`${accountId}|${date}|${amount.toFixed(2)}|${payeeNorm}`).digest('hex')
}
