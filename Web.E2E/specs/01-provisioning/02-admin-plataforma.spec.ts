import { test } from '@playwright/test'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import { resolveProvisioningAdmin, type ProvisioningPersona } from '../../config/provisioningUsers'
import { qaTitle } from '../../config/qaTestAccounts'
import { skipUnlessProvisioningQaReady } from '../../helpers/provisioningSpecHelpers'
import {
  PROVISIONING_FLOW_TC01,
  attachProvisioningFlow,
  runProvisionPersona,
  stepAdminCreateSchoolAgreement,
} from '../../helpers/provisioningTestSteps'

/**
 * Suite admin — ejecutable sola: `playwright test specs/01-provisioning/02-admin-plataforma.spec.ts`
 */
test.describe('02 — Admin plataforma @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'admin_plataforma', 'firebase_login')
  })

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

  test(qaTitle(['admin_plataforma'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    const persona = adminPersona()
    test.skip(!persona, 'Esperado: SMOKE_ADMIN_EMAIL y contraseña en .env.local.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona as ProvisioningPersona)
  })

  test(qaTitle(['admin_plataforma'], 'crear escuela: enviar acuerdo al coordinador'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    test.skip(!adminPersona(), 'Esperado: SMOKE_ADMIN_EMAIL en .env.local.')
    await stepAdminCreateSchoolAgreement(page, testInfo)
  })
})
