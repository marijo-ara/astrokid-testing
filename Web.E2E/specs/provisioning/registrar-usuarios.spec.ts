import { test, expect } from '@playwright/test'
import {
  PROVISIONING_ROLES,
  listProvisioningPersonas,
  resolveProvisioningEmail,
  resolveProvisioningPassword,
  resolveProvisioningAdmin,
} from '../../config/provisioningUsers'
import { resolveProvisioningSchoolName } from '../../helpers/schoolProvisioning'
import { usesRemoteFirebaseLogin } from '../../helpers/smokeAccount'
import { qaTitle } from '../../config/qaTestAccounts'
import {
  PROVISIONING_FLOW_TC01,
  PROVISIONING_FLOW_TC02,
  attachProvisioningFlow,
  runProvisionPersona,
  stepAdminSendSchoolAgreement,
  stepAssertDashboardPlanWithFallback,
  stepAssertParentSession,
  stepCoordinatorEscuelaDesk,
  stepEnsureAccount,
  stepAnnotateConfirmEmail,
  stepRedeemSchoolInviteIfConfigured,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const coordinatorRole = PROVISIONING_ROLES.find((r) => r.id === 'coordinador_escuela')!
const schoolFamilyRole = PROVISIONING_ROLES.find((r) => r.id === 'familia_escolar')!

function shouldSendEscuelaAgreement(): boolean {
  return process.env.REGISTRO_ESCUELA_SEND_AGREEMENT !== '0'
}

function shouldCoordinatorRegisterParent(): boolean {
  return process.env.REGISTRO_ESCUELA_REGISTER_PARENT !== '0'
}

function skipUnlessProvisioningQaReady(): void {
  test.skip(
    !usesRemoteFirebaseLogin(),
    'Esperado: PLAYWRIGHT_ENV=qa en .env.local (localhost no aprovisiona).'
  )
  test.skip(
    !resolveProvisioningPassword(),
    'Esperado: REGISTRO_SUITE_PASSWORD o SMOKE_PARENT_PASSWORD en .env.local.'
  )
}

/**
 * @provisioning — REG-PROV (docs/casos/REGISTRO_USUARIOS_QA.md)
 *
 * Un test por rol en el runner (serial): si uno falla, el resto sigue listado y puede ejecutarse tras corregir.
 */
test.describe('Registrar usuarios @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.describe('REG-PROV-01 — Asegurar cuentas', () => {
    test.describe.configure({ mode: 'serial' })

    const personas = listProvisioningPersonas()

    if (personas.length === 0) {
      test(
        qaTitle(
          ['admin_plataforma', 'coordinador_escuela', 'familia_free', 'familia_escolar', 'familia_premium'],
          'asegurar cuentas: sin configuración'
        ),
        () => {
          skipUnlessProvisioningQaReady()
          test.skip(true, 'Esperado: REGISTRO_SUITE_PASSWORD y al menos un rol (admin opcional + familias).')
        }
      )
    }

    for (const persona of personas) {
      test(qaTitle([persona.id], `${persona.label}: login o registro`), async ({ page }, testInfo) => {
        skipUnlessProvisioningQaReady()
        if (persona.id === 'admin_plataforma') {
          attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
          if (!resolveProvisioningAdmin()) {
            testInfo.annotations.push({
              type: 'note',
              description: 'Sin SMOKE_ADMIN_*: matriz sin admin; /admin/licenses no se usa en TC-02 paso 1.',
            })
          }
        }
        await runProvisionPersona(page, testInfo, persona)
      })
    }
  })

  test.describe('REG-PROV-02 — Validar roles', () => {
    test.describe.configure({ mode: 'serial' })

    test(qaTitle(['admin_plataforma'], 'admin: envío acuerdo escolar (opcional)'), async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const admin = resolveProvisioningAdmin()
      if (!admin) {
        test.skip(true, 'Sin SMOKE_ADMIN_EMAIL: omitido envío de acuerdo.')
        return
      }
      if (!shouldSendEscuelaAgreement()) {
        test.skip(true, 'REGISTRO_ESCUELA_SEND_AGREEMENT=0.')
        return
      }

      const coordinatorEmail = resolveProvisioningEmail(coordinatorRole)
      await stepAdminSendSchoolAgreement(page, admin, {
        schoolName: resolveProvisioningSchoolName(),
        coordinatorEmail,
        families: process.env.REGISTRO_SCHOOL_FAMILIES?.trim() || '2',
        students: process.env.REGISTRO_SCHOOL_STUDENTS?.trim() || '2',
      }, coordinatorEmail)
    })

    for (const role of PROVISIONING_ROLES) {
      test(qaTitle([role.id], `${role.label}: sesión, escuela o plan`), async ({ page }, testInfo) => {
        skipUnlessProvisioningQaReady()
        if (role.id === 'coordinador_escuela') {
          attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)
        }

        const password = resolveProvisioningPassword() as string
        const email = resolveProvisioningEmail(role)
        const schoolCode = process.env.REGISTRO_SCHOOL_INVITE_CODE?.trim()
        const schoolParentEmail = resolveProvisioningEmail(schoolFamilyRole)

        await stepSignOutForNextAccount(page)

        const outcome = await stepEnsureAccount(page, email, password)
        if (outcome === 'confirm_email') {
          stepAnnotateConfirmEmail(testInfo, role.label, email)
          expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
          return
        }

        await stepAssertParentSession(page, role.label)

        if (role.id === 'coordinador_escuela') {
          await stepCoordinatorEscuelaDesk(page, schoolParentEmail, {
            registerParent: shouldCoordinatorRegisterParent(),
          })
          return
        }

        if (role.id === 'familia_escolar') {
          await stepRedeemSchoolInviteIfConfigured(page, schoolCode)
        }

        if (role.expectedPlan) {
          await stepAssertDashboardPlanWithFallback(page, role)
        }
      })
    }
  })
})
