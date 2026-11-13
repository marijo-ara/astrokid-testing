import fs from 'fs'
import { test, expect } from '@playwright/test'
import {
  findProvisioningPersona,
  PROVISIONING_ROLES,
  resolveProvisioningEmail,
  type ProvisioningRole,
} from '../../config/provisioningUsers'
import { qaIdentityPassword, qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import { skipUnlessProvisioningQaReady } from '../../helpers/provisioningSpecHelpers'
import {
  attachProvisioningFlow,
  stepAnnotateConfirmEmail,
  stepAssertDashboardPlanWithFallback,
  stepAssertParentSession,
  stepEnsureAccount,
  stepSignOutForNextAccount,
} from '../../helpers/provisioningTestSteps'
import {
  childQrLatestMetaPath,
  childQrLatestPngPath,
  downloadChildQrFromDashboard,
} from '../../helpers/childQrDownload'

const FLOW = `
REG-MOB-QR-01 — Descargar QR del niño (bridge web → Mobile.E2E)
Precondiciones: cuenta Free (y opcional escolar) con hijo en dashboard.
  1. Menú usuario → Descargar QR.
  2. Esperado: PNG astrokid-qr-*.png; cache en Web.E2E/.cache/child-qr/latest.png
     para Mobile.E2E con ASTROKID_USE_WEB_QR=1 o ASTROKID_QR_PNG.
`.trim()

/** Free primero deja latest.png; escolar también descarga (copia por rol). */
const ROLES: ProvisioningRole[] = (['familia_free', 'familia_escolar'] as const)
  .map((id) => PROVISIONING_ROLES.find((r) => r.id === id)!)
  .filter(Boolean)

for (const role of ROLES) {
  test.describe(`09 — QR hijo · ${role.label} @provisioning`, () => {
    test.describe.configure({ mode: 'serial' })

    test.beforeEach(({}, testInfo) => {
      annotateSuiteDefaultActor(testInfo, role.id, 'firebase_login')
    })

    test(qaTitle([role.id], 'descargar QR PNG para app móvil'), async ({ page }, testInfo) => {
      skipUnlessProvisioningQaReady()
      const persona = findProvisioningPersona(role.id)
      test.skip(!persona, `Esperado: REGISTRO_SUITE_PASSWORD y correo ${role.id}.`)
      attachProvisioningFlow(testInfo, 'REG-MOB-QR-01', FLOW)

      const password = qaIdentityPassword(role.id) as string
      const email = resolveProvisioningEmail(role)

      await stepSignOutForNextAccount(page)
      const outcome = await stepEnsureAccount(page, email, password)
      if (outcome === 'confirm_email') {
        stepAnnotateConfirmEmail(testInfo, role.label, email)
        expect.soft(false, `${role.label}: correo sin verificar.`).toBe(true)
        return
      }
      await stepAssertParentSession(page, role.label)
      await stepAssertDashboardPlanWithFallback(page, role)

      const meta = await downloadChildQrFromDashboard(page, testInfo, role.id)
      expect(meta.roleId).toBe(role.id)
      expect(fs.existsSync(childQrLatestPngPath())).toBe(true)
      expect(fs.existsSync(childQrLatestMetaPath())).toBe(true)
      expect(meta.childName.length).toBeGreaterThan(1)
    })
  })
}
