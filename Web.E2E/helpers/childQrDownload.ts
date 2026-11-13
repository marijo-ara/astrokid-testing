/**
 * Descarga el QR del niño desde el dashboard (mismo PNG que usa el padre)
 * y lo guarda en `.cache/child-qr/` para Mobile.E2E (galería).
 * El cache está en .gitignore — el PNG lleva el token de acceso del niño.
 */

import fs from 'fs'
import path from 'path'
import { expect, type Page, type TestInfo } from '@playwright/test'

const CACHE_DIR = path.join(process.cwd(), '.cache', 'child-qr')

export type ChildQrCacheMeta = {
  roleId: string
  childName: string
  fileName: string
  downloadedAt: string
  /** Ruta absoluta al PNG (máquina local). */
  pngPath: string
}

function pngMagicOk(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
}

export function childQrCacheDir(): string {
  return CACHE_DIR
}

export function childQrLatestPngPath(): string {
  return path.join(CACHE_DIR, 'latest.png')
}

export function childQrLatestMetaPath(): string {
  return path.join(CACHE_DIR, 'latest.json')
}

async function openVisibleUserMenu(page: Page): Promise<void> {
  const desktop = page.getByTestId('user-menu-button-desktop')
  const mobile = page.getByTestId('user-menu-button-mobile')
  if (await desktop.isVisible().catch(() => false)) {
    await desktop.click()
    return
  }
  if (await mobile.isVisible().catch(() => false)) {
    await mobile.click()
    return
  }
  await page.getByRole('button', { name: /Abrir menú de usuario|Open user menu/i }).click()
}

async function waitForDashboardWithChild(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 })
  const accessCheck = page.getByText(/Verificando acceso|Verifying access/i)
  if (await accessCheck.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await accessCheck.waitFor({ state: 'detached', timeout: 45_000 }).catch(() => {})
  }
  const childUi = page
    .locator('[data-testid="child-indicator"]')
    .or(page.locator('[data-testid="child-name"]'))
    .or(page.getByTestId('mission-quota-label'))
    .first()
  await expect(childUi).toBeVisible({ timeout: 90_000 })
}

async function readChildName(page: Page): Promise<string> {
  const candidates = [
    page.locator('[data-testid="child-name"]').first(),
    page.getByTestId('child-indicator'),
  ]
  for (const loc of candidates) {
    const text = ((await loc.textContent().catch(() => null)) || '').trim()
    if (text.length >= 2) return text.replace(/\s+/g, ' ').slice(0, 80)
  }
  return 'child'
}

/**
 * Dashboard → menú usuario → Descargar QR → guarda PNG + meta en `.cache/child-qr/`.
 */
export async function downloadChildQrFromDashboard(
  page: Page,
  testInfo: TestInfo,
  roleId: string
): Promise<ChildQrCacheMeta> {
  await waitForDashboardWithChild(page)

  const childName = await readChildName(page)
  await openVisibleUserMenu(page)

  const downloadBtn = page
    .getByTestId('download-child-qr-button')
    .filter({ visible: true })
    .first()
  await expect(downloadBtn).toBeVisible({ timeout: 30_000 })
  await expect(downloadBtn).toBeEnabled({ timeout: 60_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    downloadBtn.click(),
  ])

  const suggested = download.suggestedFilename()
  expect(suggested, 'nombre del archivo QR').toMatch(/^astrokid-qr-.+\.png$/i)

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const roleSafe = roleId.replace(/[^\w.-]+/g, '_')
  const rolePng = path.join(CACHE_DIR, `${roleSafe}.png`)
  const latestPng = childQrLatestPngPath()
  await download.saveAs(rolePng)
  fs.copyFileSync(rolePng, latestPng)

  const buf = fs.readFileSync(latestPng)
  expect(buf.length, 'PNG QR vacío').toBeGreaterThan(200)
  expect(pngMagicOk(buf), 'archivo no es PNG').toBe(true)

  const meta: ChildQrCacheMeta = {
    roleId,
    childName,
    fileName: suggested,
    downloadedAt: new Date().toISOString(),
    pngPath: latestPng,
  }
  fs.writeFileSync(childQrLatestMetaPath(), JSON.stringify(meta, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(CACHE_DIR, `${roleSafe}.json`),
    JSON.stringify(meta, null, 2),
    'utf8'
  )

  testInfo.annotations.push({
    type: 'provisioning',
    description: `QR hijo descargado · ${suggested} · cache ${path.relative(process.cwd(), latestPng)}`,
  })
  await testInfo.attach(`child-qr-${roleSafe}`, {
    path: latestPng,
    contentType: 'image/png',
  })

  return meta
}
