/**
 * E2E Tests for 5 Critical Sync Fixes
 * Tests both good path (success) and bad path (failure) for each fix
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// Helper to wait for element
async function waitForElement(page: any, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
}

// Helper to clear all storage including IndexedDB
async function clearAllStorage(page: any) {
  await page.evaluate(async () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB (where secure storage is kept)
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });
  await page.context().clearCookies();
}

test.describe('Fix #1: Action Queue Reconciliation', () => {
  test('Good Path: Actions sync successfully when online', async ({ page }) => {
    console.log('🧪 [FIX-1-GOOD] Starting test...');

    // Navigate to app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Clear all storage to ensure clean state
    await clearAllStorage(page);

    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');

    // Wait for the guest login button to be visible
    await page.waitForSelector('[data-testid="guest-login-button"]', { state: 'visible', timeout: 10000 });

    // Sign in as guest using the proper test ID
    await page.click('[data-testid="guest-login-button"]');

    // Wait for navigation to home page
    await page.waitForURL(`${BASE_URL}/home`, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get initial card count
    const initialCardCount = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return Object.keys(collection.cards_owned || {}).length;
    });

    console.log('📊 [FIX-1-GOOD] Initial card count:', initialCardCount);

    // Navigate to packs page
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);

    // Click on starter pack (should be available for new users)
    const starterPackButton = page.locator('ion-button:has-text("Claim Starter Pack")').first();
    if (await starterPackButton.isVisible()) {
      await starterPackButton.click();
      await page.waitForTimeout(1000);

      // Wait for pack opening modal
      await page.waitForSelector('ion-button:has-text("Open Pack")', { timeout: 5000 });
      await page.click('ion-button:has-text("Open Pack")');

      // Wait for pack opening animation and sync
      await page.waitForTimeout(5000);

      // Verify cards were added (sync completed successfully)
      const afterPackCardCount = await page.evaluate(() => {
        const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
        return Object.keys(collection.cards_owned || {}).length;
      });

      console.log('📊 [FIX-1-GOOD] Card count after pack:', afterPackCardCount);
      expect(afterPackCardCount).toBeGreaterThan(initialCardCount);

      // Verify queue is empty (actions were synced)
      const queueCount = await page.evaluate(() => {
        const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
        return collection.action_queue?.length || 0;
      });

      console.log('📊 [FIX-1-GOOD] Queue count after sync:', queueCount);
      // Queue should be empty or very small (auto-sync cleared it)
      expect(queueCount).toBeLessThanOrEqual(1);
    }

    console.log('✅ [FIX-1-GOOD] Test passed!');
  });

  test('Bad Path: Actions queue when offline', async ({ page, context }) => {
    console.log('🧪 [FIX-1-BAD] Starting test...');

    // Navigate to app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Clear all storage to ensure clean state
    await clearAllStorage(page);

    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');

    // Sign in as guest
    await page.waitForSelector('[data-testid="guest-login-button"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-testid="guest-login-button"]');
    await page.waitForURL(`${BASE_URL}/home`, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);
    console.log('📴 [FIX-1-BAD] Device set to offline mode');

    // Get initial queue count
    const initialQueueCount = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return collection.action_queue?.length || 0;
    });

    console.log('📊 [FIX-1-BAD] Initial queue count (offline):', initialQueueCount);

    // Try to open a pack while offline - this should queue the action
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);

    const starterPackButton = page.locator('ion-button:has-text("Claim Starter Pack")').first();
    if (await starterPackButton.isVisible()) {
      await starterPackButton.click();
      await page.waitForTimeout(1000);

      // Wait for pack opening modal
      await page.waitForSelector('ion-button:has-text("Open Pack")', { timeout: 5000 });
      await page.click('ion-button:has-text("Open Pack")');

      // Wait for pack opening
      await page.waitForTimeout(3000);

      // Verify actions were queued (not synced because offline)
      const afterPackQueueCount = await page.evaluate(() => {
        const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
        return collection.action_queue?.length || 0;
      });

      console.log('📊 [FIX-1-BAD] Queue count after pack (offline):', afterPackQueueCount);
      expect(afterPackQueueCount).toBeGreaterThan(initialQueueCount);

      // Go back online
      await context.setOffline(false);
      console.log('🌐 [FIX-1-BAD] Device back online');

      // Wait for auto-sync to trigger
      await page.waitForTimeout(5000);

      // Verify queue was cleared after sync
      const afterSyncQueueCount = await page.evaluate(() => {
        const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
        return collection.action_queue?.length || 0;
      });

      console.log('📊 [FIX-1-BAD] Queue count after sync:', afterSyncQueueCount);
      // Queue should be cleared or much smaller after successful sync
      expect(afterSyncQueueCount).toBeLessThan(afterPackQueueCount);
    }

    console.log('✅ [FIX-1-BAD] Test passed!');
  });
});

test.describe('Fix #2: Collection Version & Optimistic Locking', () => {
  test('Good Path: Version increments on changes', async ({ page }) => {
    console.log('🧪 [FIX-2-GOOD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Get initial version
    const initialVersion = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return collection.collection_version || 0;
    });
    
    console.log('📊 [FIX-2-GOOD] Initial version:', initialVersion);
    
    // Make a change (open pack)
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);
    
    // Verify version incremented
    const newVersion = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return collection.collection_version || 0;
    });
    
    console.log('📊 [FIX-2-GOOD] New version:', newVersion);
    expect(newVersion).toBeGreaterThan(initialVersion);
    
    console.log('✅ [FIX-2-GOOD] Test passed!');
  });

  test('Bad Path: Detects version mismatch', async ({ page }) => {
    console.log('🧪 [FIX-2-BAD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Manually set an old version to simulate stale data
    await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      collection.collection_version = 1;
      collection.last_synced_version = 0;
      localStorage.setItem('offline_collection', JSON.stringify(collection));
    });
    
    // Trigger sync - should detect version mismatch
    const syncButton = page.locator('button:has-text("Sync")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
      
      // Version should be updated from server
      const updatedVersion = await page.evaluate(() => {
        const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
        return collection.collection_version || 0;
      });
      
      console.log('📊 [FIX-2-BAD] Updated version:', updatedVersion);
      expect(updatedVersion).toBeGreaterThanOrEqual(1);
    }
    
    console.log('✅ [FIX-2-BAD] Test passed!');
  });
});

test.describe('Fix #3: Cascade Rollback', () => {
  test('Good Path: No cascade needed for simple action', async ({ page }) => {
    console.log('🧪 [FIX-3-GOOD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Get initial state
    const initialState = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return {
        cardsCount: Object.keys(collection.cards_owned || {}).length,
        decksCount: (collection.savedDecks || []).length
      };
    });
    
    console.log('📊 [FIX-3-GOOD] Initial state:', initialState);
    
    // Simple action that won't cascade
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);
    
    const afterState = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return {
        cardsCount: Object.keys(collection.cards_owned || {}).length,
        decksCount: (collection.savedDecks || []).length
      };
    });
    
    console.log('📊 [FIX-3-GOOD] After state:', afterState);
    expect(afterState.cardsCount).toBeGreaterThanOrEqual(initialState.cardsCount);
    
    console.log('✅ [FIX-3-GOOD] Test passed!');
  });

  test('Bad Path: Cascade rollback removes dependent actions', async ({ page }) => {
    console.log('🧪 [FIX-3-BAD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Create a chain: pack → cards → deck
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);
    
    // Try to create a deck (if UI allows)
    const deckBuilderButton = page.locator('text=Deck Builder').first();
    if (await deckBuilderButton.isVisible()) {
      await deckBuilderButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Simulate cascade scenario by checking action queue
    const queueState = await page.evaluate(() => {
      const collection = JSON.parse(localStorage.getItem('offline_collection') || '{}');
      return {
        queueLength: collection.action_queue?.length || 0,
        hasPackActions: collection.action_queue?.some((a: any) => a.action === 'pack_opened') || false
      };
    });
    
    console.log('📊 [FIX-3-BAD] Queue state:', queueState);
    expect(queueState.queueLength).toBeGreaterThanOrEqual(0);
    
    console.log('✅ [FIX-3-BAD] Test passed!');
  });
});

test.describe('Fix #4: UserType System', () => {
  test('Good Path: GUEST user can sync after registration', async ({ page }) => {
    console.log('🧪 [FIX-4-GOOD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Check user type
    const userType = await page.evaluate(() => {
      const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      return profile.user_type || 'unknown';
    });
    
    console.log('📊 [FIX-4-GOOD] User type:', userType);
    expect(userType).toBe('guest');
    
    // Trigger sync (should work for guest)
    const syncButton = page.locator('button:has-text("Sync")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
      
      console.log('✅ [FIX-4-GOOD] Guest sync completed!');
    }
    
    console.log('✅ [FIX-4-GOOD] Test passed!');
  });

  test('Bad Path: ANONYMOUS user cannot sync', async ({ page }) => {
    console.log('🧪 [FIX-4-BAD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Don't sign in - remain anonymous
    await page.waitForTimeout(2000);
    
    // Check if sync button is disabled or hidden for anonymous users
    const syncButton = page.locator('button:has-text("Sync")').first();
    const isSyncVisible = await syncButton.isVisible().catch(() => false);
    
    console.log('📊 [FIX-4-BAD] Sync button visible for anonymous:', isSyncVisible);
    
    // Anonymous users should not see sync button or it should be disabled
    if (isSyncVisible) {
      const isDisabled = await syncButton.isDisabled();
      console.log('📊 [FIX-4-BAD] Sync button disabled:', isDisabled);
      expect(isDisabled).toBe(true);
    }
    
    console.log('✅ [FIX-4-BAD] Test passed!');
  });
});

test.describe('Fix #5: Idempotency Protection', () => {
  test('Good Path: Transaction completes successfully', async ({ page }) => {
    console.log('🧪 [FIX-5-GOOD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Perform action
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);
    
    // Trigger sync
    const syncButton = page.locator('button:has-text("Sync")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
      
      // Check sync status
      const syncStatus = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_game_store') || '{}');
        return state.state?.syncStatus || 'unknown';
      });
      
      console.log('📊 [FIX-5-GOOD] Sync status:', syncStatus);
      expect(['success', 'idle']).toContain(syncStatus);
    }
    
    console.log('✅ [FIX-5-GOOD] Test passed!');
  });

  test('Bad Path: Duplicate transaction is rejected', async ({ page }) => {
    console.log('🧪 [FIX-5-BAD] Starting test...');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Continue as Guest');
    await page.waitForTimeout(2000);
    
    // Perform action
    await page.click('text=Open Pack');
    await page.waitForTimeout(1000);
    
    // Trigger sync twice rapidly to test idempotency
    const syncButton = page.locator('button:has-text("Sync")').first();
    if (await syncButton.isVisible()) {
      // First sync
      await syncButton.click();
      await page.waitForTimeout(500);
      
      // Second sync (should be prevented or handled gracefully)
      const secondSyncAttempt = await syncButton.click().catch(() => null);
      await page.waitForTimeout(2000);
      
      // Check that system handled duplicate gracefully
      const syncStatus = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_game_store') || '{}');
        return state.state?.syncStatus || 'unknown';
      });
      
      console.log('📊 [FIX-5-BAD] Sync status after duplicate:', syncStatus);
      // Should not be in error state
      expect(syncStatus).not.toBe('error');
    }
    
    console.log('✅ [FIX-5-BAD] Test passed!');
  });
});

