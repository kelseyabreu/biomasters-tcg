/**
 * Test Isolation Manager
 * Ensures proper isolation between parallel test runs to prevent race conditions
 */

import { Page, APIRequestContext } from '@playwright/test';
import { randomBytes } from 'crypto';

export interface TestSession {
  sessionId: string;
  testName: string;
  startTime: number;
  resources: TestResource[];
}

export interface TestResource {
  type: 'user' | 'guest' | 'game' | 'deck' | 'collection';
  id: string;
  identifier: string; // email, username, etc.
  createdAt: number;
}

export class TestIsolationManager {
  private static sessions = new Map<string, TestSession>();
  private sessionId: string;
  private testName: string;
  private apiContext: APIRequestContext;
  private baseApiUrl: string;
  private resources: TestResource[] = [];

  constructor(
    testName: string,
    apiContext: APIRequestContext,
    baseApiUrl: string = 'http://localhost:3001'
  ) {
    this.sessionId = this.generateSessionId();
    this.testName = testName;
    this.apiContext = apiContext;
    this.baseApiUrl = baseApiUrl;
    
    const session: TestSession = {
      sessionId: this.sessionId,
      testName,
      startTime: Date.now(),
      resources: this.resources
    };
    
    TestIsolationManager.sessions.set(this.sessionId, session);
    console.log(`🔒 [TestIsolation] Created session ${this.sessionId} for test: ${testName}`);
  }

  /**
   * Generate a unique session ID for this test run
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `test-${timestamp}-${random}`;
  }

  /**
   * Create a unique identifier for test resources
   */
  createUniqueIdentifier(prefix: string): string {
    const timestamp = Date.now();
    const random = randomBytes(2).toString('hex');
    return `${prefix}-${this.sessionId}-${timestamp}-${random}`;
  }

  /**
   * Create a unique email for testing
   */
  createUniqueEmail(prefix: string = 'test'): string {
    return `${this.createUniqueIdentifier(prefix)}@example.com`;
  }

  /**
   * Create a unique username for testing
   */
  createUniqueUsername(prefix: string = 'testuser'): string {
    return this.createUniqueIdentifier(prefix).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  /**
   * Register a resource created during this test session
   */
  registerResource(type: TestResource['type'], id: string, identifier: string): void {
    const resource: TestResource = {
      type,
      id,
      identifier,
      createdAt: Date.now()
    };
    
    this.resources.push(resource);
    console.log(`📝 [TestIsolation] Registered ${type} resource: ${identifier} (${id})`);
  }

  /**
   * Clean up all resources created during this test session
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 [TestIsolation] Starting cleanup for session ${this.sessionId}`);
    console.log(`📊 [TestIsolation] Resources to clean: ${this.resources.length}`);

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

    // Wait for all cleanup operations to complete
    try {
      await Promise.allSettled(cleanupPromises);
      console.log(`✅ [TestIsolation] Cleanup completed for session ${this.sessionId}`);
    } catch (error) {
      console.error(`❌ [TestIsolation] Cleanup failed for session ${this.sessionId}:`, error);
    }

    // Remove session from registry
    TestIsolationManager.sessions.delete(this.sessionId);
    this.resources = [];
  }

  /**
   * Clean up user resources
   */
  private async cleanupUsers(users: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Cleaning up ${users.length} users`);
    
    const userEmails = users.map(u => u.identifier);
    
    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          userPattern: userEmails.join(','),
          resourceTypes: ['users', 'firebase_users']
        }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`✅ [TestIsolation] Cleaned up users:`, result.data);
      } else {
        console.warn(`⚠️ [TestIsolation] User cleanup response: ${response.status()}`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] User cleanup failed:`, error);
    }
  }

  /**
   * Clean up guest resources
   */
  private async cleanupGuests(guests: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Cleaning up ${guests.length} guests`);
    
    // Guests are typically cleaned up with users, but we can add specific logic here
    const guestIds = guests.map(g => g.id);
    
    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          guestIds: guestIds,
          resourceTypes: ['guests']
        }
      });

      if (response.ok()) {
        console.log(`✅ [TestIsolation] Cleaned up guests`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Guest cleanup failed:`, error);
    }
  }

  /**
   * Clean up game resources
   */
  private async cleanupGames(games: TestResource[]): Promise<void> {
    console.log(`🧹 [TestIsolation] Cleaning up ${games.length} games`);
    
    const gameIds = games.map(g => g.id);
    
    try {
      const response = await this.apiContext.delete(`${this.baseApiUrl}/api/test/cleanup`, {
        data: {
          testRun: this.sessionId,
          gameIds: gameIds,
          resourceTypes: ['games', 'game_sessions']
        }
      });

      if (response.ok()) {
        console.log(`✅ [TestIsolation] Cleaned up games`);
      }
    } catch (error) {
      console.error(`❌ [TestIsolation] Game cleanup failed:`, error);
    }
  }

  /**
   * Get session information
   */
  getSessionInfo(): TestSession {
    return {
      sessionId: this.sessionId,
      testName: this.testName,
      startTime: TestIsolationManager.sessions.get(this.sessionId)?.startTime || Date.now(),
      resources: [...this.resources]
    };
  }

  /**
   * Get all active sessions (for debugging)
   */
  static getAllSessions(): TestSession[] {
    return Array.from(TestIsolationManager.sessions.values());
  }

  /**
   * Clean up all sessions (emergency cleanup)
   */
  static async cleanupAllSessions(apiContext: APIRequestContext, baseApiUrl: string = 'http://localhost:3001'): Promise<void> {
    console.log(`🚨 [TestIsolation] Emergency cleanup of all sessions`);
    
    const sessions = Array.from(TestIsolationManager.sessions.values());
    
    for (const session of sessions) {
      try {
        const manager = new TestIsolationManager(session.testName, apiContext, baseApiUrl);
        manager.sessionId = session.sessionId;
        manager.resources = session.resources;
        await manager.cleanup();
      } catch (error) {
        console.error(`❌ [TestIsolation] Failed to cleanup session ${session.sessionId}:`, error);
      }
    }
    
    TestIsolationManager.sessions.clear();
  }
}
