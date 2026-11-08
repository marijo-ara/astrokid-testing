import { expect, type Page } from '@playwright/test'
import type { SmokeAccount } from './smokeAccount'
import { loginAs } from './smokeAccount'

export type SendSchoolAgreementInput = {
  schoolName: string
  coordinatorEmail: string
  families?: string
  students?: string
}

/** ESCUELA.md pasos A.1–A.4: admin envía acuerdo al correo del coordinador (licencia sigue apagada). */
export async function adminSendSchoolAgreement(
  page: Page,
  admin: SmokeAccount,
  input: SendSchoolAgreementInput
): Promise<void> {
  await loginAs(page, admin)
  await page.goto('/admin/licenses')
  await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible({
    timeout: 30_000,
  })

  await page.locator('#school-name').fill(input.schoolName)
  await page.locator('#school-email').fill(input.coordinatorEmail)
  if (input.families) await page.locator('#school-seats').fill(input.families)
  if (input.students) await page.locator('#school-students').fill(input.students)

  await page.getByRole('button', { name: 'Enviar acuerdo para firma y pago' }).click()
  await expect(
    page.getByText(/Acuerdo en PDF enviado|agreement.*sent|enviado a/i).first()
  ).toBeVisible({ timeout: 45_000 })
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

export function resolveProvisioningSchoolName(): string {
  return (
    process.env.REGISTRO_SCHOOL_NAME?.trim() ||
    process.env.SMOKE_SCHOOL_NAME?.trim() ||
    'Colegio Proton QA'
  )
}
