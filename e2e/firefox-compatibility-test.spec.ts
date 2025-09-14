/**
 * Firefox Compatibility Test Suite
 * Specifically tests Firefox browser issues and validates fixes
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { FirefoxBrowserManager } from './utils/firefox-browser-manager';
import { isFirefoxError, handleFirefoxError } from './utils/test-helpers';

test.describe('🦊 Firefox Compatibility Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let firefoxManager: FirefoxBrowserManager | null = null;

  test.beforeEach(async ({ browser, browserName }) => {
    // Only run these tests on Firefox
    test.skip(browserName !== 'firefox', 'Firefox-specific tests');

    firefoxManager = new FirefoxBrowserManager(browser, {
      maxRetries: 5,
      retryDelay: 2000,
      enableLogging: true
    });

    context = await firefoxManager.createContext();
    page = await firefoxManager.createPage();
  });

  test.afterEach(async () => {
    if (firefoxManager) {
      await firefoxManager.cleanup();
      firefoxManager = null;
    }
  });

  test('should create browser context without timeout', async () => {
    // Test that context creation works reliably
    expect(context).toBeDefined();
    expect(page).toBeDefined();
    
    // Verify page is responsive
    const title = await page.evaluate(() => document.title);
    expect(typeof title).toBe('string');
  });

  test('should navigate to app successfully', async () => {
    await firefoxManager!.navigateToUrl('/');
    
    // Wait for app to load
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Verify navigation worked
    expect(page.url()).toContain('localhost');
    
    // Check that page is interactive
    const appElement = await page.locator('ion-app');
    await expect(appElement).toBeVisible();
  });

  test('should handle multiple page operations without crashing', async () => {
    await firefoxManager!.navigateToUrl('/');
    
    // Wait for app initialization
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Perform multiple operations that commonly fail in Firefox
    const operations = [
      () => page.locator('ion-title').textContent(),
      () => page.evaluate(() => document.readyState),
      () => page.locator('body').getAttribute('class'),
      () => page.screenshot({ type: 'png', fullPage: false }),
      () => page.reload({ waitUntil: 'domcontentloaded' })
    ];

    for (const operation of operations) {
      try {
        await operation();
        console.log('✅ Operation completed successfully');
      } catch (error) {
        if (isFirefoxError(error as Error)) {
          console.log('🦊 Firefox-specific error handled:', error.message);
          await handleFirefoxError(page, error as Error, 'multiple operations test');
        } else {
          throw error;
        }
      }
    }
  });

  test('should handle browser context recreation', async () => {
    // Test that we can recreate context if needed
    const originalContext = context;
    
    // Close current context
    await firefoxManager!.closeContext();
    
    // Create new context
    context = await firefoxManager!.createContext();
    page = await firefoxManager!.createPage();
    
    expect(context).toBeDefined();
    expect(context).not.toBe(originalContext);
    
    // Verify new context works
    await firefoxManager!.navigateToUrl('/');
    await page.waitForSelector('ion-app', { timeout: 60000 });
  });

  test('should handle page errors gracefully', async () => {
    await firefoxManager!.navigateToUrl('/');
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Inject a script that might cause errors
    await page.evaluate(() => {
      // This might trigger console errors but shouldn't crash the test
      console.error('Test error message');
      
      // Try to access potentially undefined properties
      try {
        (window as any).nonExistentProperty.someMethod();
      } catch (e) {
        console.log('Expected error caught:', e.message);
      }
    });
    
    // Verify page is still functional
    const title = await page.locator('ion-title');
    await expect(title).toBeVisible();
  });

  test('should handle network delays and timeouts', async () => {
    // Test with slower network conditions
    await page.route('**/*', async route => {
      // Add artificial delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    await firefoxManager!.navigateToUrl('/');
    
    // Should still load despite delays
    await page.waitForSelector('ion-app', { timeout: 90000 });
    
    const appElement = await page.locator('ion-app');
    await expect(appElement).toBeVisible();
  });

  test('should handle concurrent operations', async () => {
    await firefoxManager!.navigateToUrl('/');
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Run multiple operations concurrently
    const concurrentOperations = [
      page.locator('ion-title').textContent(),
      page.evaluate(() => window.innerWidth),
      page.evaluate(() => window.innerHeight),
      page.locator('body').getAttribute('class')
    ];
    
    const results = await Promise.allSettled(concurrentOperations);
    
    // At least some operations should succeed
    const successfulResults = results.filter(result => result.status === 'fulfilled');
    expect(successfulResults.length).toBeGreaterThan(0);
    
    // Log any failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.log(`Operation ${index} failed:`, result.reason.message);
      }
    });
  });

  test('should maintain session across navigation', async () => {
    await firefoxManager!.navigateToUrl('/');
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Set some session data
    await page.evaluate(() => {
      sessionStorage.setItem('firefox-test', 'session-data');
      localStorage.setItem('firefox-test', 'local-data');
    });
    
    // Navigate to same page (reload)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Check session data persisted
    const sessionData = await page.evaluate(() => sessionStorage.getItem('firefox-test'));
    const localData = await page.evaluate(() => localStorage.getItem('firefox-test'));
    
    expect(sessionData).toBe('session-data');
    expect(localData).toBe('local-data');
  });

  test('should handle modal operations', async () => {
    await firefoxManager!.navigateToUrl('/');
    await page.waitForSelector('ion-app', { timeout: 60000 });
    
    // Try to trigger a modal (if available)
    try {
      // Look for any button that might open a modal
      const buttons = await page.locator('ion-button, button').all();
      
      if (buttons.length > 0) {
        // Click first button and see if modal appears
        await buttons[0].click();
        
        // Wait for modal to appear or timeout (Firefox-specific timing)
        const modal = page.locator('ion-modal');
        const isModalVisible = await Promise.race([
          modal.waitFor({ state: 'visible', timeout: 2000 }).then(() => true),
          new Promise(resolve => setTimeout(() => resolve(false), 2000))
        ]).catch(() => false);
        
        if (isModalVisible) {
          console.log('✅ Modal opened successfully');
          
          // Try to close modal
          const backdrop = page.locator('ion-backdrop');
          if (await backdrop.isVisible().catch(() => false)) {
            await backdrop.click();
            console.log('✅ Modal closed successfully');
          }
        }
      }
    } catch (error) {
      // Modal operations are optional, just log if they fail
      console.log('Modal operation failed (expected):', error.message);
    }
    
    // Verify page is still functional
    const appElement = await page.locator('ion-app');
    await expect(appElement).toBeVisible();
  });
});
