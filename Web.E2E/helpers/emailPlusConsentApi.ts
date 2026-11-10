import { type APIResponse, type Page } from '@playwright/test'
import { getCurrentEnvironment } from '../config/environments'

const EMAIL_PLUS_PATH = '/family-profiles/parental-consent/email-plus'

function apiBase(): string {
  const base = getCurrentEnvironment().apiURL?.replace(/\/$/, '')
  if (!base) {
    throw new Error('Sin ASTROKID_BASE_URL / apiURL para completar email-plus.')
  }
  return base
}

async function readJson<T>(response: APIResponse): Promise<T> {
  const text = await response.text()
  return (text ? JSON.parse(text) : {}) as T
}

/**
 * Mismo recorrido que CompleteEmailPlusAsync (API.Tests) y Mobile qaChildCode.
 * Requiere COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true en QA (nunca en producción).
 */
export async function completeEmailPlusForPageSession(page: Page): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('ak_access_token'))
  if (!token?.trim()) {
    throw new Error('Sin ak_access_token en el navegador; la sesión backend no está lista.')
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const base = apiBase()

  const statusRes = await page.request.get(`${base}${EMAIL_PLUS_PATH}`, { headers })
  if (statusRes.status() === 404 || statusRes.status() === 405) return
  if (!statusRes.ok()) {
    throw new Error(`GET ${EMAIL_PLUS_PATH} devolvió ${statusRes.status()}.`)
  }
  const snapshot = await readJson<{ status?: string }>(statusRes)
  if (snapshot.status === 'confirmed') return

  const startRes = await page.request.post(`${base}${EMAIL_PLUS_PATH}/start`, {
    headers,
    data: { locale: 'es' },
  })
  if (!startRes.ok()) {
    throw new Error(`POST ${EMAIL_PLUS_PATH}/start devolvió ${startRes.status()}.`)
  }
  const start = await readJson<{ status?: string; token?: string }>(startRes)
  if (start.status === 'confirmed') return

  let link = start.token
  for (let step = 0; step < 2; step++) {
    if (!link) {
      throw new Error(
        'El backend no expone el token de email-plus. Activa COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true solo en QA.'
      )
    }
    const consumeRes = await page.request.post(`${base}${EMAIL_PLUS_PATH}/consume`, {
      headers: { 'Content-Type': 'application/json' },
      data: { token: link, locale: 'es' },
    })
    if (!consumeRes.ok()) {
      throw new Error(`POST ${EMAIL_PLUS_PATH}/consume devolvió ${consumeRes.status()}.`)
    }
    const consume = await readJson<{ status?: string; token?: string }>(consumeRes)
    if (consume.status === 'confirmed') return
    link = consume.token
  }
  throw new Error('El flujo email-plus no llegó a "confirmed".')
}
