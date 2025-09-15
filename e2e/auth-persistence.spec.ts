/**
 * Playwright E2E Tests: Authentication Persistence
 * Tests authentication state persistence across page refreshes for both Firebase and guest users
 * 
 * This test file addresses the critical gap in our test coverage where authentication
 * persistence was not being tested, leading to undetected bugs in production.
 */

import { test, expect, Page } from '@playwright/test';
import {
  fillIonInput,
  clickIonButton,
  waitForModal,
  waitForAppInitialization,
  waitForAuthState,
  switchAuthMode
} from './utils/test-helpers';

// Helper function to create unique test users
function createUniqueTestUser(prefix: string) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return {
    email: `e2e-test-${prefix}-${timestamp}-${randomSuffix}@example.com`,
    password: 'TestPassword123!',
    displayName: `Test User ${randomSuffix.toUpperCase()}`
  };
}

// Helper function to register a test user
async function registerTestUser(page: Page, testUser: { email: string; password: string; displayName: string }) {
  console.log('🔐 Registering test user:', testUser.email);

  await clickIonButton(page, 'signin-button');
  await waitForModal(page, 'auth-modal');
  await switchAuthMode(page, 'register');

  await fillIonInput(page, 'email-input', testUser.email);
  await fillIonInput(page, 'password-input', testUser.password);
  await fillIonInput(page, 'display-name-input', testUser.displayName);

  await clickIonButton(page, 'register-button');
  await waitForModal(page, 'auth-modal', { state: 'hidden', timeout: 30000 });

  console.log('✅ User registration completed');
}

test.describe('🔐 Authentication Persistence E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await waitForAppInitialization(page);
  });

  test.describe('🔥 Firebase User Persistence', () => {
    test('should persist Firebase authentication across page refresh', async () => {
      const testUser = createUniqueTestUser('auth-persistence-firebase');
      
      console.log('🧪 Testing Firebase authentication persistence...');
      
      // Step 1: Register a new Firebase user
      console.log('📝 Registering Firebase user...');
      await registerTestUser(page, testUser);
      await waitForAuthState(page, 'authenticated');
      
      // Verify initial authentication state
      const initialAuthState = await page.evaluate(() => {
        const storeState = window.useHybridGameStore?.getState();
        return {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          userId: storeState?.userId,
          hasUserProfile: !!storeState?.userProfile,
          userType: storeState?.userProfile?.user_type
        };
      });
      
      console.log('📊 Initial auth state:', initialAuthState);
      expect(initialAuthState.isAuthenticated).toBe(true);
      expect(initialAuthState.isGuestMode).toBe(false);
      expect(initialAuthState.userId).toBeTruthy();
      expect(initialAuthState.hasUserProfile).toBe(true);
      
      // Step 2: Refresh page and verify persistence
      console.log('🔄 Refreshing page to test Firebase auth persistence...');
      await page.reload();
      await waitForAppInitialization(page);
      
      // Wait for authentication recovery
      console.log('⏳ Waiting for Firebase authentication recovery...');
      await page.waitForFunction(() => {
        const storeState = window.useHybridGameStore?.getState();
        console.log('🔍 Firebase auth recovery check:', {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          userId: storeState?.userId,
          hasUserProfile: !!storeState?.userProfile,
          firebaseUser: !!storeState?.firebaseUser
        });
        return storeState?.isAuthenticated === true && 
               storeState?.isGuestMode === false &&
               !!storeState?.userId &&
               !!storeState?.userProfile &&
               !!storeState?.firebaseUser;
      }, { timeout: 30000 });
      
      // Verify authentication state persisted
      await waitForAuthState(page, 'authenticated');
      
      const persistedAuthState = await page.evaluate(() => {
        const storeState = window.useHybridGameStore?.getState();
        return {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          userId: storeState?.userId,
          hasUserProfile: !!storeState?.userProfile,
          userType: storeState?.userProfile?.user_type,
          hasFirebaseUser: !!storeState?.firebaseUser
        };
      });
      
      console.log('📊 Persisted auth state:', persistedAuthState);
      expect(persistedAuthState.isAuthenticated).toBe(true);
      expect(persistedAuthState.isGuestMode).toBe(false);
      expect(persistedAuthState.userId).toBe(initialAuthState.userId);
      expect(persistedAuthState.hasUserProfile).toBe(true);
      expect(persistedAuthState.hasFirebaseUser).toBe(true);
      
      // Verify UI elements are correct
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="signout-button"]')).toBeVisible();
      
      console.log('✅ Firebase authentication persistence test passed!');
    });
  });

  test.describe('👻 Guest User Persistence', () => {
    test('should persist guest authentication across page refresh', async () => {
      console.log('🧪 Testing guest authentication persistence...');
      
      // Step 1: Sign in as guest
      console.log('👻 Signing in as guest...');
      await clickIonButton(page, 'signin-button');
      await waitForModal(page, 'auth-modal');
      await clickIonButton(page, 'guest-login-button');
      await waitForAuthState(page, 'authenticated');
      
      // Verify initial guest authentication state
      const initialGuestState = await page.evaluate(() => {
        const storeState = window.useHybridGameStore?.getState();
        return {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          guestId: storeState?.guestId,
          hasUserProfile: !!storeState?.userProfile,
          userType: storeState?.userProfile?.user_type
        };
      });
      
      console.log('📊 Initial guest state:', initialGuestState);
      expect(initialGuestState.isAuthenticated).toBe(true);
      expect(initialGuestState.isGuestMode).toBe(true);
      expect(initialGuestState.guestId).toBeTruthy();
      expect(initialGuestState.hasUserProfile).toBe(true);
      
      // Step 2: Refresh page and verify persistence
      console.log('🔄 Refreshing page to test guest auth persistence...');
      await page.reload();
      await waitForAppInitialization(page);
      
      // Wait for guest authentication recovery
      console.log('⏳ Waiting for guest authentication recovery...');
      await page.waitForFunction(() => {
        const storeState = window.useHybridGameStore?.getState();
        console.log('🔍 Guest auth recovery check:', {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          guestId: storeState?.guestId,
          hasUserProfile: !!storeState?.userProfile
        });
        return storeState?.isAuthenticated === true && 
               storeState?.isGuestMode === true &&
               !!storeState?.guestId &&
               !!storeState?.userProfile;
      }, { timeout: 30000 });
      
      // Verify authentication state persisted
      await waitForAuthState(page, 'authenticated');
      
      const persistedGuestState = await page.evaluate(() => {
        const storeState = window.useHybridGameStore?.getState();
        return {
          isAuthenticated: storeState?.isAuthenticated,
          isGuestMode: storeState?.isGuestMode,
          guestId: storeState?.guestId,
          hasUserProfile: !!storeState?.userProfile,
          userType: storeState?.userProfile?.user_type
        };
      });
      
      console.log('📊 Persisted guest state:', persistedGuestState);
      expect(persistedGuestState.isAuthenticated).toBe(true);
      expect(persistedGuestState.isGuestMode).toBe(true);
      expect(persistedGuestState.guestId).toBe(initialGuestState.guestId);
      expect(persistedGuestState.hasUserProfile).toBe(true);
      
      // Verify UI elements are correct
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="signout-button"]')).toBeVisible();
      
      console.log('✅ Guest authentication persistence test passed!');
    });
  });

  test.describe('🔄 Authentication Recovery Edge Cases', () => {
    test('should handle authentication recovery timeout gracefully', async () => {
      console.log('🧪 Testing authentication recovery timeout handling...');
      
      // This test verifies that the app doesn't hang if auth recovery fails
      await page.reload();
      await waitForAppInitialization(page);
      
      // Wait for either authentication or timeout
      const authRecoveryResult = await Promise.race([
        page.waitForFunction(() => {
          const storeState = window.useHybridGameStore?.getState();
          return storeState?.isAuthenticated === true;
        }, { timeout: 5000 }).then(() => 'authenticated').catch(() => 'timeout'),
        
        page.waitForSelector('[data-testid="signin-button"]', { timeout: 10000 })
          .then(() => 'unauthenticated').catch(() => 'timeout')
      ]);
      
      console.log('📊 Auth recovery result:', authRecoveryResult);
      
      // App should either be authenticated or show sign-in button (not hang)
      expect(['authenticated', 'unauthenticated']).toContain(authRecoveryResult);
      
      console.log('✅ Authentication recovery timeout handling test passed!');
    });
  });
});
