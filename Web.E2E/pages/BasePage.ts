import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  /** When set, goto() builds absolute URLs; otherwise Playwright use.baseURL is used. */
  protected baseUrl: string;

  constructor(page: Page, baseUrl: string = process.env.PLAYWRIGHT_BASE_URL || '') {
    this.page = page;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Navigate to a specific path.
   * Relative paths rely on Playwright's configured baseURL (CI/local).
   */
  async goto(path: string = '') {
    let url: string;
    if (path.startsWith('http')) {
      url = path;
    } else if (this.baseUrl) {
      const normalized = !path ? '/' : path.startsWith('/') ? path : `/${path}`;
      url = `${this.baseUrl}${normalized}`;
    } else {
      // Relative — Playwright prepends use.baseURL from config
      url = path || '/';
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for page to be ready
   */
  async waitForPageReady(timeout: number = 10000) {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string, fullPage: boolean = true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage 
    });
  }

  /**
   * Check for Next.js / HTTP error pages — not pedagogical copy that mentions "error".
   */
  async hasErrors(): Promise<boolean> {
    const patterns = [
      /this page could not be found/i,
      /internal server error/i,
      /application error/i,
      /unhandled runtime error/i,
      /an unexpected error occurred/i,
    ]
    for (const pattern of patterns) {
      const loc = this.page.getByText(pattern)
      if ((await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false))) {
        return true
      }
    }
    const errorHeading = this.page.getByRole('heading', { name: /^(404|500|error)$/i })
    if (
      (await errorHeading.count()) > 0 &&
      (await errorHeading.first().isVisible().catch(() => false))
    ) {
      return true
    }
    return false
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator, timeout: number = 10000) {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(locator: Locator, timeout: number = 10000) {
    await expect(locator).toBeHidden({ timeout });
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Get element text
   */
  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  /**
   * Get element count
   */
  async getCount(locator: Locator): Promise<number> {
    return await locator.count();
  }

  /**
   * Get page locator (public accessor)
   */
  getPageLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Get page keyboard access
   */
  get keyboard() {
    return this.page.keyboard;
  }

  /**
   * Set viewport size
   */
  async setViewportSize(size: { width: number; height: number }) {
    await this.page.setViewportSize(size);
  }

  /**
   * Wait for timeout
   */
  async waitForTimeout(milliseconds: number) {
    await this.page.waitForTimeout(milliseconds);
  }



}
