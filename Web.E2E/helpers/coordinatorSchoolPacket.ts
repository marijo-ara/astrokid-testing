import { expect, type Page } from '@playwright/test'
import { minimalSchoolPacketPdfBytes } from '../fixtures/schoolPacketPdf'
import { resolveSchoolPacketAcuerdoPath, resolveSchoolPacketToken } from './schoolPacketTokenStore'

export type CoordinatorPacketSubmitInput = {
  signerName: string
  signerTitle: string
  signerEmail: string
  signedOn: string
  paymentReference: string
}

export function defaultCoordinatorPacketInput(
  coordinatorEmail: string
): CoordinatorPacketSubmitInput {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return {
    signerName:
      process.env.REGISTRO_SCHOOL_SIGNER_NAME?.trim() || 'Coordinador QA Provisioning',
    signerTitle: process.env.REGISTRO_SCHOOL_SIGNER_TITLE?.trim() || 'Coordinador escolar',
    signerEmail: coordinatorEmail,
    signedOn: process.env.REGISTRO_SCHOOL_SIGNED_ON?.trim() || `${y}-${m}-${d}`,
    paymentReference:
      process.env.REGISTRO_SCHOOL_PAYMENT_REF?.trim() || 'QA-REF-E2E-001',
  }
}

/** Coordinador abre /escuela/acuerdo?token=…, llena el formulario y envía los dos PDF. */
export async function submitCoordinatorSchoolPacket(
  page: Page,
  token: string,
  input: CoordinatorPacketSubmitInput
): Promise<void> {
  const acuerdoPath =
    resolveSchoolPacketAcuerdoPath() ?? `/escuela/acuerdo?token=${encodeURIComponent(token)}`
  await page.goto(acuerdoPath, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByRole('heading', { name: 'Acuerdo y comprobante' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByTestId('school-packet-form')).toBeVisible({ timeout: 20_000 })

  await page.locator('#signer-name').fill(input.signerName)
  await page.locator('#signer-title').fill(input.signerTitle)
  await page.locator('#signer-email').fill(input.signerEmail)
  await page.locator('#signed-on').fill(input.signedOn)
  await page.locator('#payment-reference').fill(input.paymentReference)

  const agreement = {
    name: 'acuerdo-firmado-qa.pdf',
    mimeType: 'application/pdf',
    buffer: minimalSchoolPacketPdfBytes('acuerdo-firmado'),
  }
  const receipt = {
    name: 'comprobante-qa.pdf',
    mimeType: 'application/pdf',
    buffer: minimalSchoolPacketPdfBytes('comprobante'),
  }
  await page.locator('#signed-agreement').setInputFiles(agreement)
  await page.locator('#payment-receipt').setInputFiles(receipt)

  const send = page.getByRole('button', { name: 'Enviar acuerdo firmado y comprobante' })
  await expect(send).toBeEnabled({ timeout: 10_000 })
  await send.click()

  await expect(page.getByTestId('school-packet-success')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Documentos enviados/i)).toBeVisible()
}

export function requireSchoolPacketToken(): string | undefined {
  return resolveSchoolPacketToken()
}
