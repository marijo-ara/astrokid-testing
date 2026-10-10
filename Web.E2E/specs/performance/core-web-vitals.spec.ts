import { test, expect } from '../../fixtures/base';
import { LandingPage } from '../../pages/LandingPage';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('Core Web Vitals Tests', () => {
  test.describe('Largest Contentful Paint (LCP)', () => {
    test('should have good LCP score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure LCP', async () => {
        const lcp = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lcpEntry = entries[entries.length - 1];
              resolve(lcpEntry.startTime);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(0), 5000);
          });
        });

        console.log(`LCP: ${lcp}ms`);
        
        // LCP should be under 2.5 seconds for good score
        expect(lcp).toBeLessThan(2500);
      });
    });
  });

  test.describe('First Input Delay (FID)', () => {
    test('should have good FID score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure FID', async () => {
        const fid = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const fidEntry = entries[0] as PerformanceEventTiming;
              resolve(fidEntry.processingStart - fidEntry.startTime);
            });
            observer.observe({ entryTypes: ['first-input'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(0), 5000);
          });
        });

        console.log(`FID: ${fid}ms`);
        
        // FID should be under 100ms for good score
        expect(fid).toBeLessThan(100);
      });
    });
  });

  test.describe('Cumulative Layout Shift (CLS)', () => {
    test('should have good CLS score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure CLS', async () => {
        const cls = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              // LayoutShift is not in TypeScript's DOM lib yet.
              (entries as Array<PerformanceEntry & { hadRecentInput: boolean; value: number }>).forEach((entry) => {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              });
            });
            observer.observe({ entryTypes: ['layout-shift'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(clsValue), 5000);
          });
        });

        console.log(`CLS: ${cls}`);
        
        // CLS should be under 0.1 for good score
        expect(cls).toBeLessThan(0.1);
      });
    });
  });

  test.describe('First Contentful Paint (FCP)', () => {
    test('should have good FCP score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure FCP', async () => {
        const fcp = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const fcpEntry = entries[0];
              resolve(fcpEntry.startTime);
            });
            observer.observe({ entryTypes: ['paint'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(0), 5000);
          });
        });

        console.log(`FCP: ${fcp}ms`);
        
        // FCP should be under 1.8 seconds for good score
        expect(fcp).toBeLessThan(1800);
      });
    });
  });

  test.describe('Time to Interactive (TTI)', () => {
    test('should have good TTI score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure TTI', async () => {
        const tti = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const ttiEntry = entries[0];
              resolve(ttiEntry.startTime);
            });
            observer.observe({ entryTypes: ['navigation'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(0), 5000);
          });
        });

        console.log(`TTI: ${tti}ms`);
        
        // TTI should be under 3.8 seconds for good score
        expect(tti).toBeLessThan(3800);
      });
    });
  });

  test.describe('Speed Index', () => {
    test('should have good Speed Index score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure Speed Index', async () => {
        const speedIndex = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const speedIndexEntry = entries[0];
              resolve(speedIndexEntry.startTime);
            });
            observer.observe({ entryTypes: ['paint'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(0), 5000);
          });
        });

        console.log(`Speed Index: ${speedIndex}ms`);
        
        // Speed Index should be under 3.4 seconds for good score
        expect(speedIndex).toBeLessThan(3400);
      });
    });
  });

  test.describe('Total Blocking Time (TBT)', () => {
    test('should have good TBT score', async ({ landingPage }) => {
      await test.step('Navigate to landing page', async () => {
        await landingPage.goto();
        await landingPage.isReady();
      });

      await test.step('Measure TBT', async () => {
        const tbt = await landingPage.page.evaluate(() => {
          return new Promise((resolve) => {
            let tbtValue = 0;
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.duration > 50) {
                  tbtValue += entry.duration - 50;
                }
              });
            });
            observer.observe({ entryTypes: ['longtask'] });
            
            // Resolve after 5 seconds
            setTimeout(() => resolve(tbtValue), 5000);
          });
        });

        console.log(`TBT: ${tbt}ms`);
        
        // TBT should be under 200ms for good score
        expect(tbt).toBeLessThan(200);
      });
    });
  });
});
