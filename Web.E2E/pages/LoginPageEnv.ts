import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { getCurrentEnvironment } from '../config/environments';
import { getLoginBehavior, getTestCredentials, isGoogleLoginEnabled, isEmailLoginEnabled } from '../config/login-behaviors';

export class LoginPageEnv extends BasePage {
  // Form elements
  readonly $emailInput: Locator;
  readonly $passwordInput: Locator;
  readonly $submitButton: Locator;
  readonly $titleLabel: Locator;
  
  // Alternative login methods
  readonly $googleButton: Locator;
  readonly $registerLink: Locator;
  readonly $forgotPasswordLink: Locator;
  readonly $mockLoginButton: Locator;
  
  // Messages
  readonly $errorMessage: Locator;
  readonly $successMessage: Locator;

  private env = getCurrentEnvironment();
  private loginBehavior = getLoginBehavior(this.env);

  constructor(page: Page) {
    super(page);
    
    // Form elements - use data-testid first, then fallback to type selectors
    this.$emailInput = this.page.locator('[data-testid="login-email-input"], input[type="email"]').first();
    this.$passwordInput = this.page.locator('[data-testid="login-password-input"], input[type="password"]').first();
    this.$submitButton = this.page.locator('[data-testid="login-submit-button"], button[type="submit"]').first();
    this.$titleLabel = this.page.locator('[data-testid="login-title"], h2, h1, h3').first();
    
    // Alternative login methods
    this.$googleButton = this.page.locator('[data-testid="login-google-button"]').or(this.page.getByRole('button', { name: /Entrar con Google|Continuar con Google|Registrarse con Google/i }));
    this.$registerLink = this.page.getByRole('link', { name: /Crear cuenta|Registrarse/i });
    this.$forgotPasswordLink = this.page.getByRole('link', { name: /¿Olvidaste tu contraseña?/i });
    this.$mockLoginButton = this.page.getByRole('button', { name: /Modo desarrollo|Mock login|Desarrollo/i });
    
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
      ]).catch(() => false);
      
      return pageIsReady;
    } catch (error) {
      console.error('Login page is NOT ready:', error);
      return false;
    }
  }

  /**
   * Login with environment-specific behavior
   */
  async login(email?: string, password?: string) {
    console.log(`🔐 Login behavior: ${this.loginBehavior.type} for ${this.env.name}`);
    
    switch (this.loginBehavior.type) {
      case 'mock':
        await this.mockLogin();
        break;
      case 'firebase':
        await this.firebaseLogin(email, password);
        break;
      case 'oauth':
        await this.oauthLogin();
        break;
      default:
        throw new Error(`Unknown login behavior: ${this.loginBehavior.type}`);
    }
  }

  /**
   * Mock login for localhost/development
   */
  async mockLogin() {
    console.log('🚀 Using mock login for development');
    
    if (await this.isVisible(this.$mockLoginButton)) {
      await this.$mockLoginButton.click();
    } else {
      // Simulate mock login by setting localStorage
      await this.page.addInitScript((mockUser) => {
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('familyProfile', JSON.stringify({
          id: 'mock-family-123',
          parentName: 'Test Parent',
          parentEmail: 'test@astrokid.com',
          children: [{
            id: 'mock-child-123',
            name: 'Test Child',
            age: 7,
            birthdate: '2017-01-01',
            avatarId: 'astro-1',
            interests: ['Educación emocional'],
            createdAt: new Date().toISOString()
          }],
          currentChildId: 'mock-child-123'
        }));
      }, this.loginBehavior.mockUser);
      
      // Navigate to dashboard
      await this.page.goto(`${this.baseURL}/dashboard`);
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Firebase login for dev/qa/staging/prod
   */
  async firebaseLogin(email?: string, password?: string) {
    console.log('🔥 Using Firebase login');
    
    const credentials = email && password 
      ? { email, password }
      : getTestCredentials(this.env);

    if (isEmailLoginEnabled(this.env)) {
      await this.fillEmail(credentials.email);
      await this.fillPassword(credentials.password);
      await this.submitForm();
    } else if (isGoogleLoginEnabled(this.env)) {
      await this.loginWithGoogle();
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * OAuth login (Google, etc.)
   */
  async oauthLogin() {
    console.log('🔑 Using OAuth login');
    
    if (isGoogleLoginEnabled(this.env)) {
      await this.loginWithGoogle();
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle() {
    await this.$googleButton.click();
    
    // Handle Google OAuth popup if it appears
    try {
      const popup = await this.page.waitForEvent('popup', { timeout: 5000 });
      await this.handleGoogleOAuth(popup);
    } catch (error) {
      console.log('No popup detected, continuing with Google login flow');
    }
    
    await expect(this.page).toHaveURL(/dashboard/);
  }

  /**
   * Handle Google OAuth popup
   */
  async handleGoogleOAuth(popup: Page) {
    await popup.waitForLoadState('networkidle');
    
    // Fill Google credentials if needed (for testing)
    const emailInput = popup.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(this.loginBehavior.credentials[0].email);
      await popup.locator('#identifierNext').click();
      await popup.waitForTimeout(1000);
      
      const passwordInput = popup.locator('input[type="password"]');
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(this.loginBehavior.credentials[0].password);
        await popup.locator('#passwordNext').click();
      }
    }
    
    await popup.waitForURL(/accounts\.google\.com\/signin\/oauth\/consent/);
    await popup.locator('button[type="submit"]').click();
    await popup.close();
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
   * Complete login flow with environment-specific behavior
   */
  async completeLogin(email?: string, password?: string) {
    await this.verifyLoginPage();
    await this.login(email, password);
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL(/dashboard/);
  }

  /**
   * Get environment information
   */
  async getEnvironmentInfo(): Promise<string> {
    return `${this.env.name} (${this.env.baseURL})`;
  }

  /**
   * Get login behavior information
   */
  async getLoginBehaviorInfo(): Promise<string> {
    return `Login Type: ${this.loginBehavior.type}, Google: ${this.loginBehavior.googleEnabled}, Email: ${this.loginBehavior.emailEnabled}`;
  }

  /**
   * Check if Google login is available
   */
  async isGoogleLoginAvailable(): Promise<boolean> {
    return await this.$googleButton.isVisible();
  }

  /**
   * Check if email login is available
   */
  async isEmailLoginAvailable(): Promise<boolean> {
    return await this.$emailInput.isVisible();
  }

  /**
   * Check if mock login is available
   */
  async isMockLoginAvailable(): Promise<boolean> {
    return await this.$mockLoginButton.isVisible();
  }
}
