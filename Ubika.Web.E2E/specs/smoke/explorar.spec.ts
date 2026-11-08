import { test, expect } from "../../fixtures";

test.describe("Ubika explorar — smoke", () => {
  test("muestra búsqueda de trabajadores", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page.getByRole("heading", { name: /Buscar (profesionales|trabajadores)/i })).toBeVisible();
    await expect(page.getByPlaceholder(/¿Qué servicio necesitás/i)).toBeVisible();
  });
});
