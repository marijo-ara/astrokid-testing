import { expect, type Page } from '@playwright/test'
import {
  emailAlreadyRegisteredLocatorPattern,
  loginAccountNotFoundLocatorPattern,
  loginMeansAccountNotFound,
  normalizeBannerText,
  PROVISIONING_AUTH_ERROR_KIND,
  PROVISIONING_AUTH_UI,
  registroMeansEmailInUse,
} from '../config/provisioningAuthMessages'

export type RegisterOutcome =
  | 'created'
  | 'already_registered'
  | 'confirm_email'
  /** Banner genérico o timeout: la cuenta pudo crearse igual — intentar login. */
  | 'ui_error'

/** Resultado de asegurar cuenta: login existente, registro nuevo o correo pendiente. */
export type EnsureAccountOutcome = 'logged_in' | 'registered' | 'confirm_email'

export type LoginAttemptResult =
  | { status: 'logged_in' }
  | { status: 'account_not_found'; message: string }
  | { status: 'login_failed'; message: string }

async function readAuthBanner(
  page: Page,
  testId: 'login-error-message' | 'registro-error-message'
): Promise<{ message: string | null; kind: string | null }> {
  const banner = page.getByTestId(testId)
  if (!(await banner.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return { message: null, kind: null }
  }
  const message = normalizeBannerText(await banner.locator('.text-red-700').textContent())
  const kind = (await banner.getAttribute('data-auth-error-kind'))?.trim() || null
  return { message, kind }
}

async function readLoginErrorBanner(page: Page): Promise<{ message: string | null; kind: string | null }> {
  return readAuthBanner(page, 'login-error-message')
}

async function readRegistroBanner(page: Page): Promise<{ message: string | null; kind: string | null }> {
  const fromTestId = await readAuthBanner(page, 'registro-error-message')
  if (fromTestId.message) return fromTestId
  const legacy = page.locator('.text-red-700').first()
  if (await legacy.isVisible().catch(() => false)) {
    return { message: normalizeBannerText(await legacy.textContent()), kind: null }
  }
  return fromTestId
}

/**
 * Login en /login. account_not_found si data-auth-error-kind=account-not-found, copy loginAccountNotFound
 * o CTA login-failure-register (misma condición que LoginFailureHelp en la web).
 */
export async function attemptLoginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<LoginAttemptResult> {
  await page.goto('/login')
  await expect(page).toHaveURL(/login/)

  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByTestId('login-submit-button').click()

  const waitMs = 30_000
  const leftLogin = page
    .waitForURL((url) => !/\/login(?:\?|$)/.test(url.pathname + url.search), { timeout: waitMs })
    .then(() => 'left' as const)

  const errorVisible = page
    .getByTestId('login-error-message')
    .waitFor({ state: 'visible', timeout: waitMs })
    .then(() => 'error' as const)

  const first = await Promise.race([leftLogin, errorVisible]).catch(() => 'timeout' as const)

  if (first === 'left' && (await hasParentSession(page))) {
    return { status: 'logged_in' }
  }

  const { message, kind } = await readLoginErrorBanner(page)
  const showsRegisterCta = await page
    .getByTestId('login-failure-register')
    .isVisible({ timeout: 1_500 })
    .catch(() => false)

  if (loginMeansAccountNotFound(kind, message) || showsRegisterCta) {
    if (message) {
      await expect(page.getByTestId('login-error-message')).toContainText(
        loginAccountNotFoundLocatorPattern()
      )
    }
    if (kind) {
      expect(kind, 'kind de login alineado con firebaseAuthErrors').toBe(
        PROVISIONING_AUTH_ERROR_KIND.accountNotFound
      )
    }
    return {
      status: 'account_not_found',
      message: message ?? PROVISIONING_AUTH_UI.loginAccountNotFound.es,
    }
  }

  if (message) {
    return { status: 'login_failed', message }
  }

  if (await hasParentSession(page)) {
    return { status: 'logged_in' }
  }

  return {
    status: 'login_failed',
    message: message ?? 'Sin sesión ni banner de error reconocible en /login.',
  }
}

/** Intenta login en /login. Devuelve true si hay sesión de padre. */
export async function tryLoginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  const result = await attemptLoginWithCredentials(page, email, password)
  return result.status === 'logged_in'
}

/**
 * Crea la cuenta en /registro solo cuando el caller ya validó account_not_found en login.
 * Si aparece el mensaje canónico de email en uso, no se considera registro nuevo.
 */
export async function registerParentViaRegistro(
  page: Page,
  email: string,
  password: string
): Promise<RegisterOutcome> {
  await page.goto('/registro')
  await expect(page).toHaveURL(/registro/)

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirmPassword').fill(password)
  await page.locator('#privacy-consent').check()

  const submitRegistro = page.locator('form button[type="submit"]')
  await expect(submitRegistro).toBeVisible({ timeout: 15_000 })
  await expect(submitRegistro).toBeEnabled({ timeout: 15_000 })
  await submitRegistro.click()

  const waitMs = 25_000
  const emailInUseByKind = page.locator(
    `[data-testid="registro-error-message"][data-auth-error-kind="${PROVISIONING_AUTH_ERROR_KIND.emailInUse}"]`
  )
  const emailInUseBanner = page
    .getByTestId('registro-error-message')
    .filter({ hasText: emailAlreadyRegisteredLocatorPattern() })
  const emailInUseActions = page.getByTestId('email-in-use-actions')
  const confirmEmail = page.getByText(/Confirma tu correo|Confirm your email/i)
  const accountCreated = page.getByText(
    /Cuenta creada exitosamente|Account created|configurar tu perfil|set up your profile/i
  )
  const weak = page.getByText(/contraseña débil|weak password|Mínimo 6/i)

  const alreadyRegisteredVisible = () => 'already_registered' as const

  const outcome = await Promise.race([
    emailInUseByKind.waitFor({ state: 'visible', timeout: waitMs }).then(alreadyRegisteredVisible),
    emailInUseBanner.waitFor({ state: 'visible', timeout: waitMs }).then(alreadyRegisteredVisible),
    emailInUseActions.waitFor({ state: 'visible', timeout: waitMs }).then(alreadyRegisteredVisible),
    confirmEmail.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'confirm_email' as const),
    accountCreated.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'created' as const),
    page.waitForURL(/dashboard|onboarding/, { timeout: waitMs }).then(() => 'created' as const),
  ]).catch(() => null)

  const assertRegistroEmailInUse = async (): Promise<void> => {
    const registroError = await readRegistroBanner(page)
    expect(
      registroMeansEmailInUse(registroError.kind, registroError.message),
      `Registro: se esperaba kind=${PROVISIONING_AUTH_ERROR_KIND.emailInUse} o copy registro.emailInUse`
    ).toBe(true)
    if (registroError.message) {
      await expect(page.getByTestId('registro-error-message')).toContainText(
        emailAlreadyRegisteredLocatorPattern()
      )
    }
    if (registroError.kind) {
      expect(registroError.kind).toBe(PROVISIONING_AUTH_ERROR_KIND.emailInUse)
    }
  }

  if (outcome === 'already_registered') {
    await assertRegistroEmailInUse()
    return 'already_registered'
  }

  if (outcome === 'confirm_email' || outcome === 'created') {
    return outcome
  }

  const registroError = await readRegistroBanner(page)
  if (registroMeansEmailInUse(registroError.kind, registroError.message)) {
    await assertRegistroEmailInUse()
    return 'already_registered'
  }

  if (
    registroError.message &&
    /Error al crear la cuenta|Could not create account|No pudimos contactar a Firebase|Could not reach Firebase|no está autorizado para registrar|not allowed to sign up/i.test(
      registroError.message
    )
  ) {
    await signOutIfSession(page)
    if (await tryLoginWithCredentials(page, email, password)) {
      return 'already_registered'
    }
  }

  if (await weak.isVisible().catch(() => false)) {
    throw new Error('Registro rechazado: revisa la contraseña (mínimo 6 caracteres).')
  }

  return 'ui_error'
}

/** Pantalla AuthGuard en rutas protegidas sin sesión (URL puede ser /dashboard o /escuela). */
async function isAuthGuardLoginWall(page: Page): Promise<boolean> {
  return page
    .getByRole('heading', { name: /Bienvenido, Explorador|Welcome, Explorer/i })
    .isVisible({ timeout: 2_500 })
    .catch(() => false)
}

/** Sesión de padre con Firebase + UI (no solo “no estoy en /login”). */
export async function hasParentSession(page: Page): Promise<boolean> {
  if (await isAuthGuardLoginWall(page)) return false
  if (/\/login(?:\?|$)/.test(page.url())) return false

  if (!/dashboard|onboarding/.test(page.url())) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
  }

  if (await isAuthGuardLoginWall(page)) return false
  if (/\/login(?:\?|$)/.test(page.url())) return false

  return page
    .locator('[data-testid="logout-button"]')
    .first()
    .isVisible({ timeout: 12_000 })
    .catch(() => false)
}

export async function assertAuthenticatedParent(page: Page): Promise<void> {
  const ok = await hasParentSession(page)
  expect(
    ok,
    'No hay sesión de padre: confirmá el correo en Proton o revisá contraseña en .env.local.'
  ).toBe(true)
}

export async function signOutIfSession(page: Page): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {})
  const logout = page
    .locator('[data-testid="logout-button"]')
    .or(page.getByRole('button', { name: /Cerrar sesión|Cerrar Sesión|Log out|Sign out/i }))
  if (await logout.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
    await logout.first().click()
    await page.waitForURL(/login/, { timeout: 25_000 }).catch(() => {})
    return
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
}

/**
 * 1) Login: si hay sesión → listo.
 * 2) Solo si el banner es loginAccountNotFound → registro en /registro.
 * 3) Si registro muestra emailInUse → no registrar de nuevo; login.
 */
export async function ensureProvisionedAccount(
  page: Page,
  email: string,
  password: string
): Promise<EnsureAccountOutcome> {
  await signOutIfSession(page)

  const loginAttempt = await attemptLoginWithCredentials(page, email, password)
  if (loginAttempt.status === 'logged_in') {
    return 'logged_in'
  }

  if (loginAttempt.status === 'login_failed') {
    throw new Error(
      `Login falló sin mensaje de cuenta nueva (${email}): ${loginAttempt.message}. ` +
        `Revisá contraseña (SMOKE_* / REGISTRO_SUITE_PASSWORD) o verificación de correo. ` +
        `Para crear cuenta, la UI debe mostrar: ${PROVISIONING_AUTH_UI.loginAccountNotFound.es}`
    )
  }

  const reg = await registerParentViaRegistro(page, email, password)
  if (reg === 'confirm_email') {
    return 'confirm_email'
  }

  if (reg === 'ui_error' && (await hasParentSession(page))) {
    return 'registered'
  }

  const shouldTryLoginAfterRegister =
    reg === 'created' || reg === 'already_registered' || reg === 'ui_error'

  if (!shouldTryLoginAfterRegister) {
    throw new Error(`Resultado de registro no esperado: ${reg}`)
  }

  await signOutIfSession(page)
  const afterRegister = await attemptLoginWithCredentials(page, email, password)
  if (afterRegister.status === 'logged_in' && (await hasParentSession(page))) {
    if (reg === 'ui_error' || reg === 'already_registered') {
      return 'logged_in'
    }
    return 'registered'
  }

  if (await page.getByText(/Confirma tu correo|Confirm your email/i).isVisible().catch(() => false)) {
    return 'confirm_email'
  }

  if (reg === 'ui_error' || reg === 'already_registered') {
    return 'confirm_email'
  }

  throw new Error(
    'Registro ambiguo: confirmá el correo en Proton o probá login manual con esa contraseña.'
  )
}

export async function redeemSchoolInviteCode(page: Page, code: string): Promise<void> {
  await page.goto('/access')
  await expect(page).toHaveURL(/access/)
  await page.locator('#invite-code').fill(code.trim())
  await page.getByRole('button', { name: /Canjear código|Redeem code/i }).click()
  await expect(
    page.getByText(/Código canjeado|código canjeado|redeemed/i).first()
  ).toBeVisible({ timeout: 30_000 })
}

export async function assertDashboardPlan(page: Page, plan: string): Promise<void> {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 })
  const quota = page.locator('[data-quota-plan]').first()
  await expect(quota).toBeVisible({ timeout: 30_000 })
  await expect(quota).not.toHaveAttribute('data-quota-plan', 'loading', { timeout: 30_000 })
  await expect(quota).toHaveAttribute('data-quota-plan', plan)
}
