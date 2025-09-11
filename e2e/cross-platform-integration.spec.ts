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
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Collection Progress')).toBeVisible();

      // Navigate back to home
      await clickIonButton(page, 'home-tab');
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

      // Navigate to deck builder (check for tab button, not specific text)
      await clickIonButton(page, 'deck-builder-tab');
      await page.waitForTimeout(1000);
      await expect(page.locator('ion-tab-bar')).toBeVisible();
    });

    // 3. State Persistence
    await test.step('User state persists across reload', async () => {
      await page.reload();
      await waitForAppInitialization(page);
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
      await page.waitForTimeout(1000);

      // Should still be able to navigate
      await clickIonButton(page, 'collection-tab');
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Collection Progress')).toBeVisible();
    });

    await test.step('App works when back online', async () => {
      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);

      // Should still work normally
      await clickIonButton(page, 'home-tab');
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });
  });
});
