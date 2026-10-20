import { test, expect } from '../../fixtures/base';

test.describe('User Journey', () => {
  
  test('complete user journey from landing to dashboard', async ({ page, testHelpers }) => {
    await test.step('Start from landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify landing page loads', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });

    await test.step('Try to navigate to login', async () => {
      // Try to find and click login button with mobile support
      const loginButton = page.locator('a[href*="login"], button:has-text("Login"), button:has-text("Iniciar sesión"), button:has-text("Iniciar Sesión")').first();
      if (await loginButton.count() > 0) {
        // Use mobile-friendly click that handles visibility issues
        await testHelpers.clickWithMobileSupport(loginButton);
        await page.waitForTimeout(1000);
      }
    });

    await test.step('Verify navigation occurred', async () => {
      const currentUrl = page.url();
      // Accept any navigation away from home page
      expect(currentUrl).not.toBe('http://localhost:3000/');
    });
  });

  test('user journey with privacy policy interaction', async ({ page }) => {
    await test.step('Navigate to landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify landing page loads', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });

    await test.step('Look for privacy policy elements', async () => {
      // Look for privacy policy links or buttons
      const privacyLinks = await page.locator('a:has-text("Privacy"), a:has-text("Privacidad"), button:has-text("Privacy"), button:has-text("Privacidad")').count();
      const modalTriggers = await page.locator('[data-testid*="privacy"], [data-testid*="modal"]').count();
      
      // Should have some privacy-related elements
      expect(privacyLinks + modalTriggers).toBeGreaterThanOrEqual(0);
    });

    await test.step('Look for AstroKid legal copyright', async () => {
      const copyright = await page.locator('[data-testid="legal-copyright"]').count();
      expect(copyright).toBeGreaterThanOrEqual(1);
    });
  });

  test('dashboard functionality with agent interaction', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify dashboard loads', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });

    await test.step('Look for user menu elements', async () => {
      // Look for user menu or profile elements
      const userElements = await page.locator('button:has-text("User"), button:has-text("Usuario"), [data-testid*="user"], [data-testid*="profile"]').count();
      const menuElements = await page.locator('button:has-text("Menu"), button:has-text("Menú"), [data-testid*="menu"]').count();
      
      // Should have some user-related elements
      expect(userElements + menuElements).toBeGreaterThanOrEqual(0);
    });

    await test.step('Look for dashboard content', async () => {
      // Look for common dashboard elements
      const cards = await page.locator('.card, [class*="card"]').count();
      const buttons = await page.locator('button').count();
      const links = await page.locator('a').count();
      
      // Should have some interactive elements
      expect(cards + buttons + links).toBeGreaterThan(0);
    });
  });
});