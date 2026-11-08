import { expect, type Page } from '@playwright/test'

export type RegisterOutcome =
  | 'created'
  | 'already_registered'
  | 'confirm_email'
  /** Banner genérico o timeout: la cuenta pudo crearse igual — intentar login. */
  | 'ui_error'

/** Resultado de asegurar cuenta: login existente, registro nuevo o correo pendiente. */
export type EnsureAccountOutcome = 'logged_in' | 'registered' | 'confirm_email'

/**
 * Intenta crear la cuenta en /registro. Si ya existe, devuelve already_registered.
 * Si Firebase pide verificación, devuelve confirm_email.
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

  const confirmEmail = page.getByText(/Confirma tu correo|Confirm your email/i)
  const accountCreated = page.getByText(
    /Cuenta creada exitosamente|Account created|configurar tu perfil|set up your profile/i
  )
  const inUse = page.getByText(
    /ya hay una cuenta|ya está registrado|already registered|already uses this email|quieres iniciar sesión|sign in|email-already-in-use|already in use/i
  )
  const weak = page.getByText(/contraseña débil|weak password|Mínimo 6/i)

  const waitMs = 25_000
  const outcome = await Promise.race([
    confirmEmail.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'confirm_email' as const),
    accountCreated.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'created' as const),
    inUse.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'already_registered' as const),
    page.waitForURL(/dashboard|onboarding/, { timeout: waitMs }).then(() => 'created' as const),
  ]).catch(() => null)

  if (outcome === 'confirm_email' || outcome === 'already_registered' || outcome === 'created') {
    return outcome
  }

  const registroError = await readRegistroBanner(page)
  if (
    registroError &&
    /ya hay una cuenta|ya está registrado|already registered|already uses this email|quieres iniciar sesión/i.test(
      registroError
    )
  ) {
    return 'already_registered'
  }

  if (
    registroError &&
    /Error al crear la cuenta|Could not create account|No pudimos contactar a Firebase|Could not reach Firebase|no está autorizado para registrar|not allowed to sign up/i.test(
      registroError
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

async function readRegistroBanner(page: Page): Promise<string | null> {
  const banner = page.locator('.text-red-700').first()
  if (await banner.isVisible().catch(() => false)) {
    return (await banner.textContent())?.trim() ?? null
  }
  return null
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

/** Intenta login en /login. Devuelve true si sale de la pantalla de login. */
export async function tryLoginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  await page.goto('/login')
  await expect(page).toHaveURL(/login/)

  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByTestId('login-submit-button').click()

  const leftLogin = page
    .waitForURL((url) => !/\/login(?:\?|$)/.test(url.pathname + url.search), {
      timeout: 30_000,
    })
    .then(() => true as const)

  const loginFailed = page
    .locator('[data-testid="login-error-message"] .text-red-700')
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => false as const)

  const result = await Promise.race([leftLogin, loginFailed]).catch(() => false)
  if (result === true) return hasParentSession(page)
  return hasParentSession(page)
}

/**
 * Login si la cuenta existe; si no, registro en /registro y login.
 * No registra cuando el login ya fue exitoso.
 */
export async function ensureProvisionedAccount(
  page: Page,
  email: string,
  password: string
): Promise<EnsureAccountOutcome> {
  await signOutIfSession(page)

  if (await tryLoginWithCredentials(page, email, password)) {
    return 'logged_in'
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
  const loggedIn = await tryLoginWithCredentials(page, email, password)
  if (loggedIn && (await hasParentSession(page))) {
    if (reg === 'ui_error') {
      return 'logged_in'
    }
    return reg === 'created' ? 'registered' : 'logged_in'
  }

  if (await page.getByText(/Confirma tu correo|Confirm your email/i).isVisible().catch(() => false)) {
    return 'confirm_email'
  }

  if (reg === 'ui_error' || reg === 'already_registered') {
    return 'confirm_email'
  }

  throw new Error(
    reg === 'already_registered'
      ? 'La cuenta ya existe pero el login falló: revisa REGISTRO_SUITE_PASSWORD (o SMOKE_ADMIN_PASSWORD).'
      : 'Registro ambiguo: confirmá el correo en Proton o probá login manual con esa contraseña.'
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
