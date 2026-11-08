import { expect, type Page } from '@playwright/test'

export interface SmokeAccount {
  email: string
  password: string
}

/** Reads EMAIL and PASSWORD for a prefix. Missing values mean the smoke skips that role. */
export function smokeAccount(prefix: string): SmokeAccount | undefined {
  const email = process.env[`${prefix}_EMAIL`]?.trim()
  const password = process.env[`${prefix}_PASSWORD`]
  if (!email || !password) return undefined
  return { email, password }
}

export async function loginAs(page: Page, account: SmokeAccount): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('login-email-input').fill(account.email)
  await page.getByTestId('login-password-input').fill(account.password)
  await page.getByTestId('login-submit-button').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}
