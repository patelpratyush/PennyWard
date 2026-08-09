import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'

const { email, password } = JSON.parse(readFileSync(path.resolve(__dirname, '.test-user.json'), 'utf8'))

// §12: "signup → add debt → slider → comparison card renders." Real public
// sign-up requires clicking an email confirmation link (no inbox access in
// CI), so the account itself is created pre-confirmed by e2e/global-setup.ts
// via the Supabase admin API — this spec exercises the real sign-in UI, the
// real add-debt form, and the real payoff planner end-to-end.
test('sign in, add a debt, adjust extra payment, see the comparison card', async ({ page }) => {
  await page.goto('/sign-in')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 })

  // Add debt
  await page.goto('/app/debt?add=1')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#debt-name').fill('Playwright Smoke Card')
  await page.locator('#debt-lender').fill('Test Bank')
  await page.locator('#debt-balance').fill('5000')
  await page.locator('#debt-apr').fill('19.99')
  await page.locator('#debt-min').fill('150')
  await page.getByRole('button', { name: /^add debt$/i }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('Playwright Smoke Card')).toBeVisible()

  // Payoff planner: select debts → strategy → payments → results
  await page.goto('/app/debt/payoff-planner')
  await expect(page.getByText('Playwright Smoke Card')).toBeVisible()
  await page.getByRole('button', { name: /continue/i }).click() // step 1 -> 2 (strategy, avalanche preselected)
  await page.getByRole('button', { name: /continue/i }).click() // step 2 -> 3 (payments)

  const extraInput = page.locator('#extra')
  await expect(extraInput).toBeVisible()
  await extraInput.fill('300')

  await page.getByRole('button', { name: /continue/i }).click() // step 3 -> 4 (results)

  // The comparison card: headline debt-free date + strategy comparison table.
  await expect(page.getByText(/debt-free date/i)).toBeVisible()
  await expect(page.getByText(/strategy comparison/i)).toBeVisible()
  await expect(page.getByText(/total interest/i).first()).toBeVisible()
})
