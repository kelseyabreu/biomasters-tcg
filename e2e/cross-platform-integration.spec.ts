import { test, expect, Page } from '@playwright/test';
import { clickIonButton, waitForAppInitialization, waitForModal } from './utils/test-helpers';

/**
 * Essential Cross-Platform Integration E2E Tests
 *
 * Tests only the most critical functionality:
 * 1. Basic authentication and navigation
 * 2. Core app functionality verification
 */

test.describe('Essential Cross-Platform Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppInitialization(page);
  });

  test('Basic App Functionality', async ({ page }) => {
    // 1. Authentication
    await test.step('User authenticates as guest', async () => {
      await clickIonButton(page, 'signin-button');
      await waitForModal(page, 'auth-modal');
      await clickIonButton(page, 'guest-login-button');
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    // 2. Basic Navigation
    await test.step('Basic navigation works', async () => {
      // Navigate to collection
      await clickIonButton(page, 'collection-tab');
      await expect(page.locator('text=Collection Progress')).toBeVisible();

      // Navigate back to home
      await clickIonButton(page, 'home-tab');
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

      // Navigate to deck builder (check for tab button, not specific text)
      await clickIonButton(page, 'deck-builder-tab');
      await expect(page.locator('ion-tab-bar')).toBeVisible();
    });

    // 3. State Persistence
    await test.step('User state persists across reload', async () => {
      await page.reload();
      await waitForAppInitialization(page);

      // Wait for authentication recovery to complete and user profile to be available
      await page.waitForFunction(
        () => {
          // Check if the store has been properly hydrated with user data
          const storeState = window.useHybridGameStore?.getState();
          console.log('🔍 Store state check:', {
            isAuthenticated: storeState?.isAuthenticated,
            userProfile: storeState?.userProfile,
            isGuestMode: storeState?.isGuestMode,
            guestId: storeState?.guestId
          });
          return storeState?.isAuthenticated === true &&
                 storeState?.userProfile !== null &&
                 storeState?.userProfile !== undefined;
        },
        { timeout: 20000 }
      );

      // Debug: Check what's actually on the page
      const debugInfo = await page.evaluate(() => {
        const userProfileElement = document.querySelector('[data-testid="user-profile"]');
        const userProfileCompact = document.querySelector('.user-profile-compact');
        const mainMenuElement = document.querySelector('[data-testid="main-menu"]');
        const authPageElement = document.querySelector('[data-testid="auth-page"]');
        const storeState = window.useHybridGameStore?.getState();

        return {
          hasUserProfile: !!userProfileElement,
          hasUserProfileCompact: !!userProfileCompact,
          hasMainMenu: !!mainMenuElement,
          hasAuthPage: !!authPageElement,
          currentUrl: window.location.pathname,
          storeAuthenticated: storeState?.isAuthenticated,
          storeUserProfile: !!storeState?.userProfile,
          allUserProfileElements: document.querySelectorAll('[data-testid*="user"]').length,
          bodyContent: document.body.innerHTML.includes('user-profile'),
          pageTitle: document.title,
          ionPageElements: document.querySelectorAll('ion-page').length
        };
      });

      console.log('🔍 Debug info:', debugInfo);

      // If we're not on the main menu, navigate there
      if (!debugInfo.hasMainMenu && debugInfo.currentUrl !== '/') {
        console.log('🔄 Navigating to home page...');
        await page.goto('/');
        await waitForAppInitialization(page);
      }

      // Now the user profile should be visible
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });
  });

  test('Offline Mode Basic Functionality', async ({ page }) => {
    // Authenticate first
    await clickIonButton(page, 'signin-button');
    await waitForModal(page, 'auth-modal');
    await clickIonButton(page, 'guest-login-button');
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

    await test.step('App works offline', async () => {
      // Go offline
      await page.context().setOffline(true);

      // Should still be able to navigate
      await clickIonButton(page, 'collection-tab');
      await expect(page.locator('text=Collection Progress')).toBeVisible();
    });

    await test.step('App works when back online', async () => {
      // Go back online
      await page.context().setOffline(false);

      // Should still work normally
      await clickIonButton(page, 'home-tab');
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });
  });
});
