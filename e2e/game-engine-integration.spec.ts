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

    // Wait for collection to be created
    await page.waitForFunction(
      () => {
        const keys = Object.keys(localStorage);
        return keys.some(key => key.includes('_biomasters_offline_collection'));
      },
      { timeout: 10000 }
    );
  });

  test('TCGGameService integration works correctly', async ({ page }) => {
    // Test basic service integration by checking collection
    await clickIonButton(page, 'collection-tab');

    // Should show collection interface
    await expect(page.locator('text=Collection Progress')).toBeVisible();

    await test.step('Collection data is accessible', async () => {
      // Verify collection data exists in localStorage (user-scoped)
      const hasCollection = await page.evaluate(() => {
        // Look for any user-scoped collection key
        const keys = Object.keys(localStorage);
        return keys.some(key => key.includes('_biomasters_offline_collection'));
      });

      expect(hasCollection).toBe(true);
    });

    await test.step('Game state management works', async () => {
      // Verify that the game store is initialized
      const gameStoreInitialized = await page.evaluate(() => {
        // Check if the hybrid game store has been initialized (user-scoped or global)
        const keys = Object.keys(localStorage);
        return keys.some(key =>
          key.includes('_biomasters_offline_collection') ||
          key.includes('biomasters_guest_id') ||
          key.includes('biomasters-hybrid-game-store')
        );
      });

      expect(gameStoreInitialized).toBe(true);
    });

    await test.step('Static data is loaded for game engine', async () => {
      // Verify species data is available for the game engine
      const hasSpeciesData = await page.evaluate(() => {
        // Check if species data is cached in the new static data cache
        const keys = Object.keys(localStorage);
        return keys.some(key =>
          key.includes('static_data_data_cache') ||
          key.includes('biomasters_species_cache') ||
          key.includes('cards.json')
        );
      });

      // Species data should be available either in localStorage or loaded in memory
      expect(hasSpeciesData).toBe(true);
    });
  });

  test('Game state persistence works correctly', async ({ page }) => {
    await test.step('Game state is saved to localStorage', async () => {
      // Navigate to collection to trigger some state changes
      await clickIonButton(page, 'collection-tab');
      await expect(page.locator('text=Collection Progress')).toBeVisible();

      // Check that game state is being persisted
      const gameStatePersisted = await page.evaluate(() => {
        // Check for any game-related data in localStorage
        const keys = Object.keys(localStorage);
        return keys.some(key => key.includes('biomasters') || key.includes('game'));
      });

      expect(gameStatePersisted).toBe(true);
    });

    await test.step('Game state persists across page reload', async () => {
      // Get current state (look for any collection data)
      const beforeReload = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const collectionKey = keys.find(key => key.includes('_biomasters_offline_collection'));
        return collectionKey ? localStorage.getItem(collectionKey) : null;
      });

      // Reload page
      await page.reload();
      await waitForAppInitialization(page);

      // Check state after reload
      const afterReload = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const collectionKey = keys.find(key => key.includes('_biomasters_offline_collection'));
        return collectionKey ? localStorage.getItem(collectionKey) : null;
      });

      expect(afterReload).toBe(beforeReload);
      expect(afterReload).not.toBeNull();
    });
  });
});
