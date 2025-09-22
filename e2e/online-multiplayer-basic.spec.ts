import { test, expect } from '@playwright/test';
import {
  fillIonInput,
  clickIonButton,
  waitForModal,
  waitForAuthState,
  switchAuthMode
} from './utils/test-helpers';

test.describe('Online Multiplayer Basic Tests', () => {
  test('should navigate to online multiplayer page when authenticated', async ({ page }) => {
    const testId = Date.now();
    const email = `player-${testId}@biomasters-test.com`;
    const username = 'Test Player';
    
    console.log(`🎮 Testing basic online multiplayer navigation for: ${email}`);
    
    // Step 1: Register and login
    console.log('📝 Step 1: Registering and logging in...');

    // Navigate to app and wait for it to load
    await page.goto('/');
    await page.waitForSelector('ion-app', { timeout: 10000 });

    // Open auth modal
    await clickIonButton(page, 'signin-button');
    await waitForModal(page, 'auth-modal');

    // Switch to registration mode
    await switchAuthMode(page, 'register');

    // Fill registration form
    await fillIonInput(page, 'email-input', email);
    await fillIonInput(page, 'password-input', 'TestPassword123!');
    await fillIonInput(page, 'display-name-input', username);

    // Submit registration
    await clickIonButton(page, 'register-button');

    // Wait for registration to complete
    await page.waitForSelector('[data-testid="auth-modal"]', { state: 'hidden', timeout: 15000 });
    await waitForAuthState(page, 'authenticated');
    
    // Step 2: Navigate to online multiplayer
    console.log('🌐 Step 2: Navigating to online multiplayer...');
    await clickIonButton(page, 'online-multiplayer-button');
    await page.waitForURL('**/online', { timeout: 10000 });
    
    // Step 3: Verify page loads
    console.log('✅ Step 3: Verifying page content...');
    
    // Check that we're on the right page
    expect(page.url()).toContain('/online');
    
    // Check that the page title is correct
    await expect(page.locator('ion-title:has-text("Online Multiplayer")')).toBeVisible();
    
    // Check that we're not seeing the unauthenticated version
    await expect(page.locator('text=Sign In Required')).not.toBeVisible();
    
    // Check that online multiplayer page content is present (be more specific)
    await expect(page.locator('[data-testid="online-multiplayer-page"]')).toBeVisible();
    
    console.log('✅ Basic online multiplayer page navigation test completed successfully!');
  });
  
  test('should show sign in required when not authenticated', async ({ page }) => {
    console.log('🔒 Testing unauthenticated access to online multiplayer...');
    
    // Navigate directly to online multiplayer without authentication
    await page.goto('/online');
    
    // Should show sign in required message
    await expect(page.locator('text=Sign In Required')).toBeVisible();
    await expect(page.locator('text=Please sign in to access online multiplayer features')).toBeVisible();
    
    // Should have sign in button
    await expect(page.locator('ion-button[routerLink="/auth"]')).toBeVisible();
    
    console.log('✅ Unauthenticated access test completed successfully!');
  });
});
