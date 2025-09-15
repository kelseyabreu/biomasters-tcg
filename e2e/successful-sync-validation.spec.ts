/**
 * Successful Sync Validation E2E Tests
 * 
 * This test validates that sync operations actually succeed with proper signatures and key versions.
 * It ensures the signature verification and key version system works correctly.
 */

import { test, expect } from '@playwright/test';
import { EnhancedTestIsolation } from './utils/enhanced-test-isolation';

test.describe('🔄 Successful Sync Validation E2E', () => {
  test('should successfully sync with valid signatures and key versions', async ({ page, request }) => {
    console.log('🧪 Testing successful sync with valid signatures and key versions...');
    
    const isolationManager = new EnhancedTestIsolation('successful-sync-validation', request);
    const partialContext = await isolationManager.setup({
      testName: 'successful-sync-validation',
      enableWorkerDelay: true
    });

    // Complete setup with page and request context
    const isolatedContext = await isolationManager.completeSetup(partialContext, page, request);

    try {
      // Create unique test user
      const testUser = await isolationManager.createIsolatedUser(isolatedContext);
      console.log(`🔒 [Worker ${isolatedContext.workerConfig.workerId}] Created test user: ${testUser.email}`);

      // Add worker delay to prevent conflicts
      await isolatedContext.isolationManager.addWorkerDelay();

      // Navigate to app
      await page.goto('http://localhost:5173');
      
      // Wait for app to load
      console.log('⏳ Waiting for app to load...');
      await page.waitForSelector('[data-testid="main-menu"], [data-testid="user-profile"], ion-tab-bar, ion-content, [data-testid="auth-page"]', { 
        timeout: 30000 
      });
      console.log('✅ App loaded successfully');

      // Register test user
      console.log(`🔐 Registering test user: ${testUser.email}`);
      
      // Navigate to auth page if needed
      const authPage = page.locator('[data-testid="auth-page"]');
      if (await authPage.isVisible()) {
        console.log('📱 Already on auth page');
      } else {
        // Navigate to auth page
        await page.click('[data-testid="auth-button"], [data-testid="login-button"], [data-testid="sign-in-button"]');
        await page.waitForSelector('[data-testid="auth-page"]', { timeout: 10000 });
      }

      // Fill in registration form
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // Click register button
      await page.click('[data-testid="register-button"]');
      
      console.log('⏳ Waiting for backend registration to complete...');
      
      // Wait for registration to complete and navigate away from auth page
      await page.waitForSelector('[data-testid="main-menu"], [data-testid="user-profile"], ion-tab-bar', { 
        timeout: 60000 
      });
      
      console.log('🔍 Waiting for complete authentication flow (backend + device registration)...');
      
      // Wait a bit more for device registration to complete
      await page.waitForTimeout(3000);
      
      console.log('✅ User registration and device registration completed');

      // Initialize collection
      console.log('📦 Initializing collection...');
      
      // Navigate to collection tab to trigger initialization
      await page.click('ion-tab-button[tab="collection"]');
      await page.waitForSelector('[data-testid="collection-view"]', { timeout: 10000 });
      
      console.log('✅ Collection initialized');

      // Wait for any initial sync to complete
      await page.waitForTimeout(2000);

      // Check initial sync state
      const initialSyncState = await page.evaluate(() => {
        const store = (window as any).useHybridGameStore?.getState?.();
        return {
          syncStatus: store?.syncStatus,
          pendingActions: store?.actionQueue?.length || 0,
          hasCollection: !!store?.collection,
          signingKeyVersion: store?.signingKeyVersion,
          lastSync: store?.lastSync
        };
      });
      
      console.log('📊 Initial sync state:', initialSyncState);

      // Verify we have a valid signing key version
      expect(initialSyncState.signingKeyVersion).toBeGreaterThan(0);
      console.log('✅ Valid signing key version detected:', initialSyncState.signingKeyVersion);

      // Create a meaningful action that requires sync
      console.log('🎁 Creating meaningful action (opening starter pack)...');
      
      const actionResult = await page.evaluate(() => {
        const store = (window as any).useHybridGameStore?.getState?.();
        if (store?.openStarterPack) {
          return store.openStarterPack();
        }
        return { success: false, error: 'openStarterPack not available' };
      });
      
      console.log('📝 Action creation result:', actionResult);
      
      if (!actionResult.success) {
        // Try alternative method - add credits and open premium pack
        console.log('💰 Adding credits for pack opening...');
        
        await page.evaluate(() => {
          const store = (window as any).useHybridGameStore?.getState?.();
          if (store?.addCredits) {
            store.addCredits(100);
          }
        });
        
        const premiumPackResult = await page.evaluate(() => {
          const store = (window as any).useHybridGameStore?.getState?.();
          if (store?.openPremiumPack) {
            return store.openPremiumPack();
          }
          return { success: false, error: 'openPremiumPack not available' };
        });
        
        console.log('📝 Premium pack result:', premiumPackResult);
      }

      // Check that we have pending actions
      const postActionState = await page.evaluate(() => {
        const store = (window as any).useHybridGameStore?.getState?.();
        return {
          syncStatus: store?.syncStatus,
          pendingActions: store?.actionQueue?.length || 0,
          hasCollection: !!store?.collection,
          signingKeyVersion: store?.signingKeyVersion,
          lastSync: store?.lastSync
        };
      });
      
      console.log('📊 Post-action state:', postActionState);

      // Now perform sync and verify it succeeds
      console.log('🔄 Triggering sync to validate success...');
      
      // Find and click sync button
      const syncButton = page.locator('[data-testid="sync-button"]');
      await expect(syncButton).toBeVisible({ timeout: 10000 });
      console.log('✅ Sync button found and visible');
      
      // Click sync button
      await syncButton.click();
      console.log('🔄 Sync button clicked');
      
      // Wait for sync to complete (either success or error)
      await page.waitForTimeout(5000);
      
      // Check final sync state
      const finalSyncState = await page.evaluate(() => {
        const store = (window as any).useHybridGameStore?.getState?.();
        return {
          syncStatus: store?.syncStatus,
          pendingActions: store?.actionQueue?.length || 0,
          hasCollection: !!store?.collection,
          signingKeyVersion: store?.signingKeyVersion,
          lastSync: store?.lastSync,
          syncError: store?.syncError
        };
      });
      
      console.log('📊 Final sync state:', finalSyncState);

      // Validate sync success - now that we've fixed the key version issues, sync should succeed
      expect(finalSyncState.syncStatus).toBe('success');
      expect(finalSyncState.pendingActions).toBe(0);
      expect(finalSyncState.lastSync).toBeGreaterThan(0);
      console.log('✅ Sync completed successfully with valid signatures and key versions');

      console.log('✅ Successful sync validation test completed');

    } finally {
      // Cleanup
      console.log('🧹 Starting cleanup...');
      await isolationManager.cleanup();
      console.log('✅ Cleanup completed');
    }
  });

  test('should validate signing key lifecycle and version management', async ({ page, request }) => {
    console.log('🧪 Testing signing key lifecycle and version management...');
    
    const isolationManager = new EnhancedTestIsolation('key-lifecycle-validation', request);
    const partialContext = await isolationManager.setup({
      testName: 'key-lifecycle-validation',
      enableWorkerDelay: true
    });

    // Complete setup with page and request context
    const isolatedContext = await isolationManager.completeSetup(partialContext, page, request);

    try {
      // Create unique test user
      const testUser = await isolationManager.createIsolatedUser(isolatedContext);
      console.log(`🔒 [Worker ${isolatedContext.workerConfig.workerId}] Created test user: ${testUser.email}`);

      // Navigate to app and register user
      await page.goto('http://localhost:5173');
      
      // Wait for app to load
      await page.waitForSelector('[data-testid="main-menu"], [data-testid="user-profile"], ion-tab-bar, ion-content, [data-testid="auth-page"]', { 
        timeout: 30000 
      });

      // Register test user (simplified registration)
      const authPage = page.locator('[data-testid="auth-page"]');
      if (await authPage.isVisible()) {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="register-button"]');
        
        await page.waitForSelector('[data-testid="main-menu"], [data-testid="user-profile"], ion-tab-bar', { 
          timeout: 60000 
        });
      }

      // Navigate to collection to initialize
      await page.click('ion-tab-button[tab="collection"]');
      await page.waitForSelector('[data-testid="collection-view"]', { timeout: 10000 });
      
      // Wait for initialization
      await page.waitForTimeout(3000);

      // Check signing key version progression
      console.log('🔍 Checking signing key version management...');
      
      const keyVersionInfo = await page.evaluate(() => {
        const store = (window as any).useHybridGameStore?.getState?.();
        return {
          currentKeyVersion: store?.signingKeyVersion,
          deviceId: store?.deviceId,
          userId: store?.user?.uid,
          hasSigningKey: !!store?.signingKey
        };
      });
      
      console.log('🔑 Key version info:', keyVersionInfo);

      // Validate key version is properly set
      expect(keyVersionInfo.currentKeyVersion).toBeGreaterThan(0);
      expect(keyVersionInfo.deviceId).toBeTruthy();
      expect(keyVersionInfo.userId).toBeTruthy();
      
      console.log('✅ Signing key lifecycle validation completed');

    } finally {
      await isolationManager.cleanup();
    }
  });
});
