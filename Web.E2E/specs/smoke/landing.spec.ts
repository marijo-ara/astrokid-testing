import { test, expect } from '../../fixtures/base';

test.describe('Landing Page - Smoke Tests', () => {
  
  test('should load landing page successfully', async ({ landingPage }) => {
    await test.step('Navigate to landing page', async () => {
      await landingPage.goto();
    });

    await test.step('Verify page is ready', async () => {
      const isReady = await landingPage.isReady();
      expect(isReady).toBe(true);
    });

    await test.step('Verify main elements are visible', async () => {
      await landingPage.waitForElement(landingPage.$mainHeading);
      await landingPage.waitForElement(landingPage.$subHeading);
    });

    await test.step('Check for errors', async () => {
      const hasErrors = await landingPage.hasErrors();
      expect(hasErrors).toBe(false);
    });
  });

  test('should display navigation elements', async ({ landingPage }) => {
    await test.step('Navigate to landing page', async () => {
      await landingPage.goto();
    });

    await test.step('Verify navigation buttons are visible', async () => {
      await landingPage.verifyNavigationElements();
    });

    await test.step('Test navigation to sections', async () => {
      await landingPage.scrollToSection('solucion');
      await landingPage.waitForElement(landingPage.$howItWorksSection);
    });
  });

  test('should display agents image', async ({ landingPage }) => {
    await test.step('Navigate to landing page', async () => {
      await landingPage.goto();
    });

    await test.step('Wait for agents image to load', async () => {
      await landingPage.waitForAgentsImage();
    });

    await test.step('Verify agents image is visible', async () => {
      const isVisible = await landingPage.isVisible(landingPage.$agentsImage);
      expect(isVisible).toBe(true);
    });
  });

  test('should open privacy policy and terms as separate pages', async ({ landingPage }) => {
    await test.step('Navigate to landing page', async () => {
      await landingPage.goto();
    });

    await test.step('Open privacy policy page', async () => {
      await landingPage.openPrivacyPolicy();
      await expect(landingPage.page).toHaveURL(/\/privacidad/);
      await expect(landingPage.page.getByRole('heading', { name: /Política de privacidad|Privacy policy/i })).toBeVisible();
    });

    await test.step('Open terms of service from the home footer', async () => {
      await landingPage.goto();
      await landingPage.$termsLink.click();
      await expect(landingPage.page).toHaveURL(/\/terminos/);
      await expect(landingPage.page.getByRole('heading', { name: /Términos de servicio|Terms of service/i })).toBeVisible();
    });
  });

  test('should navigate to login page', async ({ landingPage }) => {
    await test.step('Navigate to landing page', async () => {
      await landingPage.goto();
    });

    await test.step('Click login button', async () => {
      await Promise.all([
        landingPage.page.waitForURL(/\/login/, { timeout: 15000 }),
        landingPage.clickLogin(),
      ]);
    });

    await test.step('Verify navigation to login', async () => {
      const currentUrl = await landingPage.getCurrentUrl();
      expect(currentUrl).toMatch(/\/login/);
    });
  });
});
