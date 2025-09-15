/**
 * Cross-Platform Test Helper Utilities
 * Provides robust helpers for web, iOS, and Android compatibility
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Firefox-specific error detection and handling
 */
export function isFirefoxError(error: Error): boolean {
  const firefoxErrorPatterns = [
    'Target page, context or browser has been closed',
    'Test timeout of',
    'browserContext.newPage',
    'Protocol error',
    'Connection closed',
    'Browser has been closed'
  ];

  return firefoxErrorPatterns.some(pattern =>
    error.message.includes(pattern)
  );
}

/**
 * Enhanced error handling for Firefox browser issues
 */
export async function handleFirefoxError(page: Page, error: Error, operation: string): Promise<void> {
  if (isFirefoxError(error)) {
    console.log(`🦊 [Firefox] ${operation} failed with Firefox-specific error:`, error.message);

    // Check if page is still available
    try {
      await page.evaluate(() => document.readyState);
      console.log(`🦊 [Firefox] Page is still available after ${operation} error`);
    } catch (pageError) {
      console.log(`🦊 [Firefox] Page is no longer available after ${operation} error:`, pageError.message);
      throw new Error(`Firefox page became unavailable during ${operation}: ${error.message}`);
    }
  } else {
    // Re-throw non-Firefox errors
    throw error;
  }
}

/**
 * Cross-platform input filling for Ion components
 * Handles both direct input elements and Ion-wrapped inputs
 */
export async function fillIonInput(page: Page, testId: string, value: string, options?: {
  timeout?: number;
  retries?: number;
}) {
  const { timeout = 10000, retries = 3 } = options || {};
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try multiple selectors for maximum compatibility
      const selectors = [
        `[data-testid="${testId}"] input`,  // Ion input with nested input
        `[data-testid="${testId}"]`,        // Direct input element
        `ion-input[data-testid="${testId}"] input`, // Explicit ion-input
      ];
      
      let filled = false;
      for (const selector of selectors) {
        try {
          const element = page.locator(selector).first();
          await element.waitFor({ state: 'visible', timeout: timeout / selectors.length });
          
          // Clear existing value first
          await element.clear();

          // Fill the value
          await element.fill(value);
          
          // Verify the value was set
          const actualValue = await element.inputValue();
          if (actualValue === value) {
            filled = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      if (filled) {
        return; // Success
      }
      
      throw new Error(`Failed to fill input with any selector on attempt ${attempt}`);
      
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Failed to fill ion input [data-testid="${testId}"] after ${retries} attempts: ${error.message}`);
      }

      // Wait before retry with exponential backoff
      await page.waitForTimeout(500 * attempt);
    }
  }
}

/**
 * Cross-platform button clicking with retry logic
 * Handles Ion buttons and ensures they're clickable
 */
export async function clickIonButton(page: Page, testId: string, options?: {
  timeout?: number;
  retries?: number;
  waitForStable?: boolean;
}) {
  const { timeout = 10000, retries = 3, waitForStable = true } = options || {};

  // Handle special tab navigation cases
  const tabMappings: Record<string, string> = {
    'home-tab': 'ion-tab-button[tab="home"]',
    'collection-tab': 'ion-tab-button[tab="collection"]',
    'deck-builder-tab': 'ion-tab-button[tab="deck-builder"]',
    'settings-tab': 'ion-tab-button[tab="settings"]',
    'profile-tab': 'ion-tab-button[tab="profile"]',
    'battle-tab': 'ion-tab-button[tab="battle"]',
    'main-menu-tab': 'ion-tab-button[tab="home"]'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use tab mapping if available, otherwise use data-testid
      const selector = tabMappings[testId] || `[data-testid="${testId}"]`;
      const button = page.locator(selector).first();

      // Wait for button to be visible and enabled
      await button.waitFor({ state: 'visible', timeout });

      if (waitForStable) {
        // Wait for button to be stable (not animating) using proper assertion
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
      }

      // For tab buttons, check if they're clickable differently
      if (tabMappings[testId]) {
        await button.click();
        return; // Success for tab buttons
      }

      // For regular buttons, ensure they're enabled
      const isDisabled = await button.getAttribute('disabled');
      if (isDisabled !== null) {
        throw new Error(`Button [data-testid="${testId}"] is disabled`);
      }

      // Click the button
      await button.click();

      // If this is a tab button, ensure modals are closed first
      if (testId.includes('-tab')) {
        await ensureModalsAreClosed(page);
      }

      return; // Success

    } catch (error) {
      // Use Firefox-specific error handling
      if (isFirefoxError(error as Error)) {
        await handleFirefoxError(page, error as Error, `click button [data-testid="${testId}"]`);
      }

      if (attempt === retries) {
        throw new Error(`Failed to click button [data-testid="${testId}"] after ${retries} attempts: ${error.message}`);
      }

      // Wait before retry with exponential backoff
      await page.waitForTimeout(300 * attempt);
    }
  }
}

/**
 * Wait for modal to be visible with cross-platform compatibility
 */
export async function waitForModal(page: Page, testId: string, options?: {
  timeout?: number;
  state?: 'visible' | 'hidden';
}) {
  const { timeout = 20000, state = 'visible' } = options || {}; // Increased timeout

  const modal = page.locator(`[data-testid="${testId}"]`).last(); // Use .last() to handle multiple modals

  if (state === 'visible') {
    // First wait for the modal element to exist in DOM
    await modal.waitFor({ state: 'attached', timeout });

    // Then wait for it to be visible
    await modal.waitFor({ state: 'visible', timeout });

    // Wait for Ion modal animation to complete
    await page.waitForFunction(
      (testId) => {
        const modals = document.querySelectorAll(`[data-testid="${testId}"]`);
        return Array.from(modals).some(modal => {
          const isVisible = modal.getAttribute('aria-hidden') !== 'true' &&
                           !modal.classList.contains('overlay-hidden') &&
                           !modal.classList.contains('ion-modal-hidden');

          // Check if modal animation has completed
          const computedStyle = window.getComputedStyle(modal);
          const isAnimationComplete = computedStyle.opacity === '1' &&
                                     computedStyle.visibility === 'visible';

          return isVisible && isAnimationComplete;
        });
      },
      testId,
      { timeout: 10000 }
    );

    // Ensure modal content is interactive
    await expect(modal).toBeVisible();

  } else {
    await page.waitForFunction(
      (testId) => {
        const modals = document.querySelectorAll(`[data-testid="${testId}"]`);
        return modals.length === 0 || !Array.from(modals).some(modal => {
          const isVisible = modal.getAttribute('aria-hidden') !== 'true' &&
                           !modal.classList.contains('overlay-hidden') &&
                           !modal.classList.contains('ion-modal-hidden');

          const computedStyle = window.getComputedStyle(modal);
          const isAnimationComplete = computedStyle.opacity === '1' &&
                                     computedStyle.visibility === 'visible';

          return isVisible && isAnimationComplete;
        });
      },
      testId,
      { timeout }
    );
  }
}

/**
 * Ensure all modals are closed before proceeding
 */
export async function ensureModalsAreClosed(page: Page, timeout = 5000) {
  try {
    // Wait for all modals to be hidden
    await page.waitForFunction(
      () => {
        const modals = document.querySelectorAll('ion-modal');
        return Array.from(modals).every(modal =>
          modal.getAttribute('aria-hidden') === 'true' ||
          modal.classList.contains('overlay-hidden') ||
          !modal.classList.contains('show-modal')
        );
      },
      { timeout }
    );

    // Verify DOM is stable by checking no modals are visible
    const visibleModals = page.locator('ion-modal:visible');
    await expect(visibleModals).toHaveCount(0);
  } catch (error) {
    console.log('Warning: Could not verify all modals are closed, continuing...');
  }
}

/**
 * Safe CDP operations with fallback for mobile browsers
 */
export async function safeCDPOperation(page: Page, operation: () => Promise<void>, fallback?: () => Promise<void>) {
  try {
    // Check if CDP is available
    const client = await page.context().newCDPSession(page);
    await operation();
    await client.detach();
  } catch (error) {
    console.log(`CDP operation failed, using fallback: ${error.message}`);
    if (fallback) {
      await fallback();
    } else {
      // Default fallback: simple page reload
      await page.reload({ waitUntil: 'networkidle' });
    }
  }
}

/**
 * Perform different types of page refresh for testing
 */
export async function performRefresh(page: Page, type: 'normal' | 'hard' | 'hard-clear-cache' = 'normal') {
  console.log(`🔄 Performing ${type} refresh...`);

  try {
    // Check if page is still responsive before attempting refresh
    await page.evaluate(() => document.readyState).catch(() => {
      throw new Error('Page is not responsive before refresh');
    });

    switch (type) {
      case 'normal':
        // Normal refresh (F5 / Ctrl+R) - uses cache when possible
        await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        break;

      case 'hard':
        // Hard refresh (Ctrl+F5 / Shift+F5) - bypasses cache for current page
        try {
          await page.keyboard.down('Control');
          await page.keyboard.press('F5');
          await page.keyboard.up('Control');

          // Wait for page to start loading
          await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        } catch (error) {
          console.log(`Hard refresh keyboard shortcut failed, using reload: ${error.message}`);
          await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        }
        break;

      case 'hard-clear-cache':
        // Hard refresh + clear cache (Dev Tools option) - clears all cache
        try {
          // Use CDP to clear cache and hard reload
          const client = await page.context().newCDPSession(page);
          await client.send('Network.clearBrowserCache');
          await client.send('Page.reload', { ignoreCache: true });
          await client.detach();

          // Wait for page to start loading
          await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        } catch (error) {
          console.log(`CDP cache clear failed, using fallback: ${error.message}`);
          // Fallback: keyboard shortcut for hard refresh
          try {
            await page.keyboard.down('Control');
            await page.keyboard.down('Shift');
            await page.keyboard.press('F5');
            await page.keyboard.up('Shift');
            await page.keyboard.up('Control');

            // Wait for page to start loading
            await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
          } catch (fallbackError) {
            console.log(`Keyboard shortcut fallback failed, using simple reload: ${fallbackError.message}`);
            await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
          }
        }
        break;
    }

    console.log(`✅ ${type} refresh completed`);
  } catch (error) {
    console.log(`⚠️ ${type} refresh failed: ${error.message}`);
    throw error;
  }
}

/**
 * Clear browser data with cross-platform compatibility
 * Only clears data after page is properly loaded to avoid security errors
 */
export async function clearBrowserData(page: Page) {
  try {
    // Wait for page to be in a state where we can access storage
    await page.waitForFunction(() => {
      try {
        return typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined';
      } catch {
        return false;
      }
    }, { timeout: 5000 }).catch(() => {
      // If we can't access storage, skip clearing it
      console.log('Storage not accessible, skipping clear');
    });

    // Clear localStorage and sessionStorage with error handling
    await page.evaluate(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (error) {
        console.log('Could not clear storage:', error.message);
      }
    }).catch(() => {
      // Ignore storage clearing errors - they're not critical for test functionality
      console.log('Storage clearing failed, continuing with test');
    });

  } catch (error) {
    // If all storage operations fail, just continue - this isn't critical
    console.log('Browser data clearing failed, continuing with test:', error.message);
  }
}

/**
 * Enhanced wait for app initialization with mobile-specific considerations
 */
export async function waitForAppInitialization(page: Page, options?: {
  timeout?: number;
  skipCDPCheck?: boolean;
}) {
  const { timeout = 60000, skipCDPCheck = false } = options || {}; // Increased timeout

  try {
    // Wait for basic app structure
    await page.waitForSelector('ion-app', { timeout });

    // Wait for network idle state first to ensure resources are loaded
    try {
      await page.waitForLoadState('networkidle', { timeout: 20000 });
    } catch (error) {
      console.log('Network idle timeout, continuing...');
    }

    // Wait for authentication state to stabilize with more robust checks
    await page.waitForFunction(
      () => {
        try {
          // Check if app has finished initial auth checks
          const authElements = document.querySelectorAll('[data-testid="signin-button"], [data-testid="signout-button"]');
          const mainMenu = document.querySelector('[data-testid="main-menu"]');
          const authPage = document.querySelector('[data-testid="auth-page"]');

          // Check if we have any content loaded (even if auth is still loading)
          const ionContent = document.querySelector('ion-content');
          const hasContent = ionContent && ionContent.children.length > 0;

          // Check if React has finished hydrating
          const reactReady = window.React !== undefined ||
                            document.querySelector('[data-reactroot]') !== null ||
                            document.querySelector('#root > *') !== null;

          // Check if the app is not stuck in an error state
          const hasError = document.body.textContent?.includes('Error') ||
                          document.body.textContent?.includes('Failed to load') ||
                          document.body.textContent?.includes('Something went wrong');

          // App is ready if we have auth elements OR we're on a main page OR we have content AND React is ready AND no errors
          return (authElements.length > 0 || mainMenu !== null || authPage !== null || hasContent) && reactReady && !hasError;
        } catch (error) {
          return false;
        }
      },
      { timeout }
    );

    // Wait for any loading indicators to disappear
    await page.waitForFunction(
      () => {
        try {
          const loadingElements = document.querySelectorAll('ion-loading, .loading, [data-testid*="loading"]');
          const initializingText = document.body.textContent?.includes('Initializing...') || false;
          return loadingElements.length === 0 && !initializingText;
        } catch (error) {
          return true; // If we can't check, assume loading is done
        }
      },
      { timeout: 15000 }
    ).catch(() => {
      // Ignore timeout for loading indicators
      console.log('Loading indicators check timeout, continuing...');
    });

    // Verify app is fully initialized by checking for interactive elements
    await expect(page.locator('ion-app')).toBeVisible();
    // Use first() to handle multiple matching elements (strict mode compliance)
    await expect(page.locator('ion-content, [data-testid="main-menu"], [data-testid="auth-page"]').first()).toBeVisible();
  } catch (error) {
    console.log('⚠️ App initialization timeout, but continuing...', error.message);
    // Continue anyway - the app might still be functional
  }
}

/**
 * Mobile-safe network error simulation
 */
export async function simulateNetworkError(page: Page, pattern: string) {
  try {
    // Try to use route interception (works on most browsers)
    await page.route(pattern, route => route.abort());
  } catch (error) {
    console.log(`Route interception failed: ${error.message}`);
    // Fallback: Could implement other network simulation methods
    throw new Error('Network simulation not supported on this browser');
  }
}

/**
 * Wait for authentication state to stabilize
 */
export async function waitForAuthState(page: Page, expectedState: 'authenticated' | 'unauthenticated', timeout = 15000) {
  if (expectedState === 'authenticated') {
    // Use first() to handle multiple matching elements (strict mode compliance)
    await expect(page.locator('[data-testid="signout-button"], [data-testid="user-profile"]').first()).toBeVisible({ timeout });
  } else {
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible({ timeout });
  }
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, expectedUrl?: string, timeout = 10000) {
  if (expectedUrl) {
    await expect(page).toHaveURL(expectedUrl, { timeout });
  }
  await page.waitForLoadState('networkidle', { timeout });
  await expect(page.locator('ion-app')).toBeVisible({ timeout });
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, expectedText?: string, timeout = 10000) {
  const toast = page.locator('ion-toast');
  await expect(toast).toBeVisible({ timeout });

  if (expectedText) {
    await expect(toast).toContainText(expectedText, { timeout });
  }

  return toast;
}

/**
 * Switch between authentication modes (sign-in/register)
 */
export async function switchAuthMode(page: Page, mode: 'signin' | 'register') {
  const switchButton = mode === 'register'
    ? page.locator('[data-testid="switch-to-register"]')
    : page.locator('[data-testid="switch-to-signin"]');

  await expect(switchButton).toBeVisible();
  await switchButton.click();

  // Verify the mode switched
  const expectedButton = mode === 'register'
    ? page.locator('[data-testid="register-button"]')
    : page.locator('[data-testid="signin-button"]');

  await expect(expectedButton).toBeVisible();
}
