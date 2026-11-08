import { expect, type Page } from '@playwright/test'
import { getCurrentEnvironment } from '../config/environments'
import { requireQaAccount, resolveQaAccount, type QaRoleId } from '../config/qaTestAccounts'

export interface SmokeAccount {
  email: string
  password: string
}

const SMOKE_PREFIX_TO_QA: Record<string, QaRoleId> = {
  SMOKE_ADMIN: 'admin_plataforma',
  SMOKE_COORDINATOR: 'coordinador_escuela',
  SMOKE_PARENT: 'familia_free',
  SMOKE_SCHOOL: 'familia_escolar',
  SMOKE_PREMIUM: 'familia_premium',
}

/** CI requires credentials; locally returns undefined so the caller can test.skip. */
export function requireSmokeAccount(prefix: string): SmokeAccount | undefined {
  const qaRole = SMOKE_PREFIX_TO_QA[prefix]
  if (qaRole) return requireQaAccount(qaRole)
  const account = smokeAccount(prefix)
  if (!account && (process.env.CI === 'true' || process.env.GITLAB_CI === 'true')) {
    throw new Error(`En CI hacen falta ${prefix}_EMAIL y ${prefix}_PASSWORD.`)
  }
  return account
}

/** True when tests hit a deployed app with real Firebase (e.g. PLAYWRIGHT_ENV=qa). */
export function usesRemoteFirebaseLogin(): boolean {
  const env = getCurrentEnvironment()
  return env.loginBehavior === 'firebase' && !env.mockData
}

/** Reads EMAIL and PASSWORD for a prefix. Missing values mean the smoke skips that role. */
export function smokeAccount(prefix: string): SmokeAccount | undefined {
  const qaRole = SMOKE_PREFIX_TO_QA[prefix]
  if (qaRole) return resolveQaAccount(qaRole)
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
