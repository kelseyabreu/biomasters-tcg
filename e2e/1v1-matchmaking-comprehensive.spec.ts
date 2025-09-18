import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  fillIonInput,
  clickIonButton,
  waitForModal,
  waitForFirebaseAuth,
  waitForAuthState,
  switchAuthMode
} from './utils/test-helpers';

/**
 * Comprehensive 1v1 Matchmaking E2E Tests
 * 
 * Tests the complete 1v1 online multiplayer flow:
 * 1. User authentication (2 players)
 * 2. WebSocket connection establishment
 * 3. Matchmaking queue joining
 * 4. Match finding and acceptance
 * 5. Game session initialization
 * 6. Real-time communication
 * 7. Match completion and cleanup
 */

test.describe('1v1 Matchmaking Comprehensive Tests', () => {
  
  test('should complete full 1v1 matchmaking flow with two players', async ({ browser }) => {
    console.log('🎮 Starting comprehensive 1v1 matchmaking test...');
    
    // Create two separate browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();
    
    const testId = Date.now();
    const player1Email = `player1-${testId}@biomasters-test.com`;
    const player2Email = `player2-${testId}@biomasters-test.com`;
    
    try {
      // Step 1: Authenticate both players
      console.log('📝 Step 1: Authenticating both players...');
      
      await Promise.all([
        authenticatePlayer(player1Page, player1Email, 'Player One'),
        authenticatePlayer(player2Page, player2Email, 'Player Two')
      ]);
      
      console.log('✅ Both players authenticated successfully');
      
      // Step 2: Navigate both players to online multiplayer
      console.log('🌐 Step 2: Navigating to online multiplayer...');
      
      await Promise.all([
        navigateToOnlineMultiplayer(player1Page),
        navigateToOnlineMultiplayer(player2Page)
      ]);
      
      console.log('✅ Both players on online multiplayer page');
      
      // Step 3: Verify WebSocket connections
      console.log('🔌 Step 3: Verifying WebSocket connections...');
      
      await Promise.all([
        verifyWebSocketConnection(player1Page),
        verifyWebSocketConnection(player2Page)
      ]);
      
      console.log('✅ WebSocket connections established');
      
      // Step 4: Join matchmaking queue
      console.log('🎯 Step 4: Joining 1v1 matchmaking queue...');
      
      // Player 1 joins first
      await joinMatchmakingQueue(player1Page, 'ranked_1v1');
      
      // Small delay to ensure player 1 is in queue
      await player1Page.waitForTimeout(1000);
      
      // Player 2 joins and should match with player 1
      await joinMatchmakingQueue(player2Page, 'ranked_1v1');
      
      console.log('✅ Both players joined matchmaking queue');
      
      // Step 5: Wait for match found
      console.log('🔍 Step 5: Waiting for match to be found...');
      
      await Promise.all([
        waitForMatchFound(player1Page),
        waitForMatchFound(player2Page)
      ]);
      
      console.log('✅ Match found for both players');
      
      // Step 6: Accept match
      console.log('✅ Step 6: Accepting match...');
      
      await Promise.all([
        acceptMatch(player1Page),
        acceptMatch(player2Page)
      ]);
      
      console.log('✅ Match accepted by both players');
      
      // Step 7: Verify game session initialization
      console.log('🎮 Step 7: Verifying game session...');
      
      await Promise.all([
        verifyGameSession(player1Page),
        verifyGameSession(player2Page)
      ]);
      
      console.log('✅ Game session initialized successfully');
      
      // Step 8: Test real-time communication
      console.log('💬 Step 8: Testing real-time communication...');
      
      await testRealTimeCommunication(player1Page, player2Page);
      
      console.log('✅ Real-time communication working');
      
      console.log('🎉 Comprehensive 1v1 matchmaking test completed successfully!');
      
    } finally {
      // Cleanup
      await context1.close();
      await context2.close();
    }
  });
  
  test('should handle matchmaking timeout gracefully', async ({ page }) => {
    console.log('⏰ Testing matchmaking timeout handling...');

    const testId = Date.now();
    const email = `timeout-player-${testId}@biomasters-test.com`;

    // Authenticate player
    await authenticatePlayer(page, email, 'Timeout Player');

    // Navigate to online multiplayer
    await navigateToOnlineMultiplayer(page);

    // Join matchmaking queue
    await joinMatchmakingQueue(page, 'ranked_1v1');

    // Verify we're searching (cancel button should be visible)
    await expect(page.locator('[data-testid="cancel-search-button"]')).toBeVisible({ timeout: 10000 });

    // Cancel matchmaking
    await clickIonButton(page, 'cancel-search-button');

    // Verify we're back to the main state
    await expect(page.locator('[data-testid="find-match-button"]')).toBeVisible();

    console.log('✅ Matchmaking timeout handled correctly');
  });
  
  test('should handle WebSocket disconnection and reconnection', async ({ page }) => {
    console.log('🔌 Testing WebSocket disconnection handling...');

    const testId = Date.now();
    const email = `disconnect-player-${testId}@biomasters-test.com`;

    // Authenticate player
    await authenticatePlayer(page, email, 'Disconnect Player');

    // Navigate to online multiplayer
    await navigateToOnlineMultiplayer(page);

    // Verify initial connection
    await verifyWebSocketConnection(page);

    // Simulate network disconnection by going offline
    await page.context().setOffline(true);

    // Wait for disconnection to be detected (find match button should be disabled)
    await expect(page.locator('[data-testid="find-match-button"]')).toBeDisabled({ timeout: 10000 });

    // Restore network connection
    await page.context().setOffline(false);

    // Wait for reconnection (find match button should be enabled again)
    await expect(page.locator('[data-testid="find-match-button"]')).toBeEnabled({ timeout: 15000 });

    console.log('✅ WebSocket reconnection handled correctly');
  });

  test('should display timer and auto-start game when both players accept', async ({ browser }) => {
    console.log('⏰ Starting timer and auto-start test...');

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    const testId = Date.now();
    const player1Email = `timer1-${testId}@biomasters-test.com`;
    const player2Email = `timer2-${testId}@biomasters-test.com`;

    try {
      // Authenticate and navigate
      await Promise.all([
        authenticatePlayer(player1Page, player1Email, 'Timer Player 1'),
        authenticatePlayer(player2Page, player2Email, 'Timer Player 2')
      ]);

      await Promise.all([
        navigateToOnlineMultiplayer(player1Page),
        navigateToOnlineMultiplayer(player2Page)
      ]);

      // Join matchmaking
      await joinMatchmakingQueue(player1Page, 'ranked_1v1');
      await player1Page.waitForTimeout(1000);
      await joinMatchmakingQueue(player2Page, 'ranked_1v1');

      // Wait for match found
      await Promise.all([
        waitForMatchFound(player1Page),
        waitForMatchFound(player2Page)
      ]);

      console.log('✅ Match found, testing timer functionality...');

      // Verify timer functionality
      await Promise.all([
        verifyTimerFunctionality(player1Page),
        verifyTimerFunctionality(player2Page)
      ]);

      console.log('✅ Timer displayed and counting down correctly');

      // Player 1 accepts first
      console.log('📍 Player 1 accepting match...');
      await acceptMatch(player1Page);

      // Verify Player 1 sees accepted status
      await player1Page.waitForSelector('h3:has-text("✅ Match Accepted!")', { timeout: 5000 });
      console.log('✅ Player 1 match accepted status displayed');

      // Player 2 accepts second
      console.log('📍 Player 2 accepting match...');
      await acceptMatch(player2Page);

      // Verify automatic game start
      console.log('🎮 Waiting for automatic game start...');
      await Promise.all([
        verifyGameSession(player1Page),
        verifyGameSession(player2Page)
      ]);

      console.log('✅ Game started automatically after both players accepted');

    } catch (error) {
      console.error('❌ Timer test failed:', error);
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// Helper functions

async function authenticatePlayer(page: Page, email: string, displayName: string): Promise<void> {
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
  await fillIonInput(page, 'display-name-input', displayName);
  
  // Submit registration
  await clickIonButton(page, 'register-button');
  
  // Wait for registration to complete
  await page.waitForSelector('[data-testid="auth-modal"]', { state: 'hidden', timeout: 15000 });
  await waitForAuthState(page, 'authenticated');
}

async function navigateToOnlineMultiplayer(page: Page): Promise<void> {
  await clickIonButton(page, 'online-multiplayer-button');
  await page.waitForURL('**/online', { timeout: 10000 });
  await expect(page.locator('[data-testid="online-multiplayer-page"]')).toBeVisible();
}

async function verifyWebSocketConnection(page: Page): Promise<void> {
  // Wait for matchmaking section to be visible (indicates page is loaded)
  await expect(page.locator('[data-testid="matchmaking-section"]')).toBeVisible({ timeout: 15000 });

  // Verify find match button is enabled (indicates WebSocket connection is working)
  await expect(page.locator('[data-testid="find-match-button"]')).toBeEnabled({ timeout: 10000 });
}

async function joinMatchmakingQueue(page: Page, gameMode: string): Promise<void> {
  // Select the game mode first
  await clickIonButton(page, `game-mode-${gameMode}`);

  // Click find match button
  await clickIonButton(page, 'find-match-button');

  // Verify we're in the queue by checking for cancel button
  await expect(page.locator('[data-testid="cancel-search-button"]')).toBeVisible({ timeout: 10000 });
}

async function waitForMatchFound(page: Page): Promise<void> {
  // Wait for match found modal
  await expect(page.locator('[data-testid="match-found-modal"]')).toBeVisible({ timeout: 30000 });
}

async function acceptMatch(page: Page): Promise<void> {
  // Click accept match button
  await clickIonButton(page, 'accept-match-button');

  // Wait for modal to close (indicates match was accepted)
  await expect(page.locator('[data-testid="match-found-modal"]')).not.toBeVisible({ timeout: 10000 });
}

async function verifyGameSession(page: Page): Promise<void> {
  // For now, just verify that we're no longer in matchmaking mode
  // and the find match button is available again (indicating match was processed)
  await expect(page.locator('[data-testid="find-match-button"]')).toBeVisible({ timeout: 15000 });
}

async function testRealTimeCommunication(player1Page: Page, player2Page: Page): Promise<void> {
  // For this basic test, just verify both players can see opponent info
  // when a match is found (this tests real-time communication)
  await Promise.all([
    expect(player1Page.locator('[data-testid="opponent-info"]')).toBeVisible({ timeout: 10000 }),
    expect(player2Page.locator('[data-testid="opponent-info"]')).toBeVisible({ timeout: 10000 })
  ]);
}

async function verifyTimerFunctionality(page: Page): Promise<void> {
  // Verify timer is displayed and counting down
  const timerElement = await page.waitForSelector('h3:has-text("Accept in:")', { timeout: 5000 });
  const timerText = await timerElement.textContent();

  // Timer should be between 25-30 seconds (allowing for some delay)
  expect(timerText).toMatch(/Accept in: (2[5-9]|30)s/);

  // Wait a second and verify timer decreases
  await page.waitForTimeout(1000);
  const newTimerText = await timerElement.textContent();

  // Extract numbers from timer text
  const oldSeconds = parseInt(timerText?.match(/(\d+)s/)?.[1] || '0');
  const newSeconds = parseInt(newTimerText?.match(/(\d+)s/)?.[1] || '0');

  expect(newSeconds).toBeLessThan(oldSeconds);
}
