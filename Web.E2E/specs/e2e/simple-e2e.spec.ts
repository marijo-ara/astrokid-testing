import { test, expect } from '../../fixtures/base';

test.describe('Simple E2E Tests', () => {
  
  test('should load landing page', async ({ page }) => {
    await test.step('Navigate to landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify page title', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    await test.step('Verify page content', async () => {
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test('should load login page', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify page title', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    await test.step('Verify page content', async () => {
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test('should load dashboard page', async ({ page }) => {
    await test.step('Navigate to dashboard page', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify page title', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    await test.step('Verify page content', async () => {
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test('should handle page navigation', async ({ page, testHelpers }) => {
    await test.step('Start from landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
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

  test('should verify page responsiveness', async ({ page }) => {
    await test.step('Test desktop viewport', async () => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });

    await test.step('Test mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test('should verify basic page elements', async ({ page }) => {
    await test.step('Load landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Check for basic HTML structure', async () => {
      const html = await page.locator('html');
      const head = await page.locator('head');
      const body = await page.locator('body');
      
      await expect(html).toBeVisible();
      await expect(head).toBeAttached();
      await expect(body).toBeVisible();
    });

    await test.step('Check for interactive elements', async () => {
      const links = await page.locator('a').count();
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input').count();
      
      // Should have some interactive elements
      expect(links + buttons + inputs).toBeGreaterThan(0);
    });
  });
});