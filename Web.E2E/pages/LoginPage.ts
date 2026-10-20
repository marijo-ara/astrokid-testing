import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Form elements
  readonly $emailInput: Locator;
  readonly $passwordInput: Locator;
  readonly $submitButton: Locator;
  readonly $titleLabel: Locator;
  
  // Alternative login methods
  readonly $googleButton: Locator;
  readonly $registerLink: Locator;
  readonly $forgotPasswordLink: Locator;
  
  // Messages
  readonly $errorMessage: Locator;
  readonly $successMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements - use data-testid first, then fallback to type selectors
    this.$emailInput = this.page.locator('[data-testid="login-email-input"], input[type="email"]').first();
    this.$passwordInput = this.page.locator('[data-testid="login-password-input"], input[type="password"]').first();
    this.$submitButton = this.page.locator('[data-testid="login-submit-button"], button[type="submit"]').first();
    // Buscar el título por data-testid primero, luego fallback
    this.$titleLabel = this.page.locator('[data-testid="login-title"], [class*="CardTitle"], h1, h2, h3').filter({ hasText: /AstroKid|Crear Cuenta/i }).first();
    
    // Alternative login methods
    this.$googleButton = this.page.locator('[data-testid="login-google-button"]').or(this.page.getByRole('button', { name: /Entrar con Google|Continuar con Google|Registrarse con Google/i }));
    this.$registerLink = this.page.getByRole('link', { name: /Crear cuenta|Registrarse/i });
    this.$forgotPasswordLink = this.page.getByRole('link', { name: /¿Olvidaste tu contraseña?/i });
    
    // Messages - use data-testid first
    this.$errorMessage = this.page.locator('[data-testid="login-error-message"], [class*="error"], [class*="alert-error"]').first();
    this.$successMessage = this.page.locator('[class*="success"], [class*="alert-success"]').first();
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto('/login');
  }

  /**
   * Verify login page is ready
   */
  async isReady(): Promise<boolean> {
    try {
      // Verificar URL primero
      await expect(this.page).toHaveURL(/login/, { timeout: 8000 });
      
      // Buscar múltiples indicadores de que la página está lista
      // Priorizar data-testid, luego botón de Google, luego título
      const googleButtonByTestId = this.page.locator('[data-testid="login-google-button"]');
      const googleButtonByRole = this.page.getByRole('button', { name: /Entrar con Google|Continuar con Google|Registrarse con Google/i });
      const titleByTestId = this.page.locator('[data-testid="login-title"]');
      
      const pageIsReady = await Promise.race([
        googleButtonByTestId.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
        googleButtonByRole.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
        titleByTestId.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
        this.$titleLabel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
        this.page.locator('text=AstroKid').waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      ]).catch(() => false);
      
      return pageIsReady;
    } catch (error) {
      console.error('Login page is NOT ready:', error);
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    // Check if Google login is available
    if (await this.isVisible(this.$googleButton)) {
      await this.$googleButton.click();
      await expect(this.page).toHaveURL(/dashboard/);
      return;
    }

    // Traditional email/password flow
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitForm();
  }

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    await this.$googleButton.click();
    await expect(this.page).toHaveURL(/dashboard/);
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    await this.$emailInput.fill(email);
    await expect(this.$emailInput).toHaveValue(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.$passwordInput.fill(password);
    await expect(this.$passwordInput).toHaveValue(password);
  }

  /**
   * Submit login form
   */
  async submitForm() {
    await this.$submitButton.click();
  }

  /**
   * Navigate to register page
   */
  async goToRegister() {
    await this.$registerLink.click();
    await expect(this.page).toHaveURL(/registro/);
  }

  /**
   * Navigate to forgot password
   */
  async goToForgotPassword() {
    await this.$forgotPasswordLink.click();
  }

  /**
   * Check if error message is visible
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.$errorMessage);
  }

  /**
   * Check if success message is visible
   */
  async hasSuccessMessage(): Promise<boolean> {
    return await this.isVisible(this.$successMessage);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.$errorMessage);
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.$successMessage);
  }

  /**
   * Check if form is valid
   */
  async isFormValid(): Promise<boolean> {
    const emailValue = await this.$emailInput.inputValue();
    const passwordValue = await this.$passwordInput.inputValue();
    return emailValue.length > 0 && passwordValue.length > 0;
  }

  /**
   * Complete login verification
   */
  async verifyLoginPage() {
    await this.isReady();
    await this.waitForElement(this.$emailInput);
    await this.waitForElement(this.$passwordInput);
    await this.waitForElement(this.$submitButton);
  }

  /**
   * Complete login flow
   */
  async completeLogin(email: string, password: string) {
    await this.verifyLoginPage();
    await this.login(email, password);
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL(/dashboard/);
  }
}
