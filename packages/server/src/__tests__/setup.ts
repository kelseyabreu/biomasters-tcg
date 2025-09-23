/**
 * Jest Test Setup
 * Global test configuration and utilities for REAL integration testing
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file for real database testing
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Set test environment variables (but keep real database config)
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] || 'test-secret';

// Import real database connection for integration testing
import { db, closeSingletonPool } from '../database/kysely';
import { initializeDatabase, closeDatabase, checkDatabaseHealth } from '../config/database';
import { initializeRedis } from '../config/ioredis';

// Global database setup for real integration testing
let databaseAvailable = false;

beforeAll(async () => {
  try {
    // Try to initialize real database connection
    await initializeDatabase();
    databaseAvailable = await checkDatabaseHealth();

    if (!databaseAvailable) {
      console.warn('⚠️ Database health check failed - some tests will be skipped');
    }

    // Try to initialize Redis connection for tests
    try {
      console.log('🔴 [TEST SETUP] Initializing Redis for tests...');
      await initializeRedis();
      console.log('✅ [TEST SETUP] Redis initialized successfully');
    } catch (error) {
      console.warn('⚠️ [TEST SETUP] Redis initialization failed - tests will run without Redis:', error);
    }
  } catch (error) {
    console.warn('⚠️ Database connection failed - tests will run with mocked data:', error);
    databaseAvailable = false;
  }
});

afterAll(async () => {
  if (databaseAvailable) {
    try {
      // Force close all database connections
      await closeDatabase();

      // Also close the singleton pool from kysely
      await closeSingletonPool();

      // Give time for connections to close
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('⚠️ Error closing database:', error);
    }
  }

  // Clean up data caches to prevent open handles
  try {
    // Import and destroy cache instances if they exist
    const shared = await import('@kelseyabreu/shared');
    if (shared && typeof shared === 'object') {
      // Try to access cache instances and destroy them
      Object.values(shared).forEach((value: any) => {
        if (value && typeof value.destroy === 'function') {
          value.destroy();
        }
      });
    }
  } catch (error) {
    console.error((error as Error).message);
    // Ignore cache cleanup errors
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Export database availability for tests to check
export { databaseAvailable, db };

// Global test timeout - increased for real service integration
jest.setTimeout(30000);

// Configure Jest for better test isolation
beforeEach(async () => {
  // Small delay between tests to prevent race conditions
  await new Promise(resolve => setTimeout(resolve, 10));
});

afterEach(async () => {
  // Small delay after each test to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 10));
});

// Console suppression for cleaner test output (temporarily disabled for debugging)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Temporarily disable console suppression to see auth debug logs
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Add a dummy test to prevent "no tests" error
describe('Setup', () => {
  test('should initialize test environment', () => {
    expect(process.env['NODE_ENV']).toBe('test');
  });
});
