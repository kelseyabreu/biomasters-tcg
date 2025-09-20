import { Redis } from 'ioredis';
import { db } from '../database/kysely';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string, error?: any) => console.warn(`[WARN] ${msg}`, error),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

export class DistributedStateManager {
  private redis: Redis;
  private workerId: string;
  private cacheExpirySeconds: number = 3600; // 1 hour
  private sessionStates: Map<string, any> = new Map(); // Worker memory cache

  constructor(redis: Redis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
  }

  /**
   * Save game state using write-through pattern: PostgreSQL -> Redis -> Memory
   */
  async saveGameState(sessionId: string, gameState: any, _action?: any): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Verify we own this session
      const ownsSession = await this.verifyOwnership(sessionId);
      if (!ownsSession) {
        throw new Error(`Worker ${this.workerId} does not own session ${sessionId}`);
      }

      // 2. Save to PostgreSQL (source of truth) - wrapped in transaction
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('game_sessions')
          .set({
            game_state: gameState, // Store as JSONB
            last_action_at: new Date(),
            updated_at: new Date()
          } as any)
          .where('id', '=', sessionId)
          .execute();

        // TODO: Log action for debugging/anti-cheat (after migration)
        /*
        if (action) {
          await trx.insertInto('game_action_log')
            .values({
              session_id: sessionId,
              player_id: action.playerId,
              action_type: action.type,
              action_data: action.payload,
              worker_id: this.workerId,
              processing_time_ms: Date.now() - startTime
            })
            .execute();
        }
        */
      });

      // 3. Update Redis cache (can fail without breaking the game)
      try {
        const cacheKey = `session:${sessionId}:state`;
        await this.redis.setex(cacheKey, this.cacheExpirySeconds, JSON.stringify(gameState));
        logger.debug(`Game state cached for session ${sessionId}`);
      } catch (cacheError) {
        logger.warn(`Failed to cache game state for session ${sessionId}:`, cacheError);
        // Don't throw - cache failure is not critical
      }

      // 4. Update worker memory (fastest access)
      this.sessionStates.set(sessionId, gameState);

      logger.debug(`Game state saved for session ${sessionId} in ${Date.now() - startTime}ms`);

    } catch (error) {
      logger.error(`Failed to save game state for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Load game state using read-fallback pattern: Memory -> Redis -> PostgreSQL
   */
  async loadGameState(sessionId: string): Promise<any> {
    try {
      // 1. Check worker memory first (fastest)
      if (this.sessionStates.has(sessionId)) {
        logger.debug(`Game state loaded from memory for session ${sessionId}`);
        return this.sessionStates.get(sessionId);
      }

      // 2. Try Redis cache (fast)
      const cacheKey = `session:${sessionId}:state`;
      const cachedState = await this.redis.get(cacheKey);

      if (cachedState) {
        const gameState = JSON.parse(cachedState);
        this.sessionStates.set(sessionId, gameState); // Cache in memory
        logger.debug(`Game state loaded from cache for session ${sessionId}`);
        return gameState;
      }

      // 3. Fallback to PostgreSQL (authoritative)
      const session = await db
        .selectFrom('game_sessions')
        .select(['game_state'])
        .where('id', '=', sessionId)
        .executeTakeFirst();

      if (!session || !session.game_state) {
        throw new Error(`Session ${sessionId} not found or has no game state`);
      }

      const gameState = JSON.parse(session.game_state as unknown as string);

      // 4. Populate caches for next time
      try {
        await this.redis.setex(cacheKey, this.cacheExpirySeconds, JSON.stringify(gameState));
        this.sessionStates.set(sessionId, gameState);
        logger.debug(`Game state cached from database for session ${sessionId}`);
      } catch (cacheError) {
        logger.warn(`Failed to cache game state from database for session ${sessionId}:`, cacheError);
        // Don't throw - cache failure is not critical
      }

      logger.debug(`Game state loaded from database for session ${sessionId}`);
      return gameState;

    } catch (error) {
      logger.error(`Failed to load game state for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Verify we own this session (check Redis lease)
   */
  async verifyOwnership(sessionId: string): Promise<boolean> {
    try {
      // Check Redis lease (fastest check)
      const leaseKey = `session:${sessionId}:lease`;
      const leaseOwner = await this.redis.get(leaseKey);

      if (leaseOwner !== this.workerId) {
        logger.debug(`Ownership check failed for session ${sessionId}: owner=${leaseOwner}, expected=${this.workerId}`);
        return false;
      }

      return true;

    } catch (error) {
      logger.error(`Failed to verify ownership for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Clear session from memory cache
   */
  clearSessionFromMemory(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    logger.debug(`Session ${sessionId} cleared from memory`);
  }

  /**
   * Get all sessions in memory (for monitoring)
   */
  getSessionsInMemory(): string[] {
    return Array.from(this.sessionStates.keys());
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info(`Shutting down DistributedStateManager for worker ${this.workerId}`);
    this.sessionStates.clear();
  }
}