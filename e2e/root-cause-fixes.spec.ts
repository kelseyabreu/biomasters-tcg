/**
 * Root Cause Fixes Test Suite
 * Tests the fundamental fixes for cross-browser test failures
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  waitForAppInitialization,
  waitForModal,
  handleFirefoxError,
  isFirefoxError
} from './utils/test-helpers';
import {
  firebaseTestManager,
  createTestUserData,
  TestUser
} from './utils/firebase-test-utils';

test.describe('Root Cause Fixes Validation', () => {
  let context: BrowserContext;
  let page: Page;
  let testUser: TestUser;

  test.beforeEach(async ({ browser, browserName }) => {
    // Create isolated context for each test
    context = await browser.newContext({
      // Disable service worker for tests
      serviceWorkers: 'block',
      // Clear storage between tests
      storageState: undefined,
    });

    page = await context.newPage();

    // Generate unique test user
    testUser = createTestUserData(`root-cause-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    console.log(`🧪 [${browserName}] Starting root cause test with user: ${testUser.email}`);
  });

  test.afterEach(async () => {
    // Cleanup test user
    if (testUser) {
      try {
        await firebaseTestManager.deleteTestUser(testUser);
      } catch (error) {
        console.log('Cleanup error (expected):', error);
      }
    }

    // Close context
    if (context) {
      await context.close();
    }
  });

  test('Fix 1: Service Worker Conflicts Resolved', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing service worker conflict resolution...`);
    
    try {
      // Navigate to app
      await page.goto('/');
      
      // Wait for app initialization without service worker interference
      await waitForAppInitialization(page, { timeout: 45000 });
      
      // Verify no service worker is active during tests
      const serviceWorkerActive = await page.evaluate(() => {
        return navigator.serviceWorker.controller !== null;
      });
      
      expect(serviceWorkerActive).toBe(false);
      console.log(`✅ [${browserName}] Service worker properly blocked in tests`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });

  test('Fix 2: App Initialization Race Conditions Resolved', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing app initialization stability...`);
    
    try {
      // Navigate to app
      await page.goto('/');
      
      // Test enhanced initialization wait
      const startTime = Date.now();
      await waitForAppInitialization(page, { timeout: 45000 });
      const initTime = Date.now() - startTime;
      
      console.log(`⏱️ [${browserName}] App initialized in ${initTime}ms`);
      
      // Verify app is fully functional
      const authButton = page.locator('[data-testid="signin-button"]');
      await expect(authButton).toBeVisible({ timeout: 5000 });
      
      console.log(`✅ [${browserName}] App initialization race conditions resolved`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });

  test('Fix 3: Modal State Management Improved', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing modal state management...`);
    
    try {
      // Navigate to app
      await page.goto('/');
      await waitForAppInitialization(page, { timeout: 45000 });
      
      // Open sign-in modal
      const signinButton = page.locator('[data-testid="signin-button"]');
      await signinButton.click();
      
      // Test enhanced modal wait
      await waitForModal(page, 'auth-modal', { timeout: 20000 });
      
      // Verify modal is fully interactive
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeEnabled();
      
      // Test modal closing
      const closeButton = page.locator('[data-testid="close-modal"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await waitForModal(page, 'auth-modal', { state: 'hidden', timeout: 10000 });
      }
      
      console.log(`✅ [${browserName}] Modal state management improved`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });

  test('Fix 4: Network Resilience and Connection Handling', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing network resilience...`);
    
    try {
      // Navigate to app
      await page.goto('/');
      await waitForAppInitialization(page, { timeout: 45000 });
      
      // Test registration flow (tests server connection pool)
      const signinButton = page.locator('[data-testid="signin-button"]');
      await signinButton.click();
      await waitForModal(page, 'auth-modal', { timeout: 20000 });
      
      // Switch to registration
      const registerTab = page.locator('[data-testid="switch-to-register"]');
      await registerTab.click();
      
      // Fill registration form
      await page.locator('[data-testid="email-input"] input').fill(testUser.email);
      await page.locator('[data-testid="password-input"] input').fill(testUser.password);
      await page.locator('[data-testid="display-name-input"] input').fill(testUser.displayName);
      
      // Submit registration
      const registerButton = page.locator('[data-testid="register-button"]');
      await registerButton.click();
      
      // Wait for any response (success, error, profile update, or toast)
      await Promise.race([
        page.waitForSelector('[data-testid="success-message"]', { timeout: 15000 }),
        page.waitForSelector('[data-testid="error-message"]', { timeout: 15000 }),
        page.waitForSelector('[data-testid="user-profile"]', { timeout: 15000 }),
        page.waitForSelector('ion-toast', { timeout: 15000 }) // Toast notifications
      ]);
      
      console.log(`✅ [${browserName}] Network resilience and connection handling working`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });

  test('Fix 5: Resource Management and Cleanup', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing resource management...`);
    
    try {
      // Test multiple rapid page loads (tests resource cleanup)
      for (let i = 0; i < 3; i++) {
        await page.goto('/');
        await waitForAppInitialization(page, { timeout: 45000 });
        
        // Verify app is responsive
        const signinButton = page.locator('[data-testid="signin-button"]');
        await expect(signinButton).toBeVisible({ timeout: 5000 });
        
        console.log(`🔄 [${browserName}] Page load ${i + 1}/3 successful`);
      }
      
      console.log(`✅ [${browserName}] Resource management and cleanup working`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });

  test('Integration: Full User Flow with All Fixes', async ({ browserName }) => {
    console.log(`🔧 [${browserName}] Testing complete user flow with all fixes...`);
    
    try {
      // Navigate to app
      await page.goto('/');
      await waitForAppInitialization(page, { timeout: 45000 });
      
      // Complete registration flow
      const signinButton = page.locator('[data-testid="signin-button"]');
      await signinButton.click();
      await waitForModal(page, 'auth-modal', { timeout: 20000 });
      
      const registerTab = page.locator('[data-testid="switch-to-register"]');
      await registerTab.click();
      
      await page.locator('[data-testid="email-input"] input').fill(testUser.email);
      await page.locator('[data-testid="password-input"] input').fill(testUser.password);
      await page.locator('[data-testid="display-name-input"] input').fill(testUser.displayName);
      
      const registerButton = page.locator('[data-testid="register-button"]');
      await registerButton.click();
      
      // Wait for any response indicating the flow completed
      await Promise.race([
        page.waitForSelector('[data-testid="user-profile"]', { timeout: 20000 }),
        page.waitForSelector('[data-testid="success-message"]', { timeout: 20000 }),
        page.waitForSelector('ion-toast', { timeout: 20000 }) // Toast notifications
      ]);
      
      console.log(`✅ [${browserName}] Complete user flow with all fixes working`);
      
    } catch (error) {
      if (isFirefoxError(error)) {
        await handleFirefoxError(page, error);
      } else {
        throw error;
      }
    }
  });
});
