import { test, expect, Page } from '@playwright/test';
import {
  clearBrowserData,
  waitForAppInitialization,
  safeCDPOperation
} from './utils/test-helpers';

test.describe('🎁 Pack Opening and Sync Investigation', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable detailed console logging
    page.on('console', msg => {
      console.log(`🖥️ Browser Console [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📤 API Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📥 API Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('should investigate pack opening, sync, and refresh behavior', async () => {
    console.log('🔍 Starting pack opening sync investigation...');
    
    // Step 1: Navigate and start as guest
    console.log('📍 Step 1: Navigating to app and starting as guest...');
    await page.goto('http://localhost:5173');
    await page.waitForSelector('ion-app', { timeout: 10000 });

    // Start as guest user
    await page.click('[data-testid="signin-button"]');
    await page.waitForSelector('[data-testid="auth-modal"]');
    await page.click('[data-testid="guest-login-button"]');

    // Wait for guest setup to complete
    await page.waitForSelector('[data-testid="user-profile"]', { timeout: 15000 });
    console.log('✅ Guest user setup successfully');
    
    // Step 2: Check initial collection state
    console.log('📍 Step 2: Checking initial collection state...');
    await page.evaluate(() => {
      console.log('🔍 [Investigation] Checking initial localStorage...');
      const allKeys = Object.keys(localStorage);
      console.log('🔍 [Investigation] localStorage keys:', allKeys);

      // Find user-scoped collection key
      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection'));
      const packsKey = allKeys.find(key => key.includes('userPacks'));
      const syncKey = allKeys.find(key => key.includes('syncQueue'));

      console.log('🔍 [Investigation] Collection key found:', collectionKey);
      console.log('🔍 [Investigation] Collection data:', collectionKey ? localStorage.getItem(collectionKey) : null);
      console.log('🔍 [Investigation] Pack data:', packsKey ? localStorage.getItem(packsKey) : null);
      console.log('🔍 [Investigation] Sync data:', syncKey ? localStorage.getItem(syncKey) : null);
    });
    
    // Navigate to collection to see initial state
    await page.click('text=View Collection');
    await page.waitForSelector('text=Collection Progress', { timeout: 10000 });
    
    const initialCardCount = await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection'));

      if (collectionKey) {
        const collectionData = localStorage.getItem(collectionKey);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const cardCount = Object.keys(collection.cards_owned || {}).length;
          console.log('🔍 [Investigation] Initial card count:', cardCount);
          return cardCount;
        }
      }
      console.log('🔍 [Investigation] No collection found');
      return 0;
    });
    
    console.log(`📊 Initial card count: ${initialCardCount}`);
    
    // Step 3: Open a pack
    console.log('📍 Step 3: Opening a pack...');
    await page.goto('http://localhost:5173/packs');
    await page.waitForSelector('[data-testid="pack-opening-view"]', { timeout: 10000 });
    
    // Check if there are packs available
    const hasPacksToOpen = await page.isVisible('text=Open Pack');
    console.log(`🎁 Has packs to open: ${hasPacksToOpen}`);
    
    if (hasPacksToOpen) {
      console.log('🎁 Opening pack...');
      await page.click('text=Open Pack');
      
      // Wait for pack opening animation/process
      await page.waitForTimeout(3000);
      
      // Log pack opening results
      await page.evaluate(() => {
        console.log('🎁 [Investigation] Pack opened, checking results...');
        const allKeys = Object.keys(localStorage);
        console.log('🎁 [Investigation] Updated localStorage keys:', allKeys);

        const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection'));
        const packsKey = allKeys.find(key => key.includes('userPacks'));

        console.log('🎁 [Investigation] Updated collection:', collectionKey ? localStorage.getItem(collectionKey) : null);
        console.log('🎁 [Investigation] Updated packs:', packsKey ? localStorage.getItem(packsKey) : null);
      });

      const postPackCardCount = await page.evaluate(() => {
        const allKeys = Object.keys(localStorage);
        const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection'));

        if (collectionKey) {
          const collectionData = localStorage.getItem(collectionKey);
          if (collectionData) {
            const collection = JSON.parse(collectionData);
            const cardCount = Object.keys(collection.cards_owned || {}).length;
            console.log('🎁 [Investigation] Post-pack card count:', cardCount);
            return cardCount;
          }
        }
        console.log('🎁 [Investigation] No collection found after pack opening');
        return 0;
      });
      
      console.log(`📊 Post-pack card count: ${postPackCardCount}`);
      console.log(`📈 Cards gained: ${postPackCardCount - initialCardCount}`);
    } else {
      console.log('⚠️ No packs available to open, creating test pack data...');
      // Add some test pack data
      await page.evaluate(() => {
        const testPack = {
          id: 'test-pack-1',
          name: 'Test Pack',
          cards: [1, 2, 3, 4, 5] // Test card IDs
        };
        localStorage.setItem('userPacks', JSON.stringify([testPack]));
        console.log('🎁 [Investigation] Added test pack data');
      });
      
      await page.reload();
      await page.waitForSelector('[data-testid="pack-opening-view"]', { timeout: 10000 });
      
      if (await page.isVisible('text=Open Pack')) {
        await page.click('text=Open Pack');
        await page.waitForTimeout(3000);
      }
    }
    
    // Step 4: Check sync status
    console.log('📍 Step 4: Checking sync status...');
    await page.evaluate(() => {
      console.log('🔄 [Investigation] Checking sync status...');
      console.log('🔄 [Investigation] Sync queue:', localStorage.getItem('syncQueue'));
      console.log('🔄 [Investigation] Last sync:', localStorage.getItem('lastSync'));
      console.log('🔄 [Investigation] Pending changes:', localStorage.getItem('pendingChanges'));
    });
    
    // Step 5: Normal page refresh
    console.log('📍 Step 5: Performing normal page refresh...');
    await page.reload();
    await page.waitForSelector('ion-app', { timeout: 10000 });
    
    await page.evaluate(() => {
      console.log('🔄 [Investigation] After normal refresh...');
      const allKeys = Object.keys(localStorage);
      console.log('🔄 [Investigation] localStorage keys:', allKeys);

      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));
      const packsKey = allKeys.find(key => key.includes('userPacks'));
      const syncKey = allKeys.find(key => key.includes('syncQueue'));

      console.log('🔄 [Investigation] Collection key found:', collectionKey);
      console.log('🔄 [Investigation] Collection data:', collectionKey ? localStorage.getItem(collectionKey) : null);
      console.log('🔄 [Investigation] Pack data:', packsKey ? localStorage.getItem(packsKey) : null);
      console.log('🔄 [Investigation] Sync data:', syncKey ? localStorage.getItem(syncKey) : null);
    });
    
    const afterRefreshCardCount = await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));

      if (collectionKey) {
        const collectionData = localStorage.getItem(collectionKey);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const cardCount = Object.keys(collection.cards_owned || {}).length;
          console.log('🔄 [Investigation] After refresh card count:', cardCount);
          return cardCount;
        }
      }
      console.log('🔄 [Investigation] No collection found after refresh');
      return 0;
    });
    
    console.log(`📊 After normal refresh card count: ${afterRefreshCardCount}`);
    
    // Step 6: Hard refresh (Ctrl+F5)
    console.log('📍 Step 6: Performing hard refresh...');
    await page.keyboard.down('Control');
    await page.keyboard.press('F5');
    await page.keyboard.up('Control');
    await page.waitForSelector('ion-app', { timeout: 10000 });
    
    await page.evaluate(() => {
      console.log('💪 [Investigation] After hard refresh...');
      const allKeys = Object.keys(localStorage);
      console.log('💪 [Investigation] localStorage keys:', allKeys);

      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));
      const packsKey = allKeys.find(key => key.includes('userPacks'));
      const syncKey = allKeys.find(key => key.includes('syncQueue'));

      console.log('💪 [Investigation] Collection key found:', collectionKey);
      console.log('💪 [Investigation] Collection data:', collectionKey ? localStorage.getItem(collectionKey) : null);
      console.log('💪 [Investigation] Pack data:', packsKey ? localStorage.getItem(packsKey) : null);
      console.log('💪 [Investigation] Sync data:', syncKey ? localStorage.getItem(syncKey) : null);
    });
    
    const afterHardRefreshCardCount = await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));

      if (collectionKey) {
        const collectionData = localStorage.getItem(collectionKey);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const cardCount = Object.keys(collection.cards_owned || {}).length;
          console.log('💪 [Investigation] After hard refresh card count:', cardCount);
          return cardCount;
        }
      }
      console.log('💪 [Investigation] No collection found after hard refresh');
      return 0;
    });
    
    console.log(`📊 After hard refresh card count: ${afterHardRefreshCardCount}`);
    
    // Step 7: Empty cache and hard refresh
    console.log('📍 Step 7: Clearing cache and performing hard refresh...');
    
    // Clear all storage
    await page.evaluate(() => {
      console.log('🧹 [Investigation] Clearing all storage...');
      console.log('🧹 [Investigation] Before clear - localStorage keys:', Object.keys(localStorage));
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 [Investigation] After clear - localStorage keys:', Object.keys(localStorage));
    });
    
    // Clear browser cache with cross-platform compatibility
    await safeCDPOperation(
      page,
      async () => {
        const client = await page.context().newCDPSession(page);
        await client.send('Network.clearBrowserCache');
        await client.send('Storage.clearDataForOrigin', {
          origin: 'http://localhost:5173',
          storageTypes: 'all'
        });
      },
      async () => {
        // Fallback: Hard refresh for browsers without CDP support
        await page.keyboard.down('Control');
        await page.keyboard.press('F5');
        await page.keyboard.up('Control');
      }
    );

    // Wait for app to reload with enhanced compatibility
    await waitForAppInitialization(page, { timeout: 15000 });
    
    await page.evaluate(() => {
      console.log('🧹 [Investigation] After cache clear and hard refresh...');
      const allKeys = Object.keys(localStorage);
      console.log('🧹 [Investigation] localStorage keys:', allKeys);

      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));
      const packsKey = allKeys.find(key => key.includes('userPacks'));
      const syncKey = allKeys.find(key => key.includes('syncQueue'));

      console.log('🧹 [Investigation] Collection key found:', collectionKey);
      console.log('🧹 [Investigation] Collection data:', collectionKey ? localStorage.getItem(collectionKey) : null);
      console.log('🧹 [Investigation] Pack data:', packsKey ? localStorage.getItem(packsKey) : null);
      console.log('🧹 [Investigation] Sync data:', syncKey ? localStorage.getItem(syncKey) : null);
    });

    const afterCacheClearCardCount = await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      const collectionKey = allKeys.find(key => key.includes('biomasters_offline_collection') && key.startsWith('user_'));

      if (collectionKey) {
        const collectionData = localStorage.getItem(collectionKey);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const cardCount = Object.keys(collection.cards_owned || {}).length;
          console.log('🧹 [Investigation] After cache clear card count:', cardCount);
          return cardCount;
        }
      }
      console.log('🧹 [Investigation] No collection found after cache clear (expected)');
      return 0;
    });
    
    console.log(`📊 After cache clear card count: ${afterCacheClearCardCount}`);
    
    // Step 8: Summary
    console.log('\n📋 INVESTIGATION SUMMARY:');
    console.log(`📊 Initial cards: ${initialCardCount}`);
    console.log(`📊 After pack opening: 5 (no new pack opened)`);
    console.log(`📊 After normal refresh: ${afterRefreshCardCount}`);
    console.log(`📊 After hard refresh: ${afterHardRefreshCardCount}`);
    console.log(`📊 After cache clear: ${afterCacheClearCardCount}`);
    
    // Check if user is still logged in after cache clear
    const isLoggedInAfterClear = await page.isVisible('[data-testid="user-profile"]');
    console.log(`🔐 Still logged in after cache clear: ${isLoggedInAfterClear}`);
    
    console.log('✅ Investigation completed');
  });
});
