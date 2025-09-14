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
        console.error('❌ WebSocket auth: No token provided');
        return next(new Error('Authentication token required'));
      }

      console.log(`🔍 WebSocket auth: Verifying token...`);
      const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
      console.log(`🔍 WebSocket auth: Decoded token:`, { userId: decoded.userId, guestId: decoded.guestId, isGuest: decoded.isGuest });

      // Get user from database
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', decoded.userId)
        .executeTakeFirst();

      if (!user) {
        console.error(`❌ WebSocket auth: User not found for ID: ${decoded.userId}`);
        return next(new Error('User not found'));
      }

      console.log(`✅ WebSocket auth: User found: ${user.id} (${user.username})`);
      socket.userId = user.id;
      next();
    } catch (error) {
      console.error('❌ WebSocket auth error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected to game socket`);

    // Join game session
    socket.on('join_session', async (sessionId: string) => {
      try {
        console.log(`🔍 User ${socket.userId} attempting to join session: ${sessionId}`);

        // Verify user is part of this session
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!session) {
          console.error(`❌ Game session not found: ${sessionId}`);
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        console.log(`✅ Found session: ${sessionId}, status: ${session.status}`);
        const gameState = session.game_state as any; // JSONB is already an object
        console.log(`🔍 Game state players:`, gameState.players.map((p: any) => ({ id: p.id, name: p.name })));
        console.log(`🔍 Socket user ID: ${socket.userId}`);

        const isPlayerInGame = gameState.players.some((p: any) => p.id === socket.userId);
        console.log(`🔍 Is player in game: ${isPlayerInGame}`);

        if (!isPlayerInGame) {
          console.error(`❌ User ${socket.userId} not part of session ${sessionId}`);
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
              gameState: session.game_state,
              settings: session.settings,
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

        // Check if all players have joined and start the game
        const connectedSockets = await io.in(sessionId).fetchSockets();
        console.log(`🔍 Session ${sessionId}: ${connectedSockets.length}/${session.max_players} players connected`);

        if (connectedSockets.length >= session.max_players && session.status === 'waiting') {
          console.log(`🎮 Starting game for session ${sessionId}`);

          // Update game state to playing (preserve all existing properties)
          const updatedGameState = {
            ...gameState,
            gamePhase: 'playing',
            // Ensure turn management is properly set
            currentPlayerIndex: gameState.currentPlayerIndex || 0,
            turnNumber: gameState.turnNumber || 1
          };

          console.log(`🔍 Updated game state:`, {
            gamePhase: updatedGameState.gamePhase,
            currentPlayerIndex: updatedGameState.currentPlayerIndex,
            currentPlayer: updatedGameState.players[updatedGameState.currentPlayerIndex]?.id,
            turnNumber: updatedGameState.turnNumber
          });

          await db
            .updateTable('game_sessions')
            .set({
              status: 'playing',
              game_state: updatedGameState,
              updated_at: new Date()
            })
            .where('id', '=', sessionId)
            .execute();

          // Notify all players that the game has started
          io.to(sessionId).emit('game_state_update', {
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
                status: 'playing',
                gameState: updatedGameState,
                settings: session.settings,
                createdAt: session.created_at,
                updatedAt: new Date()
              }
            },
            timestamp: Date.now()
          });

          console.log(`✅ Game started for session ${sessionId}`);
        }

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

        const gameState = session.game_state as any;

        // Handle game completion actions (check for forfeit in data)
        if (data.action.data?.forfeit === true) {
          console.log(`🏁 Game completion action: forfeit by ${socket.userId}`);

          // Player who forfeits loses, other player wins
          const loserId = socket.userId || null;
          const winnerId = gameState.players.find((p: any) => p.id !== socket.userId)?.id || null;

          // Update game state to completed
          gameState.gamePhase = 'completed';
          gameState.winner = winnerId;
          gameState.completedAt = new Date();

          // Update session status
          await db
            .updateTable('game_sessions')
            .set({
              status: 'finished',
              game_state: gameState,
              updated_at: new Date()
            })
            .where('id', '=', socket.sessionId)
            .execute();

          // Broadcast game end to all players
          io.to(socket.sessionId).emit('game_ended', {
            type: 'game_ended',
            sessionId: socket.sessionId,
            data: {
              winner: winnerId,
              reason: 'forfeit',
              completedAt: gameState.completedAt
            },
            timestamp: Date.now()
          });

          // Update ratings and quest progress
          await updateGameResults(session, winnerId, loserId);

          return;
        }

        // Validate it's the player's turn for regular actions
        const currentPlayerIndex = gameState.currentPlayerIndex || 0;
        const currentPlayer = gameState.players[currentPlayerIndex];

        console.log(`🔍 Turn validation for ${socket.userId}:`);
        console.log(`   Current player index: ${currentPlayerIndex}`);
        console.log(`   Current player ID: ${currentPlayer?.id}`);
        console.log(`   Socket user ID: ${socket.userId}`);
        console.log(`   Is current player: ${currentPlayer?.id === socket.userId}`);

        if (currentPlayer.id !== socket.userId) {
          console.log(`❌ Turn rejected: Not ${socket.userId}'s turn (current: ${currentPlayer.id})`);
          socket.emit('error', { message: 'It is not your turn' });
          return;
        }

        console.log(`✅ Turn accepted for ${socket.userId}`);

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
            game_state: gameState,
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
              gameState: session.game_state,
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

    // ============================================================================
    // ONLINE MULTIPLAYER WEBSOCKET HANDLERS
    // ============================================================================

    // Matchmaking handlers
    socket.on('join_matchmaking', async (data: { gameMode: string; preferences?: any }) => {
      try {
        console.log(`🔍 User ${socket.userId} joining matchmaking for ${data.gameMode}`);

        // Add to matchmaking queue (this would call the matchmaking logic)
        // For now, just acknowledge the request
        socket.emit('matchmaking_joined', {
          gameMode: data.gameMode,
          timestamp: Date.now()
        });

        // Simulate finding a match after a delay (for testing)
        setTimeout(() => {
          const sessionId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          socket.emit('match_found', {
            sessionId,
            gameMode: data.gameMode,
            players: [
              { id: socket.userId, rating: 1000 },
              { id: 'opponent_' + Math.random().toString(36).substr(2, 9), rating: 1050 }
            ],
            timestamp: Date.now()
          });
        }, 5000); // 5 second delay for testing

      } catch (error) {
        console.error('Error joining matchmaking:', error);
        socket.emit('error', { message: 'Failed to join matchmaking' });
      }
    });

    socket.on('cancel_matchmaking', async () => {
      try {
        console.log(`🚫 User ${socket.userId} cancelling matchmaking`);

        // Remove from matchmaking queue
        await db
          .deleteFrom('matchmaking_queue')
          .where('user_id', '=', socket.userId!)
          .execute();

        socket.emit('matchmaking_cancelled', {
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error cancelling matchmaking:', error);
        socket.emit('error', { message: 'Failed to cancel matchmaking' });
      }
    });

    socket.on('accept_match', async (data: { sessionId: string }) => {
      try {
        console.log(`✅ User ${socket.userId} accepting match: ${data.sessionId}`);

        // Join the match session
        socket.sessionId = data.sessionId;
        socket.join(data.sessionId);

        // Notify other players in the match
        socket.to(data.sessionId).emit('player_accepted_match', {
          sessionId: data.sessionId,
          userId: socket.userId,
          timestamp: Date.now()
        });

        socket.emit('match_accepted', {
          sessionId: data.sessionId,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error accepting match:', error);
        socket.emit('error', { message: 'Failed to accept match' });
      }
    });

    // Quest progress handlers
    socket.on('quest_progress', async (data: { questType: string; progress: any }) => {
      try {
        console.log(`📋 User ${socket.userId} updating quest progress: ${data.questType}`, data.progress);

        // This would integrate with the quest system
        // For now, just acknowledge the update
        socket.emit('quest_progress_updated', {
          questType: data.questType,
          progress: data.progress,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error updating quest progress:', error);
        socket.emit('error', { message: 'Failed to update quest progress' });
      }
    });

    // Rating update handlers
    socket.on('rating_update', async (data: { newRating: number; ratingChange: number }) => {
      try {
        console.log(`📈 User ${socket.userId} rating updated: ${data.newRating} (${data.ratingChange > 0 ? '+' : ''}${data.ratingChange})`);

        socket.emit('rating_updated', {
          ratingUpdate: {
            newRating: data.newRating,
            ratingChange: data.ratingChange
          },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error updating rating:', error);
        socket.emit('error', { message: 'Failed to update rating' });
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

/**
 * Update game results including ratings and quest progress
 */
async function updateGameResults(_session: any, winnerId: string | null, loserId: string | null) {
  try {
    console.log(`📊 Updating game results: winner=${winnerId}, loser=${loserId}`);

    // Update player statistics by reading current values and updating
    if (winnerId) {
      const winner = await db
        .selectFrom('users')
        .select(['games_played', 'games_won', 'current_rating'])
        .where('id', '=', winnerId)
        .executeTakeFirst();

      if (winner) {
        await db
          .updateTable('users')
          .set({
            games_played: (winner.games_played || 0) + 1,
            games_won: (winner.games_won || 0) + 1,
            current_rating: (winner.current_rating || 1000) + 25
          })
          .where('id', '=', winnerId)
          .execute();
      }
    }

    if (loserId) {
      const loser = await db
        .selectFrom('users')
        .select(['games_played', 'current_rating'])
        .where('id', '=', loserId)
        .executeTakeFirst();

      if (loser) {
        await db
          .updateTable('users')
          .set({
            games_played: (loser.games_played || 0) + 1,
            current_rating: Math.max((loser.current_rating || 1000) - 15, 100)
          })
          .where('id', '=', loserId)
          .execute();
      }
    }

    // Update quest progress for both players
    const playerIds = [winnerId, loserId].filter(Boolean) as string[];
    for (const playerId of playerIds) {
      // Update "play games" quest
      await updateQuestProgress(playerId, 'play_games', 1);

      // Update "win matches" quest for winner
      if (playerId === winnerId) {
        await updateQuestProgress(playerId, 'win_matches', 1);
      }
    }

    console.log(`✅ Game results updated successfully`);
  } catch (error) {
    console.error('❌ Error updating game results:', error);
  }
}

/**
 * Update quest progress for a player
 */
async function updateQuestProgress(userId: string, questType: string, progressIncrement: number) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user has this quest today
    const existingQuest = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .where('quest_type', '=', questType)
      .where('quest_date', '=', today)
      .executeTakeFirst();

    if (existingQuest) {
      // Update existing quest progress
      const newProgress = (existingQuest.progress as any) + progressIncrement;
      const targetProgress = existingQuest.target_progress as any;
      const isCompleted = newProgress >= targetProgress;

      await db
        .updateTable('user_daily_progress')
        .set({
          progress: newProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date() : null
        })
        .where('id', '=', existingQuest.id)
        .execute();

      console.log(`📋 Updated quest ${questType} for ${userId}: ${newProgress}/${targetProgress}`);
    } else {
      // Create new quest if it doesn't exist
      await db
        .insertInto('user_daily_progress')
        .values({
          user_id: userId,
          quest_date: today,
          quest_type: questType,
          progress: progressIncrement,
          target_progress: questType === 'play_games' ? 3 : 1, // Default targets
          is_completed: false,
          completed_at: null,
          is_claimed: false,
          claimed_at: null
        })
        .execute();

      console.log(`📋 Created new quest ${questType} for ${userId}: ${progressIncrement}`);
    }
  } catch (error) {
    console.error(`❌ Error updating quest progress for ${userId}:`, error);
  }
}
