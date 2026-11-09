import { expect, test, type Page } from '@playwright/test'
import type { SmokeAccount } from './smokeAccount'
import { loginAs } from './smokeAccount'
import { rememberSchoolPacketFromAgreementResponse } from './schoolPacketCapture'
import { captureSchoolInviteCodeFromAdmin } from './schoolInviteCodeCapture'
import { formatSendAgreementHttpError } from './schoolAgreementRules'
import { rememberProvisioningSchoolName, resolveProvisioningSchoolName } from './schoolRunStore'

export type SendSchoolAgreementInput = {
  schoolName: string
  coordinatorEmail: string
  families?: string
  students?: string
}

/** ESCUELA.md A.1–A.4: formulario en /admin/licenses (sesión admin ya abierta). */
export async function submitSchoolAgreementForm(
  page: Page,
  input: SendSchoolAgreementInput
): Promise<void> {
  await page.goto('/admin/licenses')
  const appCrashed = page.getByText(/Application error: a client-side exception/i)
  if (await appCrashed.isVisible().catch(() => false)) {
    throw new Error(
      '/admin/licenses crasheó en QA (error de cliente). Suele ser deploy viejo con schoolAgreementAdmin ' +
        '(.casefold no existe en JS). Actualizá astro-kid-web-qa (MR licencias escolares) y volvé a correr.'
    )
  }
  await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible({
    timeout: 30_000,
  })

  await page.locator('#school-name').fill(input.schoolName)
  await page.locator('#school-email').fill(input.coordinatorEmail)
  if (input.families) await page.locator('#school-seats').fill(input.families)
  if (input.students)   await page.locator('#school-students').fill(input.students)

  const captureUpload = page.waitForResponse(
    (res) =>
      res.url().includes('/admin/schools/send-agreement') &&
      res.request().method() === 'POST',
    { timeout: 90_000 }
  )
  await page
    .getByRole('button', { name: /Enviar acuerdo para firma y pago|Reenviar acuerdo \(mismo colegio\)/i })
    .click()
  const agreementResponse = await captureUpload
  if (!agreementResponse.ok()) {
    let detail: Parameters<typeof formatSendAgreementHttpError>[1]
    try {
      const json = (await agreementResponse.json()) as {
        detail?: string | { message_es?: string; message?: string; code?: string; next_action?: string }
      }
      detail = json.detail
    } catch {
      detail = (await agreementResponse.text()).replace(/\s+/g, ' ').slice(0, 320)
    }
    throw new Error(formatSendAgreementHttpError(agreementResponse.status(), detail))
  }
  rememberProvisioningSchoolName(input.schoolName)
  await rememberSchoolPacketFromAgreementResponse(page, agreementResponse)
  test.info().annotations.push({
    type: 'note',
    description:
      'Enlace coordinador: send-agreement no lo expone; E2E usa POST /admin/licenses/{id}/qa-coordinator-upload-link si Render tiene SCHOOL_AGREEMENT_QA_COORDINATOR_LINK=1.',
  })
  await expect(
    page.getByText(/Acuerdo en PDF enviado|agreement.*sent|enviado a/i).first()
  ).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText(/Pendiente|Pending/i).first()).toBeVisible({ timeout: 15_000 })
}

/** ESCUELA.md pasos A.1–A.4: admin envía acuerdo al correo del coordinador (licencia sigue apagada). */
export async function adminSendSchoolAgreement(
  page: Page,
  admin: SmokeAccount,
  input: SendSchoolAgreementInput
): Promise<void> {
  await loginAs(page, admin)
  await submitSchoolAgreementForm(page, input)
}

/** Cuando la licencia ya está activa: coordinador agrega el correo de la familia escolar a la lista. */
export async function coordinatorRegisterParentEmail(
  page: Page,
  parentEmail: string,
  givenName: string,
  familyName: string
): Promise<void> {
  await page.goto('/escuela')
  const desk = page.getByTestId('school-license-desk')
  await expect(desk).toBeVisible({ timeout: 20_000 })

  const nombre = desk.getByLabel(/Nombre|Given name/i).first()
  const apellidos = desk.getByLabel(/Apellidos|Family name/i).first()
  const correo = desk.locator('input[type="email"]').first()

  await nombre.fill(givenName)
  await apellidos.fill(familyName)
  await correo.fill(parentEmail)
  await desk.getByRole('button', { name: /Agregar padre|Add parent/i }).click()

  await expect(page.getByTestId('school-parent-pending')).toContainText(parentEmail, {
    timeout: 15_000,
  })
}

/** Tras agregar padres pendientes, envía el correo con el código de canje. */
export async function coordinatorEmailSchoolInviteToParents(page: Page): Promise<void> {
  const desk = page.getByTestId('school-license-desk')
  await expect(desk).toBeVisible({ timeout: 20_000 })
  const send = desk.getByRole('button', { name: /Enviar el código a estos padres|Email the code to these parents/i })
  await expect(send).toBeEnabled({ timeout: 10_000 })
  await send.click()
  await expect(page.getByTestId('school-parent-notice')).toBeVisible({ timeout: 90_000 })
}

export { resolveProvisioningSchoolName } from './schoolRunStore'

/** Admin: Aprobar y activar tras «Completado» (ESCUELA.md C). Sesión admin ya abierta o se usa login previo. */
export async function adminActivateSchoolLicenseOnDesk(page: Page): Promise<void> {
  const schoolName = resolveProvisioningSchoolName()
  await page.goto('/admin/licenses')
  await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible({
    timeout: 30_000,
  })

  const queue = page.getByTestId('school-agreement-queue')
  await expect(queue).toBeVisible({ timeout: 20_000 })

  const schoolCard = queue
    .locator('.rounded-lg')
    .filter({ hasText: schoolName })
    .filter({ hasText: /Completado/i })
    .first()

  await expect(schoolCard).toBeVisible({ timeout: 45_000 })
  await expect(schoolCard.getByText(/Llegaron el acuerdo firmado/i)).toBeVisible()

  const approve = schoolCard.getByRole('button', { name: 'Aprobar y activar licencia' })
  await expect(approve).toBeEnabled({ timeout: 15_000 })
  await approve.click()

  await expect(page.getByText(new RegExp(`Licencia activa para.*${schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))).toBeVisible({
    timeout: 90_000,
  })
  await captureSchoolInviteCodeFromAdmin(page)
  test.info().annotations.push({
    type: 'note',
    description:
      'Código escolar capturado tras activar licencia (misma corrida → familia canjea en /access).',
  })
}
