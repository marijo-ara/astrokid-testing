import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LandingPage extends BasePage {
  // Main elements
  readonly $mainHeading: Locator;
  readonly $subHeading: Locator;
  readonly $heroSection: Locator;
  readonly $agentsImage: Locator;
  
  // Navigation
  readonly $loginButton: Locator;
  readonly $registerButton: Locator;
  readonly $howItWorksLink: Locator;
  readonly $missionLink: Locator;
  readonly $contactLink: Locator;
  
  // Sections
  readonly $missionSection: Locator;
  readonly $howItWorksSection: Locator;
  readonly $contactSection: Locator;
  
  // Footer
  readonly $footer: Locator;
  readonly $privacyPolicyLink: Locator;
  readonly $termsLink: Locator;
  readonly $legalCopyright: Locator;
  
  // Privacy Modal
  readonly $privacyModal: Locator;
  readonly $privacyModalClose: Locator;

  constructor(page: Page) {
    super(page);
    
    // Main elements — h1 contains brand; first hero paragraph after h1 is the subtitle
    this.$mainHeading = this.page.locator('h1').first();
    this.$subHeading = this.page.locator('h1').locator('xpath=following::p[1]');
    this.$heroSection = this.page.locator('[class*="hero"]');
    this.$agentsImage = this.page.locator('[role="region"][aria-roledescription="carousel"]');
    
    // Navigation
    this.$loginButton = this.page.locator('a[href="/login"]');
    this.$registerButton = this.page.locator('a[href="/registro"]').first();
    this.$howItWorksLink = this.page.locator('a[href="#solucion"]').first();
    this.$missionLink = this.page.locator('a[href="#mision"]').first();
    this.$contactLink = this.page.locator('a[href="#contacto"]').first();
    
    // Sections
    this.$missionSection = this.page.locator('#mision');
    this.$howItWorksSection = this.page.locator('#solucion');
    this.$contactSection = this.page.locator('#contacto');
    
    // Footer - use data-testid first
    this.$footer = this.page.locator('[data-testid="footer"], footer').first();
    this.$privacyPolicyLink = this.page.getByRole('link', { name: /Política de privacidad|Privacy policy/i }).first();
    this.$termsLink = this.page.getByRole('link', { name: /Términos de servicio|Terms of service/i }).first();
    this.$legalCopyright = this.page.locator('[data-testid="legal-copyright"]');
    
    // Privacy Modal
    this.$privacyModal = this.page.locator('[class*="fixed inset-0 bg-black/50"]');
    this.$privacyModalClose = this.page.getByRole('button', { name: /Cerrar política de privacidad|Close privacy policy/i });
  }

  /**
   * Navigate to landing page
   */
  async goto() {
    await super.goto('/');
  }

  /**
   * Verify page is ready
   */
  async isReady(): Promise<boolean> {
    try {
      await this.waitForElement(this.$mainHeading);
      await this.waitForElement(this.$subHeading);
      return true;
    } catch (error) {
      console.error('Landing page is NOT ready:', error);
      return false;
    }
  }

  /**
   * Click login button
   */
  async clickLogin() {
    const loginLink = await this.getVisibleLoginLink();
    await loginLink.click();
  }

  private async getVisibleLoginLink(): Promise<Locator> {
    const count = await this.$loginButton.count();
    for (let i = 0; i < count; i++) {
      const link = this.$loginButton.nth(i);
      if (await link.isVisible()) {
        return link;
      }
    }
    const menuButton = this.page.getByRole('button', { name: /menú|menu|navegación|nav/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      const mobileLogin = this.page.locator('#mobile-menu a[href="/login"]');
      await this.waitForElement(mobileLogin);
      return mobileLogin;
    }
    return this.$loginButton.first();
  }

  /**
   * Click register button
   */
  async clickRegister() {
    await this.$registerButton.click();
  }

  /**
   * Scroll to section
   */
  async scrollToSection(sectionName: string) {
    const section = this.page.locator(`#${sectionName}`);
    await this.scrollIntoView(section);
  }

  /**
   * Open privacy policy modal
   */
  async openPrivacyPolicy() {
    await this.$privacyPolicyLink.click();
    await this.page.waitForURL(/\/privacidad/);
  }

  /**
   * Close privacy policy modal
   */
  async closePrivacyPolicy() {
    await this.$privacyModalClose.click();
    await this.waitForElementHidden(this.$privacyModal);
  }

  /**
   * Check if privacy modal is open
   */
  async isPrivacyModalOpen(): Promise<boolean> {
    return await this.isVisible(this.$privacyModal);
  }

  /**
   * Check if legal copyright footer is visible
   */
  async isLegalCopyrightVisible(): Promise<boolean> {
    return await this.isVisible(this.$legalCopyright);
  }

  /**
   * Wait for agents image to load
   */
  async waitForAgentsImage() {
    await this.waitForElement(this.$agentsImage);
  }

  /**
   * Get welcome message
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.$subHeading);
  }

  /**
   * Verify navigation elements are visible
   */
  async verifyNavigationElements() {
    await this.waitForElement(this.$howItWorksLink);
    const loginLink = await this.getVisibleLoginLink();
    await this.waitForElement(loginLink);
  }

  /**
   * Complete landing page verification
   */
  async verifyLandingPage() {
    await this.isReady();
    await this.verifyNavigationElements();
    await this.waitForAgentsImage();
    
    // Check for errors
    const hasErrors = await this.hasErrors();
    if (hasErrors) {
      throw new Error('Landing page has errors');
    }
  }
}
