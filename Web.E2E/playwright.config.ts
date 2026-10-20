import { defineConfig, devices } from '@playwright/test';
import { getCurrentEnvironment } from './config/environments';

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

const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'], hasTouch: true } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'], hasTouch: true } },
];

export default defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.ts',
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
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          'x-vercel-set-bypass-cookie': 'samesitenone',
        }
      : {},
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
