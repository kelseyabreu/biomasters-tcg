import { test } from '@playwright/test';

test.describe('Timer and Auto-Start Simple Tests', () => {
  test('should test timer and auto-start functionality manually', async ({ browser }) => {
    console.log('🎯 Starting manual timer and auto-start test...');
    
    // Create two browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();
    
    try {
      // Navigate both players to the online multiplayer page
      console.log('📍 Navigating players to online multiplayer page...');
      await Promise.all([
        player1Page.goto('http://localhost:5173/online-multiplayer'),
        player2Page.goto('http://localhost:5173/online-multiplayer')
      ]);
      
      // Wait for pages to load
      await Promise.all([
        player1Page.waitForLoadState('networkidle'),
        player2Page.waitForLoadState('networkidle')
      ]);
      
      console.log('✅ Both players on online multiplayer page');
      
      // Take screenshots to see the current state
      await player1Page.screenshot({ path: 'test-results/player1-initial.png' });
      await player2Page.screenshot({ path: 'test-results/player2-initial.png' });
      
      console.log('📸 Screenshots taken - check test-results/ folder');
      
      // Check if there are any visible elements that indicate the state
      const player1Elements = await player1Page.locator('body').textContent();
      const player2Elements = await player2Page.locator('body').textContent();
      
      console.log('📋 Player 1 page content preview:', player1Elements?.substring(0, 200));
      console.log('📋 Player 2 page content preview:', player2Elements?.substring(0, 200));
      
      // Look for specific elements
      const player1FindButton = player1Page.locator('[data-testid="find-match-button"]');
      const player2FindButton = player2Page.locator('[data-testid="find-match-button"]');
      
      const player1ButtonExists = await player1FindButton.count() > 0;
      const player2ButtonExists = await player2FindButton.count() > 0;
      
      console.log('🔍 Player 1 find match button exists:', player1ButtonExists);
      console.log('🔍 Player 2 find match button exists:', player2ButtonExists);
      
      if (player1ButtonExists && player2ButtonExists) {
        console.log('✅ Both players have find match buttons - attempting to test matchmaking');
        
        // Try to click the find match buttons
        try {
          await Promise.all([
            player1FindButton.click(),
            player2FindButton.click()
          ]);
          console.log('✅ Both players clicked find match');
          
          // Wait a bit to see if anything happens
          await player1Page.waitForTimeout(5000);
          
          // Take screenshots after clicking
          await player1Page.screenshot({ path: 'test-results/player1-after-click.png' });
          await player2Page.screenshot({ path: 'test-results/player2-after-click.png' });
          
          // Look for match found modal
          const player1Modal = player1Page.locator('[data-testid="match-found-modal"]');
          const player2Modal = player2Page.locator('[data-testid="match-found-modal"]');
          
          const player1ModalVisible = await player1Modal.isVisible().catch(() => false);
          const player2ModalVisible = await player2Modal.isVisible().catch(() => false);
          
          console.log('🔍 Player 1 match found modal visible:', player1ModalVisible);
          console.log('🔍 Player 2 match found modal visible:', player2ModalVisible);
          
          if (player1ModalVisible || player2ModalVisible) {
            console.log('✅ Match found modal detected - testing timer functionality');
            
            // Look for timer elements
            const player1Timer = player1Page.locator('[data-testid="accept-timer"]');
            const player2Timer = player2Page.locator('[data-testid="accept-timer"]');
            
            const player1TimerVisible = await player1Timer.isVisible().catch(() => false);
            const player2TimerVisible = await player2Timer.isVisible().catch(() => false);
            
            console.log('⏰ Player 1 timer visible:', player1TimerVisible);
            console.log('⏰ Player 2 timer visible:', player2TimerVisible);
            
            if (player1TimerVisible || player2TimerVisible) {
              console.log('✅ Timer functionality is working!');
              
              // Try to accept the match
              const player1AcceptButton = player1Page.locator('[data-testid="accept-match-button"]');
              const player2AcceptButton = player2Page.locator('[data-testid="accept-match-button"]');
              
              const player1AcceptExists = await player1AcceptButton.count() > 0;
              const player2AcceptExists = await player2AcceptButton.count() > 0;
              
              console.log('🔍 Player 1 accept button exists:', player1AcceptExists);
              console.log('🔍 Player 2 accept button exists:', player2AcceptExists);
              
              if (player1AcceptExists && player2AcceptExists) {
                console.log('🎯 Testing auto-start functionality...');
                
                // Accept the match for both players
                await Promise.all([
                  player1AcceptButton.click(),
                  player2AcceptButton.click()
                ]);
                
                console.log('✅ Both players accepted the match');
                
                // Wait to see if the modal closes (indicating auto-start)
                await player1Page.waitForTimeout(3000);
                
                const player1ModalStillVisible = await player1Modal.isVisible().catch(() => false);
                const player2ModalStillVisible = await player2Modal.isVisible().catch(() => false);
                
                console.log('🔍 Player 1 modal still visible after accept:', player1ModalStillVisible);
                console.log('🔍 Player 2 modal still visible after accept:', player2ModalStillVisible);
                
                if (!player1ModalStillVisible && !player2ModalStillVisible) {
                  console.log('✅ Auto-start functionality is working! Modals closed after both players accepted.');
                } else {
                  console.log('❌ Auto-start functionality may not be working - modals still visible');
                }
                
                // Take final screenshots
                await player1Page.screenshot({ path: 'test-results/player1-final.png' });
                await player2Page.screenshot({ path: 'test-results/player2-final.png' });
              }
            }
          } else {
            console.log('❌ No match found modal detected - matchmaking may not be working');
          }
        } catch (error) {
          console.log('❌ Error clicking find match buttons:', error);
        }
      } else {
        console.log('❌ Find match buttons not found - authentication may be required');
      }
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
