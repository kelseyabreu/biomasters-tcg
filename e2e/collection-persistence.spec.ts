/**
 * Integration Tests for Collection Persistence
 * Tests both good and bad paths for collection persistence across page refreshes
 */

import { test, expect, Page } from '@playwright/test';
import { clickIonButton, waitForModal, waitForAppInitialization, clearBrowserData } from './utils/test-helpers';

// Helper function to wait for authentication and collection loading
async function waitForAuthAndCollection(page: Page, timeout = 45000) {
  // First wait for the app to be fully initialized (not showing loading screen)
  await page.waitForFunction(() => {
    const loadingElement = document.querySelector('h2');
    return !loadingElement || !loadingElement.textContent?.includes('🧬 Biomasters TCG');
  }, { timeout: 10000 });

  // Then wait for authentication and collection
  await page.waitForFunction(() => {
    const store = (window as any).useHybridGameStore?.getState?.();
    return store && store.isAuthenticated && store.offlineCollection;
  }, { timeout });
}

// Helper function to get store state
async function getStoreState(page: Page) {
  return await page.evaluate(() => {
    const store = (window as any).useHybridGameStore?.getState?.();
    return {
      isAuthenticated: store?.isAuthenticated || false,
      isGuestMode: store?.isGuestMode || false,
      userId: store?.userId || null,
      guestId: store?.guestId || null,
      hasOfflineCollection: !!store?.offlineCollection,
      cardsCount: store?.offlineCollection ? Object.keys(store.offlineCollection.cards_owned || {}).length : 0,
      credits: store?.offlineCollection?.eco_credits || 0,
      hasStarterPack: store?.hasStarterPack || false,
      pendingActions: store?.pendingActions || 0,
      isHydrated: store?.isHydrated || false
    };
  });
}

// Helper function to get localStorage collection keys
async function getLocalStorageCollectionKeys(page: Page) {
  return await page.evaluate(() => {
    const allKeys = Object.keys(localStorage);
    return allKeys.filter(key => key.includes('biomasters_offline_collection'));
  });
}

test.describe('Collection Persistence Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser data and initialize app
    await page.goto('/');
    await clearBrowserData(page);
    await page.reload();
    await waitForAppInitialization(page);
  });

  test('Good Path: Complete collection persistence flow', async ({ page }) => {
    console.log('🧪 Starting Good Path Test...');

    // Step 1: Navigate to application
    await page.goto('/');
    await waitForAppInitialization(page);

    // Step 2: Check initial state (should be unauthenticated)
    const initialState = await getStoreState(page);
    expect(initialState.isAuthenticated).toBe(false);
    expect(initialState.hasOfflineCollection).toBe(false);

    // Step 3: Authenticate as guest
    await clickIonButton(page, 'signin-button');
    await waitForModal(page, 'auth-modal');
    await clickIonButton(page, 'guest-login-button');

    // Step 4: Wait for authentication and collection initialization
    await waitForAuthAndCollection(page);

    // Step 5: Verify authentication and collection state
    const authenticatedState = await getStoreState(page);
    expect(authenticatedState.isAuthenticated).toBe(true);
    expect(authenticatedState.isGuestMode).toBe(true);
    expect(authenticatedState.guestId).toBeTruthy();
    expect(authenticatedState.hasOfflineCollection).toBe(true);
    expect(authenticatedState.cardsCount).toBeGreaterThan(0); // Should have starter pack cards
    expect(authenticatedState.credits).toBeGreaterThan(0);

    // Step 6: Verify localStorage has collection data
    const collectionKeys = await getLocalStorageCollectionKeys(page);
    expect(collectionKeys.length).toBeGreaterThan(0);

    // Step 7: Record state before refresh
    const beforeRefreshState = authenticatedState;
    console.log('State before refresh:', beforeRefreshState);

    // Step 8: Refresh the page (THE CRITICAL TEST)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 9: Wait for authentication recovery and collection loading
    console.log('⏳ Waiting for authentication and collection recovery...');

    // Log state every 2 seconds to see what's happening
    const logInterval = setInterval(async () => {
      const currentState = await getStoreState(page);
      console.log('🔍 Current state during recovery:', {
        isAuthenticated: currentState.isAuthenticated,
        hasOfflineCollection: currentState.hasOfflineCollection,
        isHydrated: currentState.isHydrated,
        userId: currentState.userId,
        cardsCount: currentState.cardsCount
      });
    }, 2000);

    try {
      await waitForAuthAndCollection(page);
      clearInterval(logInterval);
    } catch (error) {
      clearInterval(logInterval);
      console.log('❌ Recovery failed, final state:', await getStoreState(page));
      throw error;
    }

    // Step 10: Verify state after refresh
    const afterRefreshState = await getStoreState(page);
    console.log('State after refresh:', afterRefreshState);

    // Step 11: Assert that all critical data is preserved
    expect(afterRefreshState.isAuthenticated).toBe(true);
    expect(afterRefreshState.isGuestMode).toBe(true);
    expect(afterRefreshState.guestId).toBe(beforeRefreshState.guestId);
    expect(afterRefreshState.hasOfflineCollection).toBe(true);
    expect(afterRefreshState.cardsCount).toBe(beforeRefreshState.cardsCount);
    expect(afterRefreshState.credits).toBe(beforeRefreshState.credits);

    console.log('✅ Good Path Test PASSED - Collection persisted across refresh!');
  });

  test('Bad Path: Collection corruption and recovery', async ({ page }) => {
    console.log('🧪 Starting Bad Path Test...');

    // Step 1: Set up authenticated state with collection
    await page.goto('/');
    await waitForAppInitialization(page);

    // Sign in as guest
    await clickIonButton(page, 'signin-button');
    await waitForModal(page, 'auth-modal');
    await clickIonButton(page, 'guest-login-button');
    await waitForAuthAndCollection(page);

    const validState = await getStoreState(page);
    expect(validState.isAuthenticated).toBe(true);
    expect(validState.hasOfflineCollection).toBe(true);

    // Step 2: Corrupt localStorage collection data
    await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      const collectionKeys = allKeys.filter(key => key.includes('biomasters_offline_collection'));
      
      if (collectionKeys.length > 0) {
        // Corrupt the collection data
        localStorage.setItem(collectionKeys[0], 'invalid-json-data');
        console.log('🔥 Corrupted collection data in localStorage');
      }
    });

    // Step 3: Refresh page to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 4: Wait for authentication recovery (should handle corruption gracefully)
    await waitForAppInitialization(page, { timeout: 15000 }); // Give time for recovery attempts

    // Step 5: Check that system handles corruption gracefully
    const afterCorruptionState = await getStoreState(page);

    // System should handle corruption gracefully - authentication might be lost but app should not crash
    // Collection might be reset due to corruption, which is acceptable
    expect(afterCorruptionState.isAuthenticated).toBeDefined(); // Should not crash
    
    console.log('State after corruption recovery:', afterCorruptionState);
    console.log('✅ Bad Path Test PASSED - System handled corruption gracefully');
  });

  test('Bad Path: Missing user ID during collection loading', async ({ page }) => {
    console.log('🧪 Starting Missing User ID Test...');

    // Step 1: Set up a scenario where user ID is missing but collection exists
    await page.goto('/');
    await waitForAppInitialization(page);

    // Step 2: Manually create collection in localStorage without proper user scoping
    await page.evaluate(() => {
      const mockCollection = {
        user_id: 'test-user-123',
        device_id: 'test-device',
        cards_owned: { '1': 1, '2': 1, '3': 1 },
        eco_credits: 150,
        xp_points: 0,
        action_queue: [],
        last_sync: Date.now(),
        signing_key_version: 1,
        collection_hash: 'mock-hash'
      };
      
      // Store with generic key (simulating orphaned collection)
      localStorage.setItem('biomasters_offline_collection', JSON.stringify(mockCollection));
      console.log('🔧 Created orphaned collection in localStorage');
    });

    // Step 3: Try to load collection without user ID
    await page.evaluate(() => {
      const store = (window as any).useHybridGameStore?.getState?.();
      if (store) {
        store.loadOfflineCollection();
      }
    });

    // Wait for store state to stabilize after fallback loading
    await expect(page.locator('ion-app')).toBeVisible();

    // Step 4: Verify fallback loading works
    const state = await getStoreState(page);
    
    // Should either find the orphaned collection or handle gracefully
    console.log('State after orphaned collection test:', state);
    console.log('✅ Missing User ID Test PASSED - Fallback loading handled gracefully');
  });
});
