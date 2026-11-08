import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { getCurrentEnvironment } from './config/environments';
import { loadEnvLocal } from './config/load-env-local';
import { VERCEL_PASSWORD_STATE } from './config/vercelProtection';

loadEnvLocal(path.resolve(__dirname, '.env.local'));

/**
 * Black-box suite for the AstroKid web app.
 *
 * Target: PLAYWRIGHT_BASE_URL, or PLAYWRIGHT_ENV=localhost|dev|qa|staging|prod.
 * Default environment is qa (https://astro-kid-web-qa.vercel.app).
 * The app is never imported. For a local run, start astro-kid-web first with
 * NEXT_PUBLIC_PLAYWRIGHT_E2E=true, or set WEB_APP_DIR so this config starts it.
 */
const env = getCurrentEnvironment();
const webAppDir = process.env.WEB_APP_DIR;
const browsers = process.env.PLAYWRIGHT_BROWSERS;
const testTimeout = Number(process.env.PLAYWRIGHT_TEST_TIMEOUT) || env.timeout;
const expectTimeout = Number(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) || Math.min(testTimeout, 45_000);

const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  /** Google Chrome instalado (no Chromium). Solo: --project=chrome */
  { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'], hasTouch: true } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'], hasTouch: true } },
];

export default defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.ts',
  timeout: testTimeout,
  expect: { timeout: expectTimeout },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? env.retries : 0,
  workers: process.env.CI ? Number(process.env.PLAYWRIGHT_WORKERS || 2) : 1,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: process.env.JUNIT_FILE || 'reports/junit.xml' }],
  ],
  globalSetup: require.resolve('./fixtures/global-setup.ts'),
  use: {
    baseURL: env.baseURL,
    // NO poner x-vercel-* en extraHTTPHeaders: Playwright los envía también a Firebase y rompe CORS.
    // Bypass: cookie en storageState (global-setup) + route por origen en fixtures/vercelProtectionHeaders.ts
    storageState:
      process.env.VERCEL_QA_PASSWORD || process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? VERCEL_PASSWORD_STATE
        : undefined,
    actionTimeout: env.timeout,
    navigationTimeout: env.timeout,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects:
    browsers === 'all'
      ? allProjects
      : process.env.CI
        ? allProjects.filter((p) => p.name === 'chromium' || p.name === 'Mobile Chrome')
        : allProjects.filter((p) => p.name === 'chromium'),
  webServer: webAppDir
    ? {
        command: 'npm run dev',
        cwd: webAppDir,
        url: env.baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: { ...process.env, NEXT_PUBLIC_PLAYWRIGHT_E2E: 'true' } as Record<string, string>,
      }
    : undefined,
});
