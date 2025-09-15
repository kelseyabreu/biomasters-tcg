/**
 * Enhanced Test Isolation System
 * Comprehensive worker-aware test isolation for parallel E2E testing
 */

import { Page, APIRequestContext, test } from '@playwright/test';
import { TestIsolationManager, WorkerIsolationConfig } from './test-isolation-manager';
import { FirebaseTestManager, TestUser, createTestUserData } from './firebase-test-utils';
import { PlaywrightTestDataManager } from './test-data-manager';

export interface IsolatedTestContext {
  isolationManager: TestIsolationManager;
  firebaseManager: FirebaseTestManager;
  dataManager: PlaywrightTestDataManager;
  page: Page;
  apiContext: APIRequestContext;
  workerConfig: WorkerIsolationConfig;
}

export interface TestSetupOptions {
  testName: string;
  enableFirebase?: boolean;
  enableDatabase?: boolean;
  enableWorkerDelay?: boolean;
  customWorkerConfig?: Partial<WorkerIsolationConfig>;
}

/**
 * Enhanced Test Isolation Factory
 * Creates fully isolated test environments for parallel execution
 */
export class EnhancedTestIsolation {
  private static instances = new Map<string, EnhancedTestIsolation>();
  
  private isolationManager: TestIsolationManager;
  private firebaseManager: FirebaseTestManager | null = null;
  private dataManager: PlaywrightTestDataManager | null = null;
  private testName: string;

  constructor(
    testName: string,
    apiContext: APIRequestContext,
    baseApiUrl: string = 'http://localhost:3001'
  ) {
    this.testName = testName;
    this.isolationManager = new TestIsolationManager(testName, apiContext, baseApiUrl);
    
    // Register this instance
    EnhancedTestIsolation.instances.set(this.isolationManager.getSessionInfo().sessionId, this);
  }

  /**
   * Setup isolated test environment
   */
  async setup(options: TestSetupOptions): Promise<IsolatedTestContext> {
    console.log(`🚀 [EnhancedIsolation] Setting up isolated environment for: ${options.testName}`);

    // Add worker delay if enabled
    if (options.enableWorkerDelay !== false) {
      await this.isolationManager.addWorkerDelay();
    }

    // Setup Firebase if enabled
    if (options.enableFirebase !== false) {
      this.firebaseManager = new FirebaseTestManager();
      console.log(`🔥 [EnhancedIsolation] Firebase manager initialized for worker ${this.isolationManager.getWorkerConfig().workerId}`);
    }

    // Setup database manager if enabled
    if (options.enableDatabase !== false && this.firebaseManager) {
      // Note: dataManager will be created when apiContext is available
      console.log(`🗄️ [EnhancedIsolation] Database manager will be initialized when API context is available`);
    }

    const workerConfig = this.isolationManager.getWorkerConfig();
    console.log(`✅ [EnhancedIsolation] Setup completed for worker ${workerConfig.workerId}`);

    // Return partial context - page and apiContext will be provided by test
    return {
      isolationManager: this.isolationManager,
      firebaseManager: this.firebaseManager!,
      dataManager: this.dataManager!,
      page: null as any, // Will be set by test
      apiContext: null as any, // Will be set by test
      workerConfig
    };
  }

  /**
   * Complete context setup with page and API context
   */
  async completeSetup(context: Partial<IsolatedTestContext>, page: Page, apiContext: APIRequestContext): Promise<IsolatedTestContext> {
    // Create data manager if Firebase is enabled
    if (this.firebaseManager && !this.dataManager) {
      this.dataManager = new PlaywrightTestDataManager(this.firebaseManager, apiContext);
    }

    return {
      ...context,
      page,
      apiContext,
      dataManager: this.dataManager!
    } as IsolatedTestContext;
  }

  /**
   * Create isolated test user
   */
  async createIsolatedUser(context: IsolatedTestContext, userData?: Partial<TestUser>): Promise<TestUser> {
    const workerPrefix = context.workerConfig.workerId;
    const testUserData = {
      ...createTestUserData(undefined, workerPrefix),
      ...userData
    };

    console.log(`👤 [EnhancedIsolation] Creating isolated user for ${workerPrefix}: ${testUserData.email}`);

    // Create user through data manager
    const user = await context.dataManager.createTestUser(testUserData);
    
    // Register with isolation manager
    context.isolationManager.registerResource('user', user.uid!, user.email);
    
    return user;
  }

  /**
   * Navigate with worker-specific timing
   */
  async navigateWithIsolation(context: IsolatedTestContext, url: string): Promise<void> {
    console.log(`🧭 [EnhancedIsolation] Worker ${context.workerConfig.workerId} navigating to: ${url}`);
    
    // Add small delay to prevent navigation conflicts
    await context.isolationManager.addWorkerDelay();
    
    await context.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log(`✅ [EnhancedIsolation] Navigation completed for worker ${context.workerConfig.workerId}`);
  }

  /**
   * Perform sync operation with isolation
   */
  async syncWithIsolation(context: IsolatedTestContext, syncButton: any): Promise<void> {
    console.log(`🔄 [EnhancedIsolation] Worker ${context.workerConfig.workerId} performing sync operation`);
    
    // Add delay to prevent sync conflicts
    await context.isolationManager.addWorkerDelay();
    
    // Click sync button
    await syncButton.click();
    
    // Wait for sync to complete with worker-specific timeout
    await context.page.waitForTimeout(2000 + (context.workerConfig.delayRange[0] / 2));
    
    console.log(`✅ [EnhancedIsolation] Sync completed for worker ${context.workerConfig.workerId}`);
  }

  /**
   * Cleanup isolated test environment
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 [EnhancedIsolation] Starting cleanup for test: ${this.testName}`);

    try {
      // Cleanup data manager
      if (this.dataManager) {
        await this.dataManager.cleanupTestUsers();
      }

      // Cleanup Firebase manager
      if (this.firebaseManager) {
        await this.firebaseManager.cleanup();
      }

      // Cleanup isolation manager
      await this.isolationManager.cleanup();

      console.log(`✅ [EnhancedIsolation] Cleanup completed for test: ${this.testName}`);
    } catch (error) {
      console.error(`❌ [EnhancedIsolation] Cleanup failed for test: ${this.testName}`, error);
    }

    // Remove from instances
    EnhancedTestIsolation.instances.delete(this.isolationManager.getSessionInfo().sessionId);
  }

  /**
   * Emergency cleanup all instances
   */
  static async emergencyCleanup(apiContext: APIRequestContext): Promise<void> {
    console.log(`🚨 [EnhancedIsolation] Emergency cleanup of all instances`);
    
    const cleanupPromises = Array.from(EnhancedTestIsolation.instances.values()).map(instance => 
      instance.cleanup()
    );
    
    await Promise.allSettled(cleanupPromises);
    
    // Also cleanup isolation manager sessions
    await TestIsolationManager.cleanupAllSessions(apiContext);
    
    EnhancedTestIsolation.instances.clear();
    console.log(`✅ [EnhancedIsolation] Emergency cleanup completed`);
  }

  /**
   * Get isolation manager
   */
  getIsolationManager(): TestIsolationManager {
    return this.isolationManager;
  }

  /**
   * Get Firebase manager
   */
  getFirebaseManager(): FirebaseTestManager | null {
    return this.firebaseManager;
  }

  /**
   * Get data manager
   */
  getDataManager(): PlaywrightTestDataManager | null {
    return this.dataManager;
  }
}

/**
 * Utility function to create isolated test environment
 */
export async function createIsolatedTestEnvironment(
  testName: string,
  page: Page,
  apiContext: APIRequestContext,
  options: TestSetupOptions = { testName }
): Promise<IsolatedTestContext> {
  const isolation = new EnhancedTestIsolation(testName, apiContext);
  const partialContext = await isolation.setup(options);
  return await isolation.completeSetup(partialContext, page, apiContext);
}

/**
 * Test fixture for enhanced isolation
 */
export const isolatedTest = test.extend<{ isolatedContext: IsolatedTestContext }>({
  isolatedContext: async ({ page, request }, use, testInfo) => {
    const testName = testInfo.title;
    const context = await createIsolatedTestEnvironment(testName, page, request);
    
    try {
      await use(context);
    } finally {
      // Cleanup after test
      const isolation = new EnhancedTestIsolation(testName, request);
      await isolation.cleanup();
    }
  }
});
