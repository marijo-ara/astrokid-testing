import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error('No baseURL. Set PLAYWRIGHT_BASE_URL or PLAYWRIGHT_ENV.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    console.log(`Web under test: ${baseURL} (${await page.title()})`);
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
