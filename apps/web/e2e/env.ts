import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/** Minimal .env(.local) loader for the Playwright global setup/teardown
 * scripts, which run outside Next.js's own env loading. Mirrors Next's
 * precedence: .env.local wins, .env fills in anything missing. */
export function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const file = path.resolve(__dirname, '..', name)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  }
}
