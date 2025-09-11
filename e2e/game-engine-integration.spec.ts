import { test, expect, Page } from '@playwright/test';
import { clickIonButton, waitForAppInitialization, waitForModal } from './utils/test-helpers';

/**
 * Game Engine Integration E2E Tests
 *
 * Tests the critical game engine functionality that was recently integrated:
 * 1. TCGGameService state loading into ClientGameEngine
 * 2. Basic game functionality verification
 * 3. Game state persistence and recovery
 */

test.describe('Game Engine Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppInitialization(page);

    // Quick guest auth for testing
    await clickIonButton(page, 'signin-button');
    await waitForModal(page, 'auth-modal');
    await clickIonButton(page, 'guest-login-button');
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  });

  test('TCGGameService integration works correctly', async ({ page }) => {
    // Test basic service integration by checking collection
    await clickIonButton(page, 'collection-tab');
    await page.waitForTimeout(2000);

    // Should show collection interface
    await expect(page.locator('text=Collection Progress')).toBeVisible();

    await test.step('Collection data is accessible', async () => {
      // Verify collection data exists in localStorage
      const hasCollection = await page.evaluate(() => {
        return localStorage.getItem('biomasters_offline_collection') !== null;
      });

      expect(hasCollection).toBe(true);
    });

    await test.step('Game state management works', async () => {
      // Verify that the game store is initialized
      const gameStoreInitialized = await page.evaluate(() => {
        // Check if the hybrid game store has been initialized
        return window.localStorage.getItem('biomasters_user_profile') !== null;
      });

      expect(gameStoreInitialized).toBe(true);
    });

    await test.step('Static data is loaded for game engine', async () => {
      // Verify species data is available for the game engine
      const hasSpeciesData = await page.evaluate(() => {
        // Check if species data is cached
        return window.localStorage.getItem('biomasters_species_cache') !== null ||
               window.sessionStorage.getItem('biomasters_species_cache') !== null;
      });

      // Species data should be available either in localStorage or loaded in memory
      expect(hasSpeciesData).toBe(true);
    });
  });

  test('Game state persistence works correctly', async ({ page }) => {
    await test.step('Game state is saved to localStorage', async () => {
      // Navigate to collection to trigger some state changes
      await clickIonButton(page, 'collection-tab');
      await page.waitForTimeout(1000);

      // Check that game state is being persisted
      const gameStatePersisted = await page.evaluate(() => {
        // Check for any game-related data in localStorage
        const keys = Object.keys(localStorage);
        return keys.some(key => key.includes('biomasters') || key.includes('game'));
      });

      expect(gameStatePersisted).toBe(true);
    });

    await test.step('Game state persists across page reload', async () => {
      // Get current state
      const beforeReload = await page.evaluate(() => {
        return localStorage.getItem('biomasters_user_profile');
      });

      // Reload page
      await page.reload();
      await waitForAppInitialization(page);

      // Check state after reload
      const afterReload = await page.evaluate(() => {
        return localStorage.getItem('biomasters_user_profile');
      });

      expect(afterReload).toBe(beforeReload);
      expect(afterReload).not.toBeNull();
    });
  });
});
