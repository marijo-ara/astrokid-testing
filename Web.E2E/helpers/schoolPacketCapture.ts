import type { Page } from '@playwright/test'
import { getCurrentEnvironment } from '../config/environments'
import { rememberSchoolPacketUploadUrl } from './schoolPacketTokenStore'

type SendAgreementBody = {
  coordinator_upload_url?: string
  license?: { id?: string }
}

let lastSchoolPacketCaptureFailure: string | undefined

export function consumeSchoolPacketCaptureFailure(): string | undefined {
  const msg = lastSchoolPacketCaptureFailure
  lastSchoolPacketCaptureFailure = undefined
  return msg
}

function apiOriginFromAgreementResponse(agreementResponse: { url(): string }): string {
  try {
    return new URL(agreementResponse.url()).origin
  } catch {
    return getCurrentEnvironment().apiURL?.replace(/\/$/, '') ?? ''
  }
}

/** Tras send-agreement: URL en body (legacy QA) o 2.ª llamada admin solo en QA. */
export async function rememberSchoolPacketFromAgreementResponse(
  page: Page,
  agreementResponse: { json(): Promise<unknown>; url(): string }
): Promise<void> {
  lastSchoolPacketCaptureFailure = undefined

  let body: SendAgreementBody
  try {
    body = (await agreementResponse.json()) as SendAgreementBody
  } catch {
    lastSchoolPacketCaptureFailure = 'Respuesta send-agreement no es JSON.'
    return
  }

  const exposed = body.coordinator_upload_url?.trim()
  if (exposed) {
    rememberSchoolPacketUploadUrl(exposed)
    return
  }

  const licenseId = body.license?.id?.trim()
  if (!licenseId) {
    lastSchoolPacketCaptureFailure = 'send-agreement sin license.id en el JSON.'
    return
  }

  const apiURL = apiOriginFromAgreementResponse(agreementResponse)
  if (!apiURL) {
    lastSchoolPacketCaptureFailure = 'No se pudo inferir la URL del API (revisá PLAYWRIGHT_ENV / ASTROKID_BASE_URL).'
    return
  }

  const backendToken = await page.evaluate(() => localStorage.getItem('ak_access_token'))
  if (!backendToken?.trim()) {
    lastSchoolPacketCaptureFailure =
      'Sin ak_access_token: el admin debe tener sesión backend (firebase-session) antes de enviar el acuerdo.'
    return
  }

  const qaRes = await page.request.post(
    `${apiURL}/admin/licenses/${licenseId}/qa-coordinator-upload-link`,
    {
      headers: {
        Authorization: `Bearer ${backendToken}`,
        'Content-Type': 'application/json',
      },
      failOnStatusCode: false,
    }
  )

  if (!qaRes.ok()) {
    const snippet = (await qaRes.text()).replace(/\s+/g, ' ').slice(0, 280)
    lastSchoolPacketCaptureFailure =
      `POST ${apiURL}/admin/licenses/…/qa-coordinator-upload-link → HTTP ${qaRes.status()}: ${snippet}` +
      (qaRes.status() === 404
        ? '. Causas: API QA sin el deploy del endpoint nuevo, o SCHOOL_AGREEMENT_QA_COORDINATOR_LINK≠1 en astro-kid-backend-1.'
        : '')
    return
  }

  const data = (await qaRes.json()) as { coordinator_upload_url?: string }
  const uploadUrl = data.coordinator_upload_url?.trim()
  if (!uploadUrl) {
    lastSchoolPacketCaptureFailure = 'qa-coordinator-upload-link respondió 200 sin coordinator_upload_url.'
    return
  }

  rememberSchoolPacketUploadUrl(uploadUrl)
}
