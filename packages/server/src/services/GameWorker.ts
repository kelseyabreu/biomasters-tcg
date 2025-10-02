import { Redis } from 'ioredis';
import { workerDb as db } from '../database/kysely';
import { SessionLeaseManager } from './SessionLeaseManager';
import { DistributedStateManager } from './DistributedStateManager';
import { SessionStatus, SessionEndReason } from '@kelseyabreu/shared';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string, error?: any) => console.warn(`[WARN] ${msg}`, error),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

export class GameWorker {
  private workerId: string;
  private sessionLeaseManager: SessionLeaseManager;
  private stateManager: DistributedStateManager;

  // State tracking
  private ownedSessions = new Set<string>();
  private activeTimers = new Map<string, NodeJS.Timeout>();

  // Health loops are PART of main process - cannot fail separately
  private heartbeatInterval?: NodeJS.Timeout;
  private leaseRenewalInterval?: NodeJS.Timeout;
  private orphanDetectionInterval?: NodeJS.Timeout;

  constructor(redis: Redis, workerId?: string) {
    this.workerId = workerId || `worker-${Date.now()}-${process.pid}`;
    this.sessionLeaseManager = new SessionLeaseManager(redis, this.workerId);
    this.stateManager = new DistributedStateManager(redis, this.workerId);

    this.setupFailFastHandlers();
  }
  
  /**
   * Start the worker with all background loops
   */
  async start(): Promise<void> {
    logger.info(`Starting GameWorker ${this.workerId}`);

    try {
      this.startCriticalLoops();
      logger.info(`GameWorker ${this.workerId} started successfully`);
    } catch (error) {
      logger.error(`Failed to start GameWorker ${this.workerId}:`, error);
      throw error;
    }
  }

  private setupFailFastHandlers() {
    // If ANY critical system fails, crash immediately
    process.on('uncaughtException', async (error) => {
      logger.error('CRITICAL: Uncaught exception, emergency shutdown', error);
      await this.emergencyShutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      logger.error('CRITICAL: Unhandled rejection, emergency shutdown', reason);
      await this.emergencyShutdown();
      process.exit(1);
    });

    // Graceful shutdown on signals
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }
  
  private startCriticalLoops() {
    // If these fail, worker crashes - no recovery attempts

    // Health heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      await this.criticalOperation('heartbeat', async () => {
        await this.sessionLeaseManager.sendHeartbeat();
      });
    }, 30000);

    // Lease renewal every 30 seconds
    this.leaseRenewalInterval = setInterval(async () => {
      await this.criticalOperation('lease_renewal', async () => {
        await this.renewAllLeases();
      });
    }, 30000);

    // Orphan detection every 60 seconds
    this.orphanDetectionInterval = setInterval(async () => {
      await this.criticalOperation('orphan_detection', async () => {
        await this.detectAndClaimOrphans();
      });
    }, 60000);
  }
  
  // Fail-fast wrapper for critical operations
  private async criticalOperation(operationName: string, operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      logger.error(`CRITICAL FAILURE in ${operationName}:`, error);
      await this.emergencyShutdown();
      process.exit(1); // Crash immediately
    }
  }

  /**
   * Renew leases for all owned sessions
   * Also validates that owned sessions should still be owned
   */
  private async renewAllLeases(): Promise<void> {
    const sessionsToCheck = Array.from(this.ownedSessions);

    // Renew leases
    const renewalPromises = sessionsToCheck.map(sessionId =>
      this.sessionLeaseManager.renewLease(sessionId)
    );
    await Promise.all(renewalPromises);

    // Validate each owned session to see if it should be ended
    for (const sessionId of sessionsToCheck) {
      await this.validateOwnedSession(sessionId);
    }
  }

  /**
   * Validate an owned session to see if it should be ended
   */
  private async validateOwnedSession(sessionId: string): Promise<void> {
    try {
      const session = await db.selectFrom('game_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();

      if (!session) {
        logger.warn(`Owned session ${sessionId} not found in database, cleaning up`);
        await this.cleanupSession(sessionId);
        return;
      }

      // If already finished, clean up
      if (session.status === SessionStatus.FINISHED ||
          session.status === SessionStatus.CANCELLED ||
          session.status === SessionStatus.ABANDONED) {
        logger.info(`Owned session ${sessionId} is ${session.status}, cleaning up`);
        await this.cleanupSession(sessionId);
        return;
      }

      const timeSinceCreated = Date.now() - new Date(session.created_at).getTime();
      const timeSinceUpdate = Date.now() - new Date(session.updated_at).getTime();

      // Check waiting sessions
      if (session.status === SessionStatus.WAITING) {
        if (timeSinceCreated > 300000) { // 5 minutes
          logger.info(`Owned session ${sessionId} in lobby for 5+ minutes, ending`);
          await this.forceEndSession(sessionId, SessionEndReason.LOBBY_TIMEOUT);
        } else if (timeSinceUpdate > 180000) { // 3 minutes
          logger.info(`Owned session ${sessionId} in lobby with 3+ minutes inactivity, ending`);
          await this.forceEndSession(sessionId, SessionEndReason.LOBBY_INACTIVITY);
        }
      }

      // Check playing sessions
      if (session.status === SessionStatus.PLAYING) {
        if (timeSinceUpdate > 600000) { // 10 minutes
          logger.info(`Owned session ${sessionId} inactive for 10+ minutes, ending`);
          await this.forceEndSession(sessionId, SessionEndReason.ABANDONMENT_TIMEOUT);
        } else if (timeSinceUpdate > 180000) { // 3 minutes
          logger.info(`Owned session ${sessionId} inactive for 3+ minutes, ending`);
          await this.forceEndSession(sessionId, SessionEndReason.CONNECTION_TIMEOUT);
        }
      }
    } catch (error) {
      logger.error(`Failed to validate owned session ${sessionId}:`, error);
    }
  }

  async detectAndClaimOrphans(): Promise<void> {
  // Layer 1: Expired Redis leases
  const expiredSessions = await this.sessionLeaseManager.getExpiredLeases();

  // Layer 2: Database staleness check
  const staleSessions = await this.findStaleSessionsInDatabase();

  // Layer 3: Dead worker detection
  const deadWorkerSessions = await this.findDeadWorkerSessions();

  // Layer 4: Abandonment markers (sessions with no connected players)
  const abandonedSessions = await this.checkAbandonmentMarkers();

  // Combine all detected orphans (remove duplicates)
  const allOrphans = new Set([...expiredSessions, ...staleSessions, ...deadWorkerSessions, ...abandonedSessions]);

  if (allOrphans.size > 0) {
    logger.info(`Found ${allOrphans.size} potential orphan sessions`);
  }

  // Attempt to claim each orphaned session
  for (const sessionId of allOrphans) {
    await this.attemptOrphanClaim(sessionId);
  }
}

async findDeadWorkerSessions(): Promise<string[]> {
  try {
    const deadWorkers = await this.sessionLeaseManager.getDeadWorkers();
    const orphanSessions: string[] = [];

    for (const deadWorkerId of deadWorkers) {
      // Find sessions owned by this dead worker in the database
      const sessions = await db
        .selectFrom('game_sessions')
        .select(['id'])
        .where('owner_worker_id' as any, '=', deadWorkerId)
        .where('status', 'in', ['waiting', 'playing'])
        .execute();

      orphanSessions.push(...sessions.map(s => s.id));
    }

    return orphanSessions;
  } catch (error) {
    logger.error(`Failed to find dead worker sessions:`, error);
    return [];
  }
}

async findStaleSessionsInDatabase(): Promise<string[]> {
  try {
    const now = Date.now();
    const waitingStaleThreshold = new Date(now - 300000); // 5 minutes for waiting
    const playingStaleThreshold = new Date(now - 600000); // 10 minutes for playing

    // Find stale waiting sessions (lobby timeout)
    const staleWaitingSessions = await db
      .selectFrom('game_sessions')
      .select('id')
      .where('status', '=', SessionStatus.WAITING)
      .where('created_at', '<', waitingStaleThreshold)
      .execute();

    // Find stale playing sessions (game timeout)
    const stalePlayingSessions = await db
      .selectFrom('game_sessions')
      .select('id')
      .where('status', '=', SessionStatus.PLAYING)
      .where('updated_at', '<', playingStaleThreshold)
      .execute();

    const allStaleSessions = [
      ...staleWaitingSessions.map(s => s.id),
      ...stalePlayingSessions.map(s => s.id)
    ];

    if (allStaleSessions.length > 0) {
      logger.info(`Found ${allStaleSessions.length} stale sessions (${staleWaitingSessions.length} waiting, ${stalePlayingSessions.length} playing)`);
    }

    return allStaleSessions;
  } catch (error) {
    logger.error(`Failed to find stale sessions:`, error);
    return [];
  }
}

/**
 * Check Redis for abandonment markers (sessions with no connected players)
 */
async checkAbandonmentMarkers(): Promise<string[]> {
  try {
    const redis = this.sessionLeaseManager['redis']; // Access Redis from SessionLeaseManager
    const keys = await redis.keys('session:*:abandonment_check');
    const abandonedSessions: string[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      try {
        const { sessionId, markedAt } = JSON.parse(data);
        const timeSinceMarked = Date.now() - markedAt;

        // If marked for 3+ minutes, consider abandoned
        if (timeSinceMarked >= 180000) {
          logger.info(`Session ${sessionId} marked for abandonment ${Math.round(timeSinceMarked / 1000)}s ago`);
          abandonedSessions.push(sessionId);
          await redis.del(key); // Clean up marker
        }
      } catch (parseError) {
        logger.error(`Failed to parse abandonment marker ${key}:`, parseError);
        await redis.del(key); // Clean up invalid marker
      }
    }

    if (abandonedSessions.length > 0) {
      logger.info(`Found ${abandonedSessions.length} sessions marked for abandonment`);
    }

    return abandonedSessions;
  } catch (error) {
    logger.error('Failed to check abandonment markers:', error);
    return [];
  }
}

async attemptOrphanClaim(sessionId: string): Promise<void> {
  const claimed = await this.sessionLeaseManager.acquireLease(sessionId);

  if (claimed) {
    logger.info(`Claimed orphaned session: ${sessionId}`);
    this.ownedSessions.add(sessionId);

    // Log recovery for monitoring
    await this.logRecovery(sessionId, 'claimed_orphan');

    // Validate and resume or end session
    await this.recoverOrphanedSession(sessionId);
  }
}

async recoverOrphanedSession(sessionId: string): Promise<void> {
  const session = await db.selectFrom('game_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    await this.cleanupSession(sessionId);
    return;
  }

  // Handle different statuses - cleanup if already finished
  if (session.status === SessionStatus.FINISHED ||
      session.status === SessionStatus.CANCELLED ||
      session.status === SessionStatus.ABANDONED) {
    await this.cleanupSession(sessionId);
    return;
  }

  const timeSinceCreated = Date.now() - new Date(session.created_at).getTime();
  const timeSinceUpdate = Date.now() - new Date(session.updated_at).getTime();

  // Waiting status (lobby) - shorter timeout
  if (session.status === SessionStatus.WAITING) {
    if (timeSinceCreated > 300000) { // 5 minutes since creation
      logger.info(`Session ${sessionId} in lobby for 5+ minutes, ending due to lobby timeout`);
      await this.forceEndSession(sessionId, SessionEndReason.LOBBY_TIMEOUT);
    } else if (timeSinceUpdate > 180000) { // 3 minutes no activity
      logger.info(`Session ${sessionId} in lobby with 3+ minutes inactivity, ending`);
      await this.forceEndSession(sessionId, SessionEndReason.LOBBY_INACTIVITY);
    } else {
      logger.debug(`Session ${sessionId} in lobby is recent, keeping alive`);
    }
    return;
  }

  // Playing status - longer timeout
  if (session.status === SessionStatus.PLAYING) {
    if (timeSinceUpdate > 600000) { // 10 minutes - abandon
      logger.info(`Session ${sessionId} inactive for 10+ minutes, ending due to abandonment`);
      await this.forceEndSession(sessionId, SessionEndReason.ABANDONMENT_TIMEOUT);
    } else if (timeSinceUpdate > 180000) { // 3 minutes - connection timeout
      logger.info(`Session ${sessionId} inactive for 3+ minutes, ending due to connection timeout`);
      await this.forceEndSession(sessionId, SessionEndReason.CONNECTION_TIMEOUT);
    } else {
      // Recent activity - resume
      logger.info(`Session ${sessionId} has recent activity, resuming`);
      await this.resumeSession(sessionId);
    }
  }
}

/**
 * Log session recovery for monitoring
 */
private async logRecovery(sessionId: string, reason: string): Promise<void> {
  try {
    // TODO: Add to session_recovery_log table after migration
    logger.info(`Session recovery logged: ${sessionId} - ${reason}`);
  } catch (error) {
    logger.error(`Failed to log recovery for session ${sessionId}:`, error);
  }
}

/**
 * Clean up session resources
 */
private async cleanupSession(sessionId: string): Promise<void> {
  try {
    // Release lease
    await this.sessionLeaseManager.releaseLease(sessionId);

    // Clear from memory
    this.ownedSessions.delete(sessionId);
    this.stateManager.clearSessionFromMemory(sessionId);

    // Clear any active timers
    if (this.activeTimers.has(sessionId)) {
      clearTimeout(this.activeTimers.get(sessionId)!);
      this.activeTimers.delete(sessionId);
    }

    logger.debug(`Session ${sessionId} cleaned up`);
  } catch (error) {
    logger.error(`Failed to cleanup session ${sessionId}:`, error);
  }
}

/**
 * Force end a session with a specific reason
 */
private async forceEndSession(sessionId: string, reason: SessionEndReason): Promise<void> {
  try {
    // Update session status in database
    await db
      .updateTable('game_sessions')
      .set({
        status: SessionStatus.FINISHED,
        end_reason: reason,
        ended_at: new Date(),
        updated_at: new Date()
      } as any)
      .where('id', '=', sessionId)
      .execute();

    // Clean up resources
    await this.cleanupSession(sessionId);

    logger.info(`Session ${sessionId} force ended: ${reason}`);
  } catch (error) {
    logger.error(`Failed to force end session ${sessionId}:`, error);
  }
}

/**
 * Resume a session after recovery
 */
private async resumeSession(sessionId: string): Promise<void> {
  try {
    // Load game state
    await this.stateManager.loadGameState(sessionId);

    // TODO: Notify players that session has resumed
    // TODO: Restart turn timers if needed

    logger.info(`Session ${sessionId} resumed successfully`);
  } catch (error) {
    logger.error(`Failed to resume session ${sessionId}:`, error);
    await this.forceEndSession(sessionId, SessionEndReason.RESUME_FAILED);
  }
}

async emergencyShutdown(): Promise<void> {
  logger.info('EMERGENCY SHUTDOWN: Releasing all sessions immediately');

  try {
    // Release all leases immediately (makes sessions claimable)
    const ownedSessions = Array.from(this.ownedSessions);

    await Promise.all(ownedSessions.map(async (sessionId) => {
      try {
        await this.sessionLeaseManager.releaseLease(sessionId);

        // TODO: Notify players of interruption via WebSocket
        logger.debug(`Released lease for session ${sessionId} during emergency shutdown`);
      } catch (error) {
        logger.error(`Failed to release lease for ${sessionId}:`, error);
      }
    }));

    // Clear all timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();

    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.leaseRenewalInterval) clearInterval(this.leaseRenewalInterval);
    if (this.orphanDetectionInterval) clearInterval(this.orphanDetectionInterval);

    // Clear state
    this.ownedSessions.clear();

    logger.info('Emergency shutdown complete');

  } catch (error) {
    logger.error('Error during emergency shutdown:', error);
  }
}

async gracefulShutdown(): Promise<void> {
  logger.info('GRACEFUL SHUTDOWN: Transferring sessions...');

  try {
    const ownedSessions = Array.from(this.ownedSessions);

    if (ownedSessions.length === 0) {
      logger.info('No sessions to transfer');
      process.exit(0);
    }

    // Save all session states to PostgreSQL
    await Promise.all(ownedSessions.map(async (sessionId) => {
      try {
        const gameState = await this.stateManager.loadGameState(sessionId);
        await this.stateManager.saveGameState(sessionId, gameState);
        logger.debug(`Saved state for session ${sessionId}`);
      } catch (error) {
        logger.error(`Failed to save state for session ${sessionId}:`, error);
      }
    }));

    // Release leases (makes sessions claimable by other workers)
    await Promise.all(ownedSessions.map(async (sessionId) => {
      try {
        await this.sessionLeaseManager.releaseLease(sessionId);
        logger.debug(`Released lease for session ${sessionId}`);
      } catch (error) {
        logger.error(`Failed to release lease for session ${sessionId}:`, error);
      }
    }));

    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.leaseRenewalInterval) clearInterval(this.leaseRenewalInterval);
    if (this.orphanDetectionInterval) clearInterval(this.orphanDetectionInterval);

    // Wait for other workers to claim sessions
    logger.info('Waiting for session transfer...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('Graceful shutdown complete');
    process.exit(0);

  } catch (error) {
    logger.error('Error during graceful shutdown, forcing exit:', error);
    await this.emergencyShutdown();
    process.exit(1);
  }
}
}