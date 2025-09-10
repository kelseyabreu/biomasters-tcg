/**
 * Playwright Global Teardown
 * Cleans up after User Types Standardization E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { firebaseEmulatorManager } from './config/firebase-test-config';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Playwright E2E test environment...');
  
  // Launch browser for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Clean up test data via API
    console.log('⏳ Cleaning up test data...');
    
    // Clean up test users (if API endpoint exists)
    try {
      await page.request.delete('http://localhost:3001/api/test/cleanup', {
        data: { testRun: 'playwright-e2e' }
      });
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.warn('⚠️ Could not clean up test data via API:', error);
    }
    
    // Clear browser storage
    await context.clearCookies();
    await context.clearPermissions();

    // Clean up Firebase emulator data
    console.log('⏳ Cleaning up Firebase test data...');
    await firebaseEmulatorManager.clearEmulatorData();

    console.log('🎉 Playwright E2E test environment cleaned up!');
    
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
    // Don't throw - cleanup failures shouldn't fail the test run
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalTeardown;
