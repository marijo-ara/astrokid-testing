/**
 * Contrato de provisioning ↔ astro-kid-web:
 * - `lib/firebaseAuthErrors.ts` → `loginErrorMessage` / `registrationErrorMessage`
 * - `lib/i18n/messages.ts` → textos en banner
 * - UI: `data-auth-error-kind` en `login-error-message` y `registro-error-message`
 *
 * Ir a /registro solo si login = account-not-found (+ copy loginAccountNotFound).
 * No crear cuenta si registro = email-in-use (+ copy registro.emailInUse).
 *
 * Otros errores de login (p. ej. invalid-credentials → loginInvalidCredentials) NO disparan registro.
 */
export const PROVISIONING_AUTH_ERROR_KIND = {
  accountNotFound: 'account-not-found',
  invalidCredentials: 'invalid-credentials',
  wrongPassword: 'wrong-password',
  emailInUse: 'email-in-use',
  network: 'network',
  firebaseNotConfigured: 'firebase-not-configured',
  siteNotAllowed: 'site-not-allowed',
  tooManyRequests: 'too-many-requests',
} as const

/** Errores que a veces son transitorios en QA (reintentar login antes de fallar). */
export const PROVISIONING_LOGIN_RETRY_KINDS = new Set<string>([
  PROVISIONING_AUTH_ERROR_KIND.network,
  PROVISIONING_AUTH_ERROR_KIND.firebaseNotConfigured,
  PROVISIONING_AUTH_ERROR_KIND.siteNotAllowed,
  PROVISIONING_AUTH_ERROR_KIND.tooManyRequests,
])

/** Copias canónicas (ES/EN) — mantener en sync con apps/web/src/lib/i18n/messages.ts */
export const PROVISIONING_AUTH_UI = {
  loginAccountNotFound: {
    es: 'No hay una cuenta de AstroKid con este correo. Regístrate o revisa que el email esté bien escrito.',
    en: 'There is no AstroKid account for this email. Sign up or check that the address is correct.',
  },
  loginInvalidCredentials: {
    es: 'Correo o contraseña incorrectos. Si te acabas de registrar, abre el enlace de verificación del correo antes de entrar.',
    en: 'Incorrect email or password. If you just signed up, open the verification link in your email before signing in.',
  },
  networkError: {
    es: 'No pudimos conectar con el servidor. Revisa tu internet o la conexión del dispositivo e inténtalo de nuevo en unos minutos.',
    en: 'We could not reach the server. Check your internet or device connection and try again in a few minutes.',
  },
  emailAlreadyRegistered: {
    login: {
      es: 'Ya hay una cuenta de AstroKid con este correo. Inicia sesión abajo o usa «¿Olvidaste tu contraseña?» si no recuerdas la clave.',
      en: 'An AstroKid account already uses this email. Sign in below, or use “Forgot your password?” if you do not remember it.',
    },
    registro: {
      es: 'Ya hay una cuenta de AstroKid con este correo. Inicia sesión o usa el enlace «¿Olvidaste tu contraseña?» si ya te registraste antes.',
      en: 'An AstroKid account already uses this email. Sign in or use “Forgot your password?” if you signed up before.',
    },
  },
} as const

const ACCOUNT_NOT_FOUND_NEEDLE = {
  es: 'No hay una cuenta de AstroKid con este correo',
  en: 'There is no AstroKid account for this email',
} as const

const EMAIL_IN_USE_NEEDLE = {
  es: 'Ya hay una cuenta de AstroKid con este correo',
  en: 'An AstroKid account already uses this email',
} as const

export function normalizeBannerText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

export function messageMeansAccountNotFound(text: string | null | undefined): boolean {
  const value = normalizeBannerText(text)
  if (!value) return false
  return (
    value.includes(ACCOUNT_NOT_FOUND_NEEDLE.es) || value.includes(ACCOUNT_NOT_FOUND_NEEDLE.en)
  )
}

export function messageMeansEmailAlreadyRegistered(text: string | null | undefined): boolean {
  const value = normalizeBannerText(text)
  if (!value) return false
  return value.includes(EMAIL_IN_USE_NEEDLE.es) || value.includes(EMAIL_IN_USE_NEEDLE.en)
}

export function loginMeansAccountNotFound(kind: string | null | undefined, message: string | null): boolean {
  if (kind === PROVISIONING_AUTH_ERROR_KIND.accountNotFound) return true
  return messageMeansAccountNotFound(message)
}

export function messageMeansLoginInvalidCredentials(text: string | null | undefined): boolean {
  const value = normalizeBannerText(text)
  if (!value) return false
  return (
    value.includes('Correo o contraseña incorrectos') ||
    value.includes('Incorrect email or password')
  )
}

/**
 * @provisioning — Firebase a menudo usa invalid-credential (mismo copy que clave incorrecta).
 * Intentar /registro; si el correo ya existe, registro responde email-in-use y se reintenta login.
 */
export function provisioningLoginShouldTryRegistro(
  kind: string | null | undefined,
  message: string | null
): boolean {
  if (loginMeansAccountNotFound(kind, message)) return true
  if (kind === PROVISIONING_AUTH_ERROR_KIND.invalidCredentials) return true
  return messageMeansLoginInvalidCredentials(message)
}

export function registroMeansEmailInUse(kind: string | null | undefined, message: string | null): boolean {
  if (kind === PROVISIONING_AUTH_ERROR_KIND.emailInUse) return true
  return messageMeansEmailAlreadyRegistered(message)
}

const NETWORK_NEEDLE = {
  es: 'No pudimos conectar con el servidor',
  en: 'We could not reach the server',
} as const

export function messageMeansLoginNetworkError(text: string | null | undefined): boolean {
  const value = normalizeBannerText(text)
  if (!value) return false
  return value.includes(NETWORK_NEEDLE.es) || value.includes(NETWORK_NEEDLE.en)
}

export function loginFailureIsRetryable(kind: string | null | undefined, message: string | null): boolean {
  if (kind && PROVISIONING_LOGIN_RETRY_KINDS.has(kind)) return true
  return messageMeansLoginNetworkError(message)
}

export function loginAccountNotFoundLocatorPattern(): RegExp {
  const es = ACCOUNT_NOT_FOUND_NEEDLE.es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const en = ACCOUNT_NOT_FOUND_NEEDLE.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${es}|${en}`)
}

export function emailAlreadyRegisteredLocatorPattern(): RegExp {
  const es = EMAIL_IN_USE_NEEDLE.es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const en = EMAIL_IN_USE_NEEDLE.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${es}|${en}`)
}
