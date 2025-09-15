/**
 * Rate Limiting Test
 * Verifies that Firebase rate limiting protection is working correctly
 */

import { test, expect } from '@playwright/test';
import { FirebaseTestManager } from './utils/firebase-test-utils';
import { getTestConfig } from './config/test-config';

test.describe('Firebase Rate Limiting Protection', () => {
  let firebaseManager: FirebaseTestManager;
  const config = getTestConfig();

  test.beforeEach(async () => {
    firebaseManager = new FirebaseTestManager();
  });

  test.afterEach(async () => {
    if (firebaseManager) {
      await firebaseManager.cleanup();
    }
  });

  test('should handle rate limiting gracefully during user creation', async () => {
    const startTime = Date.now();
    
    // Create multiple users rapidly to trigger rate limiting
    const userPromises = [];
    for (let i = 0; i < 3; i++) {
      const testUser = {
        email: `ratetest${i}_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        displayName: `Rate Test User ${i}`,
      };
      
      userPromises.push(firebaseManager.createTestUser(testUser));
    }
    
    // All users should be created successfully despite rate limiting
    const users = await Promise.all(userPromises);
    const endTime = Date.now();
    
    // Verify all users were created
    expect(users).toHaveLength(3);
    for (const user of users) {
      expect(user.uid).toBeDefined();
      expect(user.firebaseUser).toBeDefined();
    }
    
    // If rate limiting is enabled, this should take longer than without it
    const duration = endTime - startTime;
    if (config.firebase.rateLimiting.enabled) {
      console.log(`✅ Rate limiting test completed in ${duration}ms`);
      // Should take at least the minimum delay between requests
      expect(duration).toBeGreaterThan(config.firebase.rateLimiting.minDelayMs);
    } else {
      console.log(`⚡ Rate limiting disabled, test completed in ${duration}ms`);
    }
  });

  test('should log rate limiting configuration', async () => {
    console.log('🔧 Current Rate Limiting Configuration:');
    console.log(`  Enabled: ${config.firebase.rateLimiting.enabled}`);
    console.log(`  Min Delay: ${config.firebase.rateLimiting.minDelayMs}ms`);
    console.log(`  Max Requests/Second: ${config.firebase.rateLimiting.maxRequestsPerSecond}`);
    console.log(`  Retry Attempts: ${config.firebase.rateLimiting.retryAttempts}`);
    console.log(`  Max Backoff: ${config.firebase.rateLimiting.maxBackoffMs}ms`);
    
    // This test always passes, it's just for logging
    expect(true).toBe(true);
  });

  test('should respect environment-specific configuration', async () => {
    const env = process.env.NODE_ENV || 'development';
    const useEmulator = process.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    const isCI = !!process.env.CI;
    
    console.log('🌍 Environment Configuration:');
    console.log(`  NODE_ENV: ${env}`);
    console.log(`  Use Emulator: ${useEmulator}`);
    console.log(`  Is CI: ${isCI}`);
    console.log(`  Max Workers: ${config.playwright.workers.maxConcurrent}`);
    console.log(`  Auth Timeout: ${config.firebase.timeouts.authenticationMs}ms`);
    
    // Verify configuration makes sense for environment
    if (useEmulator) {
      expect(config.firebase.rateLimiting.enabled).toBe(false);
    } else if (isCI) {
      expect(config.firebase.rateLimiting.maxRequestsPerSecond).toBeLessThanOrEqual(5);
      expect(config.playwright.workers.maxConcurrent).toBeLessThanOrEqual(2);
    }
    
    expect(config.firebase.timeouts.authenticationMs).toBeGreaterThan(10000);
  });
});
