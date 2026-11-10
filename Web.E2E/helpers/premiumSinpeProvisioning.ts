import { expect, test, type Page } from '@playwright/test'
import { minimalPremiumSinpePngBytes } from '../fixtures/premiumSinpeReceipt'
import { provisioningRunSuffix } from './freeFamilyOnboarding'
import { setPremiumSinpePaymentReference } from './premiumSinpeRunStore'
export function defaultPremiumSinpeReference(): string {
  const suffix = provisioningRunSuffix()
  return `QA-PREM-${suffix}`
}

/** Padre: adjunta pantallazo SINPE en /access */
export async function premiumFamilySubmitSinpeOnAccess(page: Page): Promise<void> {
  const reference = defaultPremiumSinpeReference()
  setPremiumSinpePaymentReference(reference)

  await page.goto('/access')
  await expect(page.getByTestId('premium-purchase-options')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('premium-sinpe-form')).toBeVisible({ timeout: 15_000 })

  await page.locator('#premium-sinpe-reference').fill(reference)
  const receipt = {
    name: 'sinpe-premium-qa.png',
    mimeType: 'image/png',
    buffer: minimalPremiumSinpePngBytes(),
  }
  await page.locator('#premium-sinpe-receipt').setInputFiles(receipt)
  await page.getByTestId('premium-sinpe-submit').click()
  await expect(page.getByTestId('premium-sinpe-success')).toBeVisible({ timeout: 60_000 })
  test.info().annotations.push({
    type: 'provisioning',
    description: `Premium SINPE enviado · ref ${reference}`,
  })
}

/** Admin: activa la fila cuya referencia coincide con la última corrida. */
export async function adminActivatePremiumSinpeOnDesk(page: Page, paymentReference: string): Promise<void> {
  await page.goto('/admin/licenses')
  await expect(page.getByTestId('admin-premium-sinpe-section')).toBeVisible({ timeout: 30_000 })
  const notice = page.getByTestId('admin-premium-sinpe-notice')
  await expect(notice).toBeVisible({ timeout: 45_000 })

  const queue = page.getByTestId('admin-premium-sinpe-queue')
  await expect(queue).toBeVisible({ timeout: 20_000 })

  const row = queue
    .locator('li')
    .filter({ hasText: paymentReference })
    .first()
  await expect(row).toBeVisible({ timeout: 45_000 })

  const activate = row.getByRole('button', { name: 'Activar Premium' })
  await expect(activate).toBeEnabled({ timeout: 15_000 })
  await activate.click()

  await expect(
    page.getByText(
      new RegExp(
        `Premium activado \\(SINPE\\).*${paymentReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i'
      )
    )
  ).toBeVisible({ timeout: 90_000 })
}
