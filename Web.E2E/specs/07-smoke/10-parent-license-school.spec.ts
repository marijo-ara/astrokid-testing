import { expect, test } from '@playwright/test'
import { qaTitle } from '../../config/qaTestAccounts'
import { loginAs, requireSmokeAccount } from '../../helpers/smokeAccount'
import { annotateQaActors } from '../../helpers/qaActorAnnotations'

/**
 * Read-only gate for QA accounts. It logs in and checks the plan already on the
 * account. It does not redeem a code, create a school, or change a license.
 *
 * Cuentas canónicas: config/qaTestAccounts.ts (provisioning Proton + SMOKE_* opcional).
 */

const KNOWN_PLANS = ['free_capped', 'institutional_capped', 'premium_unlimited', 'school_revoked_blocked']

test.describe('10 — Smoke: padre, licencia y escuela', () => {
  test(qaTitle('familia_free', 'el padre ve el plan de su familia en el panel'), async ({ page }, testInfo) => {
    annotateQaActors(testInfo, 'familia_free', 'firebase_login')
    const parent = requireSmokeAccount('SMOKE_PARENT')
    test.skip(!parent, 'Falta Familia Free (REGISTRO_SUITE_PASSWORD / SMOKE_PARENT_*).')

    await loginAs(page, parent!)
    await page.goto('/dashboard')
    const plan = page.locator('[data-quota-plan]').first()
    await expect(plan).toBeVisible()
    await expect(plan).not.toHaveAttribute('data-quota-plan', 'loading')

    const expected = process.env.SMOKE_PARENT_PLAN?.trim()
    if (expected) {
      await expect(plan).toHaveAttribute('data-quota-plan', expected)
    } else {
      await expect(plan).toHaveAttribute('data-quota-plan', new RegExp(KNOWN_PLANS.join('|')))
    }
  })

  test(qaTitle('familia_escolar', 'la familia escolar ve la licencia escolar'), async ({ page }, testInfo) => {
    annotateQaActors(testInfo, 'familia_escolar', 'firebase_login')
    const school = requireSmokeAccount('SMOKE_SCHOOL')
    test.skip(!school, 'Falta Familia escolar (REGISTRO_SUITE_PASSWORD / SMOKE_SCHOOL_*).')

    await loginAs(page, school!)
    await page.goto('/dashboard')
    const plan = page.locator('[data-quota-plan="institutional_capped"]').first()
    await expect(plan).toBeVisible()
    await expect(page.getByText(/Licencia escolar/i).first()).toBeVisible()
  })

  test(qaTitle('admin_plataforma', 'el admin ve la escuela en licencias, sin cambiarla'), async ({ page }, testInfo) => {
    annotateQaActors(testInfo, 'admin_plataforma', 'firebase_login')
    const admin = requireSmokeAccount('SMOKE_ADMIN')
    test.skip(!admin, 'Falta Admin (SMOKE_ADMIN_* o REGISTRO_ADMIN_EMAIL + suite password).')

    await loginAs(page, admin!)
    await page.goto('/admin/licenses')
    await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin · licencias' })).toHaveCount(0)

    const schoolName = process.env.SMOKE_SCHOOL_NAME?.trim()
    if (schoolName) {
      await expect(page.getByText(schoolName, { exact: false }).first()).toBeVisible()
    }
  })

  test(
    qaTitle(['familia_free', 'admin_plataforma'], 'el padre no abre escritorio escolar ni activa colegios'),
    async ({ page }, testInfo) => {
      annotateQaActors(testInfo, 'familia_free', 'firebase_login', 'Entra como padre; valida denegación escuela/admin')
      const parent = requireSmokeAccount('SMOKE_PARENT')
      test.skip(!parent, 'Falta Familia Free (REGISTRO_SUITE_PASSWORD / SMOKE_PARENT_*).')

      await loginAs(page, parent!)
      await page.goto('/escuela')
      await expect(page.getByTestId('school-desk-denied')).toBeVisible()
      await expect(page.getByTestId('school-license-desk')).toHaveCount(0)
      await expect(page.getByText(parent!.email)).toHaveCount(0)

      await page.goto('/admin/licenses')
      await expect(page.getByRole('heading', { name: 'Admin · licencias' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Activar un colegio' })).toHaveCount(0)
    }
  )

  test(qaTitle('admin_plataforma', 'el admin abre la licencia escolar, sin un piloto aparte'), async ({ page }, testInfo) => {
    annotateQaActors(testInfo, 'admin_plataforma', 'firebase_login')
    const admin = requireSmokeAccount('SMOKE_ADMIN')
    test.skip(!admin, 'Falta Admin (SMOKE_ADMIN_* o REGISTRO_ADMIN_EMAIL + suite password).')

    await loginAs(page, admin!)
    await page.goto('/admin/licenses')
    await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Activar un colegio' })).toBeVisible()
    await expect(page.getByRole('button', { name: /piloto de 5 familias/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Piloto en casa' })).toHaveCount(0)
  })
})
