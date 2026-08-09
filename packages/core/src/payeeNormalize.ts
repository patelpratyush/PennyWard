export function normalizePayee(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.replace(/^(sq \*|tst\*|paypal \*)\s*/i, '')
  s = s.replace(/\b\d{10,}\b/g, '')            // phone numbers / long numeric IDs
  s = s.replace(/\b\d{3,4}\b$/g, '')            // trailing store numbers
  s = s.replace(/\b[a-z]{2}\b$/i, '')           // trailing state code
  s = s.replace(/\s+/g, ' ').trim()
  return s
}
