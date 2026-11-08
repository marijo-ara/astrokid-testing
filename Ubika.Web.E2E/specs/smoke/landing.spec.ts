import { test, expect } from "../../fixtures";

test.describe("Ubika landing — smoke", () => {
  test("carga el home con marca Ubika", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ubika/i);
    await expect(
      page.getByRole("heading", {
        name: /Encontrá a alguien de confianza para hacer el trabajo/i,
      })
    ).toBeVisible();
  });

  test("navega a explorar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Buscar un servicio/i }).first().click();
    await expect(page).toHaveURL(/explorar/);
    await expect(page.getByRole("heading", { name: /Buscar (profesionales|trabajadores)/i })).toBeVisible();
  });
});
