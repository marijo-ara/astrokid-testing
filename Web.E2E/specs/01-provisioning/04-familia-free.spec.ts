import { test, expect } from '@playwright/test'
import {
  findProvisioningPersona,
  PROVISIONING_ROLES,
  resolveProvisioningEmail,
} from '../../config/provisioningUsers'
import { qaIdentityPassword, qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import { skipUnlessProvisioningQaReady } from '../../helpers/provisioningSpecHelpers'
import {
  PROVISIONING_FLOW_TC01,
  PROVISIONING_FLOW_TC02,
  attachProvisioningFlow,
  runProvisionPersona,
  stepAnnotateConfirmEmail,
  stepAssertParentSession,
  stepEnsureFamilyChildAndPlan,
  stepEnsureAccount,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const role = PROVISIONING_ROLES.find((r) => r.id === 'familia_free')!

test.describe('04 — Familia Free @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'familia_free', 'firebase_login')
  })

  test(qaTitle(['familia_free'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    const persona = findProvisioningPersona('familia_free')
    test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y SMOKE_PARENT_EMAIL (o default).')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona!)
  })

  test(qaTitle(['familia_free'], 'validar rol: onboarding hijo o plan free en dashboard'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

    const password = qaIdentityPassword('familia_free') as string
    const email = resolveProvisioningEmail(role)

    await stepSignOutForNextAccount(page)
    const outcome = await stepEnsureAccount(page, email, password)
    if (outcome === 'confirm_email') {
      stepAnnotateConfirmEmail(testInfo, role.label, email)
      expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
      return
    }

    await stepAssertParentSession(page, role.label)
    await stepEnsureFamilyChildAndPlan(page, role)
  })
})
