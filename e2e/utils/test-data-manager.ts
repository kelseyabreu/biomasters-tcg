/**
 * Test Data Management Utilities
 * Handles creation, verification, and cleanup of test data
 */

import { Page, APIRequestContext } from '@playwright/test';
import { FirebaseTestManager, TestUser, createTestUserData } from './firebase-test-utils';
import { TEST_CONSTANTS } from '../config/firebase-test-config';

export interface TestDataManager {
  createTestUser(userData?: Partial<TestUser>): Promise<TestUser>;
  verifyUserInDatabase(userId: string): Promise<boolean>;
  verifyUserNotInDatabase(email: string): Promise<boolean>;
  verifyFirebaseUserExists(uid: string): Promise<boolean>;
  verifyFirebaseUserDeleted(uid: string): Promise<boolean>;
  cleanupTestUsers(pattern?: string): Promise<void>;
  createBulkTestUsers(count: number): Promise<TestUser[]>;
}

export class PlaywrightTestDataManager implements TestDataManager {
  private firebaseManager: FirebaseTestManager;
  private apiContext: APIRequestContext;
  private createdUsers: TestUser[] = [];
  private baseApiUrl: string;

  constructor(
    firebaseManager: FirebaseTestManager,
    apiContext: APIRequestContext,
    baseApiUrl: string = 'http://localhost:3001'
  ) {
    this.firebaseManager = firebaseManager;
    this.apiContext = apiContext;
    this.baseApiUrl = baseApiUrl;
  }

  /**
   * Create a test user in both Firebase and database
   */
  async createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const testUserData = {
      ...createTestUserData(),
      ...userData
    };

    try {
      console.log(`📝 Creating test user: ${testUserData.email}`);

      // Create user in Firebase first
      const firebaseUser = await this.firebaseManager.createTestUser(testUserData);

      // Create user in database via API
      const response = await this.apiContext.post(`${this.baseApiUrl}/api/test/create-user`, {
        data: {
          email: firebaseUser.email,
          username: firebaseUser.displayName?.replace(/\s+/g, '').toLowerCase() || `user${Date.now()}`,
          displayName: firebaseUser.displayName,
          firebaseUid: firebaseUser.uid,
          isGuest: false
        }
      });

      if (!response.ok()) {
        throw new Error(`Failed to create user in database: ${response.status()}`);
      }

      const dbUser = await response.json();
      const completeUser: TestUser = {
        ...firebaseUser,
        databaseId: dbUser.data.user.id
      };

      this.createdUsers.push(completeUser);
      console.log(`✅ Test user created: ${testUserData.email} (Firebase: ${firebaseUser.uid}, DB: ${dbUser.data.user.id})`);

      return completeUser;
    } catch (error) {
      console.error(`❌ Failed to create test user ${testUserData.email}:`, error);
      throw error;
    }
  }

  /**
   * Verify user exists in database
   */
  async verifyUserInDatabase(userId: string): Promise<boolean> {
    try {
      const response = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}`);
      return response.ok();
    } catch (error) {
      console.error(`❌ Failed to verify user in database: ${userId}`, error);
      return false;
    }
  }

  /**
   * Verify user does NOT exist in database
   */
  async verifyUserNotInDatabase(email: string): Promise<boolean> {
    try {
      // Try to find user by email
      const response = await this.apiContext.get(`${this.baseApiUrl}/api/users/search?email=${encodeURIComponent(email)}`);
      
      if (response.status() === 404) {
        return true; // User not found, which is what we want
      }
      
      if (response.ok()) {
        const data = await response.json();
        return !data.user; // User should not exist
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to verify user not in database: ${email}`, error);
      return false;
    }
  }

  /**
   * Verify user exists in Firebase Auth
   */
  async verifyFirebaseUserExists(uid: string): Promise<boolean> {
    return await this.firebaseManager.verifyUserExists(uid);
  }

  /**
   * Verify user does NOT exist in Firebase Auth
   */
  async verifyFirebaseUserDeleted(uid: string): Promise<boolean> {
    return await this.firebaseManager.verifyUserDeleted(uid);
  }

  /**
   * Clean up test users
   */
  async cleanupTestUsers(pattern?: string): Promise<void> {
    try {
      console.log('🧹 Cleaning up test users...');

      // Clean up Firebase users
      await this.firebaseManager.cleanup();

      // Clean up database users via API
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: 'playwright-test-data-manager',
          userPattern: pattern || 'e2e-test-%'
        }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`✅ Cleaned up ${result.data.deletedUsers} test users from database`);
      } else {
        console.warn('⚠️ Database cleanup may have failed');
      }

      this.createdUsers = [];
      console.log('✅ Test user cleanup completed');
    } catch (error) {
      console.error('❌ Test user cleanup failed:', error);
      // Don't throw - cleanup should be best effort
    }
  }

  /**
   * Create multiple test users for bulk testing
   */
  async createBulkTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const userData = createTestUserData(`bulk-${timestamp}-${i}`);
      const user = await this.createTestUser(userData);
      users.push(user);
    }

    console.log(`✅ Created ${count} bulk test users`);
    return users;
  }

  /**
   * Get all created users
   */
  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  /**
   * Find a created user by email
   */
  findUserByEmail(email: string): TestUser | undefined {
    return this.createdUsers.find(user => user.email === email);
  }

  /**
   * Find a created user by Firebase UID
   */
  findUserByUid(uid: string): TestUser | undefined {
    return this.createdUsers.find(user => user.uid === uid);
  }
}

/**
 * Database verification utilities
 */
export class DatabaseVerificationUtils {
  private apiContext: APIRequestContext;
  private baseApiUrl: string;

  constructor(apiContext: APIRequestContext, baseApiUrl: string = 'http://localhost:3001') {
    this.apiContext = apiContext;
    this.baseApiUrl = baseApiUrl;
  }

  /**
   * Verify user data integrity after operations
   */
  async verifyUserDataIntegrity(userId: string): Promise<{
    userExists: boolean;
    hasCards: boolean;
    hasDecks: boolean;
    hasTransactions: boolean;
    errors: string[];
  }> {
    const result = {
      userExists: false,
      hasCards: false,
      hasDecks: false,
      hasTransactions: false,
      errors: [] as string[]
    };

    try {
      // Check user exists
      const userResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}`);
      result.userExists = userResponse.ok();

      if (result.userExists) {
        // Check user cards
        const cardsResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/cards`);
        result.hasCards = cardsResponse.ok() && (await cardsResponse.json()).data.length > 0;

        // Check user decks
        const decksResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/decks`);
        result.hasDecks = decksResponse.ok() && (await decksResponse.json()).data.length > 0;

        // Check user transactions
        const transactionsResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/transactions`);
        result.hasTransactions = transactionsResponse.ok() && (await transactionsResponse.json()).data.length > 0;
      }
    } catch (error) {
      result.errors.push(`Verification failed: ${error}`);
    }

    return result;
  }

  /**
   * Verify complete user deletion
   */
  async verifyCompleteUserDeletion(userId: string, email: string): Promise<{
    userDeleted: boolean;
    cardsDeleted: boolean;
    decksDeleted: boolean;
    transactionsDeleted: boolean;
    errors: string[];
  }> {
    const result = {
      userDeleted: false,
      cardsDeleted: false,
      decksDeleted: false,
      transactionsDeleted: false,
      errors: [] as string[]
    };

    try {
      // Verify user is deleted
      const userResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}`);
      result.userDeleted = userResponse.status() === 404;

      // Verify user cards are deleted
      const cardsResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/cards`);
      result.cardsDeleted = cardsResponse.status() === 404;

      // Verify user decks are deleted
      const decksResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/decks`);
      result.decksDeleted = decksResponse.status() === 404;

      // Verify user transactions are deleted
      const transactionsResponse = await this.apiContext.get(`${this.baseApiUrl}/api/users/${userId}/transactions`);
      result.transactionsDeleted = transactionsResponse.status() === 404;

    } catch (error) {
      result.errors.push(`Deletion verification failed: ${error}`);
    }

    return result;
  }
}

/**
 * Factory function to create test data manager
 */
export async function createTestDataManager(
  firebaseManager: FirebaseTestManager,
  apiContext: APIRequestContext,
  baseApiUrl?: string
): Promise<PlaywrightTestDataManager> {
  return new PlaywrightTestDataManager(firebaseManager, apiContext, baseApiUrl);
}

/**
 * Factory function to create database verification utils
 */
export function createDatabaseVerificationUtils(
  apiContext: APIRequestContext,
  baseApiUrl?: string
): DatabaseVerificationUtils {
  return new DatabaseVerificationUtils(apiContext, baseApiUrl);
}
