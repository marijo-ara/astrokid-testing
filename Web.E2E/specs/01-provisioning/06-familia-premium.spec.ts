import { test, expect } from '@playwright/test'
import {
  findProvisioningPersona,
  PROVISIONING_ROLES,
  resolveProvisioningAdmin,
  resolveProvisioningEmail,
  type ProvisioningPersona,
} from '../../config/provisioningUsers'
import { qaIdentityPassword, qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import { skipUnlessProvisioningQaReady, shouldAdminActivatePremiumSinpe } from '../../helpers/provisioningSpecHelpers'
import {
  PROVISIONING_FLOW_TC01,
  PROVISIONING_FLOW_TC02,
  attachProvisioningFlow,
  runProvisionPersona,
  stepAnnotateConfirmEmail,
  stepAssertParentSession,
  stepAssertPremiumFamilyPlan,
  stepAdminActivatePremiumSinpe,
  stepEnsureFamilyChildAndPlan,
  stepEnsureAccount,
  stepPremiumFamilySubmitSinpeProof,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const role = PROVISIONING_ROLES.find((r) => r.id === 'familia_premium')!

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

test.describe('06 — Familia Premium @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'familia_premium', 'firebase_login')
  })

  test(qaTitle(['familia_premium'], 'asegurar cuenta: login o registro'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    const persona = findProvisioningPersona('familia_premium')
    test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y correo familia premium.')
    attachProvisioningFlow(testInfo, 'REG-PROV-01', PROVISIONING_FLOW_TC01)
    await runProvisionPersona(page, testInfo, persona!)
  })

  test(
    qaTitle(['familia_premium'], 'validar rol: onboarding hijo o perfil listo (sin plan aún)'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const password = qaIdentityPassword('familia_premium') as string
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
    }
  )

  test(
    qaTitle(['familia_premium'], 'pagar Premium: dashboard → Google Pay / ONVO / SINPE'),
    async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

    const password = qaIdentityPassword('familia_premium') as string
    const email = resolveProvisioningEmail(role)

    await stepSignOutForNextAccount(page)
    const outcome = await stepEnsureAccount(page, email, password)
    if (outcome === 'confirm_email') {
      stepAnnotateConfirmEmail(testInfo, role.label, email)
      expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
      return
    }
    await stepAssertParentSession(page, role.label)
      await stepPremiumFamilySubmitSinpeProof(page)
    }
  )

  test(qaTitle(['admin_plataforma'], 'activar Premium tras comprobante SINPE'), async ({ page }, testInfo) => {
    skipUnlessProvisioningQaReady()
    annotateSuiteDefaultActor(testInfo, 'admin_plataforma', 'firebase_login')
    test.skip(!adminPersona(), 'Esperado: SMOKE_ADMIN_EMAIL en .env.local.')
    test.skip(!shouldAdminActivatePremiumSinpe(), 'REGISTRO_PREMIUM_ADMIN_ACTIVATE=0.')
    attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)
    await stepAdminActivatePremiumSinpe(page, testInfo)
  })

  test(
    qaTitle(['familia_premium'], 'validar plan premium_unlimited en dashboard'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      attachProvisioningFlow(testInfo, 'REG-PROV-02', PROVISIONING_FLOW_TC02)

      const password = qaIdentityPassword('familia_premium') as string
      const email = resolveProvisioningEmail(role)

      await stepSignOutForNextAccount(page)
      const outcome = await stepEnsureAccount(page, email, password)
      if (outcome === 'confirm_email') {
        stepAnnotateConfirmEmail(testInfo, role.label, email)
        expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
        return
      }
      await stepAssertParentSession(page, role.label)
      await stepAssertPremiumFamilyPlan(page, role)
    }
  )
})
