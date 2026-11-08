import { test, expect } from "../../fixtures";

test.describe("Ubika — puertas de auth (caja negra)", () => {
  test("login muestra el formulario", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Iniciar sesión/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("dashboard sin sesión redirige a login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("admin sin sesión redirige a login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });
});
