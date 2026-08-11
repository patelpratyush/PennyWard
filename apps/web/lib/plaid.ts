import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

/** Server-only Plaid client. PLAID_ENV is 'sandbox' until the app goes
 * through Plaid's production access review (see .env.example). */
export function getPlaidClient() {
  const env = process.env.PLAID_ENV ?? 'sandbox'
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
  return new PlaidApi(configuration)
}
