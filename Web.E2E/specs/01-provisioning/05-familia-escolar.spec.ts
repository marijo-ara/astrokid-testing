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
  stepRedeemSchoolInviteIfConfigured,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const role = PROVISIONING_ROLES.find((r) => r.id === 'familia_escolar')!

test.describe('05 — Familia licencia escolar @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'familia_escolar', 'firebase_login')
  })

  test(qaTitle(['familia_escolar'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    const persona = findProvisioningPersona('familia_escolar')
    test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y correo familia escolar.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona!)
  })

  test(qaTitle(['familia_escolar'], 'validar rol: canje, onboarding hijo o plan institucional'), async ({
    page,
  }, testInfo) => {
    skipUnlessProvisioningQaReady()
    attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

    const password = qaIdentityPassword('familia_escolar') as string
    const email = resolveProvisioningEmail(role)
    const schoolCode = process.env.REGISTRO_SCHOOL_INVITE_CODE?.trim()

    await stepSignOutForNextAccount(page)
    const outcome = await stepEnsureAccount(page, email, password)
    if (outcome === 'confirm_email') {
      stepAnnotateConfirmEmail(testInfo, role.label, email)
      expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
      return
    }

    await stepAssertParentSession(page, role.label)
    await stepRedeemSchoolInviteIfConfigured(page, schoolCode)
    await stepEnsureFamilyChildAndPlan(page, role)
  })
})
