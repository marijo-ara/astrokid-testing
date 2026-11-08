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

/**
 * @provisioning — REG-PROV (docs/casos/REGISTRO_USUARIOS_QA.md)
 *
 * Cada test adjunta el flujo completo (annotation `flow`) y descompone en test.step
 * con patrón: Acción → Esperado / Validación.
 */
test.describe('Registrar usuarios @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test(
    qaTitle(
      ['admin_plataforma', 'coordinador_escuela', 'familia_free', 'familia_escolar', 'familia_premium'],
      'asegurar cuentas: login o registro'
    ),
    async ({ page }, testInfo) => {
      attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)

      await test.step('Precondición: entorno QA Firebase + contraseña de suite', async () => {
        test.skip(
          !usesRemoteFirebaseLogin(),
          'Esperado: PLAYWRIGHT_ENV=qa en .env.local (localhost no aprovisiona).'
        )
        const passwordRaw = resolveProvisioningPassword()
        test.skip(
          !passwordRaw,
          'Esperado: REGISTRO_SUITE_PASSWORD o SMOKE_PARENT_PASSWORD en .env.local.'
        )
        const personas = listProvisioningPersonas()
        test.skip(
          personas.length === 0,
          'Esperado: REGISTRO_SUITE_PASSWORD y al menos una persona (admin opcional + roles).'
        )
        if (!resolveProvisioningAdmin()) {
          testInfo.annotations.push({
            type: 'note',
            description:
              'Sin SMOKE_ADMIN_*: matriz sin admin; /admin/licenses no se usa en TC-02 paso 1.',
          })
        }
        expect(personas.length).toBeGreaterThan(0)
      })

      const personas = listProvisioningPersonas()
      for (const persona of personas) {
        await runProvisionPersona(page, testInfo, persona)
      }
    }
  )

  test(
    qaTitle(
      ['admin_plataforma', 'coordinador_escuela', 'familia_free', 'familia_escolar', 'familia_premium'],
      'validar roles: escuela, planes y canje'
    ),
    async ({ page }, testInfo) => {
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const passwordRaw = resolveProvisioningPassword()
      test.skip(
        !usesRemoteFirebaseLogin(),
        'Esperado: PLAYWRIGHT_ENV=qa en .env.local.'
      )
      test.skip(!passwordRaw, 'Esperado: REGISTRO_SUITE_PASSWORD en .env.local.')
      const password = passwordRaw as string

      const schoolCode = process.env.REGISTRO_SCHOOL_INVITE_CODE?.trim()
      const coordinatorEmail = resolveProvisioningEmail(coordinatorRole)
      const schoolParentEmail = resolveProvisioningEmail(schoolFamilyRole)
      const admin = resolveProvisioningAdmin()

      if (admin && shouldSendEscuelaAgreement()) {
        await stepAdminSendSchoolAgreement(page, admin, {
          schoolName: resolveProvisioningSchoolName(),
          coordinatorEmail,
          families: process.env.REGISTRO_SCHOOL_FAMILIES?.trim() || '2',
          students: process.env.REGISTRO_SCHOOL_STUDENTS?.trim() || '2',
        }, coordinatorEmail)
      } else if (!admin) {
        testInfo.annotations.push({
          type: 'note',
          description: 'Sin admin: omitido envío de acuerdo (SMOKE_ADMIN_* o REGISTRO_ESCUELA_SEND_AGREEMENT=0).',
        })
      }

      for (const role of PROVISIONING_ROLES) {
        const email = resolveProvisioningEmail(role)

        await test.step(`Rol: ${role.label} (${email})`, async () => {
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
    }
  )
})
