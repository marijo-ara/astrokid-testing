import { expect, test } from '@playwright/test'
import { loginAs, smokeAccount } from '../../helpers/smokeAccount'

/**
 * Read-only gate for QA accounts. It logs in and checks the plan already on the
 * account. It does not redeem a code, create a school, or change a license.
 *
 * SMOKE_PARENT_EMAIL / SMOKE_PARENT_PASSWORD / SMOKE_PARENT_PLAN
 * SMOKE_SCHOOL_EMAIL / SMOKE_SCHOOL_PASSWORD
 * SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD / SMOKE_SCHOOL_NAME
 */

const KNOWN_PLANS = ['free_capped', 'institutional_capped', 'premium_unlimited', 'school_revoked_blocked']

/** In CI a missing account fails the release gate. Locally the case is skipped. */
function accountFor(prefix: string) {
  const account = smokeAccount(prefix)
  if (!account && process.env.CI) {
    throw new Error(`En CI hacen falta ${prefix}_EMAIL y ${prefix}_PASSWORD.`)
  }
  return account
}

test.describe('padre, licencia y escuela', () => {
  test('el padre ve el plan de su familia en el panel', async ({ page }) => {
    const parent = accountFor('SMOKE_PARENT')
    test.skip(!parent, 'Faltan SMOKE_PARENT_EMAIL y SMOKE_PARENT_PASSWORD')

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

  test('la familia escolar ve la licencia escolar', async ({ page }) => {
    const school = accountFor('SMOKE_SCHOOL')
    test.skip(!school, 'Faltan SMOKE_SCHOOL_EMAIL y SMOKE_SCHOOL_PASSWORD')

    await loginAs(page, school!)
    await page.goto('/dashboard')
    const plan = page.locator('[data-quota-plan="institutional_capped"]').first()
    await expect(plan).toBeVisible()
    await expect(page.getByText(/Licencia escolar/i).first()).toBeVisible()
  })

  test('el admin ve la escuela en licencias, sin cambiarla', async ({ page }) => {
    const admin = accountFor('SMOKE_ADMIN')
    test.skip(!admin, 'Faltan SMOKE_ADMIN_EMAIL y SMOKE_ADMIN_PASSWORD')

    await loginAs(page, admin!)
    await page.goto('/admin/licenses')
    await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin · licencias' })).toHaveCount(0)

    const schoolName = process.env.SMOKE_SCHOOL_NAME?.trim()
    if (schoolName) {
      await expect(page.getByText(schoolName, { exact: false }).first()).toBeVisible()
    }
  })

  test('el padre que no es contacto no abre el escritorio de la escuela', async ({ page }) => {
    const parent = accountFor('SMOKE_PARENT')
    test.skip(!parent, 'Faltan SMOKE_PARENT_EMAIL y SMOKE_PARENT_PASSWORD')

    await loginAs(page, parent!)
    await page.goto('/escuela')
    await expect(page.getByTestId('school-desk-denied')).toBeVisible()
    await expect(page.getByTestId('school-license-desk')).toHaveCount(0)
    await expect(page.getByText(parent!.email)).toHaveCount(0)

    await page.goto('/admin/licenses')
    await expect(page.getByRole('heading', { name: 'Admin · licencias' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Activar un colegio' })).toHaveCount(0)
  })

  test('el admin abre la licencia escolar, sin un piloto aparte', async ({ page }) => {
    const admin = accountFor('SMOKE_ADMIN')
    test.skip(!admin, 'Faltan SMOKE_ADMIN_EMAIL y SMOKE_ADMIN_PASSWORD')

    await loginAs(page, admin!)
    await page.goto('/admin/licenses')
    await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Activar un colegio' })).toBeVisible()
    await expect(page.getByRole('button', { name: /piloto de 5 familias/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Piloto en casa' })).toHaveCount(0)
  })
})
