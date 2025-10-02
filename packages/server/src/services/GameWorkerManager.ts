import { Redis } from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { GameWorker } from './GameWorker';
import { WebSocketGameHandler } from './WebSocketGameHandler';
import { workerDb as db } from '../database/kysely';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string, error?: any) => console.warn(`[WARN] ${msg}`, error),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

/**
 * GameWorkerManager - Orchestrates the distributed game worker system
 * 
 * This is the main entry point for the 4-phase distributed worker system:
 * Phase 1: Distributed Leasing System ✅
 * Phase 2: State Management Hierarchy ✅  
 * Phase 3: Failure & Recovery Logic ✅
 * Phase 4: Implementation Details & Monitoring ✅
 */
export class GameWorkerManager {
  private redis: Redis;
  private io?: SocketIOServer;
  private gameWorker?: GameWorker;
  private webSocketHandler?: WebSocketGameHandler;
  private workerId: string;
  private isInitialized = false;

  // Health monitoring
  private healthCheckInterval?: NodeJS.Timeout;
  private healthCheckIntervalMs = 30000; // 30 seconds

  constructor(redis: Redis, workerId?: string) {
    this.redis = redis;
    this.workerId = workerId || `worker-${Date.now()}-${process.pid}`;
  }

  /**
   * Initialize the complete distributed worker system
   */
  async initialize(io?: SocketIOServer): Promise<void> {
    if (this.isInitialized) {
      logger.warn('GameWorkerManager already initialized');
      return;
    }

    try {
      logger.info(`Initializing GameWorkerManager with worker ID: ${this.workerId}`);

      // Phase 1 & 2: Initialize GameWorker (includes leasing and state management)
      this.gameWorker = new GameWorker(this.redis, this.workerId);
      await this.gameWorker.start();

      // Phase 3: Initialize WebSocket handler for real-time communication
      if (io) {
        this.io = io;
        this.webSocketHandler = new WebSocketGameHandler(io, this.redis, this.gameWorker);
        logger.info('WebSocket game handler initialized');
      }

      // Phase 4: Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info(`GameWorkerManager initialized successfully`);

    } catch (error) {
      logger.error('Failed to initialize GameWorkerManager:', error);
      throw error;
    }
  }

  /**
   * Phase 4: Health monitoring and metrics
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, this.healthCheckIntervalMs);

    logger.debug('Health monitoring started');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check Redis connectivity
      await this.redis.ping();

      // Check database connectivity
      await db.selectFrom('game_sessions').select('id').limit(1).execute();

      // Check worker status
      if (this.gameWorker) {
        const ownedSessions = this.gameWorker['ownedSessions'].size;
        const memoryUsage = process.memoryUsage();
        
        // Log health metrics
        logger.debug(`Health check passed - Sessions: ${ownedSessions}, Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);

        // Store health metrics in Redis for monitoring
        const healthData = {
          workerId: this.workerId,
          timestamp: Date.now(),
          ownedSessions,
          memoryUsage: memoryUsage.heapUsed,
          uptime: process.uptime()
        };

        await this.redis.setex(
          `worker:${this.workerId}:health_metrics`,
          120, // 2 minutes TTL
          JSON.stringify(healthData)
        );
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get worker health status
   */
  async getHealthStatus(): Promise<{
    workerId: string;
    isHealthy: boolean;
    ownedSessions: number;
    memoryUsage: number;
    uptime: number;
    lastHealthCheck: number;
  }> {
    try {
      const ownedSessions = this.gameWorker?.['ownedSessions'].size || 0;
      const memoryUsage = process.memoryUsage().heapUsed;
      const uptime = process.uptime();

      return {
        workerId: this.workerId,
        isHealthy: this.isInitialized && !!this.gameWorker,
        ownedSessions,
        memoryUsage,
        uptime,
        lastHealthCheck: Date.now()
      };

    } catch (error) {
      logger.error('Failed to get health status:', error);
      return {
        workerId: this.workerId,
        isHealthy: false,
        ownedSessions: 0,
        memoryUsage: 0,
        uptime: 0,
        lastHealthCheck: Date.now()
      };
    }
  }

  /**
   * Get comprehensive worker metrics
   */
  async getWorkerMetrics(): Promise<{
    workerId: string;
    ownedSessions: string[];
    connectedPlayers: number;
    redisConnected: boolean;
    databaseConnected: boolean;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  }> {
    try {
      const ownedSessions = Array.from(this.gameWorker?.['ownedSessions'] || []);
      const connectedPlayers = this.webSocketHandler ? 
        ownedSessions.reduce((total, sessionId) => 
          total + this.webSocketHandler!.getConnectedPlayerCount(sessionId), 0) : 0;

      // Test connections
      let redisConnected = false;
      let databaseConnected = false;

      try {
        await this.redis.ping();
        redisConnected = true;
      } catch (e) {
        // Redis not connected
      }

      try {
        await db.selectFrom('game_sessions').select('id').limit(1).execute();
        databaseConnected = true;
      } catch (e) {
        // Database not connected
      }

      return {
        workerId: this.workerId,
        ownedSessions,
        connectedPlayers,
        redisConnected,
        databaseConnected,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

    } catch (error) {
      logger.error('Failed to get worker metrics:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of the entire worker system
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down GameWorkerManager...');

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Shutdown game worker (handles session transfer)
      if (this.gameWorker) {
        await this.gameWorker['gracefulShutdown']();
      }

      // Close WebSocket connections
      if (this.io) {
        this.io.close();
      }

      this.isInitialized = false;
      logger.info('GameWorkerManager shutdown complete');

    } catch (error) {
      logger.error('Error during GameWorkerManager shutdown:', error);
      throw error;
    }
  }

  /**
   * Emergency shutdown (fail-fast)
   */
  async emergencyShutdown(): Promise<void> {
    logger.error('EMERGENCY SHUTDOWN: GameWorkerManager');

    try {
      // Stop health monitoring immediately
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Emergency shutdown game worker
      if (this.gameWorker) {
        await this.gameWorker['emergencyShutdown']();
      }

      // Force close WebSocket connections
      if (this.io) {
        this.io.close();
      }

      this.isInitialized = false;
      logger.info('Emergency shutdown complete');

    } catch (error) {
      logger.error('Error during emergency shutdown:', error);
    }
  }

  /**
   * Check if the worker manager is ready to handle requests
   */
  isReady(): boolean {
    return this.isInitialized && !!this.gameWorker;
  }

  /**
   * Get the underlying game worker (for advanced usage)
   */
  getGameWorker(): GameWorker | undefined {
    return this.gameWorker;
  }

  /**
   * Get the WebSocket handler (for advanced usage)
   */
  getWebSocketHandler(): WebSocketGameHandler | undefined {
    return this.webSocketHandler;
  }

  /**
   * Get worker ID
   */
  getWorkerId(): string {
    return this.workerId;
  }
}

// Singleton instance for the application
let gameWorkerManagerInstance: GameWorkerManager | null = null;

/**
 * Get or create the singleton GameWorkerManager instance
 */
export function getGameWorkerManager(redis?: Redis, workerId?: string): GameWorkerManager {
  if (!gameWorkerManagerInstance) {
    if (!redis) {
      throw new Error('Redis instance required to create GameWorkerManager');
    }
    gameWorkerManagerInstance = new GameWorkerManager(redis, workerId);
  }
  return gameWorkerManagerInstance;
}

/**
 * Initialize the global game worker manager
 */
export async function initializeGameWorkerManager(redis: Redis, io?: SocketIOServer, workerId?: string): Promise<GameWorkerManager> {
  const manager = getGameWorkerManager(redis, workerId);
  await manager.initialize(io);
  return manager;
}
