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
  emailInUse: 'email-in-use',
} as const

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

export function registroMeansEmailInUse(kind: string | null | undefined, message: string | null): boolean {
  if (kind === PROVISIONING_AUTH_ERROR_KIND.emailInUse) return true
  return messageMeansEmailAlreadyRegistered(message)
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
