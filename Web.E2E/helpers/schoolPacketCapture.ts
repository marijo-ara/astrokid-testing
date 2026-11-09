import type { Page } from '@playwright/test'
import { getCurrentEnvironment } from '../config/environments'
import { rememberSchoolPacketUploadUrl } from './schoolPacketTokenStore'

type SendAgreementBody = {
  coordinator_upload_url?: string
  license?: { id?: string }
}

/** Tras send-agreement: URL en body (legacy QA) o 2.ª llamada admin solo en QA. */
export async function rememberSchoolPacketFromAgreementResponse(
  page: Page,
  agreementResponse: { json(): Promise<unknown> }
): Promise<void> {
  let body: SendAgreementBody
  try {
    body = (await agreementResponse.json()) as SendAgreementBody
  } catch {
    return
  }

  const exposed = body.coordinator_upload_url?.trim()
  if (exposed) {
    rememberSchoolPacketUploadUrl(exposed)
    return
  }

  const licenseId = body.license?.id?.trim()
  if (!licenseId) return

  const apiURL = getCurrentEnvironment().apiURL?.replace(/\/$/, '')
  if (!apiURL) return

  const uploadUrl = await page.evaluate(
    async ({ apiURL, licenseId }) => {
      const token = localStorage.getItem('ak_access_token')
      if (!token) return null
      const res = await fetch(`${apiURL}/admin/licenses/${licenseId}/qa-coordinator-upload-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) return null
      const data = (await res.json()) as { coordinator_upload_url?: string }
      return data.coordinator_upload_url?.trim() || null
    },
    { apiURL, licenseId }
  )

  rememberSchoolPacketUploadUrl(uploadUrl)
}
