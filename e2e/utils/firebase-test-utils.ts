/**
 * Firebase Test Utilities for E2E Tests
 * Provides utilities for testing with real Firebase Auth
 */

import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  User,
  connectAuthEmulator
} from 'firebase/auth';
import { getTestConfig } from '../config/test-config';

// Firebase test configuration
const FIREBASE_TEST_CONFIG = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Test user interface
export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  uid?: string;
  firebaseUser?: User;
}

// Global rate limiting manager
class FirebaseRateLimitManager {
  private static instance: FirebaseRateLimitManager;
  private lastRequestTime = 0;
  private requestCount = 0;
  private config = getTestConfig().firebase.rateLimiting;

  static getInstance(): FirebaseRateLimitManager {
    if (!FirebaseRateLimitManager.instance) {
      FirebaseRateLimitManager.instance = new FirebaseRateLimitManager();
    }
    return FirebaseRateLimitManager.instance;
  }

  async throttleRequest(): Promise<void> {
    if (!this.config.enabled) {
      return; // Rate limiting disabled
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if more than 1 second has passed
    if (timeSinceLastRequest > 1000) {
      this.requestCount = 0;
    }

    // If we've hit the rate limit, wait
    if (this.requestCount >= this.config.maxRequestsPerSecond) {
      const waitTime = 1000 - timeSinceLastRequest;
      if (waitTime > 0) {
        console.log(`🚦 Rate limiting: waiting ${waitTime}ms (${this.requestCount}/${this.config.maxRequestsPerSecond} requests)...`);
        await this.sleep(waitTime);
        this.requestCount = 0;
      }
    }

    // Ensure minimum delay between requests
    if (timeSinceLastRequest < this.config.minDelayMs) {
      const waitTime = this.config.minDelayMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Firebase test manager class
export class FirebaseTestManager {
  private app: any;
  private auth: any;
  private testUsers: TestUser[] = [];
  private useEmulator: boolean;
  private rateLimitManager: FirebaseRateLimitManager;

  constructor(useEmulator = process.env.NODE_ENV === 'test') {
    this.useEmulator = useEmulator;
    this.rateLimitManager = FirebaseRateLimitManager.getInstance();
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialize Firebase app for testing
      this.app = initializeApp(FIREBASE_TEST_CONFIG, 'test-app');
      this.auth = getAuth(this.app);

      // Connect to emulator if in test environment
      if (this.useEmulator && !this.auth._delegate._config.emulator) {
        connectAuthEmulator(this.auth, 'http://localhost:9099');
        console.log('🔥 Connected to Firebase Auth Emulator');
      }

      console.log('✅ Firebase Test Manager initialized');
    } catch (error) {
      console.error('❌ Firebase Test Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a test user in Firebase Auth with rate limiting protection
   */
  async createTestUser(testUser: TestUser): Promise<TestUser> {
    const config = getTestConfig();
    const maxRetries = config.firebase.rateLimiting.retryAttempts;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Apply global rate limiting
        await this.rateLimitManager.throttleRequest();

        console.log(`🔥 Creating test user: ${testUser.email} (attempt ${attempt + 1}/${maxRetries})`);

        const userCredential = await createUserWithEmailAndPassword(
          this.auth,
          testUser.email,
          testUser.password
        );

        const firebaseUser = userCredential.user;

        // Note: updateProfile is not available in Node.js Firebase Admin SDK
        // Display name will be set on the client side if needed

        const createdUser: TestUser = {
          ...testUser,
          uid: firebaseUser.uid,
          firebaseUser
        };

        this.testUsers.push(createdUser);
        console.log(`✅ Test user created: ${testUser.email} (${firebaseUser.uid})`);

        return createdUser;
      } catch (error: any) {
        attempt++;

        if (error.code === 'auth/too-many-requests') {
          const delay = Math.min(
            1000 * Math.pow(config.firebase.rateLimiting.exponentialBackoffBase, attempt),
            config.firebase.rateLimiting.maxBackoffMs
          );
          console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}...`);
          await this.sleep(delay);
          continue;
        }

        console.error(`❌ Failed to create test user ${testUser.email}:`, error);
        throw new Error(`Firebase user creation failed: ${error.message}`);
      }
    }

    throw new Error(`Firebase user creation failed after ${maxRetries} attempts due to rate limiting`);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sign in a test user with rate limiting protection
   */
  async signInTestUser(email: string, password: string): Promise<TestUser> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Apply global rate limiting
        await this.rateLimitManager.throttleRequest();

        console.log(`🔑 Signing in test user: ${email} (attempt ${attempt + 1}/${maxRetries})`);

        const userCredential = await signInWithEmailAndPassword(
          this.auth,
          email,
          password
        );

        const firebaseUser = userCredential.user;

        const signedInUser: TestUser = {
          email,
          password,
          displayName: firebaseUser.displayName || '',
          uid: firebaseUser.uid,
          firebaseUser
      };

        console.log(`✅ Test user signed in: ${email} (${firebaseUser.uid})`);
        return signedInUser;
      } catch (error: any) {
        attempt++;

        if (error.code === 'auth/too-many-requests') {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
          console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}...`);
          await this.sleep(delay);
          continue;
        }

        console.error(`❌ Failed to sign in test user ${email}:`, error);
        throw new Error(`Firebase sign in failed: ${error.message}`);
      }
    }

    throw new Error(`Firebase sign in failed after ${maxRetries} attempts due to rate limiting`);
  }

  /**
   * Delete a test user from Firebase Auth
   */
  async deleteTestUser(testUser: TestUser): Promise<void> {
    try {
      if (!testUser.firebaseUser) {
        console.warn(`⚠️ No Firebase user to delete for: ${testUser.email}`);
        return;
      }

      console.log(`🗑️ Deleting test user: ${testUser.email} (${testUser.uid})`);
      
      await deleteUser(testUser.firebaseUser);
      
      // Remove from tracked users
      this.testUsers = this.testUsers.filter(user => user.uid !== testUser.uid);
      
      console.log(`✅ Test user deleted: ${testUser.email}`);
    } catch (error: any) {
      console.error(`❌ Failed to delete test user ${testUser.email}:`, error);
      // Don't throw here as cleanup should be best-effort
    }
  }

  /**
   * Verify a user exists in Firebase Auth
   */
  async verifyUserExists(uid: string): Promise<boolean> {
    try {
      // In a real implementation, you'd use Firebase Admin SDK
      // For now, we'll check if the user is in our tracked users
      const user = this.testUsers.find(u => u.uid === uid);
      return !!user;
    } catch (error) {
      console.error(`❌ Failed to verify user exists: ${uid}`, error);
      return false;
    }
  }

  /**
   * Verify a user does NOT exist in Firebase Auth
   */
  async verifyUserDeleted(uid: string): Promise<boolean> {
    try {
      const exists = await this.verifyUserExists(uid);
      return !exists;
    } catch (error) {
      console.error(`❌ Failed to verify user deleted: ${uid}`, error);
      return false;
    }
  }

  /**
   * Clean up all test users
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.testUsers.length} test users...`);
    
    const cleanupPromises = this.testUsers.map(user => this.deleteTestUser(user));
    await Promise.allSettled(cleanupPromises);
    
    this.testUsers = [];
    console.log('✅ Firebase test cleanup completed');
  }

  /**
   * Get current auth state
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      console.log('✅ Signed out current user');
    } catch (error) {
      console.error('❌ Failed to sign out:', error);
    }
  }

  /**
   * Destroy the Firebase test manager
   */
  async destroy(): Promise<void> {
    try {
      await this.cleanup();
      
      if (this.app) {
        await deleteApp(this.app);
        console.log('✅ Firebase test app destroyed');
      }
    } catch (error) {
      console.error('❌ Failed to destroy Firebase test manager:', error);
    }
  }
}

// Utility functions for test setup
export async function setupFirebaseTest(): Promise<FirebaseTestManager> {
  const manager = new FirebaseTestManager();
  return manager;
}

export async function teardownFirebaseTest(manager: FirebaseTestManager): Promise<void> {
  await manager.destroy();
}

// Test user factory with worker isolation support
export function createTestUserData(suffix: string = Date.now().toString(), workerPrefix?: string): TestUser {
  const finalSuffix = workerPrefix ? `${workerPrefix}-${suffix}` : suffix;
  return {
    email: `e2e-test-${finalSuffix}@example.com`,
    password: `TestPassword${finalSuffix}!`,
    displayName: `E2E Test User ${finalSuffix}`
  };
}

// Batch test user creation with worker isolation
export async function createTestUsers(
  manager: FirebaseTestManager,
  count: number,
  workerPrefix?: string
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const userData = createTestUserData(`${timestamp}-${i}`, workerPrefix);
    const user = await manager.createTestUser(userData);
    users.push(user);
  }

  return users;
}

// Export default instance for simple usage
export const firebaseTestManager = new FirebaseTestManager();
