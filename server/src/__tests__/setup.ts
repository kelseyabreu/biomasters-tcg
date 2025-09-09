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
import { db } from '../database/kysely';
import { initializeDatabase, closeDatabase, checkDatabaseHealth } from '../config/database';

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
  } catch (error) {
    console.warn('⚠️ Database connection failed - tests will run with mocked data:', error);
    databaseAvailable = false;
  }
});

afterAll(async () => {
  if (databaseAvailable) {
    try {
      await closeDatabase();
    } catch (error) {
      console.warn('⚠️ Error closing database:', error);
    }
  }
});

// Export database availability for tests to check
export { databaseAvailable, db };

// Global test timeout
jest.setTimeout(10000);

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
