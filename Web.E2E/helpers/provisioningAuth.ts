import { expect, type Page } from '@playwright/test'
import {
  emailAlreadyRegisteredLocatorPattern,
  loginAccountNotFoundLocatorPattern,
  loginFailureIsRetryable,
  loginMeansAccountNotFound,
  provisioningLoginShouldTryRegistro,
  messageMeansLoginNetworkError,
  normalizeBannerText,
  PROVISIONING_AUTH_ERROR_KIND,
  PROVISIONING_AUTH_UI,
  registroMeansEmailInUse,
} from '../config/provisioningAuthMessages'
import {
  formatIdentityToolkitProbe,
  startIdentityToolkitSignInProbe,
  type IdentityToolkitSignInProbe,
} from './firebaseSignInProbe'
import { ensureVercelProtectionOnContext } from '../fixtures/vercelProtectionHeaders'

const LOGIN_SUBMIT_RETRIES = 3

let loginProbeDiagnostics = ''

export function consumeLastLoginProbeDiagnostics(): string {
  const value = loginProbeDiagnostics
  loginProbeDiagnostics = ''
  return value
}

async function waitForLoginFormReady(page: Page): Promise<void> {
  await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 25_000 })
  await expect(page.locator('#email')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
  const submit = page.getByTestId('login-submit-button')
  await expect(submit).toBeVisible({ timeout: 20_000 })
  await expect(submit).toBeEnabled({ timeout: 20_000 })
  await expect(page.getByTestId('login-google-button')).toBeVisible({ timeout: 20_000 })
}

async function fillLoginField(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector)
  await field.click()
  await field.fill('')
  await field.pressSequentially(value, { delay: 12 })
  await expect(field).toHaveValue(value, { timeout: 8_000 })
}

async function submitLoginForm(page: Page, email: string, password: string): Promise<void> {
  const trimmedEmail = email.trim()
  const trimmedPassword = password.trim()

  await fillLoginField(page, '#email', trimmedEmail)
  await fillLoginField(page, '#password', trimmedPassword)

  if (process.env.PROVISIONING_PAUSE_LOGIN === '1') {
    await page.pause()
    const loginPath = new URL(page.url())
    if (!/\/login(?:\?|$)/.test(loginPath.pathname + loginPath.search)) {
      return
    }
  }

  const passwordField = page.locator('#password')
  await expect(page.getByTestId('login-submit-button')).toBeEnabled({ timeout: 10_000 })
  await passwordField.press('Enter')
}

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
  | { status: 'login_failed'; message: string; kind?: string | null }

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

function isOffLoginRoute(page: Page): boolean {
  const { pathname, search } = new URL(page.url())
  return !/\/login(?:\?|$)/.test(pathname + search)
}

/** Salir en header desktop/mobile; `logout-button` solo está en menú hamburguesa/dropdown. */
function parentSessionLogoutLocator(page: Page) {
  return page
    .locator('[data-testid="logout-button-desktop"]')
    .or(page.locator('[data-testid="logout-button-mobile"]'))
    .or(page.locator('[data-testid="logout-button"]'))
    .or(page.getByRole('button', { name: /Salir|Log out|Sign out|Cerrar sesión/i }))
}

function isOnboardingRoute(page: Page): boolean {
  return /\/onboarding(?:\?|$)/.test(new URL(page.url()).pathname)
}

const ONBOARDING_WELCOME_HEADING = /Así acompaña AstroKid|How AstroKid stays with you/i

async function isParentDashboardGreetingVisible(page: Page): Promise<boolean> {
  return page.getByText(/¡Hola,|Hello,/i).isVisible({ timeout: 3_000 }).catch(() => false)
}

async function isOnboardingWelcomeVisible(page: Page): Promise<boolean> {
  return page
    .getByRole('heading', { name: ONBOARDING_WELCOME_HEADING })
    .isVisible({ timeout: 5_000 })
    .catch(() => false)
}

/** Sin perfil familiar, login redirige a /onboarding (bienvenida educativa), no al dashboard. */
async function hasOnboardingParentSession(page: Page): Promise<boolean> {
  if (!isOnboardingRoute(page)) return false
  if (await isAuthGuardLoginWall(page)) return false
  if (await isOnboardingWelcomeVisible(page)) return true
  return page
    .getByRole('button', { name: /Crear el perfil|Create the profile/i })
    .isVisible({ timeout: 5_000 })
    .catch(() => false)
}

async function signOutViaOnboardingCancel(page: Page): Promise<void> {
  const cancel = page.getByRole('button', { name: /Cancelar onboarding|Cancel onboarding/i })
  if (!(await cancel.isVisible({ timeout: 5_000 }).catch(() => false))) return
  await cancel.click()
  await page
    .getByRole('heading', { name: /¿Cancelar onboarding\?|Cancel onboarding\?/i })
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => {})
  const confirm = page.getByRole('button', { name: /^Cancelar$|^Cancel$/i }).last()
  if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirm.click()
    await page
      .waitForURL((url) => !/\/onboarding(?:\?|$)/.test(url.pathname), { timeout: 20_000 })
      .catch(() => {})
  }
}

/** Pantallas intermedias tras login OK (DashboardShell, PrivacyReconsent). */
async function waitForPostLoginLoadingShell(page: Page): Promise<void> {
  const accessCheck = page.getByText(/Verificando acceso|Verifying access/i)
  if (await accessCheck.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await accessCheck.waitFor({ state: 'detached', timeout: 45_000 }).catch(() => {})
  }
  const checking = page.getByText(/Revisando el aviso de privacidad|Checking (the )?privacy notice/i)
  if (await checking.isVisible({ timeout: 2_500 }).catch(() => false)) {
    await checking.waitFor({ state: 'detached', timeout: 45_000 }).catch(() => {})
  }
  const loading = page.getByText(/^Cargando\.\.\.$|^Loading\.\.\.$/i)
  if (await loading.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
    await loading.first().waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
  }
}

async function waitForPostLoginShellSettled(page: Page): Promise<void> {
  await waitForPostLoginLoadingShell(page)
  await page.waitForURL(/dashboard|onboarding/, { timeout: 25_000 }).catch(() => {})

  if ((await isOnboardingWelcomeVisible(page)) || isOnboardingRoute(page)) {
    await page
      .getByRole('heading', { name: ONBOARDING_WELCOME_HEADING })
      .waitFor({ state: 'visible', timeout: 45_000 })
    return
  }

  const logout = parentSessionLogoutLocator(page).first()
  await logout.waitFor({ state: 'visible', timeout: 15_000 }).catch(() =>
    page.getByText(/¡Hola,|Hello,/i).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  )
}

/**
 * Coordinador escolar (sin hijo en familia): abre el escritorio sin completar onboarding.
 * Misma navegación que el paso del paquete (`domcontentloaded`) y bandera local de bienvenida vista.
 */
export async function provisionNavigateSchoolDesk(
  page: Page,
  options?: { coordinatorEmail?: string }
): Promise<void> {
  const email = options?.coordinatorEmail?.trim()
  if (email) {
    await page.evaluate((raw) => {
      const key = `parentEducationSeen:${raw.trim().toLowerCase()}`
      localStorage.setItem(key, 'true')
    }, email)
  }
  await page.goto('/escuela', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (/\/onboarding/.test(new URL(page.url()).pathname)) {
    await page.goto('/escuela', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  }
  await expect(page).toHaveURL(/\/escuela(?:\?|$)/, { timeout: 30_000 })
  const stuckOnboarding =
    /\/onboarding/.test(new URL(page.url()).pathname) &&
    (await isOnboardingWelcomeVisible(page))
  expect(
    stuckOnboarding,
    'Coordinador sigue en onboarding tras /escuela. Revisá sesión (correo verificado) o errores family-profiles en consola.'
  ).toBe(false)
}

/** REG-PROV-01: primera tarjeta educativa antes del wizard del niño. */
export async function assertOnboardingWelcomeFirstScreen(page: Page): Promise<void> {
  if (!(await isOnboardingWelcomeVisible(page))) {
    await page.waitForURL(/onboarding/, { timeout: 25_000 })
  }
  await expect(page.getByRole('heading', { name: ONBOARDING_WELCOME_HEADING })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole('button', { name: /Crear el perfil|Create the profile/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/Agentes que juegan ahora|Agents playing now/i)).toBeVisible({
    timeout: 15_000,
  })
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
async function attemptLoginOnce(
  page: Page,
  email: string,
  password: string,
  probe: IdentityToolkitSignInProbe
): Promise<LoginAttemptResult> {
  await page.goto('/login', { waitUntil: 'load' })
  await expect(page).toHaveURL(/login/)
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await waitForLoginFormReady(page)
  await submitLoginForm(page, email, password)

  const waitMs = 45_000
  const leftLogin = page
    .waitForURL((url) => !/\/login(?:\?|$)/.test(url.pathname + url.search), { timeout: waitMs })
    .then(() => 'success' as const)

  const navigated = page
    .waitForURL(/dashboard|onboarding/, { timeout: waitMs })
    .then(() => 'success' as const)

  const accessVerifying = page
    .getByText(/Verificando acceso|Verifying access/i)
    .waitFor({ state: 'visible', timeout: waitMs })
    .then(() => 'success' as const)

  const onboardingWelcome = page
    .getByRole('heading', { name: ONBOARDING_WELCOME_HEADING })
    .waitFor({ state: 'visible', timeout: waitMs })
    .then(() => 'success' as const)

  const loginErrorBanner = page
    .getByTestId('login-error-message')
    .waitFor({ state: 'visible', timeout: waitMs })
    .then(() => 'error' as const)

  const first = await Promise.race([
    leftLogin,
    navigated,
    accessVerifying,
    onboardingWelcome,
    loginErrorBanner,
  ]).catch(() => 'timeout' as const)

  const loginSucceeded =
    first === 'success' ||
    (first === 'timeout' && isOffLoginRoute(page)) ||
    /dashboard|onboarding/.test(new URL(page.url()).pathname)

  if (first !== 'error' && (loginSucceeded || isOffLoginRoute(page))) {
    await waitForPostLoginShellSettled(page)
    if (await hasParentSession(page)) {
      return { status: 'logged_in' }
    }
  }

  if (first !== 'error' && isOffLoginRoute(page)) {
    if ((isOnboardingRoute(page) || (await isOnboardingWelcomeVisible(page))) && (await hasParentSession(page))) {
      return { status: 'logged_in' }
    }
    return {
      status: 'login_failed',
      message:
        'Login redirigió fuera de /login pero no hay dashboard (Salir / ¡Hola) ni onboarding (Así acompaña AstroKid).',
      kind: null,
    }
  }

  if (isOnboardingRoute(page) || (await isOnboardingWelcomeVisible(page))) {
    await waitForPostLoginShellSettled(page)
    if (await hasParentSession(page)) {
      return { status: 'logged_in' }
    }
  }

  const { message, kind } = await readLoginErrorBanner(page)
  const showsRegisterCta = await page
    .getByTestId('login-failure-register')
    .isVisible({ timeout: 1_500 })
    .catch(() => false)

  if (
    loginMeansAccountNotFound(kind, message) ||
    showsRegisterCta ||
    provisioningLoginShouldTryRegistro(kind, message)
  ) {
    if (message && loginMeansAccountNotFound(kind, message)) {
      await expect(page.getByTestId('login-error-message')).toContainText(
        loginAccountNotFoundLocatorPattern()
      )
    }
    if (kind && loginMeansAccountNotFound(kind, message)) {
      expect(kind, 'kind de login alineado con firebaseAuthErrors').toBe(
        PROVISIONING_AUTH_ERROR_KIND.accountNotFound
      )
    }
    return {
      status: 'account_not_found',
      message:
        message ??
        (provisioningLoginShouldTryRegistro(kind, message)
          ? PROVISIONING_AUTH_UI.loginInvalidCredentials.es
          : PROVISIONING_AUTH_UI.loginAccountNotFound.es),
    }
  }

  loginProbeDiagnostics = formatIdentityToolkitProbe(probe.lastSignInResponse(), {
    corsBlocked: probe.sawIdentityToolkitCorsBlock(),
    pageOrigin: new URL(page.url()).origin,
    requestUrlRedacted: probe.lastSignInRequestUrlRedacted(),
  })

  if (message) {
    return { status: 'login_failed', message, kind }
  }

  if (await hasParentSession(page)) {
    return { status: 'logged_in' }
  }

  return {
    status: 'login_failed',
    message: message ?? 'Sin sesión ni banner de error reconocible en /login.',
    kind,
  }
}

/** Login en /login con reintentos si Firebase responde red / dominio / no configurado. */
export async function attemptLoginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<LoginAttemptResult> {
  let last: LoginAttemptResult = {
    status: 'login_failed',
    message: 'Login no ejecutado.',
    kind: null,
  }

  await ensureVercelProtectionOnContext(page.context())
  const probe = startIdentityToolkitSignInProbe(page)
  try {
  for (let attempt = 1; attempt <= LOGIN_SUBMIT_RETRIES; attempt++) {
    last = await attemptLoginOnce(page, email, password, probe)
    if (last.status !== 'login_failed') {
      return last
    }
    const kind = 'kind' in last ? last.kind : null
    const message = last.message
    if (!loginFailureIsRetryable(kind, message) || attempt === LOGIN_SUBMIT_RETRIES) {
      return last
    }
    await page.waitForTimeout(2_000 * attempt)
  }

  return last
  } finally {
    probe.dispose()
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

  if ((await isOnboardingWelcomeVisible(page)) || isOnboardingRoute(page)) {
    return !(await isAuthGuardLoginWall(page))
  }

  if (!/dashboard|onboarding/.test(page.url())) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
  }

  await waitForPostLoginLoadingShell(page)

  if (await isAuthGuardLoginWall(page)) return false
  if (/\/login(?:\?|$)/.test(page.url())) return false

  if (await hasOnboardingParentSession(page)) return true

  if (await parentSessionLogoutLocator(page).first().isVisible({ timeout: 8_000 }).catch(() => false)) {
    return true
  }
  return isParentDashboardGreetingVisible(page)
}

export async function assertAuthenticatedParent(page: Page): Promise<void> {
  const ok = await hasParentSession(page)
  expect(
    ok,
    'No hay sesión de padre: confirmá el correo en Proton o revisá contraseña en .env.local.'
  ).toBe(true)
}

export async function signOutIfSession(page: Page): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {})
  await waitForPostLoginLoadingShell(page)
  const logout = parentSessionLogoutLocator(page)
  if (await logout.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
    await logout.first().click()
    await page.waitForURL(/login/, { timeout: 25_000 }).catch(() => {})
    return
  }

  if (isOnboardingRoute(page) || (await isOnboardingWelcomeVisible(page))) {
    await signOutViaOnboardingCancel(page)
  }

  await page.goto('/login', { waitUntil: 'load' })
}

/**
 * 1) Login: si hay sesión → listo.
 * 2) Si login = cuenta nueva o «correo/contraseña incorrectos» (provisioning) → /registro.
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
    if (
      messageMeansLoginNetworkError(loginAttempt.message) ||
      loginAttempt.kind === PROVISIONING_AUTH_ERROR_KIND.network
    ) {
      const probe = consumeLastLoginProbeDiagnostics()
      throw new Error(
        `Login en QA falló por red/Firebase (${email}): ${loginAttempt.message} ` +
          `(kind=${loginAttempt.kind ?? 'n/a'}). ${probe} ` +
          `No es Render: es Firebase/Google Cloud (API key del mismo proyecto que NEXT_PUBLIC_FIREBASE_* en Vercel QA). ` +
          `GCP → Credentials → API key → HTTP referrers: https://astro-kid-web-qa.vercel.app/* y https://*.vercel.app/* . ` +
          `Firebase Console → Authentication → Authorized domains: astro-kid-web-qa.vercel.app . ` +
          `Si el manual “funciona” en otra URL (astrokid.io) pero el test usa QA, son dominios distintos.`
      )
    }
    throw new Error(
      `Login falló sin mensaje de cuenta nueva (${email}): ${loginAttempt.message} ` +
        `(kind=${loginAttempt.kind ?? 'n/a'}). Revisá contraseña (SMOKE_* / REGISTRO_SUITE_PASSWORD) ` +
        `o verificación de correo. Para crear cuenta, la UI debe mostrar: ${PROVISIONING_AUTH_UI.loginAccountNotFound.es}`
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

/** Barra de progreso de misiones en dashboard (p. ej. licencia escolar recién canjeada: 0/100). */
export async function assertDashboardMissionQuotaLabel(
  page: Page,
  expectedLabel: string
): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 })
  const bar = page.getByTestId('mission-quota-label')
  await expect(bar).toBeVisible({ timeout: 45_000 })
  await expect(bar).toContainText(expectedLabel, { timeout: 30_000 })
}
