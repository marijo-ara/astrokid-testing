import { expect, test, type Locator, type Page } from '@playwright/test'
import type { SmokeAccount } from './smokeAccount'
import { loginAs } from './smokeAccount'
import { rememberSchoolPacketFromAgreementResponse } from './schoolPacketCapture'
import { captureSchoolInviteCodeFromAdmin } from './schoolInviteCodeCapture'
import { formatSendAgreementHttpError } from './schoolAgreementRules'
import {
  rememberProvisioningSchoolName,
  resolveProvisioningSchoolName,
  resolveSchoolNameBase,
} from './schoolRunStore'

export type SendSchoolAgreementInput = {
  schoolName: string
  coordinatorEmail: string
  families?: string
  students?: string
}

export type ParentDeskListState = 'roster' | 'pending' | 'none'

/**
 * Una sola tarjeta de licencia en /escuela (sin `.or()` — evita strict mode con 2 matches).
 * Si el nombre exacto de la corrida no aparece, prueba base del colegio y el último artículo.
 */
export async function resolveCoordinatorLicenseCard(
  page: Page,
  options?: { parentEmail?: string }
): Promise<Locator> {
  const desk = page.getByTestId('school-license-desk')
  const parentEmail = options?.parentEmail?.trim()

  if (parentEmail) {
    const scoped = desk
      .locator('article')
      .filter({ hasText: parentEmail })
      .getByTestId('school-license-card')
    const scopedCount = await scoped.count()
    if (scopedCount === 1) return scoped
    if (scopedCount > 1) {
      const schoolName = resolveProvisioningSchoolName()
      const narrowed = desk
        .locator('article')
        .filter({ hasText: schoolName })
        .filter({ hasText: parentEmail })
        .getByTestId('school-license-card')
        .first()
      if ((await narrowed.count()) > 0) return narrowed
      return scoped.first()
    }
  }

  const schoolName = resolveProvisioningSchoolName()
  const byRunName = desk.locator('article').filter({ hasText: schoolName }).getByTestId('school-license-card')
  const runCount = await byRunName.count()
  if (runCount === 1) return byRunName
  if (runCount > 1) return byRunName.first()

  const base = resolveSchoolNameBase()
  const byBase = desk.locator('article').filter({ hasText: base }).getByTestId('school-license-card')
  const baseCount = await byBase.count()
  if (baseCount === 1) return byBase
  if (baseCount > 1) return byBase.last()

  const anyCard = desk.getByTestId('school-license-card')
  const anyCount = await anyCard.count()
  expect(anyCount, 'El escritorio escolar debe mostrar al menos una licencia activa.').toBeGreaterThan(0)
  return anyCard.first()
}

/**
 * Tarjeta de licencia (solo uso con `parentEmail` o cuando QA tiene un solo colegio de la corrida).
 * Preferir `resolveCoordinatorLicenseCard` en flows con re-ejecución en QA.
 */
export function coordinatorLicenseCardLocator(
  page: Page,
  options?: { parentEmail?: string }
): Locator {
  const desk = page.getByTestId('school-license-desk')
  const parentEmail = options?.parentEmail?.trim()
  if (parentEmail) {
    return desk.getByTestId('school-license-card').filter({ hasText: parentEmail }).first()
  }
  const schoolName = resolveProvisioningSchoolName()
  return desk
    .locator('article')
    .filter({ hasText: schoolName })
    .getByTestId('school-license-card')
    .first()
}

/** @deprecated use resolveCoordinatorLicenseCard */
export function coordinatorLicenseCardForProvisioningRun(page: Page) {
  return coordinatorLicenseCardLocator(page)
}

export async function parentDeskListState(
  card: Locator,
  parentEmail: string
): Promise<ParentDeskListState> {
  const email = parentEmail.trim()
  const roster = card.getByTestId('school-parent-roster').filter({ hasText: email })
  if (await roster.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return 'roster'
  }
  const pending = card.getByTestId('school-parent-pending').filter({ hasText: email })
  if (await pending.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return 'pending'
  }
  return 'none'
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
  if (input.students) await page.locator('#school-students').fill(input.students)

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

/**
 * Licencia activa: agrega el correo de familia escolar si aún no está en roster ni pendientes.
 * Idempotente en QA (re-ejecuciones de la suite).
 */
export async function coordinatorRegisterParentEmail(
  page: Page,
  parentEmail: string,
  givenName: string,
  familyName: string
): Promise<void> {
  const desk = page.getByTestId('school-license-desk')
  await expect(desk).toBeVisible({ timeout: 20_000 })

  const card = await resolveCoordinatorLicenseCard(page, { parentEmail })
  await expect(card).toBeVisible({ timeout: 15_000 })

  const listState = await parentDeskListState(card, parentEmail)
  if (listState === 'roster') {
    test.info().annotations.push({
      type: 'note',
      description: `Skip agregar padre: ${parentEmail} ya figura en el roster del colegio (código enviado o canjeado).`,
    })
    return
  }
  if (listState === 'pending') {
    test.info().annotations.push({
      type: 'note',
      description: `Skip agregar padre: ${parentEmail} ya está en la lista de pendientes por enviar.`,
    })
    return
  }

  const addForm = card.getByTestId('school-parent-list')
  await expect(addForm).toBeVisible({ timeout: 15_000 })

  await addForm.getByLabel(/Nombre|Given name/i).fill(givenName)
  await addForm.getByLabel(/Apellidos|Family name/i).fill(familyName)
  await addForm.locator('input[type="email"]').fill(parentEmail)
  await addForm.getByRole('button', { name: /Agregar padre|Add parent/i }).click()

  const alreadyListedBanner = page.getByText(
    /Ese correo ya está en la lista|That email is already on the list/i
  )
  if (await alreadyListedBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
    test.info().annotations.push({
      type: 'note',
      description: `UI: ${parentEmail} ya estaba en la lista del colegio.`,
    })
    return
  }

  await expect(addForm.getByTestId('school-parent-pending')).toContainText(parentEmail, {
    timeout: 15_000,
  })
}

/** Tras agregar padres pendientes, envía el correo con el código de canje (skip si no hay pendientes). */
export async function coordinatorEmailSchoolInviteToParents(
  page: Page,
  parentEmail?: string
): Promise<void> {
  const card = await resolveCoordinatorLicenseCard(page, {
    parentEmail: parentEmail?.trim(),
  })
  const addForm = card.getByTestId('school-parent-list')
  await expect(addForm).toBeVisible({ timeout: 20_000 })

  const pending = addForm.getByTestId('school-parent-pending')
  const hasPending = await pending.isVisible({ timeout: 3_000 }).catch(() => false)
  if (!hasPending) {
    test.info().annotations.push({
      type: 'note',
      description:
        'Skip enviar código: no hay padres pendientes (posible re-ejecución o familia ya en roster).',
    })
    return
  }

  const send = addForm.getByRole('button', {
    name: /Enviar el código a estos padres|Email the code to these parents/i,
  })
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
