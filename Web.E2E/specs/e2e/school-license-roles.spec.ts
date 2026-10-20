import { test, expect } from '../../fixtures/base'

/**
 * School license views, black-box:
 * - Parent uses /access to redeem one shared code.
 * - AstroKid admin uses /admin/licenses to register the school and read the roster.
 * - The coordinator has no login. They receive the code (email / copied instructions)
 *   and families redeem it. A coordinator account is not an admin.
 */

const freeAccess = {
  has_access: true,
  enforced: true,
  family_id: 'fam-1',
  active: [],
  sources: [],
  mission_quota: {
    plan: 'free_capped',
    limit: 10,
    enforced: true,
    children: [
      {
        child_id: 'c1',
        child_name: 'Vega',
        used: 2,
        limit: 10,
        remaining: 8,
        unlimited: false,
      },
    ],
  },
}

const schoolAccess = {
  ...freeAccess,
  sources: ['institutional_invite'],
  mission_quota: {
    plan: 'institutional_capped',
    limit: 100,
    enforced: true,
    children: [
      {
        child_id: 'c1',
        child_name: 'Vega',
        used: 2,
        limit: 100,
        remaining: 98,
        unlimited: false,
      },
    ],
  },
}

const billing = {
  stripe_enabled: true,
  has_access: true,
  sources: [],
  plan: 'free_capped',
  can_upgrade_to_premium: true,
  already_premium: false,
  amount_cents: 999,
  currency: 'usd',
  school_seat_amount_cents: 500,
  school_min_seats: 5,
  school_max_seats: 500,
  school_license_revoked: false,
}

const schoolOrg = {
  id: 'org-1',
  name: 'Colegio Norte',
  org_type: 'school',
  contact_email: 'coord@colegio.edu',
  student_count: 100,
  status: 'active',
  notes: null,
  seats_used: 1,
  licenses: [
    {
      id: 'lic-1',
      organization_id: 'org-1',
      seats: 110,
      seats_used: 1,
      status: 'active',
      starts_at: null,
      ends_at: null,
      notes: null,
      activated_by_email: 'ops@astrokid.io',
      payment_status: 'waived',
      payment_reference: 'PILOT-NORTE',
      payment_cleared: true,
    },
  ],
}

async function seedSession(page: import('@playwright/test').Page, email: string, name: string) {
  await page.addInitScript(
    ({ email, name }) => {
      localStorage.setItem('__PLAYWRIGHT_E2E__', '1')
      localStorage.setItem('user', JSON.stringify({ name, email }))
      localStorage.setItem('ak_access_token', 'mock-token')
    },
    { email, name }
  )
}

test.describe('school license roles', () => {
  test('parent redeems the school code on /access', async ({ page }) => {
    await seedSession(page, 'ana@familia.test', 'Ana')
    await page.route('**/entitlements/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(freeAccess),
      })
    })
    await page.route('**/entitlements/redeem', async (route) => {
      const body = route.request().postDataJSON() as { code?: string }
      expect(body.code).toBe('NORTE1')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entitlement: {
            id: 'ent-1',
            source: 'institutional_invite',
            status: 'active',
            family_id: 'fam-1',
          },
          access: schoolAccess,
        }),
      })
    })
    await page.route('**/billing/premium/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(billing),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-1', parent: {}, children: [] }),
      })
    })

    await page.goto('/access', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('access-status')).toContainText('Acceso: activo')
    await expect(page.getByTestId('mission-quota')).toContainText('hasta 10 por niño (Free)')
    await expect(page.getByText('Activar licencia escolar')).toHaveCount(0)

    await page.getByLabel('Código de invite escolar').fill('norte1')
    await page.getByRole('button', { name: 'Canjear código' }).click()

    await expect(page.getByText('Código canjeado. La licencia escolar quedó activa para esta familia.')).toBeVisible()
    await expect(page.getByTestId('mission-quota')).toContainText('hasta 100 por niño (licencia escolar)')
  })

  test('admin registers the school and the coordinator instructions carry the family code', async ({ page }) => {
    await seedSession(page, 'ops@astrokid.io', 'Ops')
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'ops@astrokid.io',
          role: 'admin',
          admin_source: 'ADMIN_EMAILS',
        }),
      })
    })
    await page.route('**/admin/organizations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizations: [] }),
      })
    })
    await page.route('**/admin/organizations/*/members*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [] }),
      })
    })
    await page.route('**/admin/pilot-children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ children: [] }),
      })
    })
    await page.route('**/admin/activate-school', async (route) => {
      const body = route.request().postDataJSON() as {
        school_name?: string
        contact_email?: string
        payment_waived?: boolean
      }
      expect(body.school_name).toBe('Colegio Norte')
      expect(body.contact_email).toBe('coord@colegio.edu')
      expect(body.payment_waived).toBe(true)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: schoolOrg,
          license: schoolOrg.licenses[0],
          invite: {
            id: 'inv-1',
            code: 'NORTE1',
            organization_id: 'org-1',
            license_id: 'lic-1',
            max_redemptions: 110,
            redeemed_count: 0,
            status: 'active',
            expires_at: null,
          },
          coordinator_email: { ok: true },
        }),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-ops', parent: {}, children: [] }),
      })
    })

    await page.goto('/admin/licenses', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Activar licencia escolar' })).toBeVisible()
    await expect(page.getByText('El contacto del colegio no entra aquí.')).toBeVisible()
    await expect(page.getByText('Recibe el código. No se convierte en admin.')).toBeVisible()

    await page.getByLabel('Nombre del colegio').fill('Colegio Norte')
    await page.getByLabel('Correo del coordinador').fill('coord@colegio.edu')
    await page.getByRole('checkbox', { name: 'Eximir pago (piloto)' }).check()
    await page.getByRole('button', { name: 'Validar pago y activar licencia' }).click()

    const result = page.getByTestId('admin-invite-result')
    await expect(result).toContainText('NORTE1')
    await expect(result).toContainText('Correo enviado a coord@colegio.edu')

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copiar instrucciones para el coordinador' }).click()
    const note = await page.evaluate(() => navigator.clipboard.readText())
    expect(note).toContain('Código: NORTE1')
    expect(note).toContain('coord@colegio.edu')
    expect(note).toContain('/access')
    expect(note).toContain('No administra la plataforma')
  })

  test('admin roster lists the student by given name and keeps the parent email masked', async ({ page }) => {
    await seedSession(page, 'ops@astrokid.io', 'Ops')
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'ops@astrokid.io',
          role: 'admin',
          admin_source: 'ADMIN_EMAILS',
        }),
      })
    })
    await page.route('**/admin/organizations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizations: [schoolOrg] }),
      })
    })
    await page.route('**/admin/organizations/*/members*', async (route) => {
      const reveal = route.request().url().includes('reveal_emails=true')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [
            {
              family_id: 'fam-1',
              parent_email: reveal ? 'ana@familia.test' : 'a***@familia.test',
              email_revealed: reveal,
              entitlement_status: 'active',
              children: [{ id: 'c1', given_name: 'Vega', age_band: '8–9' }],
              children_count: 1,
            },
          ],
        }),
      })
    })
    await page.route('**/admin/pilot-children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ children: [] }),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-ops', parent: {}, children: [] }),
      })
    })

    await page.goto('/admin/licenses', { waitUntil: 'domcontentloaded' })
    const roster = page.getByTestId('admin-school-students')
    await expect(roster).toContainText('Vega · 8–9')
    await expect(roster).toContainText('1 registrados de 100')
    await expect(page.getByText('a***@familia.test')).toBeVisible()
    await expect(page.getByText('ana@familia.test')).toHaveCount(0)

    await page.getByRole('button', { name: 'Mostrar correos de esta escuela' }).click()
    await expect(page.getByText('ana@familia.test')).toBeVisible()
  })

  test('coordinator email cannot open the AstroKid admin registry', async ({ page }) => {
    await seedSession(page, 'coord@colegio.edu', 'Coordinación')
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'coord@colegio.edu',
          role: 'parent',
          admin_source: null,
        }),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-coord', parent: {}, children: [] }),
      })
    })

    await page.goto('/admin/licenses', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Admin · licencias' })).toBeVisible()
    await expect(page.getByText(/coord@colegio.edu/)).toBeVisible()
    await expect(page.getByText(/role=admin/)).toBeVisible()
    await expect(page.getByText('Activar un colegio del piloto')).toHaveCount(0)
  })
})
