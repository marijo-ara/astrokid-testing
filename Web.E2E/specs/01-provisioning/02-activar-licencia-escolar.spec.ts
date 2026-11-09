import { test, expect } from '@playwright/test'
import {
  findProvisioningPersona,
  PROVISIONING_ROLES,
  resolveProvisioningAdmin,
  resolveProvisioningEmail,
  type ProvisioningPersona,
} from '../../config/provisioningUsers'
import { hasResolvableSchoolPacketLink } from '../../helpers/schoolPacketTokenStore'
import { hasResolvableSchoolInviteCode } from '../../helpers/schoolInviteCodeStore'
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
  stepAdminCreateSchoolAgreement,
  stepCoordinatorAssertRedeemedSchoolFamily,
  stepCoordinatorRegisterSchoolFamily,
  stepCoordinatorLoginOnboardingThenSchoolPacket,
  stepSchoolFamilyRedeemAccessAndQuota,
  stepEnsureAccount,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const coordinatorRole = PROVISIONING_ROLES.find((r) => r.id === 'coordinador_escuela')!
const schoolFamilyRole = PROVISIONING_ROLES.find((r) => r.id === 'familia_escolar')!

function adminPersona(): ProvisioningPersona | undefined {
  const admin = resolveProvisioningAdmin()
  if (!admin) return undefined
  return {
    id: 'admin_plataforma',
    label: 'Admin plataforma',
    email: admin.email,
    password: admin.password,
  }
}

/**
 * Flujo completo escuela QA (8 pruebas en serie).
 * `playwright test specs/01-provisioning/02-activar-licencia-escolar.spec.ts`
 */
test.describe('Activar Licencia Escolar @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test(qaTitle(['admin_plataforma'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    annotateSuiteDefaultActor(testInfo, 'admin_plataforma', 'firebase_login')
    const persona = adminPersona()
    test.skip(!persona, 'Esperado: SMOKE_ADMIN_EMAIL y contraseña en .env.local.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona as ProvisioningPersona)
  })

  test(qaTitle(['admin_plataforma'], 'crear escuela: enviar acuerdo al coordinador'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    annotateSuiteDefaultActor(testInfo, 'admin_plataforma', 'firebase_login')
    test.skip(!adminPersona(), 'Esperado: SMOKE_ADMIN_EMAIL en .env.local.')
    await stepAdminCreateSchoolAgreement(page, testInfo)
  })

  test(qaTitle(['coordinador_escuela'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    annotateSuiteDefaultActor(testInfo, 'coordinador_escuela', 'firebase_login')
    const persona = findProvisioningPersona('coordinador_escuela')
    test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y correo coordinador en .env.local.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona!)
  })

  test(
    qaTitle(['coordinador_escuela'], 'subir acuerdo firmado y comprobante en /escuela/acuerdo'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      annotateSuiteDefaultActor(testInfo, 'coordinador_escuela', 'firebase_login')
      test.skip(
        !hasResolvableSchoolPacketLink(),
        'Sin token: corré «crear escuela: enviar acuerdo» antes en esta suite (misma corrida en serie).'
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
      annotateSuiteDefaultActor(testInfo, 'admin_plataforma', 'firebase_login')
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
      annotateSuiteDefaultActor(testInfo, 'coordinador_escuela', 'firebase_login')
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

  test(
    qaTitle(
      ['familia_escolar'],
      'activar licencia en /access y validar barra de misiones 0/100'
    ),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      test.skip(!shouldCoordinatorRegisterParent(), 'REGISTRO_ESCUELA_REGISTER_PARENT=0.')
      if (!hasResolvableSchoolInviteCode()) {
        test.skip(
          true,
          'Sin código escolar: corré esta suite en serie hasta «registrar familia» o «activar licencia»; alternativa: REGISTRO_SCHOOL_INVITE_CODE en .env.local.'
        )
      }
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)
      annotateSuiteDefaultActor(testInfo, 'familia_escolar', 'firebase_login')

      const password = qaIdentityPassword('familia_escolar') as string
      const schoolParentEmail = resolveProvisioningEmail(schoolFamilyRole)

      await stepSchoolFamilyRedeemAccessAndQuota(
        page,
        schoolParentEmail,
        password,
        schoolFamilyRole.label
      )
    }
  )

  test(
    qaTitle(
      ['coordinador_escuela'],
      'ver familia con licencia activa y datos del niño en /escuela'
    ),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      annotateSuiteDefaultActor(testInfo, 'coordinador_escuela', 'firebase_login')
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
      await stepCoordinatorAssertRedeemedSchoolFamily(page, coordinatorRole.label, schoolParentEmail)
    }
  )
})
