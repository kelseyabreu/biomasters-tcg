/**
 * Playwright Global Setup
 * Prepares the test environment for User Types Standardization E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { firebaseEmulatorManager, validateTestEnvironment } from './config/firebase-test-config';
import { logTestConfig } from './config/test-config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Playwright E2E test environment...');

  // Log test configuration for debugging
  logTestConfig();

  // Validate test environment and Firebase configuration
  validateTestEnvironment();

  // Start Firebase emulators if needed
  await firebaseEmulatorManager.startEmulators();

  // Clear any existing emulator data
  await firebaseEmulatorManager.clearEmulatorData();

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend server...');
    await page.goto('http://localhost:5173', { timeout: 60000 });
    await page.waitForSelector('ion-app', { timeout: 30000 });
    console.log('✅ Frontend server is ready');
    
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend server...');
    const healthResponse = await page.goto('http://localhost:3001/health', { timeout: 60000 });
    if (!healthResponse?.ok()) {
      throw new Error('Backend health check failed');
    }
    console.log('✅ Backend server is ready');
    
    // Verify database migrations are up to date
    console.log('⏳ Checking database migrations...');
    const migrationsResponse = await page.request.get('http://localhost:3001/api/health/migrations');
    if (!migrationsResponse.ok()) {
      console.warn('⚠️ Could not verify migrations status');
    } else {
      console.log('✅ Database migrations verified');
    }
    
    console.log('🎉 Playwright E2E test environment ready!');
    
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
