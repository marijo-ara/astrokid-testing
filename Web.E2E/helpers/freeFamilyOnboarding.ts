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
  if ((await quota.count()) > 0) {
    await expect(quota).not.toHaveAttribute('data-quota-plan', 'loading', { timeout: 45_000 }).catch(() => {})
  }
}

const CHILD_UI = (page: Page) =>
  page
    .locator('[data-testid="child-name"]')
    .or(page.locator('[data-testid="child-indicator"]'))
    .or(page.getByTestId('mission-quota-label'))
    .or(page.getByTestId('parent-mvp-stack'))
    .or(page.getByText(/Resumen de hoy|Today's summary/i))

/** Tras login: ¿hay al menos un hijo visible en el panel? */
export async function familyHasRegisteredChild(page: Page, timeoutMs = 60_000): Promise<boolean> {
  return CHILD_UI(page)
    .first()
    .isVisible({ timeout: timeoutMs })
    .catch(() => false)
}

type FamilyProfileState = 'has-child' | 'onboarding-welcome' | 'onboarding-wizard' | 'pending'

async function resolveFamilyProfileState(page: Page): Promise<FamilyProfileState> {
  if (await familyHasRegisteredChild(page, 1_500)) return 'has-child'
  if (await page.locator('#child-birth-month').isVisible().catch(() => false)) return 'onboarding-wizard'
  if (
    await page
      .getByRole('heading', { name: /Así acompaña AstroKid|How AstroKid stays with you/i })
      .isVisible()
      .catch(() => false)
  ) {
    return 'onboarding-welcome'
  }
  if (
    await page.getByRole('button', { name: /Crear el perfil|Create the profile/i }).isVisible().catch(() => false)
  ) {
    return 'onboarding-welcome'
  }
  return 'pending'
}

/** Espera a que el panel muestre un hijo o el flujo de onboarding (también si /onboarding redirige al dashboard). */
export async function waitForFamilyProfileState(page: Page, timeoutMs = 60_000): Promise<FamilyProfileState> {
  const deadline = Date.now() + timeoutMs
  let last: FamilyProfileState = 'pending'
  while (Date.now() < deadline) {
    last = await resolveFamilyProfileState(page)
    if (last !== 'pending') return last
    if (/\/dashboard/.test(page.url())) {
      await waitForDashboardShell(page).catch(() => {})
    }
    await page.waitForTimeout(750)
  }
  if (await familyHasRegisteredChild(page, 5_000)) return 'has-child'
  return last
}

/** Tras login: ¿hace falta crear el primer hijo? */
export async function familyNeedsChildOnboarding(page: Page): Promise<boolean> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/dashboard|\/onboarding|\/login/, { timeout: 45_000 })
  if (!/\/dashboard|\/onboarding/.test(page.url())) {
    throw new Error(`Destino inesperado tras /dashboard: ${page.url()}`)
  }
  await waitForDashboardShell(page)
  const state = await waitForFamilyProfileState(page)
  return state !== 'has-child'
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

  const state = await waitForFamilyProfileState(page)
  if (state === 'has-child') return

  if (state === 'onboarding-welcome') {
    await page.getByRole('button', { name: /Crear el perfil|Create the profile/i }).click()
    const afterWelcome = await waitForFamilyProfileState(page, 45_000)
    if (afterWelcome === 'has-child') return
  }

  const beforeWizard = await waitForFamilyProfileState(page, 15_000)
  if (beforeWizard === 'has-child') return

  await expect(page.locator('#child-birth-month')).toBeVisible({ timeout: 30_000 })

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
  await expect(CHILD_UI(page).first()).toBeVisible({ timeout: 60_000 })

  void runSuffix
}
