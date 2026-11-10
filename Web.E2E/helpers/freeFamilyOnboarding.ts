import { expect, type Page } from '@playwright/test'
import { completeEmailPlusForPageSession } from './emailPlusConsentApi'

export function provisioningRunSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function waitForDashboardShell(page: Page): Promise<void> {
  const accessCheck = page.getByText(/Verificando acceso|Verifying access/i)
  if (await accessCheck.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await accessCheck.waitFor({ state: 'detached', timeout: 45_000 }).catch(() => {})
  }
  const loading = page.getByText(/^Cargando\.\.\.$|^Loading\.\.\.$/i)
  if (await loading.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loading.first().waitFor({ state: 'detached', timeout: 45_000 }).catch(() => {})
  }
  const quota = page.locator('[data-quota-plan]').first()
  if (await quota.count()) {
    await expect(quota).not.toHaveAttribute('data-quota-plan', 'loading', { timeout: 45_000 }).catch(() => {})
  }
}

/** Tras login: ¿hay al menos un hijo visible en el panel? */
export async function familyHasRegisteredChild(page: Page): Promise<boolean> {
  const childName = page.locator('[data-testid="child-name"]').first()
  if (await childName.isVisible({ timeout: 8_000 }).catch(() => false)) return true

  const indicator = page.locator('[data-testid="child-indicator"]').first()
  if (await indicator.isVisible({ timeout: 8_000 }).catch(() => false)) return true

  const switcher = page.locator('[data-testid="child-switcher-button"]').first()
  if (await switcher.isVisible({ timeout: 5_000 }).catch(() => false)) return true

  const quotaLabel = page.getByTestId('mission-quota-label').first()
  if (await quotaLabel.isVisible({ timeout: 5_000 }).catch(() => false)) return true

  return false
}

/** Tras login: ¿hace falta crear el primer hijo? */
export async function familyNeedsChildOnboarding(page: Page): Promise<boolean> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/dashboard|\/onboarding|\/login/, { timeout: 45_000 })
  if (/\/onboarding/.test(page.url())) return true
  if (!/\/dashboard/.test(page.url())) {
    throw new Error(`Destino inesperado tras /dashboard: ${page.url()}`)
  }
  await waitForDashboardShell(page)
  return !(await familyHasRegisteredChild(page))
}

async function pickBirthMonthYear(page: Page): Promise<void> {
  const birthYear = String(new Date().getFullYear() - 8)
  await page.locator('#child-birth-month').selectOption('5')
  await page.locator('#child-birth-year').selectOption(birthYear)
  await page.getByRole('button', { name: /^Siguiente$|^Next$/i }).click()
}

async function pickThreeAdjectivesAndAlias(page: Page): Promise<void> {
  const comboboxes = page.getByRole('combobox')
  await expect(comboboxes).toHaveCount(3, { timeout: 20_000 })
  for (let i = 0; i < 3; i++) {
    await comboboxes.nth(i).click()
    const options = page.getByRole('option')
    const count = await options.count()
    expect(count).toBeGreaterThan(0)
    await options.nth(Math.min(i, count - 1)).click()
  }
  const alias = page.locator('[role="radiogroup"] [role="radio"]').first()
  await expect(alias).toBeVisible({ timeout: 20_000 })
  await alias.click()
  await page.getByRole('button', { name: /Siguiente|Next/i }).click()
}

async function pickHobbies(page: Page): Promise<void> {
  const hobbiesHeading = page.getByRole('heading', {
    name: /¿Qué le gusta a tu hijo|What does your child enjoy/i,
  })
  await expect(hobbiesHeading).toBeVisible({ timeout: 15_000 })
  const hobbyChip = page
    .getByRole('button', { name: /Deportes|Sports|Arte|Art|Música|Music/i })
    .first()
  await hobbyChip.click()
  const subPanel = page.locator('.rounded-xl.border').filter({ hasText: /./ }).last()
  await subPanel.locator('button[type="button"]').first().click({ timeout: 15_000 })
  await page.getByRole('button', { name: /^Siguiente$|^Next$/i }).click()
}

async function submitParentalConsent(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /Seguir al consentimiento|Continue to consent/i })
    .click()
  const modal = page.getByTestId('parental-consent-modal')
  await expect(modal).toBeVisible({ timeout: 15_000 })
  const boxes = modal.getByRole('checkbox')
  await boxes.nth(0).check()
  await boxes.nth(1).check()
  await boxes.nth(2).check()
  await modal.locator('#consent-signature').fill('QA Provisioning')
  await modal.getByRole('button', { name: /Dar consentimiento|Give consent/i }).click()
}

/** Wizard completo del hijo (cuenta Familia Free sin niños). */
export async function runFreeFamilyOnboardingWizard(page: Page, runSuffix: string): Promise<void> {
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 45_000 })
  if (/\/dashboard/.test(page.url())) {
    await waitForDashboardShell(page)
    if (await familyHasRegisteredChild(page)) return
  }

  const createProfile = page.getByRole('button', { name: /Crear el perfil/i })
  if (await createProfile.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await createProfile.click()
  }

  await expect(
    page.getByRole('heading', { name: /perfil|profile/i }).or(page.getByText(/fecha de nacimiento|birth/i))
  ).toBeVisible({ timeout: 30_000 })

  await completeEmailPlusForPageSession(page)

  await pickBirthMonthYear(page)
  await pickThreeAdjectivesAndAlias(page)
  await pickHobbies(page)
  await submitParentalConsent(page)

  const emailPlusDialog = page.getByRole('dialog', { name: /correo|email/i })
  if (await emailPlusDialog.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await completeEmailPlusForPageSession(page)
    await page.getByRole('button', { name: /Ya confirmé el segundo correo|I confirmed the second email/i }).click()
  }

  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 120_000 })
  await expect(page.locator('[data-testid="child-name"]').first()).toBeVisible({ timeout: 60_000 })

  // runSuffix queda en anotaciones del paso que invoca el wizard (alias estelar aleatorio en UI).
  void runSuffix
}
