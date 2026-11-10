import { expect, test, type Page } from '@playwright/test'
import { minimalPremiumSinpePngBytes } from '../fixtures/premiumSinpeReceipt'
import { provisioningRunSuffix } from './freeFamilyOnboarding'
import { setPremiumSinpePaymentReference } from './premiumSinpeRunStore'
import { waitForDashboardChildReady } from './freeFamilyOnboarding'

export function defaultPremiumSinpeReference(): string {
  const suffix = provisioningRunSuffix()
  return `QA-PREM-${suffix}`
}

/** Igual que mask_email del backend admin (t***@dominio). */
export function maskEmailLikeBackend(email: string): string {
  const raw = email.trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  if (!domain || !local) return raw
  return `${local[0]}***@${domain}`
}

/** Padre Free: dashboard → ventana de pago → SINPE (idempotente si ya hay pendiente o Premium). */
export async function premiumFamilySubmitSinpeFromDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await waitForDashboardChildReady(page, 90_000)

  const alreadyPremium = await page
    .getByTestId('child-license-badge')
    .filter({ hasText: /premium/i })
    .isVisible()
    .catch(() => false)
  if (alreadyPremium) {
    test.info().annotations.push({
      type: 'note',
      description: 'Familia premium: ya tiene Premium; se omite envío SINPE.',
    })
    return
  }

  const cta = page.getByTestId('dashboard-premium-upgrade-cta')
  await expect(cta).toBeVisible({ timeout: 30_000 })
  await cta.click()
  await expect(page).toHaveURL(/\/dashboard\/premium/, { timeout: 30_000 })
  await expect(page.getByTestId('premium-checkout-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('premium-pay-methods')).toBeVisible()
  await expect(page.getByTestId('premium-pay-google')).toBeVisible()
  await expect(page.getByTestId('premium-pay-onvo')).toBeVisible()
  await expect(page.getByTestId('premium-pay-sinpe')).toBeVisible()

  const pending = page.getByTestId('premium-sinpe-pending')
  if (await pending.isVisible().catch(() => false)) {
    await expect(pending).toContainText(/en revisión|under review/i)
    test.info().annotations.push({
      type: 'note',
      description: 'Comprobante SINPE ya en revisión; no se reenvía en esta corrida.',
    })
    return
  }

  const reference = defaultPremiumSinpeReference()
  setPremiumSinpePaymentReference(reference)
  await expect(page.getByTestId('premium-sinpe-form')).toBeVisible({ timeout: 15_000 })

  await page.locator('#premium-sinpe-reference').fill(reference)
  const receipt = {
    name: 'sinpe-premium-qa.png',
    mimeType: 'image/png',
    buffer: minimalPremiumSinpePngBytes(),
  }
  await page.locator('#premium-sinpe-receipt').setInputFiles(receipt)
  await page.getByTestId('premium-sinpe-submit').click()
  const success = page.getByTestId('premium-sinpe-success')
  const pendingAfter = page.getByTestId('premium-sinpe-pending')
  await expect(success.or(pendingAfter)).toBeVisible({ timeout: 60_000 })
  if (await pendingAfter.isVisible()) {
    await expect(pendingAfter).toContainText(/en revisión|under review/i)
  }
  test.info().annotations.push({
    type: 'provisioning',
    description: `Premium SINPE enviado desde dashboard · ref ${reference}`,
  })
}

/** @deprecated Usar premiumFamilySubmitSinpeFromDashboard */
export const premiumFamilySubmitSinpeOnAccess = premiumFamilySubmitSinpeFromDashboard

export type AdminActivatePremiumSinpeOptions = {
  paymentReference?: string
  parentEmail?: string
}

/** Admin: activa fila por referencia o por correo enmascarado del padre QA. */
export async function adminActivatePremiumSinpeOnDesk(
  page: Page,
  options: AdminActivatePremiumSinpeOptions = {}
): Promise<void> {
  await page.goto('/admin/licenses')
  await expect(page.getByTestId('admin-premium-sinpe-section')).toBeVisible({ timeout: 30_000 })

  const empty = page.getByTestId('admin-premium-sinpe-empty')
  if (await empty.isVisible().catch(() => false)) {
    test.info().annotations.push({
      type: 'note',
      description: 'Cola Premium SINPE vacía (¿Premium ya activado en corrida anterior?).',
    })
    return
  }

  const notice = page.getByTestId('admin-premium-sinpe-notice')
  await expect(notice).toBeVisible({ timeout: 45_000 })

  const queue = page.getByTestId('admin-premium-sinpe-queue')
  await expect(queue).toBeVisible({ timeout: 20_000 })

  const ref = options.paymentReference?.trim()
  let row = queue.locator('li').first()
  if (ref) {
    row = queue.locator('li').filter({ hasText: ref }).first()
  } else if (options.parentEmail?.trim()) {
    const masked = maskEmailLikeBackend(options.parentEmail)
    row = queue.locator('li').filter({ hasText: masked }).first()
  }

  await expect(row).toBeVisible({ timeout: 45_000 })
  const rowText = (await row.textContent()) ?? ''

  const activate = row.getByRole('button', { name: 'Activar Premium' })
  await expect(activate).toBeEnabled({ timeout: 15_000 })
  await activate.click()

  await expect(page.getByText(/Premium activado \(SINPE\)/i)).toBeVisible({ timeout: 90_000 })
  test.info().annotations.push({
    type: 'provisioning',
    description: `Premium SINPE activado · fila: ${rowText.slice(0, 120)}`,
  })
}
