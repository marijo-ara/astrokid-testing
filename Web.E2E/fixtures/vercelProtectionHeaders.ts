import type { BrowserContext, Route } from '@playwright/test'
import { getCurrentEnvironment } from '../config/environments'

/** Headers de Vercel Deployment Protection — solo deben ir a *tu* dominio, no a Google/Firebase. */
export function vercelBypassHeaders(): Record<string, string> | null {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  if (!secret) return null
  return {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'samesitenone',
  }
}

export async function attachVercelProtectionToContext(
  context: BrowserContext,
  baseURL: string
): Promise<void> {
  const headers = vercelBypassHeaders()
  if (!headers) return

  const marked = context as BrowserContext & { __vercelProtectionRoute?: boolean }
  if (marked.__vercelProtectionRoute) return

  let origin: string
  try {
    origin = new URL(baseURL).origin
  } catch {
    return
  }

  const handler = async (route: Route) => {
    const req = route.request()
    const url = req.url()
    if (!url.startsWith(origin)) {
      await route.continue()
      return
    }
    await route.continue({ headers: { ...req.headers(), ...headers } })
  }

  await context.route('**/*', handler)
  marked.__vercelProtectionRoute = true
}

export async function ensureVercelProtectionOnContext(context: BrowserContext): Promise<void> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || getCurrentEnvironment().baseURL
  await attachVercelProtectionToContext(context, baseURL)
}
