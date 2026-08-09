/** Round-half-up to the cent, matching lender behavior. Money in this
 * package is always plain `number` in dollars (never a Float DB column) —
 * round2 is applied at every arithmetic step to avoid float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
