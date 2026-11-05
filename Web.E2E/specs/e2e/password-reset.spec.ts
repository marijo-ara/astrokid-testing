import { test, expect } from '../../fixtures/base';

/**
 * Password reset stays on the login page and does not say whether the account exists.
 * Firebase is stubbed so the suite never sends a real reset email.
 */

const RESET_EMAIL = 'parent_reset_test@example.com';

test.describe('Password reset', () => {
  test('asks for a reset link without revealing whether the account exists', async ({ page, loginPage }) => {
    await page.route('**/identitytoolkit.googleapis.com/**/accounts:sendOobCode**', async (route) => {
      const body = route.request().postDataJSON() as { email?: string; requestType?: string };
      expect(body.requestType).toBe('PASSWORD_RESET');
      expect(body.email).toBe(RESET_EMAIL);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: RESET_EMAIL }),
      });
    });

    await loginPage.goto();
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.$forgotPasswordLink).toBeVisible();

    await loginPage.goToForgotPassword();
    await expect(page.getByText(/Recuperar contraseña|Reset password/)).toBeVisible();
    await expect(loginPage.$passwordInput).toBeHidden();

    await loginPage.fillEmail('parent_reset_test@nodot');
    await loginPage.submitForm();
    await expect(loginPage.$errorMessage).toContainText(/formato del email|Email format/i);
    await expect(loginPage.$successMessage).toHaveCount(0);

    await loginPage.fillEmail(RESET_EMAIL);
    await loginPage.submitForm();
    await expect(page.getByTestId('login-reset-notice')).toContainText(
      /Si hay una cuenta con ese correo|If an account exists for that email/
    );
    await expect(loginPage.$errorMessage).toHaveCount(0);
  });

  test('a missing Firebase account gets the same confirmation', async ({ page, loginPage }) => {
    await page.route('**/identitytoolkit.googleapis.com/**/accounts:sendOobCode**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 400, message: 'EMAIL_NOT_FOUND' },
        }),
      });
    });

    await page.goto('/login?mode=reset');
    await expect(page.getByText(/Recuperar contraseña|Reset password/)).toBeVisible();
    await page.getByTestId('login-email-input').fill(RESET_EMAIL);
    await page.getByTestId('login-submit-button').click();
    await expect(page.getByTestId('login-reset-notice')).toContainText(
      /Si hay una cuenta con ese correo|If an account exists for that email/
    );
  });

  test('registro opens the reset form', async ({ page }) => {
    await page.goto('/registro');
    await page.getByRole('link', { name: /Olvidaste tu contraseña|Forgot your password/i }).click();
    await expect(page).toHaveURL(/\/login\?mode=reset/);
    await expect(page.getByText(/Recuperar contraseña|Reset password/)).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toHaveCount(0);
  });
});
