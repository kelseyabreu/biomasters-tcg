/**
 * Firebase Test Utilities for E2E Tests
 * Provides utilities for testing with real Firebase Auth
 */

import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  deleteUser,
  User,
  connectAuthEmulator
} from 'firebase/auth';

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

// Firebase test manager class
export class FirebaseTestManager {
  private app: any;
  private auth: any;
  private testUsers: TestUser[] = [];
  private useEmulator: boolean;

  constructor(useEmulator = process.env.NODE_ENV === 'test') {
    this.useEmulator = useEmulator;
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
   * Create a test user in Firebase Auth
   */
  async createTestUser(testUser: TestUser): Promise<TestUser> {
    try {
      console.log(`🔥 Creating test user: ${testUser.email}`);
      
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        testUser.email,
        testUser.password
      );

      const firebaseUser = userCredential.user;
      
      // Update profile with display name
      if (testUser.displayName) {
        await firebaseUser.updateProfile({
          displayName: testUser.displayName
        });
      }

      const createdUser: TestUser = {
        ...testUser,
        uid: firebaseUser.uid,
        firebaseUser
      };

      this.testUsers.push(createdUser);
      console.log(`✅ Test user created: ${testUser.email} (${firebaseUser.uid})`);
      
      return createdUser;
    } catch (error: any) {
      console.error(`❌ Failed to create test user ${testUser.email}:`, error);
      throw new Error(`Firebase user creation failed: ${error.message}`);
    }
  }

  /**
   * Sign in a test user
   */
  async signInTestUser(email: string, password: string): Promise<TestUser> {
    try {
      console.log(`🔑 Signing in test user: ${email}`);
      
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
      console.error(`❌ Failed to sign in test user ${email}:`, error);
      throw new Error(`Firebase sign in failed: ${error.message}`);
    }
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

// Test user factory
export function createTestUserData(suffix: string = Date.now().toString()): TestUser {
  return {
    email: `e2e-test-${suffix}@example.com`,
    password: `TestPassword${suffix}!`,
    displayName: `E2E Test User ${suffix}`
  };
}

// Batch test user creation
export async function createTestUsers(
  manager: FirebaseTestManager, 
  count: number
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const userData = createTestUserData(`${Date.now()}-${i}`);
    const user = await manager.createTestUser(userData);
    users.push(user);
  }
  
  return users;
}

// Export default instance for simple usage
export const firebaseTestManager = new FirebaseTestManager();
