import type { ConsoleMessage, Page, Request, Response } from '@playwright/test'

/** Solo para logs de test; la API key de Firebase es pública en el cliente. */
export function redactGoogleApiKeyInUrl(url: string): string {
  return url.replace(/([?&]key=)([A-Za-z0-9_-]+)/, (_, prefix, key: string) => {
    const tail = key.length <= 8 ? '…' : `…${key.slice(-8)}`
    return `${prefix}${tail}`
  })
}

export type IdentityToolkitSignInProbe = {
  dispose: () => void
  lastSignInResponse: () => IdentityToolkitHit | null
  lastSignInRequestUrlRedacted: () => string | null
  sawIdentityToolkitCorsBlock: () => boolean
}

export type IdentityToolkitHit = {
  status: number
  url: string
  ok: boolean
}

/** Observa POST signInWithPassword a identitytoolkit (diagnóstico cuando la UI muestra error de red). */
export function startIdentityToolkitSignInProbe(page: Page): IdentityToolkitSignInProbe {
  let last: IdentityToolkitHit | null = null
  let lastRequestUrl: string | null = null
  let corsBlocked = false

  const onRequest = (request: Request) => {
    const url = request.url()
    if (!url.includes('identitytoolkit.googleapis.com')) return
    if (!/signInWithPassword|accounts:signIn/i.test(url)) return
    lastRequestUrl = url
  }

  const onResponse = (response: Response) => {
    const url = response.url()
    if (!url.includes('identitytoolkit.googleapis.com')) return
    if (!/signInWithPassword|accounts:signIn/i.test(url)) return
    last = { status: response.status(), url, ok: response.ok() }
  }

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (
      text.includes('identitytoolkit.googleapis.com') &&
      (text.includes('CORS policy') || text.includes('Access-Control-Allow-Origin'))
    ) {
      corsBlocked = true
    }
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  page.on('console', onConsole)

  return {
    dispose: () => {
      page.off('request', onRequest)
      page.off('response', onResponse)
      page.off('console', onConsole)
    },
    lastSignInResponse: () => last,
    lastSignInRequestUrlRedacted: () =>
      lastRequestUrl ? redactGoogleApiKeyInUrl(lastRequestUrl) : null,
    sawIdentityToolkitCorsBlock: () => corsBlocked,
  }
}

export function formatIdentityToolkitProbe(
  hit: IdentityToolkitHit | null,
  options?: { corsBlocked?: boolean; pageOrigin?: string; requestUrlRedacted?: string | null }
): string {
  const parts: string[] = []
  if (options?.corsBlocked) {
    parts.push(
      'CONSOLE CORS en identitytoolkit: el navegador bloqueó signInWithPassword (API key / HTTP referrers en Google Cloud, no Render).'
    )
  }
  if (hit) {
    parts.push(`identitytoolkit HTTP ${hit.status} ${hit.ok ? 'OK' : 'FAILED'} — ${hit.url.split('?')[0]}`)
  } else {
    parts.push(
      'identitytoolkit: sin respuesta HTTP a signInWithPassword (CORS, referrer de API key o red).'
    )
  }
  if (options?.pageOrigin) {
    parts.push(`origen de la página: ${options.pageOrigin}`)
  }
  if (options?.requestUrlRedacted) {
    parts.push(
      `petición observada: ${options.requestUrlRedacted} (en GCP edita ESA key — suele ≠ otra del listado; revisa API restrictions → Identity Toolkit API o Don't restrict).`
    )
  }
  return parts.join(' ')
}
