import { test, expect } from "../../fixtures";

/**
 * A missing account and a bad password must look the same.
 * The form maps both Firebase codes to one sentence. It must not say the account is missing.
 */
test.describe("Ubika — el login no enumera cuentas", () => {
  test("un correo que no está y una clave mala muestran el mismo aviso", async ({ page }) => {
    test.setTimeout(60_000);
    const missing = `missing-${Date.now()}@example.com`;
    const email = page.locator("#email");
    const password = page.locator("#password");

    await page.goto("/login", { waitUntil: "load" });
    await email.click();
    await email.pressSequentially(missing, { delay: 15 });
    await password.click();
    await password.pressSequentially("definitely-wrong-password-xx", { delay: 10 });
    await expect(email).toHaveValue(missing);

    await page.getByRole("button", { name: "Entrar" }).click();

    const alert = page.locator(".text-destructive");
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/login/);

    const text = (await alert.innerText()).toLowerCase();
    expect(text).not.toMatch(/no existe|user-not-found|no está registrad|no registrado|isn't registered/);
    expect(text).toMatch(/email o contraseña incorrectos|demasiados intentos/);
  });
});
