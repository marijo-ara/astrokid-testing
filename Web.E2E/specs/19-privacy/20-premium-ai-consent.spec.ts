import { test, expect } from '../../fixtures/base'
import { qaTitle } from '../../config/qaTestAccounts'
import { annotateSuiteDefaultActor } from '../../helpers/qaActorAnnotations'
import { AI_NOTICE_VERSION, PREMIUM_PARENT } from '../../helpers/aiConsentBackend'

/**
 * COPPA-18 on the parent dashboard: Premium paid by card verifies the parent, but AI
 * only turns on after the parent accepts the third-party notice.
 * Requirement IDs: docs/COPPA_REQUIREMENTS.md. Backend rules: API.Tests/Coppa/CoppaTests.cs.
 */
test.describe('20 — Privacy: premium e IA en el panel', () => {
  test.beforeEach(async ({ dashboardPage, premiumAiBackend }, testInfo) => {
    annotateSuiteDefaultActor(testInfo, 'familia_premium', 'mock_api')
    expect(premiumAiBackend.decisions).toEqual([])
    await dashboardPage.goto()
  })

  test(
    qaTitle('familia_premium', 'acepta aviso IA: activación Premium sin cargo extra @coppa'),
    async ({
    dashboardPage,
    premiumAiBackend,
  }) => {
    const card = await test.step('Abre la tarjeta de misiones con IA', async () => {
      const card = await dashboardPage.openAiConsentCard()
      await card.expectOff()
      return card
    })

    await test.step('Lee el aviso: Premium por tarjeta no tiene cargo extra', async () => {
      await card.openNotice()
      await card.expectNoExtraChargeNotice()
      await expect(card.$activateWithPremiumButton).toBeDisabled()
    })

    await test.step('Acepta el envío a terceros y activa con Premium', async () => {
      await card.acceptNotice()
      await expect(card.$activateWithPremiumButton).toBeEnabled()
      await card.activateWithPremium()
    })

    await test.step('La IA queda activada y no se abrió el cargo de US$0.50', async () => {
      await card.expectOn()
      expect(premiumAiBackend.decisions).toHaveLength(1)
      expect(premiumAiBackend.decisions[0].url).toContain(
        `/ai-consent/children/${PREMIUM_PARENT.child.id}/premium-activate`
      )
      expect(premiumAiBackend.decisions[0].body).toMatchObject({
        accepted: true,
        notice_version: AI_NOTICE_VERSION,
      })
      expect(premiumAiBackend.checkouts).toEqual([])
    })
  })

  test(qaTitle('familia_premium', 'sin aceptar aviso IA: Premium queda con IA apagada @coppa'), async ({
    page,
    dashboardPage,
    premiumAiBackend,
  }) => {
    const card = await test.step('Abre el aviso sin marcar la casilla', async () => {
      const card = await dashboardPage.openAiConsentCard()
      await card.openNotice()
      await expect(card.$acceptCheckbox).not.toBeChecked()
      await expect(card.$activateWithPremiumButton).toBeDisabled()
      return card
    })

    await test.step('Cierra el aviso sin aceptar', async () => {
      await card.closeNotice()
      await card.expectOff()
    })

    await test.step('Tras recargar, la IA sigue apagada y no se envió ninguna decisión', async () => {
      await page.reload()
      const reloaded = await dashboardPage.openAiConsentCard()
      await reloaded.expectOff()
      expect(premiumAiBackend.decisions).toEqual([])
      expect(premiumAiBackend.checkouts).toEqual([])
    })
  })
})
