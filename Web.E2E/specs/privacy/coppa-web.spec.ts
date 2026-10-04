import { test, expect, type Page } from '@playwright/test';

/**
 * COPPA black-box checks on the web app. Requirement IDs: docs/COPPA_REQUIREMENTS.md
 */

const TRACKERS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /posthog\.com/,
  /clarity\.ms/,
  /\/_vercel\/insights/,
];

function trackTrackerRequests(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (TRACKERS.some((pattern) => pattern.test(url))) hits.push(url);
  });
  return hits;
}

test.describe('COPPA — web', () => {
  test('COPPA-07: no third-party measurement before the parent accepts it @coppa', async ({ page }) => {
    const hits = trackTrackerRequests(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(hits, `Trackers loaded before consent: ${hits.join(', ')}`).toEqual([]);
  });

  for (const path of ['/adventure', '/mapas-misiones']) {
    test(`COPPA-08: child route ${path} loads no third-party measurement @coppa`, async ({ page }) => {
      const hits = trackTrackerRequests(page);
      await page.goto(path, { waitUntil: 'networkidle' });
      expect(hits, `Trackers on child route ${path}: ${hits.join(', ')}`).toEqual([]);
    });
  }

  test('COPPA-11: the privacy policy states AI is off by default and names what is sent @coppa', async ({ page }) => {
    await page.goto('/privacidad', { waitUntil: 'domcontentloaded' });
    const body = page.locator('body');
    await expect(body).toContainText('Misiones con IA, apagadas por defecto');
    await expect(body).toContainText('sin el nombre');
    await expect(body).toContainText('US$0.50');
    await expect(body).toContainText('La voz no se envía a ningún proveedor');
  });

  test('COPPA-01: the email-plus confirmation page rejects a forged link @coppa', async ({ page }) => {
    await page.goto('/consent/email-plus?token=forged-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Este enlace ya no sirve|This link no longer works/)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).not.toContainText(/Confirmación lista|Confirmation ready/);
  });
});
