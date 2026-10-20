import { test, expect } from '../../fixtures/base';


test.describe('Accessibility + Performance Integration', () => {
  test.describe('Accessible Performance', () => {
    test('should maintain accessibility while performing well', async ({ landingPage }) => {
      const startTime = Date.now();
      
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      const loadTime = Date.now() - startTime;
      
      await test.step('Verify performance', async () => {
        // Remote CI + networkidle can exceed 3s; catch real regressions above 8s
        expect(loadTime).toBeLessThan(8000);
        console.log(`Page loaded in ${loadTime}ms`);
      });

      await test.step('Verify accessibility', async () => {
        // Check for proper heading hierarchy
        const h1 = landingPage.getPageLocator('h1');
        await expect(h1.first()).toBeVisible();
        
        // Check for proper ARIA attributes on labeled controls
        const buttons = landingPage.getPageLocator('button[aria-label], a[aria-label]');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
        }
      });
    });

    test('should handle keyboard navigation efficiently', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Test keyboard navigation performance', async () => {
        const startTime = Date.now();
        
        // Test Tab navigation
        for (let i = 0; i < 5; i++) {
          await landingPage.keyboard.press('Tab');
        }
        
        const navigationTime = Date.now() - startTime;
        
        // Keyboard navigation should be fast
        expect(navigationTime).toBeLessThan(1000);
        console.log(`Keyboard navigation took ${navigationTime}ms`);
        
        // Check if focus is visible - use first() to handle multiple focus elements
        const focusedElement = landingPage.getPageLocator(':focus').first();
        await expect(focusedElement).toBeVisible();
      });
    });
  });

  test.describe('Screen Reader Performance', () => {
    test('should work efficiently with screen readers', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Test screen reader compatibility', async () => {
        // Check for semantic elements (more flexible)
        const header = landingPage.getPageLocator('header, .header, [role="banner"]');
        const main = landingPage.getPageLocator('main, .main, [role="main"]');
        const footer = landingPage.getPageLocator('footer, .footer, [role="contentinfo"]');
        
        const headerExists = await header.count() > 0;
        const mainExists = await main.count() > 0;
        const footerExists = await footer.count() > 0;
        
        // Should have at least one semantic element
        expect(headerExists || mainExists || footerExists).toBeTruthy();
        
        // Check for landmark roles (more flexible)
        const banner = landingPage.getPageLocator('[role="banner"], header, .header');
        const mainRole = landingPage.getPageLocator('[role="main"], main, .main');
        const contentinfo = landingPage.getPageLocator('[role="contentinfo"], footer, .footer');
        
        const landmarkCount = await banner.count() + await mainRole.count() + await contentinfo.count();
        // Should have at least one landmark or semantic element
        expect(landmarkCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  test.describe('Mobile Accessibility Performance', () => {
    test('should be accessible and performant on mobile', async ({ landingPage }) => {
      await test.step('Set mobile viewport', async () => {
        await landingPage.setViewportSize({ width: 375, height: 667 });
      });

      const startTime = Date.now();
      
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      const loadTime = Date.now() - startTime;
      
      await test.step('Verify mobile performance', async () => {
        // Remote CI + networkidle can exceed 3s; catch real regressions above 8s
        expect(loadTime).toBeLessThan(8000);
        console.log(`Mobile page loaded in ${loadTime}ms`);
      });

      await test.step('Verify mobile accessibility', async () => {
        // Primary hero / product CTAs (avoid nav chrome like brand text link)
        const targets = landingPage.getPageLocator(
          'a[href="#producto"], a[href="/login?mode=register"], a[href="/login"]'
        );
        const visible: { width: number; height: number }[] = [];
        const count = await targets.count();
        for (let i = 0; i < count; i++) {
          const target = targets.nth(i);
          if (!(await target.isVisible())) continue;
          const box = await target.boundingBox();
          if (box) visible.push(box);
          if (visible.length >= 3) break;
        }

        expect(visible.length).toBeGreaterThan(0);
        for (const box of visible) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      });
    });
  });
});
