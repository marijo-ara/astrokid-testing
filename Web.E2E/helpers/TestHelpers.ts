import { Page } from '@playwright/test';
import { TEST_CONSTANTS } from '../utils/constants';

export class TestHelpers {
  constructor(private page: Page) {}

  async mockAuthentication(userData: { name: string; email: string }) {
    await this.page.addInitScript((userData) => {
      localStorage.setItem('user', JSON.stringify(userData));
    }, userData);
  }

  async mockFamilyProfile(familyData: any, email: string = TEST_CONSTANTS.TEST_DATA.DEFAULT_USER.email) {
    await this.page.addInitScript(({ familyData, email }) => {
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem(`familyProfile:${email}`, JSON.stringify(familyData));
    }, { familyData, email });
  }

  async mockApiResponse(url: string, response: any, status: number = 200) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockApiResponseMultiple(patterns: string[], response: any, status: number = 200) {
    for (const pattern of patterns) {
      await this.mockApiResponse(pattern, response, status);
    }
  }

  async mockSpaceAgents(agents: any[] | readonly any[]) {
    await this.mockApiResponse('**/api/space-agents', agents as any[]);
  }

  async mockFamilyProfiles(status: number = 404) {
    await this.mockApiResponse('**/family-profiles/**', { detail: 'Not found' }, status);
  }

  async checkForErrors(): Promise<boolean> {
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
    return (
      (await errorHeading.count()) > 0 &&
      (await errorHeading.first().isVisible().catch(() => false))
    )
  }

  async hasPageErrors(): Promise<boolean> {
    for (const selector of TEST_CONSTANTS.SELECTORS.ERROR_MESSAGES) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }
    return false;
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async clearAllData() {
    await this.clearLocalStorage();
  }

  async setLocalStorageItem(key: string, value: any) {
    await this.page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, { key, value });
  }

  async getLocalStorageItem(key: string): Promise<any> {
    return await this.page.evaluate((key) => {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }, key);
  }

  createDefaultFamilyProfile() {
    return TEST_CONSTANTS.TEST_DATA.DEFAULT_FAMILY;
  }

  createDefaultSpaceAgents() {
    return TEST_CONSTANTS.TEST_DATA.SPACE_AGENTS;
  }

  generateTestData(type: 'user' | 'family' | 'agent') {
    switch (type) {
      case 'user':
        return {
          ...TEST_CONSTANTS.TEST_DATA.DEFAULT_USER,
          email: `test-${Date.now()}@example.com`
        };
      case 'family':
        return {
          ...TEST_CONSTANTS.TEST_DATA.DEFAULT_FAMILY,
          id: `test-family-${Date.now()}`
        };
      case 'agent':
        return TEST_CONSTANTS.TEST_DATA.SPACE_AGENTS;
      default:
        return {};
    }
  }

  async setupTestEnvironment() {
    const user = TEST_CONSTANTS.TEST_DATA.DEFAULT_USER;
    const familyData = this.createDefaultFamilyProfile();
    const email = user.email;
    const name = user.name;
    const uid = `test-uid-${email}`;

    await this.page.addInitScript(({ email, name, uid, familyData }) => {
      if (sessionStorage.getItem('__AK_TEST_SEEDED__') === '1') return;
      sessionStorage.setItem('__AK_TEST_SEEDED__', '1');
      localStorage.clear();
      localStorage.setItem('__PLAYWRIGHT_E2E__', '1');
      localStorage.setItem('user', JSON.stringify({ name, email }));
      localStorage.setItem('ak_access_token', `mock-access-token-${uid}`);
      localStorage.setItem(`familyProfile:${email}`, JSON.stringify(familyData));
      localStorage.setItem(`onboardingCompleted:${email.toLowerCase()}`, 'true');
    }, { email, name, uid, familyData });

    await this.mockSpaceAgents(this.createDefaultSpaceAgents());
    await this.mockApiResponse('**/mission-progress/**', {}, 200);
    await this.mockFamilyProfiles(404);

    const backendFamily = {
      id: familyData.id,
      parent: {
        id: 'c3d4e5f6-a7b8-4901-c234-567890abcdef1',
        parent_name: familyData.parentName,
        parent_email: familyData.parentEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      children: familyData.children.map((child: { createdAt: string; [key: string]: unknown }) => ({
        ...child,
        created_at: child.createdAt,
        updated_at: child.createdAt,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const encodedEmail = encodeURIComponent(email);
    await this.mockApiResponseMultiple(
      [
        `**/family-profiles/by-email/${encodedEmail}*`,
        `**/*family-profiles/by-email/${encodedEmail}*`,
      ],
      backendFamily,
      200
    );
  }

  async mockFirebaseAuth(userData?: { email: string; name: string; uid?: string }) {
    const email = userData?.email || 'dev@astrokid.com';
    const name = userData?.name || 'Usuario de Desarrollo';
    const uid = userData?.uid || 'dev-user-123';
    
    await this.page.addInitScript(({ email, name, uid }) => {
      // Mock Firebase auth object
      const mockUser = {
        uid: uid,
        email: email,
        displayName: name,
        photoURL: null,
        getIdToken: async () => 'mock-token-' + uid
      };

      const mockAuth = {
        currentUser: mockUser,
        onAuthStateChanged: (callback: any) => {
          callback(mockUser);
          return () => {};
        }
      };

      // Mock Firebase module
      (window as any).firebase = {
        auth: () => mockAuth
      };

      // Store mock data globally for later use
      (window as any).__mockFirebaseUser = mockUser;
      (window as any).__mockFirebaseAuth = mockAuth;
    }, { email, name, uid });

    // Intercept and mock signInWithPopup calls
    await this.page.addInitScript(({ email, name, uid }) => {
      // Override the dynamic import to return mocked functions
      const originalFetch = window.fetch;
      const mockUser = {
        uid: uid,
        email: email,
        displayName: name,
        photoURL: null,
        getIdToken: async () => 'mock-token-' + uid
      };

      // Intercept firebase/auth module when it's dynamically imported
      // This is a workaround since we can't directly intercept dynamic imports
      (window as any).__mockSignInWithPopup = async (auth: any, provider: any) => {
        // Simulate successful login
        return Promise.resolve({
          user: mockUser,
          credential: { accessToken: 'mock-access-token' },
          operationType: 'signIn'
        });
      };

      // Try to intercept the actual signInWithPopup call by patching it after import
      const originalSetTimeout = window.setTimeout;
      let patched = false;
      
      (window as any).setTimeout = function(callback: any, delay: any, ...args: any[]) {
        if (!patched) {
          patched = true;
          // Try to patch after a short delay to catch the dynamic import
          setTimeout(() => {
            try {
              // This will be called after the page loads and tries to use Firebase
              const firebaseAuth = (window as any).firebase?.auth?.();
              if (firebaseAuth) {
                // Already mocked above
              }
            } catch (e) {
              // Ignore errors
            }
          }, 100);
        }
        return originalSetTimeout(callback, delay, ...args);
      };
    }, { email, name, uid });

    // Route Firebase auth API calls
    await this.page.route('**/identitytoolkit.googleapis.com/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idToken: 'mock-id-token',
          email: email,
          displayName: name,
          localId: uid
        })
      });
    });
  }

  /**
   * Mocks a complete authenticated session without attempting real OAuth
   * This is the recommended approach for CI/CD where OAuth doesn't work
   */
  async mockAuthenticatedSession(userData: { email: string; name: string; uid?: string }) {
    const email = userData.email;
    const name = userData.name;
    const uid = userData.uid || `test-uid-${email}`;
    
    // Set all auth-related storage
    await this.page.addInitScript(({ email, name, uid }) => {
      // Mock Firebase auth state
      const mockUser = {
        uid: uid,
        email: email,
        displayName: name,
        photoURL: null,
        getIdToken: async () => 'mock-token-' + uid
      };

      // Set localStorage items that the app expects
      localStorage.setItem('__PLAYWRIGHT_E2E__', '1');
      localStorage.setItem('user', JSON.stringify({ name, email }));
      localStorage.setItem('ak_access_token', 'mock-access-token-' + uid);
      localStorage.setItem('firebase:authUser:' + uid, JSON.stringify(mockUser));
      
      // Mock Firebase auth object
      (window as any).firebase = {
        auth: () => ({
          currentUser: mockUser,
          onAuthStateChanged: (callback: any) => {
            callback(mockUser);
            return () => {};
          }
        })
      };
    }, { email, name, uid });
  }

  /**
   * Simulates a Google login click and handles the authentication flow
   * In CI/CD, this will mock the session instead of attempting real OAuth
   */
  async simulateGoogleLogin(redirectTo: string = '/dashboard', timeout: number = 10000, userData?: { email: string; name: string; uid?: string }) {
    // In CI/CD, skip real OAuth and just mock the session
    const isCI = process.env.CI === 'true' || process.env.GITLAB_CI === 'true';
    
    if (isCI && userData) {
      // Mock the session directly without clicking
      await this.mockAuthenticatedSession(userData);
      await this.page.goto(redirectTo);
      await this.page.waitForLoadState('networkidle');
      return;
    }
    
    // For local development, try the real flow
    const googleButton = this.page.locator('[data-testid="login-google-button"]').or(
      this.page.getByRole('button', { name: /Google|Entrar con Google|Continuar con Google/i })
    );
    
    if (await googleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click the button
      await googleButton.click();
      
      // Wait a bit for any async operations
      await this.page.waitForTimeout(2000);
      
      // Check if we're already redirected
      const currentUrl = this.page.url();
      if (currentUrl.includes(redirectTo)) {
        return; // Already redirected
      }
      
      // If not redirected after timeout, manually navigate
      try {
        await this.page.waitForURL(new RegExp(redirectTo), { timeout, waitUntil: 'domcontentloaded' });
      } catch (e) {
        // Fallback: manually navigate if automatic redirect failed
        if (userData) {
          await this.mockAuthenticatedSession(userData);
        }
        await this.page.goto(redirectTo);
        await this.page.waitForLoadState('networkidle');
      }
    }
  }

  /**
   * Helper to click buttons that might be hidden in mobile/responsive layouts
   */
  async clickWithMobileSupport(locator: any, options?: { force?: boolean }) {
    // Scroll into view first
    await locator.scrollIntoViewIfNeeded();
    
    // Wait for it to be visible
    await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // If still not visible, try force click (for mobile overlays)
      if (options?.force !== false) {
        return locator.click({ force: true });
      }
      throw new Error('Element not visible and force click disabled');
    });
    
    // Try normal click first
    try {
      await locator.click({ timeout: 3000 });
    } catch (e) {
      // Fallback to force click if normal click fails
      await locator.click({ force: true });
    }
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForText(text: string, timeout: number = TEST_CONSTANTS.TIMEOUTS.MEDIUM) {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  async waitForElementVisible(selector: string, timeout: number = TEST_CONSTANTS.TIMEOUTS.MEDIUM) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  async waitForElementHidden(selector: string, timeout: number = TEST_CONSTANTS.TIMEOUTS.MEDIUM) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async takeScreenshot(name: string, fullPage: boolean = true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage 
    });
  }

  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
  }

  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async waitForLoadingComplete() {
    for (const selector of TEST_CONSTANTS.SELECTORS.LOADING_INDICATORS) {
      await this.waitForElementHidden(selector);
    }
  }

}
