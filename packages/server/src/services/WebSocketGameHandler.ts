import { Server as SocketIOServer, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { GameWorker } from './GameWorker';
import { SessionLeaseManager } from './SessionLeaseManager';
import { DistributedStateManager } from './DistributedStateManager';
import { TurnTimerManager } from './TurnTimerManager';
import { db } from '../database/kysely';

// Simple logger for now
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  warn: (msg: string, error?: any) => console.warn(`[WARN] ${msg}`, error),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error)
};

export class WebSocketGameHandler {
  private io: SocketIOServer;
  private redis: Redis;
  private sessionLeaseManager: SessionLeaseManager;
  private stateManager: DistributedStateManager;
  private turnTimerManager: TurnTimerManager;

  // Track connected players
  private connectedPlayers = new Map<string, { socketId: string; sessionId?: string }>();
  private sessionPlayers = new Map<string, Set<string>>(); // sessionId -> Set of playerIds

  constructor(io: SocketIOServer, redis: Redis, gameWorker: GameWorker) {
    this.io = io;
    this.redis = redis;
    this.sessionLeaseManager = gameWorker['sessionLeaseManager'];
    this.stateManager = gameWorker['stateManager'];
    // Note: TurnTimerManager was removed from GameWorker
    this.turnTimerManager = new (require('./TurnTimerManager').TurnTimerManager)(redis, gameWorker['workerId']);

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.debug(`Player connected: ${socket.id}`);

      // Handle player joining a game session
      socket.on('join_session', async (data: { sessionId: string; playerId: string }) => {
        await this.handleJoinSession(socket, data);
      });

      // Handle player leaving a game session
      socket.on('leave_session', async (data: { sessionId: string; playerId: string }) => {
        await this.handleLeaveSession(socket, data);
      });

      // Handle game actions
      socket.on('game_action', async (data: { sessionId: string; action: any }) => {
        await this.handleGameAction(socket, data);
      });

      // Handle player disconnect
      socket.on('disconnect', async () => {
        await this.handlePlayerDisconnect(socket);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Handle player joining a game session
   */
  private async handleJoinSession(socket: Socket, data: { sessionId: string; playerId: string }): Promise<void> {
    const { sessionId, playerId } = data;
    
    try {
      // Verify session exists and is active
      const session = await db
        .selectFrom('game_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .where('status', 'in', ['waiting', 'playing'])
        .executeTakeFirst();

      if (!session) {
        socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Game session not found or inactive' });
        return;
      }

      // Check if this worker owns the session
      const ownsSession = await this.sessionLeaseManager.verifyOwnership(sessionId);
      if (!ownsSession) {
        // Try to acquire the session
        const acquired = await this.sessionLeaseManager.acquireLease(sessionId);
        if (!acquired) {
          socket.emit('error', { code: 'SESSION_UNAVAILABLE', message: 'Session is owned by another worker' });
          return;
        }
      }

      // Join the socket room
      socket.join(sessionId);
      
      // Track the connection
      this.connectedPlayers.set(playerId, { socketId: socket.id, sessionId });
      
      if (!this.sessionPlayers.has(sessionId)) {
        this.sessionPlayers.set(sessionId, new Set());
      }
      this.sessionPlayers.get(sessionId)!.add(playerId);

      // Load and send current game state
      const gameState = await this.stateManager.loadGameState(sessionId);
      socket.emit('game_state', gameState);

      // Notify other players
      socket.to(sessionId).emit('player_joined', { playerId });

      logger.info(`Player ${playerId} joined session ${sessionId}`);

    } catch (error) {
      logger.error(`Failed to handle join session for ${playerId}:`, error);
      socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join session' });
    }
  }

  /**
   * Handle player leaving a game session
   */
  private async handleLeaveSession(socket: Socket, data: { sessionId: string; playerId: string }): Promise<void> {
    const { sessionId, playerId } = data;
    
    try {
      // Leave the socket room
      socket.leave(sessionId);
      
      // Update tracking
      this.connectedPlayers.delete(playerId);
      this.sessionPlayers.get(sessionId)?.delete(playerId);

      // Notify other players
      socket.to(sessionId).emit('player_left', { playerId });

      // Check if session should be paused or ended
      await this.checkSessionPlayerCount(sessionId);

      logger.info(`Player ${playerId} left session ${sessionId}`);

    } catch (error) {
      logger.error(`Failed to handle leave session for ${playerId}:`, error);
    }
  }

  /**
   * Handle game actions from players
   */
  private async handleGameAction(socket: Socket, data: { sessionId: string; action: any }): Promise<void> {
    const { sessionId, action } = data;
    
    try {
      // Verify we own this session
      const ownsSession = await this.sessionLeaseManager.verifyOwnership(sessionId);
      if (!ownsSession) {
        socket.emit('error', { code: 'SESSION_NOT_OWNED', message: 'This worker does not own the session' });
        return;
      }

      // Rate limiting check (10 actions per minute per player)
      const playerId = action.playerId;
      const rateLimitKey = `rate_limit:${playerId}:${sessionId}`;
      const actionCount = await this.redis.incr(rateLimitKey);
      
      if (actionCount === 1) {
        await this.redis.expire(rateLimitKey, 60); // 1 minute window
      }
      
      if (actionCount > 10) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many actions, please slow down' });
        return;
      }

      // Load current game state
      const currentState = await this.stateManager.loadGameState(sessionId);
      
      // TODO: Process action through game engine
      // const result = gameEngine.processAction(currentState, action);
      
      // For now, just save the action and broadcast
      await this.stateManager.saveGameState(sessionId, currentState, action);
      
      // Broadcast state update to all players in session
      this.io.to(sessionId).emit('game_state_update', {
        gameState: currentState,
        lastAction: action
      });

      // Handle turn timers
      if (action.type === 'PASS_TURN') {
        await this.turnTimerManager.clearTimer(sessionId, playerId);
        // TODO: Start timer for next player
      }

      logger.debug(`Processed action ${action.type} for player ${playerId} in session ${sessionId}`);

    } catch (error) {
      logger.error(`Failed to handle game action:`, error);
      socket.emit('error', { code: 'ACTION_FAILED', message: 'Failed to process action' });
    }
  }

  /**
   * Handle player disconnect
   */
  private async handlePlayerDisconnect(socket: Socket): Promise<void> {
    try {
      // Find the player who disconnected
      let disconnectedPlayerId: string | null = null;
      let sessionId: string | null = null;

      for (const [playerId, playerData] of this.connectedPlayers.entries()) {
        if (playerData.socketId === socket.id) {
          disconnectedPlayerId = playerId;
          sessionId = playerData.sessionId || null;
          break;
        }
      }

      if (disconnectedPlayerId && sessionId) {
        // Remove from tracking
        this.connectedPlayers.delete(disconnectedPlayerId);
        this.sessionPlayers.get(sessionId)?.delete(disconnectedPlayerId);

        // Notify other players
        socket.to(sessionId).emit('player_disconnected', { playerId: disconnectedPlayerId });

        // Check if session should be paused or ended
        await this.checkSessionPlayerCount(sessionId);

        logger.info(`Player ${disconnectedPlayerId} disconnected from session ${sessionId}`);
      }

    } catch (error) {
      logger.error(`Failed to handle player disconnect:`, error);
    }
  }

  /**
   * Check if session has enough players and handle accordingly
   */
  private async checkSessionPlayerCount(sessionId: string): Promise<void> {
    try {
      const connectedCount = this.sessionPlayers.get(sessionId)?.size || 0;
      
      if (connectedCount === 0) {
        // No players connected - start abandonment timer
        logger.info(`No players connected to session ${sessionId}, starting abandonment timer`);
        
        // TODO: Start abandonment timer (3 minutes)
        setTimeout(async () => {
          const stillEmpty = (this.sessionPlayers.get(sessionId)?.size || 0) === 0;
          if (stillEmpty) {
            // Force end session due to abandonment
            await this.forceEndSession(sessionId, 'player_abandonment');
          }
        }, 180000); // 3 minutes
      }
    } catch (error) {
      logger.error(`Failed to check session player count for ${sessionId}:`, error);
    }
  }

  /**
   * Force end a session
   */
  private async forceEndSession(sessionId: string, reason: string): Promise<void> {
    try {
      // Update database
      await db
        .updateTable('game_sessions')
        .set({
          status: 'finished',
          end_reason: reason,
          ended_at: new Date(),
          updated_at: new Date()
        } as any)
        .where('id', '=', sessionId)
        .execute();

      // Notify any remaining players
      this.io.to(sessionId).emit('session_ended', { reason });

      // Clean up tracking
      this.sessionPlayers.delete(sessionId);

      logger.info(`Session ${sessionId} force ended: ${reason}`);

    } catch (error) {
      logger.error(`Failed to force end session ${sessionId}:`, error);
    }
  }

  /**
   * Get connected player count for a session
   */
  getConnectedPlayerCount(sessionId: string): number {
    return this.sessionPlayers.get(sessionId)?.size || 0;
  }

  /**
   * Broadcast message to all players in a session
   */
  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event, data);
  }
}
