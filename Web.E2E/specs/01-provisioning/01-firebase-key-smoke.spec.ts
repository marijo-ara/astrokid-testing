import { test, expect } from '@playwright/test'
import { qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import {
  redactGoogleApiKeyInUrl,
  startIdentityToolkitSignInProbe,
} from '../../helpers/firebaseSignInProbe'

/**
 * Diagnóstico: qué API key usa el bundle de QA en signInWithPassword (sufijo only).
 * Correr si provisioning falla con CORS en identitytoolkit.
 */
test.describe('01 — Provisioning (Firebase key) @provisioning', () => {
  test.beforeEach(({}, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'diagnostico', 'sin_sesion')
  })

  test(qaTitle('diagnostico', 'QA expone petición Firebase signIn (diagnóstico key)'), async ({ page }) => {
    const probe = startIdentityToolkitSignInProbe(page)
    try {
      await page.goto('/login', { waitUntil: 'load' })
      await page.locator('#email').fill('firebase-probe@example.test')
      await page.locator('#password').fill('probe-only-not-a-real-password')
      await page.locator('#password').press('Enter')
      await page
        .getByTestId('login-error-message')
        .waitFor({ state: 'visible', timeout: 45_000 })
        .catch(() => {})

      const redacted = probe.lastSignInRequestUrlRedacted()
      expect(
        redacted,
        'No hubo llamada a identitytoolkit: Firebase no está configurado en el build o el form no envió.'
      ).toBeTruthy()

      test.info().annotations.push({
        type: 'firebase-key-suffix',
        description:
          `Compará en GCP Credentials que editas la key que termina igual que: ${redacted}. ` +
          `Vercel QA → NEXT_PUBLIC_FIREBASE_PROJECT_ID debe ser astro-kid (preview). ` +
          `Pestaña API restrictions: Don't restrict o Identity Toolkit + Token Service.`,
      })
    } finally {
      probe.dispose()
    }
  })
})
