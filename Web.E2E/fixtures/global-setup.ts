import { chromium, FullConfig, Page } from '@playwright/test';
import { VERCEL_PASSWORD_STATE } from '../config/vercelProtection';

/** Unlocks Vercel "Password Protected" with VERCEL_QA_PASSWORD; the cookie is reused by every test. */
async function unlockVercelPassword(page: Page) {
  const password = process.env.VERCEL_QA_PASSWORD;
  const $passwordGate = page.getByRole('heading', { name: 'Password Protected' });
  if (!(await $passwordGate.isVisible())) return;
  if (!password) {
    throw new Error('The web app is behind Vercel password protection. Set VERCEL_QA_PASSWORD or VERCEL_AUTOMATION_BYPASS_SECRET.');
  }
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await $passwordGate.waitFor({ state: 'detached' });
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error('No baseURL. Set PLAYWRIGHT_BASE_URL or PLAYWRIGHT_ENV.');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ extraHTTPHeaders: config.projects[0]?.use?.extraHTTPHeaders });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await unlockVercelPassword(page);
    const $passwordGate = page.getByRole('heading', { name: 'Password Protected' });
    if (await $passwordGate.isVisible()) {
      throw new Error(
        'Still on Vercel password protection. Use the deployment password from Vercel → Settings → Deployment Protection (VERCEL_QA_PASSWORD), or a valid VERCEL_AUTOMATION_BYPASS_SECRET.'
      );
    }
    if (process.env.VERCEL_QA_PASSWORD) {
      await context.storageState({ path: VERCEL_PASSWORD_STATE });
    }
    const title = await page.title();
    console.log(`Web under test: ${baseURL} (${title})`);
    if (errors.length > 0) {
      console.warn('Console errors on first load:', errors);
    }
  } catch (error) {
    throw new Error(`The web app is not reachable at ${baseURL}: ${error}`);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
