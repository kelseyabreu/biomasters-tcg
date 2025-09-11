import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../database/kysely';
import { PhyloGameAction } from '../../../shared/types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

// Use shared PhyloGameAction instead of local interface
type GameAction = PhyloGameAction;

// interface GameUpdate {
//   type: 'game_state_update' | 'player_joined' | 'player_left' | 'player_ready' | 'game_started' | 'game_ended' | 'turn_change' | 'action_result';
//   sessionId: string;
//   data: any;
//   timestamp: number;
// }

export function setupGameSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env['FRONTEND_URL'] || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
      
      // Get user from database
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', decoded.userId)
        .executeTakeFirst();

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected to game socket`);

    // Join game session
    socket.on('join_session', async (sessionId: string) => {
      try {
        // Verify user is part of this session
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!session) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        const gameState = JSON.parse(session.game_state);
        const isPlayerInGame = gameState.players.some((p: any) => p.id === socket.userId);

        if (!isPlayerInGame) {
          socket.emit('error', { message: 'You are not part of this game session' });
          return;
        }

        socket.sessionId = sessionId;
        socket.join(sessionId);

        // Send current game state
        socket.emit('game_state_update', {
          type: 'game_state_update',
          sessionId,
          data: {
            session: {
              id: session.id,
              hostUserId: session.host_user_id,
              gameMode: session.game_mode,
              isPrivate: session.is_private,
              maxPlayers: session.max_players,
              currentPlayers: session.current_players,
              status: session.status,
              gameState: JSON.parse(session.game_state),
              settings: JSON.parse(session.settings),
              createdAt: session.created_at,
              updatedAt: session.updated_at
            }
          },
          timestamp: Date.now()
        });

        // Notify other players
        socket.to(sessionId).emit('player_joined', {
          type: 'player_joined',
          sessionId,
          data: {
            userId: socket.userId,
            message: 'A player has joined the game'
          },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join game session' });
      }
    });

    // Leave game session
    socket.on('leave_session', () => {
      if (socket.sessionId) {
        socket.to(socket.sessionId).emit('player_left', {
          type: 'player_left',
          sessionId: socket.sessionId,
          data: {
            userId: socket.userId,
            message: 'A player has left the game'
          },
          timestamp: Date.now()
        });

        socket.leave(socket.sessionId);
        (socket as any).sessionId = undefined;
      }
    });

    // Handle game actions
    socket.on('game_action', async (data: { action: GameAction }) => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'You must join a session first' });
        return;
      }

      try {
        // Get current session
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', socket.sessionId)
          .executeTakeFirst();

        if (!session) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        if (session.status !== 'playing') {
          socket.emit('error', { message: 'Game is not in playing state' });
          return;
        }

        const gameState = JSON.parse(session.game_state);

        // Validate it's the player's turn
        const currentPlayer = gameState.players[gameState.currentPlayerIndex || 0];
        if (currentPlayer.id !== socket.userId) {
          socket.emit('error', { message: 'It is not your turn' });
          return;
        }

        // Process the action (simplified for now)
        // In a full implementation, this would use the game logic from gameStateManager
        const actionResult = {
          success: true,
          action: data.action,
          playerId: socket.userId,
          timestamp: Date.now()
        };

        // Update game state (simplified)
        gameState.lastAction = actionResult;
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

        // Save updated game state
        await db
          .updateTable('game_sessions')
          .set({
            game_state: JSON.stringify(gameState),
            updated_at: new Date()
          })
          .where('id', '=', socket.sessionId)
          .execute();

        // Broadcast action result to all players in the session
        io.to(socket.sessionId).emit('action_result', {
          type: 'action_result',
          sessionId: socket.sessionId,
          data: actionResult,
          timestamp: Date.now()
        });

        // Broadcast turn change
        io.to(socket.sessionId).emit('turn_change', {
          type: 'turn_change',
          sessionId: socket.sessionId,
          data: {
            currentPlayer: gameState.players[gameState.currentPlayerIndex],
            turnNumber: (gameState.turnNumber || 0) + 1
          },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error processing game action:', error);
        socket.emit('error', { message: 'Failed to process game action' });
      }
    });

    // Handle player ready status
    socket.on('player_ready', async (data: { ready: boolean }) => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'You must join a session first' });
        return;
      }

      try {
        // This would typically call the REST API endpoint
        // For now, just broadcast the ready status
        socket.to(socket.sessionId).emit('player_ready', {
          type: 'player_ready',
          sessionId: socket.sessionId,
          data: {
            userId: socket.userId,
            ready: data.ready
          },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error updating ready status:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Handle spectator mode
    socket.on('spectate_session', async (sessionId: string) => {
      try {
        // Verify session exists and is public or user has permission
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!session) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        // For now, allow spectating any public game
        if (session.is_private) {
          socket.emit('error', { message: 'Cannot spectate private games' });
          return;
        }

        socket.join(`${sessionId}_spectators`);

        // Send current game state to spectator
        socket.emit('spectator_game_state', {
          type: 'spectator_game_state',
          sessionId,
          data: {
            session: {
              id: session.id,
              gameMode: session.game_mode,
              status: session.status,
              gameState: JSON.parse(session.game_state),
              createdAt: session.created_at
            }
          },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error joining as spectator:', error);
        socket.emit('error', { message: 'Failed to join as spectator' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from game socket`);
      
      if (socket.sessionId) {
        socket.to(socket.sessionId).emit('player_disconnected', {
          type: 'player_disconnected',
          sessionId: socket.sessionId,
          data: {
            userId: socket.userId,
            message: 'A player has disconnected'
          },
          timestamp: Date.now()
        });
      }
    });
  });

  return io;
}
