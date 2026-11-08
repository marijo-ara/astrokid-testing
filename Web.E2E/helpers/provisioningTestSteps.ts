import { test, expect, type Page, type TestInfo } from '@playwright/test'
import type { ProvisioningPersona, ProvisioningRole } from '../config/provisioningUsers'
import type { SmokeAccount } from './smokeAccount'
import {
  assertAuthenticatedParent,
  assertDashboardPlan,
  assertOnboardingWelcomeFirstScreen,
  ensureProvisionedAccount,
  redeemSchoolInviteCode,
  signOutIfSession,
  type EnsureAccountOutcome,
} from './provisioningAuth'
import {
  adminSendSchoolAgreement,
  coordinatorRegisterParentEmail,
  type SendSchoolAgreementInput,
} from './schoolProvisioning'

/** Caso REG-PROV-01 — visible en el reporte Playwright (annotation type flow). */
export const PROVISIONING_FLOW_TC01 = `
REG-PROV-01 — Asegurar cuentas (login o registro)
Precondiciones: PLAYWRIGHT_ENV=qa, REGISTRO_SUITE_PASSWORD, correos SMOKE_* en .env.local.
Por cada persona (admin → coordinador → familias Free / escolar / premium), en serie:
  1. Cerrar sesión de la cuenta anterior.
  2. Login en /login:
     — Si entra (dashboard + Salir / ¡Hola, u /onboarding «Así acompaña AstroKid») → logged_in → siguiente persona (sin /registro).
     — Si «No hay una cuenta…» o «Correo o contraseña incorrectos» (cuenta nueva en Firebase) → /registro.
     — Otro error → falla el test.
  3. Solo si hizo falta registro: volver a login y validar sesión.
  4. Validar destino: onboarding «Así acompaña AstroKid» + Crear el perfil, o dashboard con Salir.
  5. Siguiente persona (mismo test, describe serial).
Resultado: logged_in o registered; confirm_email → anotación manual y soft-fail.
`.trim()

/** Caso REG-PROV-02 */
export const PROVISIONING_FLOW_TC02 = `
REG-PROV-02 — Validar roles, escuela y planes
Precondiciones: cuentas del TC-01 (o este test las re-asegura).
  1. (Opcional) Admin envía acuerdo escolar al coordinador en /admin/licenses.
  2. Por cada rol de familia/coordinador: asegurar sesión (igual que TC-01).
  3. Coordinador: /escuela → guía visible; si licencia activa, agregar correo familia escolar.
  4. Familia escolar: canje en /access si hay REGISTRO_SCHOOL_INVITE_CODE.
  5. Familias con plan: data-quota-plan en dashboard (free_capped, institutional_capped, premium_unlimited).
`.trim()

export function attachProvisioningFlow(testInfo: TestInfo, caseId: string, body: string): void {
  testInfo.annotations.push({ type: 'flow', description: `${caseId}\n${body}` })
}

export async function stepSignOutForNextAccount(page: Page): Promise<void> {
  await test.step('Acción: cerrar sesión previa → Esperado: sin sesión de otra persona', async () => {
    await signOutIfSession(page)
  })
}

export async function stepEnsureAccount(
  page: Page,
  email: string,
  password: string
): Promise<EnsureAccountOutcome> {
  return test.step(
    `Acción: login (mensaje cuenta nueva) o registro (mensaje correo en uso) (${email}) → logged_in | registered | confirm_email`,
    async () => ensureProvisionedAccount(page, email, password)
  )
}

export async function stepAssertParentSession(
  page: Page,
  label: string
): Promise<void> {
  await test.step(`Validación: sesión padre (${label}) → dashboard u onboarding, sin AuthGuard`, async () => {
    await assertAuthenticatedParent(page)
  })
}

/** REG-PROV-01: sin perfil familiar suele ir a /onboarding — validar la primera pantalla, no el dashboard. */
export async function stepAssertRegProv01LoginDestination(
  page: Page,
  label: string
): Promise<void> {
  await test.step(
    `Validación: ${label} → onboarding «Así acompaña AstroKid» o dashboard (Salir)`,
    async () => {
      const onOnboarding = /\/onboarding(?:\?|$)/.test(page.url())
      const welcome = page.getByRole('heading', {
        name: /Así acompaña AstroKid|How AstroKid stays with you/i,
      })
      const seesWelcome = await welcome.isVisible({ timeout: 5_000 }).catch(() => false)
      if (onOnboarding || seesWelcome) {
        await assertOnboardingWelcomeFirstScreen(page)
        return
      }
      await assertAuthenticatedParent(page)
    }
  )
}

export function stepAnnotateConfirmEmail(testInfo: TestInfo, label: string, email: string): void {
  testInfo.annotations.push({
    type: 'manual',
    description: `${label}: abrir enlace de verificación para ${email} y volver a correr @provisioning.`,
  })
  testInfo.annotations.push({
    type: 'expected',
    description: `Tras verificar correo: outcome logged_in y paso 3 del flujo (sesión padre).`,
  })
}

export function stepAnnotateProvisionOutcome(
  testInfo: TestInfo,
  label: string,
  outcome: EnsureAccountOutcome
): void {
  if (outcome === 'confirm_email') return
  testInfo.annotations.push({
    type: 'provisioning',
    description:
      outcome === 'registered'
        ? `${label}: cuenta creada y sesión validada.`
        : `${label}: cuenta existente; login OK.`,
  })
}

export async function stepAdminSendSchoolAgreement(
  page: Page,
  admin: SmokeAccount,
  input: SendSchoolAgreementInput,
  coordinatorEmail: string
): Promise<void> {
  await test.step(
    `Acción: admin envía acuerdo a ${coordinatorEmail} → Esperado: mensaje de PDF enviado`,
    async () => {
      await stepSignOutForNextAccount(page)
      await stepEnsureAccount(page, admin.email, admin.password)
      await stepAssertParentSession(page, 'Admin plataforma')
      await adminSendSchoolAgreement(page, admin, input)
    }
  )
  test.info().annotations.push({
    type: 'manual',
    description:
      'Coordinador: enlace del correo → subir PDF + comprobante. Admin: Aprobar y activar en /admin/licenses (ESCUELA.md B–C).',
  })
}

export async function stepCoordinatorEscuelaDesk(
  page: Page,
  schoolParentEmail: string,
  options: { registerParent: boolean }
): Promise<void> {
  await test.step(
    'Acción: abrir /escuela → Esperado: heading Guía de alineación / School alignment',
    async () => {
      await page.goto('/escuela')
      await expect(
        page.getByRole('heading', { name: /Guía de alineación|School alignment/i })
      ).toBeVisible({ timeout: 20_000 })
    }
  )

  const desk = page.getByTestId('school-license-desk')
  const denied = page.getByTestId('school-desk-denied')
  const deskVisible = await desk.isVisible().catch(() => false)

  if (deskVisible && options.registerParent) {
    const given = process.env.REGISTRO_ESCUELA_PARENT_GIVEN?.trim() || 'Familia'
    const family = process.env.REGISTRO_ESCUELA_PARENT_FAMILY?.trim() || 'Proton'
    await test.step(
      `Acción: coordinador agrega ${schoolParentEmail} → Esperado: fila pending con ese correo`,
      async () => {
        await coordinatorRegisterParentEmail(page, schoolParentEmail, given, family)
      }
    )
    test.info().annotations.push({
      type: 'manual',
      description:
        'Coordinador: «Enviar el código a estos padres» y copiar REGISTRO_SCHOOL_INVITE_CODE.',
    })
    return
  }

  if (await denied.isVisible().catch(() => false)) {
    test.info().annotations.push({
      type: 'note',
      description: 'Licencia no activa: completar ESCUELA.md B–C y repetir TC-02.',
    })
  } else if (!deskVisible) {
    test.info().annotations.push({
      type: 'note',
      description: 'Escritorio escolar no visible aún (acuerdo o activación pendiente).',
    })
  }
}

export async function stepRedeemSchoolInviteIfConfigured(
  page: Page,
  schoolCode: string | undefined
): Promise<void> {
  if (!schoolCode) {
    test.info().annotations.push({
      type: 'manual',
      description: 'Definir REGISTRO_SCHOOL_INVITE_CODE para canjear licencia en /access.',
    })
    return
  }
  await test.step(
    `Acción: canjear código escolar en /access → Esperado: mensaje de código canjeado`,
    async () => {
      await redeemSchoolInviteCode(page, schoolCode)
    }
  )
}

export async function stepAssertDashboardPlanWithFallback(
  page: Page,
  role: ProvisioningRole
): Promise<void> {
  const plan = role.expectedPlan!
  await test.step(
    `Validación: plan ${role.label} → data-quota-plan="${plan}" en dashboard`,
    async () => {
      try {
        await assertDashboardPlan(page, plan)
      } catch {
        const onOnboarding = /onboarding/.test(page.url())
        if (onOnboarding) {
          test.info().annotations.push({
            type: 'manual',
            description: `${role.label}: completar onboarding; plan esperado ${plan}.`,
          })
          expect
            .soft(false, 'Cuenta sin perfil familiar: termina onboarding antes de validar el plan.')
            .toBe(true)
          return
        }
        if (role.id === 'familia_premium') {
          test.info().annotations.push({
            type: 'manual',
            description: 'Premium: activar en /access (checkout) o vía soporte.',
          })
          expect.soft(false, 'Plan premium aún no es premium_unlimited.').toBe(true)
          return
        }
        throw new Error(`Plan esperado ${plan} no coincide en dashboard.`)
      }
    }
  )
}

export async function runProvisionPersona(
  page: Page,
  testInfo: TestInfo,
  persona: ProvisioningPersona
): Promise<EnsureAccountOutcome> {
  return test.step(`Persona: ${persona.label} (${persona.email})`, async () => {
    await stepSignOutForNextAccount(page)
    const outcome = await stepEnsureAccount(page, persona.email, persona.password)
    if (outcome === 'confirm_email') {
      stepAnnotateConfirmEmail(testInfo, persona.label, persona.email)
      expect
        .soft(false, `${persona.label}: confirmar correo antes de usar la cuenta en otras suites.`)
        .toBe(true)
      return outcome
    }
    await stepAssertRegProv01LoginDestination(page, persona.label)
    stepAnnotateProvisionOutcome(testInfo, persona.label, outcome)
    return outcome
  })
}
