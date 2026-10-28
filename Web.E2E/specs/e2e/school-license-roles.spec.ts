import { test, expect } from '../../fixtures/base'

/**
 * Roles de la licencia escolar, caja negra. El mismo correo no cambia de rol
 * al abrir otra pantalla.
 * - El admin de AstroKid usa /admin/licenses. El correo del coordinador recibe
 *   el acuerdo y, al activar, el código de familias.
 * - El contacto del colegio abre /escuela: solo la licencia activa, los padres
 *   que ese contacto registró, el primer nombre de quien ya canjeó, la práctica
 *   CASEL y los cuatro marcos. El correo de una familia que ya canjeó no aparece.
 *   El coordinador no es admin.
 * - El padre canjea un código compartido en /access. El tope pasa al de la
 *   escuela (100 por niño) en la misma familia.
 *   /admin/licencias, /escuelas y /acceso son reescrituras de Next: sirven
 *   la misma página y el navegador se queda en esa dirección.
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

const activeSchoolDesk = {
  schools: [
    {
      organization_id: 'org-1',
      name: 'Colegio Norte',
      student_count: 100,
      usage: {
        missions_last_7_days: 12,
        families_with_missions_last_7_days: 3,
      },
      coverage: {
        student_count: 1,
        missions_completed: 2,
        students_with_every_primary: 0,
        students_with_every_secondary: 0,
      },
      students: [
        {
          student_key: 'stu-vega',
          given_name: 'Vega',
          missions_completed: 2,
          primaries_practiced: 2,
          secondaries_practiced: 2,
          how_practiced: ['effort'],
          why_practiced: ['relatedness'],
          think_practiced: ['planning'],
          casel: {
            selfAwareness: { primary: 0, secondary: 1 },
            selfManagement: { primary: 0, secondary: 1 },
            socialAwareness: { primary: 1, secondary: 0 },
            relationshipSkills: { primary: 0, secondary: 1 },
            responsibleDecisionMaking: { primary: 1, secondary: 0 },
          },
        },
      ],
      licenses: [
        {
          id: 'lic-1',
          status: 'active',
          seats: 5,
          payment_status: 'waived',
          ends_at: null,
          families_active: 2,
          invites: [
            {
              code: 'NORTE1',
              status: 'active',
              redeemed_count: 2,
              max_redemptions: 5,
            },
          ],
          parent_invites: [
            {
              email: 'padre.lista@colegio.test',
              sent: true,
              given_name: 'Ana',
              family_name: 'Campos',
            },
          ],
          family_seats: [
            {
              family_id: 'fam-1',
              plan: 'school',
              children: [
                { id: 'child-1', given_name: 'Vega', plan: 'school' },
                { id: 'child-2', given_name: 'Sol', plan: 'school' },
              ],
            },
          ],
        },
        {
          id: 'lic-draft',
          status: 'draft',
          seats: 5,
          payment_status: 'pending',
          ends_at: null,
          families_active: 0,
          invites: [],
          parent_invites: [],
          family_seats: [],
        },
      ],
    },
  ],
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
      activated_by_email: 'admin_test@astrokid.io',
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
    await seedSession(page, 'admin_test@astrokid.io', 'Ops')
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'admin_test@astrokid.io',
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
    await page.route('**/admin/schools/send-agreement', async (route) => {
      const body = route.request().postDataJSON() as {
        school_name?: string
        contact_email?: string
      }
      expect(body.school_name).toBe('Colegio Norte')
      expect(body.contact_email).toBe('coord@colegio.edu')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: { ...schoolOrg, contact_email: 'coord@colegio.edu', status: 'draft' },
          license: {
            ...schoolOrg.licenses[0],
            status: 'draft',
            payment_cleared: false,
            agreement_status: 'sent',
          },
          agreement_email: { ok: true },
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
    await expect(page.getByRole('heading', { name: 'Activar un colegio' })).toBeVisible()
    await expect(page.getByText('El contacto del colegio no entra aquí.')).toBeVisible()
    await expect(page.getByText('Recibe el acuerdo para firmar. No se convierte en admin.')).toBeVisible()
    await expect(page.getByText('Validación de pago')).toHaveCount(0)

    await page.getByLabel('Colegio').fill('Colegio Norte')
    await page.getByLabel('Correo').fill('coord@colegio.edu')
    await page.getByRole('button', { name: 'Enviar acuerdo para firma y pago' }).click()

    await expect(page.getByText(/Acuerdo en PDF enviado a coord@colegio.edu/)).toBeVisible()
  })

  test('admin roster lists the student by given name and keeps the parent email masked', async ({ page }) => {
    await seedSession(page, 'admin_test@astrokid.io', 'Ops')
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'admin_test@astrokid.io',
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

  test('school contact sees seat counts and the parent list they registered', async ({ page }) => {
    await seedSession(page, 'coord@colegio.edu', 'Coordinación')
    await page.route('**/entitlements/school-desk', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeSchoolDesk),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-coord', parent: {}, children: [] }),
      })
    })

    await page.goto('/escuela', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('school-usage')).toHaveText(
      '2 de 5 asientos canjeados. 12 misiones completadas en los últimos 7 días. 3 familias con al menos una misión.'
    )
    await expect(page.getByTestId('school-license-desk')).toBeVisible()
    await expect(page.getByText('padre.lista@colegio.test')).toBeVisible()
    await expect(page.getByText('Código enviado')).toBeVisible()
    await expect(page.getByTestId('school-parent-roster')).toBeVisible()
    await expect(page.getByLabel('Mensaje a enviar')).toHaveValue(/NORTE1/)
    await expect(page.getByLabel('Mensaje a enviar')).toHaveValue(/CASEL/)
    await expect(page.getByLabel('Mensaje a enviar')).toHaveValue(/Hasta 100 misiones por niño/)
    await expect(page.getByTestId('school-license-card')).toHaveCount(1)
    await expect(page.getByText('pending')).toHaveCount(0)
    await expect(
      page.getByText(
        'Este es el mensaje que se enviará. Explica cómo activar con el código, qué incluye la licencia y la práctica CASEL. Edítalo si hace falta.'
      )
    ).toBeVisible()
    await expect(page.getByTestId('school-arc-frames')).toContainText('mentalidad de crecimiento')
    await expect(page.getByTestId('school-arc-frames')).toContainText('autodeterminación')
    await expect(page.getByTestId('school-arc-frames')).toContainText('pensar')
    await expect(page.getByTestId('school-arc-frames')).toContainText('no es un diagnóstico')
    await expect(page.getByTestId('school-personalization')).toContainText('intereses')
    await expect(page.getByTestId('school-personalization')).toContainText('diálogo en familia')
    await expect(page.getByTestId('school-coverage-summary')).toContainText(
      '0 de 1 estudiantes practicaron las 5 competencias CASEL como primaria'
    )
    await expect(page.getByTestId('school-student-coverage')).toContainText('primaria / apoyo')
    await expect(page.getByTestId('school-student-coverage')).toContainText('esfuerzo')
    await expect(page.getByTestId('school-student-coverage')).toContainText('Vega')
    await expect(page.getByTestId('school-family-seats')).toContainText('Vega · Sol')
    await expect(page.getByTestId('school-family-seats')).toContainText('Licencia escolar')
    await expect(page.getByRole('button', { name: 'Revocar familia' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Regenerar código de la familia' })).toBeVisible()
    await expect(page.getByText('ana@familia.test')).toHaveCount(0)
    await expect(page.getByText(/correo de la familia/i)).toHaveCount(0)
  })

  test('a badly formed parent address stays off the list', async ({ page }) => {
    await seedSession(page, 'coord@colegio.edu', 'Coordinador')
    await page.route('**/entitlements/school-desk', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeSchoolDesk),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-coord', parent: {}, children: [] }),
      })
    })

    await page.goto('/escuela', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Nombre').fill('Ana')
    await page.getByLabel('Apellidos').fill('Campos')
    await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('sin-arroba')
    await page.getByRole('button', { name: 'Agregar padre' }).click()
    await expect(page.getByText('Revisa el formato del correo.')).toBeVisible()
    await expect(page.getByTestId('school-parent-pending')).toHaveCount(0)
    await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('')
    await page.getByRole('button', { name: 'Enviar el código a estos padres' }).click()
    await expect(page.getByText('Agrega al menos un correo de padre.')).toBeVisible()
  })

  test('revoking a family seat asks first and posts the family onto Free', async ({ page }) => {
    await seedSession(page, 'coord@colegio.edu', 'Coordinador')
    await page.route('**/entitlements/school-desk', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeSchoolDesk),
      })
    })
    let released = false
    await page.route('**/entitlements/school-seat', async (route) => {
      const body = route.request().postDataJSON() as {
        action?: string
        family_id?: string
        child_id?: string | null
      }
      expect(body.action).toBe('revoke')
      expect(body.family_id).toBe('fam-1')
      expect(body.child_id ?? null).toBeNull()
      released = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: 'free_capped', code: null, scope: 'family' }),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-coord', parent: {}, children: [] }),
      })
    })

    let confirmText = ''
    page.once('dialog', (dialog) => {
      confirmText = dialog.message()
      void dialog.accept()
    })
    await page.goto('/escuela', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Revocar familia' }).click()
    await expect.poll(() => confirmText).toContain('Esta familia pasa a Free')
    await expect.poll(() => released).toBe(true)
  })

  test('an agreement link without a live token does not open the upload form', async ({ page }) => {
    await page.route('**/school-agreements/packet**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Upload link not found' }),
      })
    })

    await page.goto('/escuela/acuerdo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Acuerdo y comprobante' })).toBeVisible()
    await expect(
      page.getByText('Este enlace no está vigente. Pide a AstroKid que reenvíe el acuerdo.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar acuerdo firmado y comprobante' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()

    await page.goto('/escuela/acuerdo?token=falso', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByText('Este enlace no está vigente. Pide a AstroKid que reenvíe el acuerdo.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar acuerdo firmado y comprobante' })).toHaveCount(0)
  })

  test('a redeeming parent cannot open the school desk', async ({ page }) => {
    await seedSession(page, 'ana@familia.test', 'Ana')
    await page.route('**/entitlements/school-desk', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'School contact only' }),
      })
    })
    await page.route('**/family-profiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'fam-1', parent: {}, children: [] }),
      })
    })

    await page.goto('/escuela', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('school-desk-denied')).toBeVisible()
    await expect(page.getByTestId('school-license-desk')).toHaveCount(0)
    await expect(page.getByText('ana@familia.test')).toHaveCount(0)
  })
})
