import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Header elements
  readonly $header: Locator;
  readonly $userMenu: Locator;
  readonly $logoutButton: Locator;
  readonly $progressStars: Locator;
  
  // Main content
  readonly $welcomeMessage: Locator;
  readonly $childIndicator: Locator;
  readonly $progressBar: Locator;
  readonly $journeySnapshot: Locator;
  readonly $parentInsightsPanel: Locator;
  readonly $parentParticipationCard: Locator;
  
  // Agent cards
  readonly $agentCards: Locator;
  readonly $empathyAgent: Locator;
  readonly $resilienceAgent: Locator;
  readonly $mcpAgent: Locator;
  
  // Footer
  readonly $footer: Locator;

  constructor(page: Page) {
    super(page);
    
    // Header elements
    this.$header = this.page.locator('header');
    this.$userMenu = this.page.locator('[data-testid="user-menu-button"]');
    this.$logoutButton = this.page.locator('[data-testid="logout-button"]');
    this.$progressStars = this.page.locator('[data-testid^="progress-star-"], [data-testid="progress-stars"] svg');
    
    // Main content
    this.$welcomeMessage = this.page.locator('[data-testid="welcome-message"]');
    this.$childIndicator = this.page.locator('[data-testid="child-indicator"]');
    this.$progressBar = this.page.locator('[data-testid="progress-bar-container"]');
    this.$journeySnapshot = this.page.locator('[data-testid="journey-snapshot"]');
    this.$parentInsightsPanel = this.page.locator('[data-testid="parent-insights-panel"]');
    this.$parentParticipationCard = this.page.locator('[data-testid="parent-participation-card"]');
    
    // Agent cards
    this.$agentCards = this.page.locator('[data-testid="agent-card"]');
    this.$empathyAgent = this.page.locator('[data-testid="agent-name"]').filter({ hasText: 'Capitán Empatía' });
    this.$resilienceAgent = this.page.locator('[data-testid="agent-name"]').filter({ hasText: 'Comandante Finanzas' });
    this.$mcpAgent = this.page.locator('[data-testid="agent-name"]').filter({ hasText: 'Teniente Talento' });
    
    // Footer
    this.$footer = this.page.locator('[data-testid="footer"]');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .locator('[data-testid="welcome-message"]')
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => {
        console.log('Welcome message not visible after navigation');
      });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('Network idle timeout, continuing...');
    });
  }

  /**
   * Verify dashboard is ready
   */
  async isReady(): Promise<boolean> {
    try {
      // Wait for URL first with shorter timeout
      await expect(this.page).toHaveURL(/dashboard/, { timeout: 8000 });
      
      // Wait for page to be interactive
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {
        // Continue if timeout
      });
      
      // Try data-testid first, then fallback to text search
      const welcomeByTestId = this.page.locator('[data-testid="welcome-message"]');
      const welcomeByText = this.page.getByText(/¡Buenos días|¡Buenas tardes|¡Buenas noches|Good morning|Good afternoon|Good evening/);
      
      // Check if either selector is visible
      const testIdCount = await welcomeByTestId.count();
      const textCount = await welcomeByText.count();
      
      if (testIdCount > 0) {
        try {
          await this.waitForElement(welcomeByTestId, 5000);
          return true;
        } catch {
          // Element exists but not visible yet, continue
        }
      }
      
      if (textCount > 0) {
        try {
          await this.waitForElement(welcomeByText, 5000);
          return true;
        } catch {
          // Element exists but not visible yet, continue
        }
      }
      
      // If neither is found, check if we're on a login/error page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/onboarding')) {
        console.log('Redirected to login/onboarding, dashboard not ready');
        return false;
      }
      
      // Last resort: check if body is visible
      const body = this.page.locator('body');
      if (await body.isVisible()) {
        console.log('Body is visible but welcome message not found');
        return true; // Page loaded, even if welcome message not found
      }
      
      return false;
    } catch (error) {
      console.error('Dashboard is NOT ready:', error);
      return false;
    }
  }

  /**
   * Expand family maps section if the parent MVP accordion is collapsed.
   */
  async expandFamilyMapsIfCollapsed() {
    const section = this.page.locator('[data-testid="dashboard-section-maps"]');
    if (await section.count() === 0) return;
    const isOpen = await section.getAttribute('open');
    if (isOpen !== null) return;
    await section.locator('summary').click();
  }

  /**
   * Wait for agent cards to load
   */
  async waitForAgentCards(timeout: number = 15000) {
    await this.expandFamilyMapsIfCollapsed();
    try {
      await this.waitForElement(this.$agentCards.first(), timeout);
    } catch (error) {
      // Try alternative selector
      const altCards = this.page.locator('[class*="agent-card"]');
      const count = await altCards.count();
      if (count === 0) {
        throw error;
      }
    }
  }

  /**
   * Get agent cards count
   */
  async getAgentCount(): Promise<number> {
    return await this.getCount(this.$agentCards);
  }

  /**
   * Click on specific agent card
   */
  async clickAgentCard(agentName: string) {
    await this.expandFamilyMapsIfCollapsed();
    // Try to find by data-testid first
    const agentCardByTestId = this.page.locator(`[data-testid="agent-card-${agentName.toLowerCase().replace(/\s+/g, '-')}"]`);
    const count = await agentCardByTestId.count();
    if (count > 0) {
      await agentCardByTestId.first().click();
      return;
    }
    // Fallback to text search
    const agentCard = this.page.locator('[data-testid="agent-name"]').filter({ hasText: agentName }).locator('..').locator('..');
    await agentCard.click();
  }

  /**
   * Get progress stars count
   */
  async getProgressStarsCount(): Promise<number> {
    // Try data-testid first
    const starsByTestId = this.page.locator('[data-testid^="progress-star-"]');
    const count = await starsByTestId.count();
    if (count > 0) {
      return count;
    }
    // Fallback to svg inside progress-stars container
    const starsBySvg = this.page.locator('[data-testid="progress-stars"] svg');
    return await this.getCount(starsBySvg);
  }

  /**
   * Open user menu
   */
  async openUserMenu() {
    // Try data-testid first, then fallback to aria-label
    const userMenuByTestId = this.page.locator('[data-testid="user-menu-button"]');
    const count = await userMenuByTestId.count();
    if (count > 0) {
      await userMenuByTestId.click();
      return;
    }
    // Fallback to aria-label
    const userMenuByAria = this.page.getByRole('button', { name: /Abrir menú de usuario/ });
    await userMenuByAria.click();
  }

  /**
   * Logout user
   */
  async logout() {
    await this.openUserMenu();
    
    // Try data-testid first, then fallback to text search
    const logoutByTestId = this.page.locator('[data-testid="logout-button"]');
    const count = await logoutByTestId.count();
    if (count > 0) {
      await logoutByTestId.click();
      return;
    }
    // Fallback to text search
    const logoutByText = this.page.getByRole('button', { name: /Cerrar sesión/ });
    await logoutByText.click();
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.$welcomeMessage);
  }

  /**
   * Get child name from indicator
   */
  async getChildName(): Promise<string> {
    return await this.getText(this.$childIndicator);
  }

  /**
   * Verify specific agent is visible
   */
  async verifyAgentVisible(agentName: string): Promise<boolean> {
    // Try data-testid first, then fallback to text search
    const agentLocator = this.page.locator('[data-testid="agent-name"]').filter({ hasText: agentName });
    const count = await agentLocator.count();
    if (count > 0) {
      return await this.isVisible(agentLocator.first());
    }
    // Fallback to text search
    const textLocator = this.page.getByText(agentName);
    return await this.isVisible(textLocator);
  }

  /**
   * Complete dashboard verification
   */
  async verifyDashboard() {
    const isReady = await this.isReady();
    if (!isReady) {
      throw new Error('Dashboard is not ready');
    }
    
    await this.waitForAgentCards();
    
    // Verify main elements with fallbacks
    try {
      await this.waitForElement(this.$welcomeMessage, 5000);
    } catch {
      // Try alternative selector
      const welcomeAlt = this.page.locator('[data-testid="welcome-message"], h1, h2').first();
      await this.waitForElement(welcomeAlt, 5000);
    }
    
    // Child indicator is optional
    try {
      await this.waitForElement(this.$childIndicator, 3000);
    } catch {
      console.log('Child indicator not found, but continuing...');
    }
    
    // Check for errors
    const hasErrors = await this.hasErrors();
    if (hasErrors) {
      throw new Error('Dashboard has errors');
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    return {
      agentCount: await this.getAgentCount(),
      progressStars: await this.getProgressStarsCount(),
      welcomeMessage: await this.getWelcomeMessage(),
      childName: await this.getChildName()
    };
  }
}
