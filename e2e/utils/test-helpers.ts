/**
 * Cross-Platform Test Helper Utilities
 * Provides robust helpers for web, iOS, and Android compatibility
 */

import { Page, Locator, expect } from '@playwright/test';

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
          await page.waitForTimeout(100); // Brief pause for stability
          
          // Fill the value
          await element.fill(value);
          await page.waitForTimeout(100); // Brief pause for value to register
          
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
      
      // Wait before retry
      await page.waitForTimeout(1000 * attempt);
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
        // Wait for button to be stable (not animating)
        await page.waitForTimeout(500);
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
      // Check if page/context is closed
      if (error.message.includes('Target page, context or browser has been closed')) {
        throw new Error(`Page was closed during test execution: ${error.message}`);
      }

      if (attempt === retries) {
        throw new Error(`Failed to click button [data-testid="${testId}"] after ${retries} attempts: ${error.message}`);
      }

      // Wait before retry, but check if page is still available
      try {
        await page.waitForTimeout(500 * attempt);
      } catch (timeoutError) {
        if (timeoutError.message.includes('Target page, context or browser has been closed')) {
          throw new Error(`Page was closed during retry wait: ${timeoutError.message}`);
        }
        throw timeoutError;
      }
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
  const { timeout = 15000, state = 'visible' } = options || {};
  
  const modal = page.locator(`[data-testid="${testId}"]`).last(); // Use .last() to handle multiple modals
  
  if (state === 'visible') {
    await modal.waitFor({ state: 'visible', timeout });
    
    // Additional check for Ion modal specific attributes
    await page.waitForFunction(
      (testId) => {
        const modals = document.querySelectorAll(`[data-testid="${testId}"]`);
        return Array.from(modals).some(modal => 
          modal.getAttribute('aria-hidden') !== 'true' &&
          !modal.classList.contains('overlay-hidden')
        );
      },
      testId,
      { timeout }
    );
  } else {
    await page.waitForFunction(
      (testId) => {
        const modals = document.querySelectorAll(`[data-testid="${testId}"]`);
        return modals.length === 0 || !Array.from(modals).some(modal =>
          modal.getAttribute('aria-hidden') !== 'true' &&
          !modal.classList.contains('overlay-hidden')
        );
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

    // Additional wait to ensure DOM is stable
    await page.waitForTimeout(500);
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
  const { timeout = 20000, skipCDPCheck = false } = options || {};
  
  // Wait for basic app structure
  await page.waitForSelector('ion-app', { timeout });
  
  // Wait for authentication state to stabilize
  await page.waitForFunction(
    () => {
      // Check if app has finished initial auth checks
      const authElements = document.querySelectorAll('[data-testid="signin-button"], [data-testid="signout-button"]');
      return authElements.length > 0;
    },
    { timeout }
  );
  
  // Wait for any loading indicators to disappear
  await page.waitForFunction(
    () => {
      const loadingElements = document.querySelectorAll('ion-loading, .loading, [data-testid*="loading"]');
      return loadingElements.length === 0;
    },
    { timeout: 5000 }
  ).catch(() => {
    // Ignore timeout for loading indicators
  });
  
  // Brief pause for final stabilization
  await page.waitForTimeout(1000);
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
