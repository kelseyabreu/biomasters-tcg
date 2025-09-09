/**
 * Playwright E2E Tests: User Types Standardization
 * Tests the complete user experience across web and mobile platforms
 * 
 * Coverage:
 * - User registration and authentication flows
 * - Profile management with display_name
 * - Guest-to-registered conversion
 * - Cross-platform compatibility (web/mobile)
 * - Offline/online mode transitions
 * - Error handling and edge cases
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('🔄 User Types Standardization - Frontend E2E', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Navigate to the app
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('ion-app', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('🚀 Basic App Structure', () => {
    test('should load app and show main elements', async () => {
      // Check that the app loads and shows the main title
      await expect(page.locator('ion-title')).toContainText('🧬 Biomasters TCG');

      // Check that main content loads
      await expect(page.locator('ion-content')).toBeVisible();

      // Check that all navigation tabs are present and visible
      const tabButtons = page.locator('ion-tab-button');
      await expect(tabButtons).toHaveCount(4);

      // Verify specific tabs exist
      await expect(page.locator('ion-tab-button[tab="home"]')).toBeVisible();
      await expect(page.locator('ion-tab-button[tab="collection"]')).toBeVisible();
      await expect(page.locator('ion-tab-button[tab="deck-builder"]')).toBeVisible();
      await expect(page.locator('ion-tab-button[tab="settings"]')).toBeVisible();

      // Verify tab labels
      await expect(page.locator('ion-tab-button[tab="home"] ion-label')).toContainText('Home');
      await expect(page.locator('ion-tab-button[tab="collection"] ion-label')).toContainText('Collection');
      await expect(page.locator('ion-tab-button[tab="deck-builder"] ion-label')).toContainText('Deck Builder');
      await expect(page.locator('ion-tab-button[tab="settings"] ion-label')).toContainText('Settings');
    });

    test('should navigate between tabs correctly', async () => {
      // Test navigation to Collection tab
      await page.click('ion-tab-button[tab="collection"]');
      await page.waitForURL('**/collection');
      await expect(page.locator('ion-tab-button[tab="collection"]')).toHaveClass(/tab-selected/);

      // Test navigation to Deck Builder tab
      await page.click('ion-tab-button[tab="deck-builder"]');
      await page.waitForURL('**/deck-builder');
      await expect(page.locator('ion-tab-button[tab="deck-builder"]')).toHaveClass(/tab-selected/);

      // Test navigation to Settings tab
      await page.click('ion-tab-button[tab="settings"]');
      await page.waitForURL('**/settings');
      await expect(page.locator('ion-tab-button[tab="settings"]')).toHaveClass(/tab-selected/);

      // Return to Home tab
      await page.click('ion-tab-button[tab="home"]');
      await page.waitForURL('**/home');
      await expect(page.locator('ion-tab-button[tab="home"]')).toHaveClass(/tab-selected/);
    });
  });

  test.describe('🔐 Authentication Flows', () => {
    test('should handle guest user creation and display', async () => {
      // Click "Continue as Guest" button
      await page.click('[data-testid="guest-login-button"]');
      
      // Wait for guest user to be created
      await page.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });
      
      // Verify guest user display
      const userProfile = page.locator('[data-testid="user-profile"]');
      await expect(userProfile).toBeVisible();
      
      // Check that guest username is displayed (Guest-XXXXXX format)
      const username = await userProfile.locator('[data-testid="username"]').textContent();
      expect(username).toMatch(/^Guest-[A-Z0-9]{6}$/);
      
      // Verify guest badge is shown
      await expect(page.locator('[data-testid="account-type-badge"]')).toContainText('Guest');
    });

    test('should handle Firebase user registration', async () => {
      // Click "Sign In" button
      await page.click('[data-testid="signin-button"]');
      
      // Wait for auth modal
      await page.waitForSelector('[data-testid="auth-modal"]');
      
      // Fill in registration form (mock Firebase auth)
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.fill('[data-testid="display-name-input"]', 'Test User Display');
      
      // Submit registration
      await page.click('[data-testid="register-button"]');
      
      // Wait for successful registration
      await page.waitForSelector('[data-testid="user-profile"]', { timeout: 10000 });
      
      // Verify registered user display
      const userProfile = page.locator('[data-testid="user-profile"]');
      const displayName = await userProfile.locator('[data-testid="display-name"]').textContent();
      expect(displayName).toBe('Test User Display');
      
      // Verify registered badge is shown
      await expect(page.locator('[data-testid="account-type-badge"]')).toContainText('Registered');
    });

    test('should handle guest-to-registered conversion', async () => {
      // Start as guest
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      // Click "Create Account" CTA
      await page.click('[data-testid="guest-registration-cta"]');
      
      // Fill conversion form
      await page.fill('[data-testid="email-input"]', 'converted@example.com');
      await page.fill('[data-testid="password-input"]', 'convertedpassword123');
      await page.fill('[data-testid="display-name-input"]', 'Converted User');
      
      // Submit conversion
      await page.click('[data-testid="convert-account-button"]');
      
      // Wait for conversion success
      await page.waitForSelector('[data-testid="conversion-success"]');
      
      // Verify user is now registered
      await expect(page.locator('[data-testid="account-type-badge"]')).toContainText('Registered');
      
      // Verify display name is preserved
      const displayName = await page.locator('[data-testid="display-name"]').textContent();
      expect(displayName).toBe('Converted User');
    });
  });

  test.describe('👤 Profile Management', () => {
    test.beforeEach(async () => {
      // Set up a registered user for profile tests
      await page.click('[data-testid="signin-button"]');
      await page.waitForSelector('[data-testid="auth-modal"]');
      await page.fill('[data-testid="email-input"]', 'profile@example.com');
      await page.fill('[data-testid="password-input"]', 'profilepassword123');
      await page.fill('[data-testid="display-name-input"]', 'Profile Test User');
      await page.click('[data-testid="register-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
    });

    test('should update display name in profile', async () => {
      // Navigate to profile page
      await page.click('[data-testid="profile-tab"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      // Update display name
      await page.fill('[data-testid="display-name-input"]', 'Updated Display Name');
      
      // Save changes
      await page.click('[data-testid="save-profile-button"]');
      
      // Wait for success message
      await page.waitForSelector('[data-testid="profile-update-success"]');
      
      // Verify display name is updated in UI
      await page.click('[data-testid="main-menu-tab"]');
      const displayName = await page.locator('[data-testid="display-name"]').textContent();
      expect(displayName).toBe('Updated Display Name');
    });

    test('should handle profile validation errors', async () => {
      // Navigate to profile page
      await page.click('[data-testid="profile-tab"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      // Try to set display name too long
      await page.fill('[data-testid="display-name-input"]', 'A'.repeat(100));
      
      // Save changes
      await page.click('[data-testid="save-profile-button"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="profile-error"]')).toContainText('Display name must be');
    });

    test('should show both username and display name correctly', async () => {
      // Navigate to profile page
      await page.click('[data-testid="profile-tab"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      // Verify username field is read-only or not editable
      const usernameInput = page.locator('[data-testid="username-input"]');
      await expect(usernameInput).toBeDisabled();
      
      // Verify display name field is editable
      const displayNameInput = page.locator('[data-testid="display-name-input"]');
      await expect(displayNameInput).toBeEnabled();
      
      // Verify both are displayed in user profile
      await page.click('[data-testid="main-menu-tab"]');
      await expect(page.locator('[data-testid="username"]')).toBeVisible();
      await expect(page.locator('[data-testid="display-name"]')).toBeVisible();
    });
  });

  test.describe('📱 Cross-Platform Compatibility', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test guest login on mobile
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      // Verify mobile-responsive user profile
      const userProfile = page.locator('[data-testid="user-profile"]');
      await expect(userProfile).toBeVisible();
      
      // Test navigation on mobile
      await page.click('[data-testid="profile-tab"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      // Verify profile form is usable on mobile
      await expect(page.locator('[data-testid="display-name-input"]')).toBeVisible();
    });

    test('should handle offline mode gracefully', async () => {
      // Set up user first
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      // Simulate offline mode
      await context.setOffline(true);
      
      // Try to update profile (should show offline message)
      await page.click('[data-testid="profile-tab"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      await page.fill('[data-testid="display-name-input"]', 'Offline Update');
      await page.click('[data-testid="save-profile-button"]');
      
      // Should show offline indicator or pending sync status
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('Offline');
      
      // Go back online
      await context.setOffline(false);
      
      // Should sync changes
      await page.waitForSelector('[data-testid="sync-success"]', { timeout: 10000 });
    });
  });

  test.describe('❌ Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Start registration process
      await page.click('[data-testid="signin-button"]');
      await page.waitForSelector('[data-testid="auth-modal"]');
      
      // Fill form
      await page.fill('[data-testid="email-input"]', 'network@example.com');
      await page.fill('[data-testid="password-input"]', 'networkpassword123');
      
      // Simulate network failure
      await page.route('**/api/auth/**', route => route.abort());
      
      // Try to register
      await page.click('[data-testid="register-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="auth-error"]')).toContainText('Network error');
    });

    test('should handle invalid user data', async () => {
      // Try to register with invalid email
      await page.click('[data-testid="signin-button"]');
      await page.waitForSelector('[data-testid="auth-modal"]');
      
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="register-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');
    });
  });

  test.describe('🎯 Performance & UX', () => {
    test('should load user profile quickly', async () => {
      const startTime = Date.now();
      
      // Create guest user
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should maintain user state across navigation', async () => {
      // Create guest user
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      const originalUsername = await page.locator('[data-testid="username"]').textContent();
      
      // Navigate to different pages
      await page.click('[data-testid="collection-tab"]');
      await page.waitForSelector('[data-testid="collection-page"]');
      
      await page.click('[data-testid="battle-tab"]');
      await page.waitForSelector('[data-testid="battle-page"]');
      
      // Return to main menu
      await page.click('[data-testid="main-menu-tab"]');
      
      // Verify user state is preserved
      const currentUsername = await page.locator('[data-testid="username"]').textContent();
      expect(currentUsername).toBe(originalUsername);
    });

    test('should handle rapid user interactions', async () => {
      // Create guest user
      await page.click('[data-testid="guest-login-button"]');
      await page.waitForSelector('[data-testid="user-profile"]');
      
      // Rapidly navigate between tabs
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="profile-tab"]');
        await page.click('[data-testid="collection-tab"]');
        await page.click('[data-testid="main-menu-tab"]');
      }
      
      // Should still show user profile correctly
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="username"]')).toContainText('Guest-');
    });
  });
});
