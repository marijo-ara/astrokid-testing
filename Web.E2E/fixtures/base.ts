import { test as base, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { TestHelpers } from '../helpers/TestHelpers';

type MyFixtures = {
  landingPage: LandingPage;
  dashboardPage: DashboardPage;
  loginPage: LoginPage;
  testHelpers: TestHelpers;
};

export const test = base.extend<MyFixtures>({
  landingPage: async ({ page }, use) => {
    const landingPage = new LandingPage(page);
    await use(landingPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  testHelpers: async ({ page }, use) => {
    const testHelpers = new TestHelpers(page);
    await use(testHelpers);
  },
});

export { expect };
