import { test, expect } from '../../fixtures/base'

test.describe('Dev Login Flow - UI', () => {
  test('stores token and loads dashboard with protected calls', async ({ page, dashboardPage, testHelpers }) => {
    const parentEmail = 'ui.parent@example.com'
    const parentName = 'UI Parent'
    const familyData = {
      id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      parentName: parentName,
      parentEmail: parentEmail,
      children: [
        {
          id: 'b2c3d4e5-f6a7-4890-b123-456789abcdef0',
          name: 'UI Child',
          age: 7,
          birthdate: '2017-01-01',
          avatarId: 'astro-1',
          interests: ['Educación emocional'],
          createdAt: new Date().toISOString(),
        },
      ],
      currentChildId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef0',
    }

    await page.addInitScript(({ email, name, uid, familyData }) => {
      if (sessionStorage.getItem('__AK_TEST_SEEDED__') === '1') return
      sessionStorage.setItem('__AK_TEST_SEEDED__', '1')
      localStorage.clear()
      localStorage.setItem('__PLAYWRIGHT_E2E__', '1')
      localStorage.setItem('user', JSON.stringify({ name, email }))
      localStorage.setItem('ak_access_token', `mock-access-token-${uid}`)
      localStorage.setItem(`familyProfile:${email}`, JSON.stringify(familyData))
    }, { email: parentEmail, name: parentName, uid: `uid-${parentEmail}`, familyData })

    const encoded = encodeURIComponent(parentEmail)
    await testHelpers.mockApiResponseMultiple(
      [`**/family-profiles/by-email/${encoded}*`],
      {
        id: familyData.id,
        parent: {
          id: 'c3d4e5f6-a7b8-4901-c234-567890abcdef1',
          parent_name: parentName,
          parent_email: parentEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        children: familyData.children.map((child) => ({
          ...child,
          created_at: child.createdAt,
          updated_at: child.createdAt,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      200
    )
    await testHelpers.mockApiResponse('**/mission-progress/**', {}, 200)

    await dashboardPage.goto()
    await page.waitForURL(/dashboard/, { timeout: 20000, waitUntil: 'domcontentloaded' })
    await dashboardPage.waitForAgentCards()

    expect(await dashboardPage.verifyAgentVisible('Capitán Empatía')).toBe(true)
  })
})
