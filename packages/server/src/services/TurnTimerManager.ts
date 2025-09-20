import { Redis } from 'ioredis';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

interface TurnTimerData {
  playerId: string;
  startTime: number;
  timeoutAt: number;
  workerId: string;
  sessionId: string;
}

export class TurnTimerManager {
  private redis: Redis;
  private workerId: string;
  private turnTimeoutSeconds: number = 60; // 60 seconds per turn
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(redis: Redis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
  }

  /**
   * Start a turn timer for a player
   */
  async startTurnTimer(sessionId: string, playerId: string, timeoutSeconds: number = this.turnTimeoutSeconds): Promise<void> {
    const timerKey = `session:${sessionId}:turn_timer`;
    const timerData: TurnTimerData = {
      playerId,
      startTime: Date.now(),
      timeoutAt: Date.now() + (timeoutSeconds * 1000),
      workerId: this.workerId,
      sessionId
    };

    try {
      // Clear any existing timer for this session
      await this.clearTurnTimer(sessionId);

      // Store timer in Redis with TTL (extra 5 seconds buffer)
      await this.redis.setex(timerKey, timeoutSeconds + 5, JSON.stringify(timerData));

      // Set up local timeout
      const timeout = setTimeout(async () => {
        await this.handleTurnTimeout(sessionId, playerId);
      }, timeoutSeconds * 1000);

      this.activeTimers.set(sessionId, timeout);

      logger.info(`Turn timer started for player ${playerId} in session ${sessionId} (${timeoutSeconds}s)`);
    } catch (error) {
      logger.error(`Failed to start turn timer for session ${sessionId}:`, error);
    }
  }

  /**
   * Clear a turn timer for a session
   */
  async clearTurnTimer(sessionId: string): Promise<void> {
    const timerKey = `session:${sessionId}:turn_timer`;

    try {
      // Clear Redis timer
      await this.redis.del(timerKey);

      // Clear local timeout
      const timeout = this.activeTimers.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeTimers.delete(sessionId);
      }

      logger.debug(`Turn timer cleared for session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to clear turn timer for session ${sessionId}:`, error);
    }
  }

  /**
   * Get remaining time for a turn timer
   */
  async getRemainingTime(sessionId: string): Promise<number | null> {
    const timerKey = `session:${sessionId}:turn_timer`;

    try {
      const timerDataStr = await this.redis.get(timerKey);
      if (!timerDataStr) return null;

      const timerData: TurnTimerData = JSON.parse(timerDataStr);
      const remaining = timerData.timeoutAt - Date.now();

      return Math.max(0, Math.floor(remaining / 1000)); // Return seconds
    } catch (error) {
      logger.error(`Failed to get remaining time for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Handle turn timeout - auto-pass the turn
   */
  private async handleTurnTimeout(sessionId: string, playerId: string): Promise<void> {
    const timerKey = `session:${sessionId}:turn_timer`;

    try {
      // Check if timer is still valid (not cleared by player action)
      const timerDataStr = await this.redis.get(timerKey);

      if (!timerDataStr) {
        logger.debug(`Turn timer already cleared for session ${sessionId}`);
        return; // Timer was cleared
      }

      const timerData: TurnTimerData = JSON.parse(timerDataStr);

      // Verify this is still our timer
      if (timerData.playerId !== playerId || timerData.workerId !== this.workerId) {
        logger.debug(`Turn timer ownership changed for session ${sessionId}`);
        return; // Not our timer anymore
      }

      // Auto-pass the turn
      await this.autoPassTurn(sessionId, playerId);

      // Clear the timer
      await this.clearTurnTimer(sessionId);

    } catch (error) {
      logger.error(`Failed to handle turn timeout for session ${sessionId}:`, error);
    }
  }

  /**
   * Auto-pass the turn for an AFK player
   */
  private async autoPassTurn(sessionId: string, playerId: string): Promise<void> {
    try {
      logger.info(`Auto-passing turn for player ${playerId} in session ${sessionId} due to timeout`);

      // TODO: Integrate with game engine to process PASS_TURN action
      // This would typically:
      // 1. Load the game state
      // 2. Process a PASS_TURN action for the player
      // 3. Update the game state
      // 4. Notify all players via WebSocket

      // For now, just log the action
      logger.debug(`PASS_TURN action processed for player ${playerId} in session ${sessionId}`);

    } catch (error) {
      logger.error(`Failed to auto-pass turn for player ${playerId} in session ${sessionId}:`, error);
    }
  }

  /**
   * Get all active timers (for monitoring)
   */
  getActiveTimers(): string[] {
    return Array.from(this.activeTimers.keys());
  }

  /**
   * Clear a specific timer
   */
  async clearTimer(sessionId: string, playerId: string): Promise<void> {
    try {
      const timerKey = `timer:${sessionId}:${playerId}`;

      // Clear from Redis
      await this.redis.del(timerKey);

      // Clear local timer if it exists
      if (this.activeTimers.has(sessionId)) {
        clearTimeout(this.activeTimers.get(sessionId)!);
        this.activeTimers.delete(sessionId);
      }

      logger.debug(`Timer cleared for player ${playerId} in session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to clear timer for player ${playerId} in session ${sessionId}:`, error);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info(`Shutting down TurnTimerManager for worker ${this.workerId}`);

    // Clear all active timers
    for (const [sessionId, timeout] of this.activeTimers) {
      clearTimeout(timeout);
      await this.clearTurnTimer(sessionId);
    }

    this.activeTimers.clear();
  }
}