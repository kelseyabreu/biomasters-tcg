/**
 * Enhanced Test Isolation Manager
 * Ensures proper isolation between parallel test runs with worker-specific resources
 */

import { Page, APIRequestContext } from '@playwright/test';
import { randomBytes } from 'crypto';

export interface TestSession {
  sessionId: string;
  workerId: string;
  testName: string;
  startTime: number;
  resources: TestResource[];
  databasePrefix: string;
  firebaseProjectSuffix: string;
}

export interface TestResource {
  type: 'user' | 'guest' | 'game' | 'deck' | 'collection' | 'signing_key';
  id: string;
  identifier: string; // email, username, etc.
  createdAt: number;
  workerId: string;
}

export interface WorkerIsolationConfig {
  workerId: string;
  databasePrefix: string;
  firebaseProjectSuffix: string;
  serverPort: number;
  frontendPort: number;
  delayRange: [number, number]; // Random delay range to prevent timing conflicts
}

export class TestIsolationManager {
  private static sessions = new Map<string, TestSession>();
  private static workerConfigs = new Map<string, WorkerIsolationConfig>();
  private sessionId: string;
  private workerId: string;
  private testName: string;
  private apiContext: APIRequestContext;
  private baseApiUrl: string;
  private resources: TestResource[] = [];
  private config: WorkerIsolationConfig;

  constructor(
    testName: string,
    apiContext: APIRequestContext,
    baseApiUrl: string = 'http://localhost:3001'
  ) {
    this.workerId = this.getWorkerId();
    this.sessionId = this.generateSessionId();
    this.testName = testName;
    this.apiContext = apiContext;
    this.baseApiUrl = baseApiUrl;
    this.config = this.getOrCreateWorkerConfig();

    const session: TestSession = {
      sessionId: this.sessionId,
      workerId: this.workerId,
      testName,
      startTime: Date.now(),
      resources: this.resources,
      databasePrefix: this.config.databasePrefix,
      firebaseProjectSuffix: this.config.firebaseProjectSuffix
    };

    TestIsolationManager.sessions.set(this.sessionId, session);
    console.log(`🔒 [TestIsolation] Created session ${this.sessionId} for worker ${this.workerId}, test: ${testName}`);
  }

  /**
   * Get or detect the current worker ID
   */
  private getWorkerId(): string {
    // Try to get worker ID from environment or process
    const workerId = process.env.PLAYWRIGHT_WORKER_ID ||
                    process.env.TEST_WORKER_INDEX ||
                    process.pid.toString();
    return `worker-${workerId}`;
  }

  /**
   * Get or create worker-specific configuration
   */
  private getOrCreateWorkerConfig(): WorkerIsolationConfig {
    if (TestIsolationManager.workerConfigs.has(this.workerId)) {
      return TestIsolationManager.workerConfigs.get(this.workerId)!;
    }

    const workerIndex = parseInt(this.workerId.replace('worker-', '')) || 0;
    const config: WorkerIsolationConfig = {
      workerId: this.workerId,
      databasePrefix: `test_w${workerIndex}_`,
      firebaseProjectSuffix: `w${workerIndex}`,
      serverPort: 3001 + workerIndex, // Different ports per worker if needed
      frontendPort: 5173 + workerIndex,
      delayRange: [workerIndex * 100, (workerIndex + 1) * 100] // Staggered delays
    };

    TestIsolationManager.workerConfigs.set(this.workerId, config);
    console.log(`🔧 [TestIsolation] Created worker config for ${this.workerId}:`, config);
    return config;
  }

  /**
   * Generate a unique session ID for this test run
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${this.workerId}-${timestamp}-${random}`;
  }

  /**
   * Create a unique identifier for test resources with worker isolation
   */
  createUniqueIdentifier(prefix: string): string {
    const timestamp = Date.now();
    const random = randomBytes(2).toString('hex');
    return `${this.config.databasePrefix}${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a unique email for testing with worker isolation
   */
  createUniqueEmail(prefix: string = 'test'): string {
    return `${this.createUniqueIdentifier(prefix)}@example.com`;
  }

  /**
   * Create a unique username for testing with worker isolation
   */
  createUniqueUsername(prefix: string = 'testuser'): string {
    return this.createUniqueIdentifier(prefix).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  /**
   * Add random delay to prevent timing conflicts between workers
   */
  async addWorkerDelay(): Promise<void> {
    const [min, max] = this.config.delayRange;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏱️ [TestIsolation] Worker ${this.workerId} waiting ${delay}ms to prevent conflicts`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Register a resource created during this test session with worker tracking
   */
  registerResource(type: TestResource['type'], id: string, identifier: string): void {
    const resource: TestResource = {
      type,
      id,
      identifier,
      createdAt: Date.now(),
      workerId: this.workerId
    };

    this.resources.push(resource);
    console.log(`📝 [TestIsolation] Worker ${this.workerId} registered ${type} resource: ${identifier} (${id})`);
  }

  /**
   * Get worker-specific database table prefix
   */
  getDatabasePrefix(): string {
    return this.config.databasePrefix;
  }

  /**
   * Get worker-specific Firebase project suffix
   */
  getFirebaseProjectSuffix(): string {
    return this.config.firebaseProjectSuffix;
  }

  /**
   * Get worker configuration
   */
  getWorkerConfig(): WorkerIsolationConfig {
    return { ...this.config };
  }

  /**
   * Clean up all resources created during this test session with worker isolation
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 [TestIsolation] Starting cleanup for worker ${this.workerId}, session ${this.sessionId}`);
    console.log(`📊 [TestIsolation] Resources to clean: ${this.resources.length}`);

    // Add worker delay to prevent cleanup conflicts
    await this.addWorkerDelay();

    const cleanupPromises: Promise<void>[] = [];

    // Group resources by type for efficient cleanup
    const resourcesByType = this.resources.reduce((acc, resource) => {
      if (!acc[resource.type]) acc[resource.type] = [];
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, TestResource[]>);

    // Clean up users (includes Firebase and database)
    if (resourcesByType.user) {
      cleanupPromises.push(this.cleanupUsers(resourcesByType.user));
    }

    // Clean up guests
    if (resourcesByType.guest) {
      cleanupPromises.push(this.cleanupGuests(resourcesByType.guest));
    }

    // Clean up games
    if (resourcesByType.game) {
      cleanupPromises.push(this.cleanupGames(resourcesByType.game));
    }

    // Clean up signing keys
    if (resourcesByType.signing_key) {
      cleanupPromises.push(this.cleanupSigningKeys(resourcesByType.signing_key));
    }

    // Wait for all cleanup operations to complete
    try {
      await Promise.allSettled(cleanupPromises);
      console.log(`✅ [TestIsolation] Cleanup completed for worker ${this.workerId}, session ${this.sessionId}`);
    } catch (error) {
      console.error(`❌ [TestIsolation] Cleanup failed for worker ${this.workerId}, session ${this.sessionId}:`, error);
    }

    // Remove session from registry
    TestIsolationManager.sessions.delete(this.sessionId);
    this.resources = [];
  }

  /**
   * Clean up user resources with worker isolation
   */
  private async cleanupUsers(users: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Worker ${this.workerId} cleaning up ${users.length} users`);

    const userEmails = users.map(u => u.identifier);

    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          workerId: this.workerId,
          databasePrefix: this.config.databasePrefix,
          userPattern: userEmails.join(','),
          resourceTypes: ['users', 'firebase_users', 'user_cards', 'user_decks', 'user_transactions']
        }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`✅ [TestIsolation] Worker ${this.workerId} cleaned up users:`, result.data);
      } else {
        console.warn(`⚠️ [TestIsolation] Worker ${this.workerId} user cleanup response: ${response.status()}`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Worker ${this.workerId} user cleanup failed:`, error);
    }
  }

  /**
   * Clean up guest resources with worker isolation
   */
  private async cleanupGuests(guests: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Worker ${this.workerId} cleaning up ${guests.length} guests`);

    const guestIds = guests.map(g => g.id);

    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          workerId: this.workerId,
          databasePrefix: this.config.databasePrefix,
          guestIds: guestIds,
          resourceTypes: ['guests', 'guest_sessions']
        }
      });

      if (response.ok()) {
        console.log(`✅ [TestIsolation] Worker ${this.workerId} cleaned up guests`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Worker ${this.workerId} guest cleanup failed:`, error);
    }
  }

  /**
   * Clean up game resources with worker isolation
   */
  private async cleanupGames(games: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Worker ${this.workerId} cleaning up ${games.length} games`);

    const gameIds = games.map(g => g.id);

    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          workerId: this.workerId,
          databasePrefix: this.config.databasePrefix,
          gameIds: gameIds,
          resourceTypes: ['games', 'game_sessions', 'game_actions']
        }
      });

      if (response.ok()) {
        console.log(`✅ [TestIsolation] Worker ${this.workerId} cleaned up games`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Worker ${this.workerId} game cleanup failed:`, error);
    }
  }

  /**
   * Clean up signing key resources with worker isolation
   */
  private async cleanupSigningKeys(keys: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Worker ${this.workerId} cleaning up ${keys.length} signing keys`);

    const keyIds = keys.map(k => k.id);

    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          workerId: this.workerId,
          databasePrefix: this.config.databasePrefix,
          keyIds: keyIds,
          resourceTypes: ['signing_keys']
        }
      });

      if (response.ok()) {
        console.log(`✅ [TestIsolation] Worker ${this.workerId} cleaned up signing keys`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Worker ${this.workerId} signing key cleanup failed:`, error);
    }
  }

  /**
   * Get session information with worker details
   */
  getSessionInfo(): TestSession {
    return {
      sessionId: this.sessionId,
      workerId: this.workerId,
      testName: this.testName,
      startTime: TestIsolationManager.sessions.get(this.sessionId)?.startTime || Date.now(),
      resources: [...this.resources],
      databasePrefix: this.config.databasePrefix,
      firebaseProjectSuffix: this.config.firebaseProjectSuffix
    };
  }

  /**
   * Get all active sessions (for debugging)
   */
  static getAllSessions(): TestSession[] {
    return Array.from(TestIsolationManager.sessions.values());
  }

  /**
   * Get sessions for a specific worker
   */
  static getWorkerSessions(workerId: string): TestSession[] {
    return Array.from(TestIsolationManager.sessions.values())
      .filter(session => session.workerId === workerId);
  }

  /**
   * Get all worker configurations
   */
  static getAllWorkerConfigs(): WorkerIsolationConfig[] {
    return Array.from(TestIsolationManager.workerConfigs.values());
  }

  /**
   * Clean up all sessions (emergency cleanup) with worker awareness
   */
  static async cleanupAllSessions(apiContext: APIRequestContext, baseApiUrl: string = 'http://localhost:3001'): Promise<void> {
    console.log(`🚨 [TestIsolation] Emergency cleanup of all sessions across all workers`);

    const sessions = Array.from(TestIsolationManager.sessions.values());
    const workerGroups = sessions.reduce((acc, session) => {
      if (!acc[session.workerId]) acc[session.workerId] = [];
      acc[session.workerId].push(session);
      return acc;
    }, {} as Record<string, TestSession[]>);

    // Clean up each worker's sessions in parallel
    const workerCleanupPromises = Object.entries(workerGroups).map(async ([workerId, workerSessions]) => {
      console.log(`🧹 [TestIsolation] Cleaning up ${workerSessions.length} sessions for ${workerId}`);

      for (const session of workerSessions) {
        try {
          const manager = new TestIsolationManager(session.testName, apiContext, baseApiUrl);
          manager.sessionId = session.sessionId;
          manager.workerId = session.workerId;
          manager.resources = session.resources;
          await manager.cleanup();
        } catch (error) {
          console.error(`❌ [TestIsolation] Failed to cleanup session ${session.sessionId} for ${workerId}:`, error);
        }
      }
    });

    await Promise.allSettled(workerCleanupPromises);

    TestIsolationManager.sessions.clear();
    TestIsolationManager.workerConfigs.clear();
    console.log(`✅ [TestIsolation] Emergency cleanup completed for all workers`);
  }

  /**
   * Clean up sessions for a specific worker
   */
  static async cleanupWorkerSessions(workerId: string, apiContext: APIRequestContext, baseApiUrl: string = 'http://localhost:3001'): Promise<void> {
    console.log(`🧹 [TestIsolation] Cleaning up sessions for worker ${workerId}`);

    const workerSessions = TestIsolationManager.getWorkerSessions(workerId);

    for (const session of workerSessions) {
      try {
        const manager = new TestIsolationManager(session.testName, apiContext, baseApiUrl);
        manager.sessionId = session.sessionId;
        manager.workerId = session.workerId;
        manager.resources = session.resources;
        await manager.cleanup();
      } catch (error) {
        console.error(`❌ [TestIsolation] Failed to cleanup session ${session.sessionId} for ${workerId}:`, error);
      }
    }

    // Remove worker config
    TestIsolationManager.workerConfigs.delete(workerId);
    console.log(`✅ [TestIsolation] Cleanup completed for worker ${workerId}`);
  }
}
