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
  stepAssertOnboardingSchoolAccessExit,
  stepAssertSchoolAccessDeepLink,
  stepEnsureAccount,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'

const role = PROVISIONING_ROLES.find((r) => r.id === 'familia_free')!

test.describe('06 — Acceso escolar y cambio de cuenta @provisioning', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'familia_free', 'firebase_login')
  })

  test(
    qaTitle(['familia_free'], 'deep link /access?code= y salida desde onboarding'),
    async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      const persona = findProvisioningPersona('familia_free')
      test.skip(!persona, 'Esperado: REGISTRO_SUITE_PASSWORD y correo familia free.')

      const password = qaIdentityPassword('familia_free') as string
      const email = resolveProvisioningEmail(role)
      const demoCode = (process.env.REGISTRO_SCHOOL_INVITE_CODE?.trim() || 'DEMOCODE1').toUpperCase()

      await stepSignOutForNextAccount(page)
      const outcome = await stepEnsureAccount(page, email, password)
      if (outcome === 'confirm_email') {
        testInfo.annotations.push({
          type: 'manual',
          description: `${role.label}: verificar correo antes de probar /access.`,
        })
        test.skip(true, 'Correo sin verificar.')
      }

      await stepAssertSchoolAccessDeepLink(page, demoCode)
      await stepAssertOnboardingSchoolAccessExit(page)

      await page.getByTestId('auth-use-another-account').click()
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
      const next = new URL(page.url()).searchParams.get('next')
      expect(next, 'login debe conservar ?next=/access tras cerrar sesión').toMatch(/\/access/)
    }
  )
})
