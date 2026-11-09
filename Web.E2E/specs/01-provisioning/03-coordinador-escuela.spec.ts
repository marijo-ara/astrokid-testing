import { test, expect } from '@playwright/test'
import {
  findProvisioningPersona,
  PROVISIONING_ROLES,
  resolveProvisioningEmail,
} from '../../config/provisioningUsers'
import { hasResolvableSchoolPacketLink } from '../../helpers/schoolPacketTokenStore'
import { qaIdentityPassword, qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import {
  skipUnlessProvisioningQaReady,
  shouldAdminActivateSchoolLicense,
  shouldCoordinatorRegisterParent,
} from '../../helpers/provisioningSpecHelpers'
import {
  PROVISIONING_FLOW_TC01,
  PROVISIONING_FLOW_TC02,
  attachProvisioningFlow,
  runProvisionPersona,
  stepAnnotateConfirmEmail,
  stepAssertParentSession,
  stepAdminActivateSchoolLicense,
  stepCoordinatorEscuelaDesk,
  stepCoordinatorRegisterSchoolFamily,
  stepCoordinatorLoginOnboardingThenSchoolPacket,
  stepAssertSchoolPacketLinkReady,
  stepEnsureAccount,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const coordinatorRole = PROVISIONING_ROLES.find((r) => r.id === 'coordinador_escuela')!
const schoolFamilyRole = PROVISIONING_ROLES.find((r) => r.id === 'familia_escolar')!

test.describe('03 — Coordinador escuela @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'coordinador_escuela', 'firebase_login')
  })

  test(qaTitle(['coordinador_escuela'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    const persona = findProvisioningPersona('coordinador_escuela')
    test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y correo coordinador en .env.local.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona!)
  })

  test(
    qaTitle(['coordinador_escuela'], 'preflight: enlace acuerdo listo (capturado en suite 02)'),
    async ({}, testInfo) => {
      skipUnlessProvisioningQaReady()
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)
      await stepAssertSchoolPacketLinkReady(testInfo)
    }
  )

  test(
    qaTitle(['coordinador_escuela'], 'subir acuerdo firmado y comprobante en /escuela/acuerdo'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      test.skip(
        !hasResolvableSchoolPacketLink(),
        'Sin token: corré suite 02 (enviar acuerdo) y el preflight de esta suite, en la misma corrida provisioning (02 antes que 03).'
      )
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const password = qaIdentityPassword('coordinador_escuela') as string
      const email = resolveProvisioningEmail(coordinatorRole)

      const outcome = await stepCoordinatorLoginOnboardingThenSchoolPacket(
        page,
        email,
        password,
        coordinatorRole.label
      )
      if (outcome === 'confirm_email') {
        stepAnnotateConfirmEmail(testInfo, coordinatorRole.label, email)
        expect.soft(false, `${coordinatorRole.label}: correo sin verificar.`).toBe(true)
        return
      }
    }
  )

  test(
    qaTitle(['admin_plataforma'], 'activar licencia escolar tras paquete del coordinador'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      test.skip(!shouldAdminActivateSchoolLicense(), 'REGISTRO_ESCUELA_ADMIN_ACTIVATE=0.')
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)
      await stepAdminActivateSchoolLicense(page, testInfo)
    }
  )

  test(
    qaTitle(
      ['coordinador_escuela', 'familia_escolar'],
      'registrar familia licencia escolar en escritorio /escuela'
    ),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      test.skip(!shouldCoordinatorRegisterParent(), 'REGISTRO_ESCUELA_REGISTER_PARENT=0.')
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const password = qaIdentityPassword('coordinador_escuela') as string
      const email = resolveProvisioningEmail(coordinatorRole)
      const schoolParentEmail = resolveProvisioningEmail(schoolFamilyRole)

      await stepSignOutForNextAccount(page)
      const outcome = await stepEnsureAccount(page, email, password)
      if (outcome === 'confirm_email') {
        stepAnnotateConfirmEmail(testInfo, coordinatorRole.label, email)
        expect.soft(false, `${coordinatorRole.label}: correo sin verificar.`).toBe(true)
        return
      }

      await stepAssertParentSession(page, coordinatorRole.label)
      await stepCoordinatorRegisterSchoolFamily(page, coordinatorRole.label, schoolParentEmail)
    }
  )

  test(qaTitle(['coordinador_escuela'], 'validar rol: escritorio /escuela'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

    const password = qaIdentityPassword('coordinador_escuela') as string
    const email = resolveProvisioningEmail(coordinatorRole)
    const schoolParentEmail = resolveProvisioningEmail(schoolFamilyRole)

    await stepSignOutForNextAccount(page)
    const outcome = await stepEnsureAccount(page, email, password)
    if (outcome === 'confirm_email') {
      stepAnnotateConfirmEmail(testInfo, coordinatorRole.label, email)
      expect.soft(false, `${coordinatorRole.label}: correo sin verificar.`).toBe(true)
      return
    }

    await stepAssertParentSession(page, coordinatorRole.label)
    await stepCoordinatorEscuelaDesk(page, schoolParentEmail, {
      registerParent: false,
    })
    await expect(page.getByTestId('school-license-desk')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('school-parent-pending')).toContainText(schoolParentEmail, {
      timeout: 15_000,
    })
  })
})
