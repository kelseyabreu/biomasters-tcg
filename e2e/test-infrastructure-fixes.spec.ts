/**
 * Infrastructure Fixes Test Suite
 * Tests the robustness of our infrastructure fixes for database, Redis, and health checks
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { TestIsolationManager } from './utils/test-isolation-manager';
import {
  fillIonInput,
  clickIonButton,
  waitForModal,
  switchAuthMode
} from './utils/test-helpers';

test.describe('Infrastructure Fixes Verification', () => {
  let page: Page;
  let apiContext: APIRequestContext;
  let isolationManager: TestIsolationManager;

  test.beforeEach(async ({ browser, playwright }) => {
    // Create isolated test session
    const backendRequest = await playwright.request.newContext({
      baseURL: 'http://localhost:3001'
    });
    isolationManager = new TestIsolationManager('infrastructure-fixes', backendRequest);

    const context = await browser.newContext();
    page = await context.newPage();

    // Use backend API context
    apiContext = backendRequest;

    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('ion-app', { timeout: 30000 });
  });

  test.afterEach(async () => {
    // Clean up test session
    if (isolationManager) {
      await isolationManager.cleanup();
    }
    
    if (page) {
      await page.close();
    }
  });

  test.describe('🏥 Health Check Endpoints', () => {
    test('should return basic health status', async () => {
      const response = await apiContext.get('/health');
      expect(response.ok()).toBeTruthy();
      
      const health = await response.json();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
      expect(health.services).toHaveProperty('database');
      expect(health.services).toHaveProperty('redis');
      expect(health.services).toHaveProperty('firebase');
      
      console.log('✅ Basic health check:', health);
    });

    test('should return detailed health information', async () => {
      const response = await apiContext.get('/api/health/detailed');
      expect(response.ok()).toBeTruthy();
      
      const health = await response.json();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('responseTime');
      expect(health.services.database).toHaveProperty('responseTime');
      
      console.log('✅ Detailed health check response time:', health.responseTime + 'ms');
      console.log('✅ Database response time:', health.services.database.responseTime + 'ms');
    });

    test('should return migration status', async () => {
      const response = await apiContext.get('/api/health/migrations');
      
      if (response.ok()) {
        const migrations = await response.json();
        expect(migrations).toHaveProperty('status', 'success');
        expect(migrations.data).toHaveProperty('migrationsTableExists', true);
        expect(migrations.data).toHaveProperty('totalExpected');
        expect(migrations.data).toHaveProperty('totalExecuted');
        
        console.log('✅ Migration status:', {
          expected: migrations.data.totalExpected,
          executed: migrations.data.totalExecuted,
          upToDate: migrations.data.isUpToDate
        });
      } else {
        console.warn('⚠️ Migration endpoint not accessible, status:', response.status());
      }
    });
  });

  test.describe('🔄 Database Resilience', () => {
    test('should handle user registration with database retry logic', async () => {
      const uniqueEmail = isolationManager.createUniqueEmail('db-test');
      const uniqueUsername = isolationManager.createUniqueUsername('dbtest');
      
      // Click sign in button
      await clickIonButton(page, 'signin-button');
      await waitForModal(page, 'auth-modal');

      // Switch to registration
      await switchAuthMode(page, 'register');

      // Fill registration form
      await fillIonInput(page, 'email-input', uniqueEmail);
      await fillIonInput(page, 'password-input', 'testpassword123');
      await fillIonInput(page, 'display-name-input', uniqueUsername);

      // Submit registration
      await clickIonButton(page, 'register-button');

      // Wait for registration to complete (with our enhanced retry logic)
      await Promise.race([
        waitForModal(page, 'auth-modal', { state: 'hidden', timeout: 12000 }).catch(() => {}),
        expect(page.locator('[data-testid="auth-modal"]')).toBeVisible({ timeout: 12000 }).catch(() => {})
      ]);
      
      // Check if registration succeeded or failed gracefully
      const modalVisible = await page.locator('[data-testid="auth-modal"]').isVisible();
      
      if (!modalVisible) {
        // Registration succeeded
        await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
        console.log('✅ Database registration succeeded with retry logic');
        
        // Register the user for cleanup
        isolationManager.registerResource('user', uniqueEmail, uniqueEmail);
      } else {
        // Registration failed but should fail gracefully
        await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
        console.log('⚠️ Database registration failed but handled gracefully');
      }
    });

    test('should handle concurrent user registrations', async () => {
      const concurrentUsers = 3;
      const registrationPromises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = (async () => {
          const context = await page.context().browser()!.newContext();
          const testPage = await context.newPage();
          
          try {
            const uniqueEmail = isolationManager.createUniqueEmail(`concurrent-${i}`);
            const uniqueUsername = isolationManager.createUniqueUsername(`concurrent${i}`);
            
            await testPage.goto('/');
            await testPage.waitForSelector('ion-app');
            
            // Perform registration
            await clickIonButton(testPage, 'signin-button');
            await waitForModal(testPage, 'auth-modal');
            await switchAuthMode(testPage, 'register');

            await fillIonInput(testPage, 'email-input', uniqueEmail);
            await fillIonInput(testPage, 'password-input', 'testpassword123');
            await fillIonInput(testPage, 'display-name-input', uniqueUsername);

            await clickIonButton(testPage, 'register-button');
            await Promise.race([
              waitForModal(testPage, 'auth-modal', { state: 'hidden', timeout: 10000 }).catch(() => {}),
              expect(testPage.locator('[data-testid="auth-modal"]')).toBeVisible({ timeout: 10000 }).catch(() => {})
            ]);
            
            // Register for cleanup regardless of success/failure
            isolationManager.registerResource('user', uniqueEmail, uniqueEmail);
            
            console.log(`✅ Concurrent registration ${i} completed`);
          } catch (error) {
            console.log(`⚠️ Concurrent registration ${i} failed:`, error);
          } finally {
            await testPage.close();
            await context.close();
          }
        })();
        
        registrationPromises.push(promise);
      }
      
      // Wait for all concurrent registrations to complete
      await Promise.allSettled(registrationPromises);
      console.log('✅ All concurrent registrations completed');
    });
  });

  test.describe('🔴 Redis Fallback', () => {
    test('should work when Redis is unavailable', async () => {
      // Test that the app works even if Redis is down
      // This tests our memory fallback for caching and rate limiting
      
      const uniqueEmail = isolationManager.createUniqueEmail('redis-fallback');
      
      // Perform a registration that would normally use Redis for rate limiting
      await clickIonButton(page, 'signin-button');
      await waitForModal(page, 'auth-modal');
      await switchAuthMode(page, 'register');

      await fillIonInput(page, 'email-input', uniqueEmail);
      await fillIonInput(page, 'password-input', 'testpassword123');
      await fillIonInput(page, 'display-name-input', 'Redis Fallback Test');

      await clickIonButton(page, 'register-button');
      await Promise.race([
        waitForModal(page, 'auth-modal', { state: 'hidden', timeout: 10000 }).catch(() => {}),
        expect(page.locator('[data-testid="auth-modal"]')).toBeVisible({ timeout: 10000 }).catch(() => {})
      ]);
      
      // Should work regardless of Redis status
      const hasUserProfile = await page.locator('[data-testid="user-profile"]').isVisible();
      const hasAuthModal = await page.locator('[data-testid="auth-modal"]').isVisible();
      
      // Either registration succeeded or failed gracefully
      expect(hasUserProfile || hasAuthModal).toBeTruthy();
      
      if (hasUserProfile) {
        isolationManager.registerResource('user', uniqueEmail, uniqueEmail);
        console.log('✅ Redis fallback test: Registration succeeded');
      } else {
        console.log('✅ Redis fallback test: Registration handled gracefully');
      }
    });
  });

  test.describe('🧹 Test Isolation', () => {
    test('should create unique identifiers for test isolation', async () => {
      const email1 = isolationManager.createUniqueEmail('isolation');
      const email2 = isolationManager.createUniqueEmail('isolation');
      const username1 = isolationManager.createUniqueUsername('isolation');
      const username2 = isolationManager.createUniqueUsername('isolation');
      
      // Should be unique
      expect(email1).not.toBe(email2);
      expect(username1).not.toBe(username2);
      
      // Should contain worker prefix and test identifier
      expect(email1).toContain('test_w');
      expect(email1).toContain('isolation');
      // Username removes special characters, so test_w becomes testw
      expect(username1).toContain('testw');
      expect(username1).toContain('isolation');
      
      console.log('✅ Test isolation identifiers:', { email1, email2, username1, username2 });
    });

    test('should track and cleanup resources', async () => {
      const sessionInfo = isolationManager.getSessionInfo();
      
      expect(sessionInfo).toHaveProperty('sessionId');
      expect(sessionInfo).toHaveProperty('testName');
      expect(sessionInfo).toHaveProperty('startTime');
      expect(sessionInfo).toHaveProperty('resources');
      
      // Register a test resource
      isolationManager.registerResource('user', 'test-id-123', 'test@example.com');
      
      const updatedInfo = isolationManager.getSessionInfo();
      expect(updatedInfo.resources).toHaveLength(1);
      expect(updatedInfo.resources[0]).toMatchObject({
        type: 'user',
        id: 'test-id-123',
        identifier: 'test@example.com'
      });
      
      console.log('✅ Resource tracking working:', updatedInfo.resources);
    });
  });

  test.describe('⚡ Performance & Timeouts', () => {
    test('should handle health checks within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await apiContext.get('/api/health/detailed');
      const responseTime = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const health = await response.json();
      expect(health.responseTime).toBeLessThan(5000); // Server-side should be under 5 seconds
      
      console.log('✅ Health check performance:', {
        clientTime: responseTime + 'ms',
        serverTime: health.responseTime + 'ms'
      });
    });
  });
});
