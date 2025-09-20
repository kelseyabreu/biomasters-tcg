import { Redis } from 'ioredis';
import { db } from '../database/kysely';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

export class SessionLeaseManager {
  private redis: Redis;
  private workerId: string;
  private leaseTTL: number = 60; // 60 seconds
  private renewalInterval: number = 30; // 30 seconds
  private heartbeatTTL: number = 90; // 90 seconds
  private heartbeatInterval: number = 30; // 30 seconds
  private renewalTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimer?: NodeJS.Timeout | undefined;

  constructor(redis: Redis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
    this.startHeartbeat();
  }

  /**
   * Attempt to acquire a lease for a session using Redis SET NX
   */
  async acquireLease(sessionId: string): Promise<boolean> {
    const leaseKey = `session:${sessionId}:lease`;

    try {
      // Use SET NX with TTL - atomic operation
      const result = await this.redis.set(
        leaseKey,
        this.workerId,
        'EX',
        this.leaseTTL,
        'NX'
      );

      if (result === 'OK') {
        // Update database ownership
        await this.updateDatabaseOwnership(sessionId, this.workerId);

        logger.info(`Worker ${this.workerId} acquired lease for session ${sessionId}`);
        this.startLeaseRenewal(sessionId);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to acquire lease for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Release a lease for a session (only if we own it)
   */
  async releaseLease(sessionId: string): Promise<boolean> {
    const leaseKey = `session:${sessionId}:lease`;

    try {
      // Only release if we own it (Lua script for atomicity)
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, leaseKey, this.workerId);

      if (result === 1) {
        // Clear database ownership
        await this.updateDatabaseOwnership(sessionId, null);

        logger.info(`Worker ${this.workerId} released lease for session ${sessionId}`);
        this.stopLeaseRenewal(sessionId);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to release lease for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Check if we own a lease
   */
  async ownsLease(sessionId: string): Promise<boolean> {
    const leaseKey = `session:${sessionId}:lease`;

    try {
      const owner = await this.redis.get(leaseKey);
      return owner === this.workerId;
    } catch (error) {
      logger.error(`Failed to check lease ownership for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Renew a lease we own (fail-fast if we don't own it)
   */
  async renewLease(sessionId: string): Promise<boolean> {
    const leaseKey = `session:${sessionId}:lease`;

    try {
      // Only renew if we own it (Lua script for atomicity)
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("EXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, leaseKey, this.workerId, this.leaseTTL);

      if (result === 1) {
        // Update database lease expiry and heartbeat
        await this.updateDatabaseHeartbeat(sessionId);

        logger.debug(`Worker ${this.workerId} renewed lease for session ${sessionId}`);
        return true;
      } else {
        logger.warn(`Worker ${this.workerId} lost lease for session ${sessionId}`);
        this.stopLeaseRenewal(sessionId);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to renew lease for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Update database ownership
   */
  private async updateDatabaseOwnership(sessionId: string, workerId: string | null): Promise<void> {
    try {
      const leaseExpiresAt = workerId ? new Date(Date.now() + this.leaseTTL * 1000) : null;

      await db
        .updateTable('game_sessions')
        .set({
          owner_worker_id: workerId,
          lease_expires_at: leaseExpiresAt,
          last_heartbeat_at: new Date()
        } as any)
        .where('id', '=', sessionId)
        .execute();

      logger.debug(`Database ownership updated for session ${sessionId} (worker: ${workerId})`);
    } catch (error) {
      logger.error(`Failed to update database ownership for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update database heartbeat
   */
  private async updateDatabaseHeartbeat(sessionId: string): Promise<void> {
    try {
      const leaseExpiresAt = new Date(Date.now() + this.leaseTTL * 1000);

      await db
        .updateTable('game_sessions')
        .set({
          lease_expires_at: leaseExpiresAt,
          last_heartbeat_at: new Date()
        } as any)
        .where('id', '=', sessionId)
        .where('owner_worker_id' as any, '=', this.workerId)
        .execute();

      logger.debug(`Database heartbeat updated for session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to update database heartbeat for session ${sessionId}:`, error);
    }
  }

  /**
   * Start automatic lease renewal for a session
   */
  private startLeaseRenewal(sessionId: string): void {
    // Clear any existing timer
    this.stopLeaseRenewal(sessionId);

    const timer = setInterval(async () => {
      const renewed = await this.renewLease(sessionId);
      if (!renewed) {
        this.stopLeaseRenewal(sessionId);
      }
    }, this.renewalInterval * 1000);

    this.renewalTimers.set(sessionId, timer);
  }

  /**
   * Stop automatic lease renewal for a session
   */
  private stopLeaseRenewal(sessionId: string): void {
    const timer = this.renewalTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.renewalTimers.delete(sessionId);
    }
  }

  /**
   * Start worker heartbeat
   */
  private startHeartbeat(): void {
    const updateHeartbeat = async () => {
      try {
        const heartbeatKey = `worker:${this.workerId}:health`;
        await this.redis.setex(heartbeatKey, this.heartbeatTTL, Date.now().toString());
        logger.debug(`Worker ${this.workerId} heartbeat updated`);
      } catch (error) {
        logger.error(`Failed to update heartbeat for worker ${this.workerId}:`, error);
      }
    };

    // Initial heartbeat
    updateHeartbeat();

    // Recurring heartbeat
    this.heartbeatTimer = setInterval(updateHeartbeat, this.heartbeatInterval * 1000);
  }

  /**
   * Stop worker heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Get all expired leases (for orphan detection)
   */
  async getExpiredLeases(): Promise<string[]> {
    try {
      const pattern = 'session:*:lease';
      const keys = await this.redis.keys(pattern);
      const expiredSessions: string[] = [];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) { // Key doesn't exist (expired)
          const sessionId = key.split(':')[1];
          if (sessionId) {
            expiredSessions.push(sessionId);
          }
        }
      }

      return expiredSessions;
    } catch (error) {
      logger.error('Failed to get expired leases:', error);
      return [];
    }
  }

  /**
   * Get all dead workers (for orphan detection)
   */
  async getDeadWorkers(): Promise<string[]> {
    try {
      const pattern = 'worker:*:health';
      const keys = await this.redis.keys(pattern);
      const deadWorkers: string[] = [];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) { // Key doesn't exist (expired)
          const workerId = key.split(':')[1];
          if (workerId) {
            deadWorkers.push(workerId);
          }
        }
      }

      return deadWorkers;
    } catch (error) {
      logger.error('Failed to get dead workers:', error);
      return [];
    }
  }

  /**
   * Send worker heartbeat
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const healthKey = `worker:${this.workerId}:health`;
      const healthData = `${Date.now()}:${this.renewalTimers.size}`;

      await this.redis.setex(healthKey, 90, healthData); // 90 second TTL
      logger.debug(`Heartbeat sent for worker ${this.workerId}`);
    } catch (error) {
      logger.error(`Failed to send heartbeat for worker ${this.workerId}:`, error);
      throw error;
    }
  }

  /**
   * Verify ownership of a session
   */
  async verifyOwnership(sessionId: string): Promise<boolean> {
    try {
      const leaseKey = `session:${sessionId}:lease`;
      const leaseValue = await this.redis.get(leaseKey);

      if (!leaseValue) {
        return false;
      }

      const [ownerId] = leaseValue.split(':');
      return ownerId === this.workerId;
    } catch (error) {
      logger.error(`Failed to verify ownership for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info(`Shutting down SessionLeaseManager for worker ${this.workerId}`);

    // Stop heartbeat
    this.stopHeartbeat();

    // Release all leases
    const sessionIds = Array.from(this.renewalTimers.keys());
    for (const sessionId of sessionIds) {
      await this.releaseLease(sessionId);
    }

    // Clear all timers
    for (const timer of this.renewalTimers.values()) {
      clearInterval(timer);
    }
    this.renewalTimers.clear();
  }
}