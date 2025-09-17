/**
 * Test Namespace Helper
 * Provides unique namespaces for test isolation
 */

import { MatchmakingService } from '../../services/MatchmakingService';
import { MatchmakingWorker } from '../../workers/MatchmakingWorker';
import { MatchNotificationService } from '../../services/MatchNotificationService';
import { Redis } from '@upstash/redis';
import { Server } from 'socket.io';

export class TestNamespaceManager {
    private static namespaces: Set<string> = new Set();

    /**
     * Generate a unique namespace for a test
     */
    static generateNamespace(testName: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const namespace = `test_${testName}_${timestamp}_${random}`;
        
        this.namespaces.add(namespace);
        console.log(`🔧 Generated test namespace: ${namespace}`);
        return namespace;
    }

    /**
     * Create a namespaced MatchmakingService for testing
     */
    static createMatchmakingService(namespace: string): MatchmakingService {
        return new MatchmakingService(namespace);
    }

    /**
     * Create a namespaced MatchmakingWorker for testing
     */
    static createMatchmakingWorker(namespace: string): MatchmakingWorker {
        return new MatchmakingWorker(namespace);
    }

    /**
     * Create a namespaced MatchNotificationService for testing
     */
    static createMatchNotificationService(io: Server, namespace: string): MatchNotificationService {
        return new MatchNotificationService(io, namespace);
    }

    /**
     * Clean up a specific namespace
     */
    static async cleanupNamespace(namespace: string): Promise<void> {
        try {
            const redis = new Redis({
                url: process.env['UPSTASH_REDIS_REST_URL']!,
                token: process.env['UPSTASH_REDIS_REST_TOKEN']!,
            });

            const pattern = `${namespace}:*`;
            const keys = await redis.keys(pattern);
            
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`🧹 Cleaned up ${keys.length} keys from namespace: ${namespace}`);
            }

            this.namespaces.delete(namespace);
        } catch (error) {
            console.warn(`⚠️ Failed to cleanup namespace ${namespace}:`, error);
        }
    }

    /**
     * Clean up all test namespaces
     */
    static async cleanupAllNamespaces(): Promise<void> {
        const cleanupPromises = Array.from(this.namespaces).map(namespace => 
            this.cleanupNamespace(namespace)
        );
        
        await Promise.all(cleanupPromises);
        console.log(`🧹 Cleaned up all ${cleanupPromises.length} test namespaces`);
    }

    /**
     * Get all active namespaces (for debugging)
     */
    static getActiveNamespaces(): string[] {
        return Array.from(this.namespaces);
    }
}

/**
 * Test helper for creating isolated test environments
 */
export function createTestEnvironment(testName: string) {
    const namespace = TestNamespaceManager.generateNamespace(testName);
    
    return {
        namespace,
        matchmakingService: TestNamespaceManager.createMatchmakingService(namespace),
        matchmakingWorker: TestNamespaceManager.createMatchmakingWorker(namespace),
        cleanup: () => TestNamespaceManager.cleanupNamespace(namespace)
    };
}

/**
 * Jest setup helper for automatic cleanup
 */
export function setupTestNamespaceCleanup() {
    afterAll(async () => {
        await TestNamespaceManager.cleanupAllNamespaces();
    });
}
