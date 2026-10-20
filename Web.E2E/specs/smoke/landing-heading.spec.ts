import { test, expect } from '@playwright/test';

test.describe('Simple Test', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/AstroKid/i, { timeout: 10000 });

    // Real error pages only — not pedagogical copy that mentions "error"
    await expect(page.getByText(/this page could not be found/i)).toHaveCount(0);
    await expect(page.getByText(/internal server error/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^(404|500)$/ })).toHaveCount(0);

    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible({ timeout: 10000 });
    await expect(mainHeading).toContainText('Las redes no educan', { timeout: 10000 });
    await expect(mainHeading).toContainText('AstroKid', { timeout: 10000 });
  });
});
