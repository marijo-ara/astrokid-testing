import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    test.skip(
      !process.env.UBIKA_WEB_BASE_URL,
      "Definí UBIKA_WEB_BASE_URL (web desplegada o http://localhost:3000)."
    );
    await use(page);
  },
});

export { expect };
