import { expect, type Page } from '@playwright/test'
import { rememberSchoolInviteCode } from './schoolInviteCodeStore'
import { resolveCoordinatorLicenseCard } from './schoolProvisioning'

const INVITE_LINE =
  /(?:Código para familias|Family code):\s*([A-Za-z0-9][A-Za-z0-9_-]*)/i
const ADMIN_INLINE = /Código\s+([A-Za-z0-9][A-Za-z0-9_-]*)/i

function parseInviteCodeFromText(text: string): string | undefined {
  const fromLine = text.match(INVITE_LINE)?.[1]
  if (fromLine) return fromLine.trim()
  const fromAdmin = text.match(ADMIN_INLINE)?.[1]
  if (fromAdmin && fromAdmin.length >= 4) return fromAdmin.trim()
  return undefined
}

/** Tras activar licencia en /admin/licenses (sin depender de `p.font-mono` en QA). */
export async function captureSchoolInviteCodeFromAdmin(page: Page): Promise<void> {
  const inviteResult = page.getByTestId('admin-invite-result')
  if (await inviteResult.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const code = parseInviteCodeFromText(await inviteResult.innerText())
    if (code) {
      rememberSchoolInviteCode(code)
      return
    }
    const mono = await inviteResult.locator('p').filter({ hasText: /^[A-Za-z0-9]/ }).first().textContent()
    rememberSchoolInviteCode(mono)
    return
  }
  const toast = page.getByText(/Licencia activa para/i).first()
  if (await toast.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const code = parseInviteCodeFromText((await toast.textContent()) ?? '')
    rememberSchoolInviteCode(code)
  }
}

/** Escritorio coordinador: «Código para familias» en la tarjeta de licencia activa. */
export async function captureSchoolInviteCodeFromEscuelaDesk(page: Page): Promise<void> {
  await expect(page.getByTestId('school-license-desk')).toBeVisible({ timeout: 25_000 })
  const desk = page.getByTestId('school-license-desk')
  const code = parseInviteCodeFromText(await desk.innerText())
  rememberSchoolInviteCode(code)
  const card = await resolveCoordinatorLicenseCard(page)
  if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const fromCard = parseInviteCodeFromText(await card.innerText())
    rememberSchoolInviteCode(fromCard)
  }
}
