import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { sql } from 'kysely';
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
      console.log('🔐 [WebSocket] ===== AUTHENTICATION MIDDLEWARE CALLED =====');
      console.log('🔐 [WebSocket] Socket ID:', socket.id);
      console.log('🔐 [WebSocket] Socket handshake auth:', JSON.stringify(socket.handshake.auth, null, 2));
      console.log('🔐 [WebSocket] Socket handshake headers authorization:', socket.handshake.headers.authorization);
      console.log('🔐 [WebSocket] Socket handshake query:', socket.handshake.query);

      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      console.log('🔍 [WebSocket] Token extraction result:', {
        fromAuth: !!socket.handshake.auth.token,
        fromHeaders: !!socket.handshake.headers.authorization,
        finalToken: token ? `${token.substring(0, 20)}...` : 'null'
      });

      if (!token) {
        console.error('❌ [WebSocket] No token provided');
        console.error('❌ [WebSocket] Auth object:', socket.handshake.auth);
        console.error('❌ [WebSocket] Headers:', socket.handshake.headers);
        return next(new Error('Authentication token required'));
      }

      console.log(`🔍 [WebSocket] Token received: ${token.substring(0, 50)}...`);
      console.log(`🔍 [WebSocket] NODE_ENV: ${process.env['NODE_ENV']}`);
      console.log(`🔍 [WebSocket] JWT_SECRET exists: ${!!process.env['JWT_SECRET']}`);

      // Handle test tokens specifically
      if (process.env['NODE_ENV'] === 'test' && token.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
        console.log('🔍 [WebSocket] Processing test token');
        try {
          const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'fallback-secret') as any;
          console.log(`🔍 [WebSocket] Test token decoded:`, decoded);

          // For test tokens, look up by firebase_uid (uid field in JWT)
          console.log(`🔍 [WebSocket] Looking for user with firebase_uid: ${decoded.uid}`);
          const user = await db
            .selectFrom('users')
            .selectAll()
            .where('firebase_uid', '=', decoded.uid)
            .executeTakeFirst();

          console.log(`🔍 [WebSocket] Database query result:`, user);

          if (!user) {
            console.error(`❌ [WebSocket] User not found for firebase_uid: ${decoded.uid}`);
            return next(new Error('User not found'));
          }

          console.log(`✅ [WebSocket] Test user found: ${user.id} (${user.username})`);
          socket.userId = user.id;
          console.log(`🔐 [WebSocket] ===== AUTHENTICATION SUCCESSFUL FOR USER ${user.id} =====`);
          return next();
        } catch (testError) {
          console.error('❌ [WebSocket] Test token verification failed:', testError);
          return next(new Error('Test token authentication failed'));
        }
      }

      // Regular token processing
      console.log(`🔍 [WebSocket] Processing regular token`);
      const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
      console.log(`🔍 [WebSocket] Regular token decoded:`, { userId: decoded.userId, guestId: decoded.guestId, isGuest: decoded.isGuest });

      // Get user from database
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', decoded.userId)
        .executeTakeFirst();

      if (!user) {
        console.error(`❌ [WebSocket] User not found for ID: ${decoded.userId}`);
        return next(new Error('User not found'));
      }

      console.log(`✅ [WebSocket] User found: ${user.id} (${user.username})`);
      socket.userId = user.id;
      next();
    } catch (error) {
      console.error('❌ [WebSocket] Authentication error:', error);
      if (error instanceof Error) {
        console.error('❌ [WebSocket] Error stack:', error.stack);
        console.error('❌ [WebSocket] Error details:', {
          message: error.message,
          name: error.name,
          code: (error as any).code
        });
      }
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connect_error', (error: any) => {
    console.error('❌ [WebSocket] Connection error:', error);
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 [WebSocket] ===== NEW CONNECTION ESTABLISHED =====`);
    console.log(`🔌 [WebSocket] User ${socket.userId} connected to game socket`);
    console.log(`🔌 [WebSocket] Socket ID: ${socket.id}`);
    console.log(`🔌 [WebSocket] Socket connected: ${socket.connected}`);
    console.log(`🔌 [WebSocket] Socket authenticated: ${!!socket.userId}`);

    // Join user to their personal room for notifications
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    console.log(`✅ [WebSocket] User ${socket.userId} joined personal notification room: ${userRoom}`);

    // Verify room membership
    const rooms = Array.from(socket.rooms);
    console.log(`🔌 [WebSocket] User ${socket.userId} is in rooms:`, rooms);

    // Double-check room membership with io.sockets.adapter
    const socketsInRoom = io.sockets.adapter.rooms.get(userRoom);
    console.log(`🔌 [WebSocket] Sockets in room ${userRoom}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');

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

        // Initialize BioMasters engine if needed
        if (!gameState.engineInitialized) {
          console.log(`🎮 [WebSocket] Initializing BioMasters engine for session ${socket.sessionId}`);

          // Get the global server data loader
          const serverDataLoader = (global as any).serverDataLoader;
          if (!serverDataLoader) {
            throw new Error('Server data loader not initialized');
          }

          // Load game data using unified data loader
          const [cardsResult, abilitiesResult, keywordsResult] = await Promise.all([
            serverDataLoader.loadCards(),
            serverDataLoader.loadAbilities(),
            serverDataLoader.loadKeywords()
          ]);

          if (!cardsResult.success || !abilitiesResult.success || !keywordsResult.success) {
            throw new Error('Failed to load game data');
          }

          // Convert to Maps as expected by BioMasters engine
          const cardDatabase = new Map();
          cardsResult.data?.forEach((card: any) => {
            cardDatabase.set(card.cardId || card.id, card);
          });

          const abilityDatabase = new Map();
          abilitiesResult.data?.forEach((ability: any) => {
            abilityDatabase.set(ability.id, ability);
          });

          const keywordDatabase = new Map();
          keywordsResult.data?.forEach((keyword: any) => {
            keywordDatabase.set(keyword.id, keyword.name);
          });

          // Use the existing MockLocalizationManager
          const { MockLocalizationManager } = await import('../utils/mockLocalizationManager');
          const localizationManager = new MockLocalizationManager();

          // Import and initialize engine
          const { BioMastersEngine } = await import('../../../shared/game-engine/BioMastersEngine');
          const engine = new BioMastersEngine(
            cardDatabase,
            abilityDatabase,
            keywordDatabase,
            localizationManager
          );

          // Initialize game with session players
          const players = (session.players as any[]).map(p => ({ id: p.playerId, name: p.username }));
          const gameSettings = {
            maxPlayers: session.max_players,
            gridWidth: 9,
            gridHeight: 10,
            startingHandSize: 5,
            maxHandSize: 7,
            startingEnergy: 10,
            turnTimeLimit: 300
          };

          const initialGameState = engine.initializeNewGame(socket.sessionId, players, gameSettings);

          // Store engine state in session
          gameState.engineState = initialGameState;
          gameState.engineInitialized = true;

          await db
            .updateTable('game_sessions')
            .set({
              game_state: gameState,
              updated_at: new Date()
            })
            .where('id', '=', socket.sessionId)
            .execute();

          console.log(`✅ [WebSocket] BioMasters engine initialized for session ${socket.sessionId}`);
        }

        // Process action through BioMasters engine
        const { BioMastersEngine } = await import('../../../shared/game-engine/BioMastersEngine');

        // Get the global server data loader
        const serverDataLoader = (global as any).serverDataLoader;
        if (!serverDataLoader) {
          throw new Error('Server data loader not initialized');
        }

        // Load game data using unified data loader
        const [cardsResult, abilitiesResult, keywordsResult] = await Promise.all([
          serverDataLoader.loadCards(),
          serverDataLoader.loadAbilities(),
          serverDataLoader.loadKeywords()
        ]);

        if (!cardsResult.success || !abilitiesResult.success || !keywordsResult.success) {
          throw new Error('Failed to load game data');
        }

        // Convert to Maps as expected by BioMasters engine
        const cardDatabase = new Map();
        cardsResult.data?.forEach((card: any) => {
          cardDatabase.set(card.cardId || card.id, card);
        });

        const abilityDatabase = new Map();
        abilitiesResult.data?.forEach((ability: any) => {
          abilityDatabase.set(ability.id, ability);
        });

        const keywordDatabase = new Map();
        keywordsResult.data?.forEach((keyword: any) => {
          keywordDatabase.set(keyword.id, keyword.name);
        });

        // Use the existing MockLocalizationManager
        const { MockLocalizationManager } = await import('../utils/mockLocalizationManager');
        const localizationManager = new MockLocalizationManager();

        const engine = new BioMastersEngine(
          cardDatabase,
          abilityDatabase,
          keywordDatabase,
          localizationManager
        );

        // Restore engine state by initializing a new game if needed
        if (gameState.engineState) {
          // Use the existing state if available
          console.log('🔄 Using existing engine state');
        } else {
          // Initialize new game if no state exists
          const players = session.players as any[];
          const gameSettings = {
            maxPlayers: players.length,
            gridWidth: 9,
            gridHeight: 10,
            startingHandSize: 5,
            maxHandSize: 7,
            startingEnergy: 3,
            turnTimeLimit: 300000
          };

          const initialState = engine.initializeNewGame(socket.sessionId, players, gameSettings);
          gameState.engineState = initialState;
          gameState.engineInitialized = true;
        }

        // Convert PhyloGameAction to GameActionType
        let actionType;
        switch (data.action.type) {
          case 'place_card':
            actionType = 'PLAY_CARD';
            break;
          case 'move_card':
            actionType = 'MOVE_CARD';
            break;
          case 'challenge':
            actionType = 'CHALLENGE';
            break;
          case 'pass_turn':
            actionType = 'PASS_TURN';
            break;
          case 'drop_and_draw':
            actionType = 'DROP_AND_DRAW_THREE';
            break;
          default:
            actionType = 'PLAY_CARD';
        }

        // Process the action through the engine
        const actionResult = engine.processAction({
          type: actionType as any,
          playerId: socket.userId || 'unknown',
          payload: data.action.data || {}
        });

        if (!actionResult.isValid) {
          socket.emit('error', {
            message: actionResult.errorMessage || 'Invalid action',
            action: data.action
          });
          return;
        }

        // Update stored game state
        const updatedEngineState = actionResult.newState || engine.getGameState();
        gameState.engineState = updatedEngineState;
        gameState.lastAction = {
          action: data.action,
          playerId: socket.userId,
          timestamp: Date.now(),
          result: actionResult
        };

        // Check for game end condition
        const gameEnded = updatedEngineState.gamePhase === 'ended';

        if (gameEnded) {
          gameState.status = 'finished';
          gameState.endedAt = new Date();
          gameState.winner = updatedEngineState.winner;

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

          // Create match results and update ratings
          await createMatchResults(socket.sessionId, session, updatedEngineState);

          // Track quest progress for all players
          const players = session.players as any[];
          for (const player of players) {
            await trackQuestProgress(player.playerId, {
              winner: updatedEngineState.winner || null,
              gameMode: session.game_mode || 'casual_1v1',
              playerId: player.playerId
            });
          }

          // Broadcast game end
          io.to(socket.sessionId).emit('game_ended', {
            type: 'game_ended',
            sessionId: socket.sessionId,
            data: {
              winner: updatedEngineState.winner || null,
              finalState: updatedEngineState,
              matchDuration: Date.now() - new Date(session.created_at).getTime()
            },
            timestamp: Date.now()
          });

          return; // Don't continue with turn processing
        }

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
          data: {
            action: data.action,
            playerId: socket.userId,
            result: actionResult,
            newGameState: updatedEngineState
          },
          timestamp: Date.now()
        });

        // Broadcast turn change if game continues
        const newCurrentPlayer = updatedEngineState.players[updatedEngineState.currentPlayer || 0];
        io.to(socket.sessionId).emit('turn_change', {
          type: 'turn_change',
          sessionId: socket.sessionId,
          data: {
            currentPlayer: newCurrentPlayer,
            turnNumber: updatedEngineState.turnNumber,
            turnPhase: updatedEngineState.turnPhase
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

      console.log(`🎮 [WEBSOCKET] Player ready event received - Session: ${socket.sessionId}, User: ${socket.userId}, Ready: ${data.ready}`);

      try {
        // Get current session from database
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', socket.sessionId)
          .executeTakeFirst();

        if (!session) {
          console.error(`❌ [WEBSOCKET] Session ${socket.sessionId} not found`);
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        console.log(`🔍 [WEBSOCKET] Current session status: ${session.status}`);

        // Parse players array
        let players: any[];
        try {
          players = typeof session.players === 'string'
            ? JSON.parse(session.players)
            : session.players || [];
        } catch (parseError) {
          console.error(`❌ [WEBSOCKET] Failed to parse players:`, parseError);
          socket.emit('error', { message: 'Invalid session data' });
          return;
        }

        console.log(`🔍 [WEBSOCKET] Current players:`, JSON.stringify(players, null, 2));

        // Find player in session
        const playerIndex = players.findIndex((p: any) => p.playerId === socket.userId || p.user_id === socket.userId);
        if (playerIndex === -1) {
          console.error(`❌ [WEBSOCKET] Player ${socket.userId} not found in session ${socket.sessionId}`);
          socket.emit('error', { message: 'Player not found in session' });
          return;
        }

        console.log(`🔍 [WEBSOCKET] Found player at index ${playerIndex}:`, JSON.stringify(players[playerIndex], null, 2));

        // Update player ready state
        players[playerIndex].ready = data.ready;
        console.log(`🔧 [WEBSOCKET] Updated player ready state to: ${data.ready}`);

        // Check if all players are ready
        const allReady = players.every((p: any) => p.ready === true);
        const newStatus: 'waiting' | 'active' = allReady ? 'active' : 'waiting';

        console.log(`🔍 [WEBSOCKET] Ready check: ${players.filter((p: any) => p.ready).length}/${players.length} players ready`);
        console.log(`🔍 [WEBSOCKET] All ready: ${allReady}, New status: ${newStatus}`);

        // Update database with new player states and status
        const playersJson = JSON.stringify(players);
        console.log(`🔧 [WEBSOCKET] Updating database with status: ${newStatus}`);

        await db
          .updateTable('game_sessions')
          .set({
            status: newStatus,
            players: playersJson as any,
            updated_at: new Date()
          })
          .where('id', '=', socket.sessionId)
          .execute();

        console.log(`✅ [WEBSOCKET] Database updated successfully - Status: ${newStatus}`);

        // Broadcast ready status to all players in the session
        io.to(socket.sessionId).emit('player_ready', {
          type: 'player_ready',
          sessionId: socket.sessionId,
          data: {
            userId: socket.userId,
            ready: data.ready,
            allPlayersReady: allReady,
            sessionStatus: newStatus
          },
          timestamp: Date.now()
        });

        console.log(`📡 [WEBSOCKET] Broadcasted ready status to all players in session ${socket.sessionId}`);

        // If all players are ready and status changed to active, send game state update
        if (allReady && newStatus === 'active') {
          console.log(`🎉 [WEBSOCKET] All players ready! Game transitioning to active status`);

          // Send updated game state to all players
          io.to(socket.sessionId).emit('game_state_update', {
            type: 'game_state_update',
            sessionId: socket.sessionId,
            data: {
              session: {
                id: session.id,
                hostUserId: session.host_user_id,
                gameMode: session.game_mode,
                isPrivate: session.is_private,
                maxPlayers: session.max_players,
                currentPlayers: session.current_players,
                status: 'active',
                gameState: session.game_state,
                settings: session.settings,
                createdAt: session.created_at,
                updatedAt: new Date()
              }
            },
            timestamp: Date.now()
          });

          console.log(`✅ [WEBSOCKET] Game state update sent - Session ${socket.sessionId} is now ACTIVE!`);
        }

      } catch (error) {
        console.error(`❌ [WEBSOCKET] Error updating ready status for session ${socket.sessionId}:`, error);
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

      // Leave personal notification room
      socket.leave(`user:${socket.userId}`);
      console.log(`✅ User ${socket.userId} left personal notification room`);

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
 * Create match results and update ratings for completed games
 */
async function createMatchResults(sessionId: string, session: any, finalGameState: any) {
  try {
    console.log(`📊 Creating match results for session ${sessionId}`);

    const players = session.players as any[];
    const gameMode = session.game_mode || 'casual_1v1';
    const matchDuration = Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000);
    const winnerId = finalGameState.winner;

    // Calculate rating changes using ELO system
    const ratingChanges = await calculateRatingChanges(players, winnerId, gameMode);

    // Create match result entries for each player
    for (const player of players) {
      const isWinner = player.playerId === winnerId;
      const result = isWinner ? 'win' : 'loss';
      const ratingChange = ratingChanges[player.playerId] || 0;
      const oldRating = player.rating || 1000;
      const newRating = oldRating + ratingChange;

      // Insert match result
      await db
        .insertInto('match_results')
        .values({
          session_id: sessionId,
          player_user_id: player.playerId,
          opponent_user_id: players.find(p => p.playerId !== player.playerId)?.playerId || null,
          game_mode: gameMode,
          result,
          rating_before: oldRating,
          rating_after: newRating,
          rating_change: ratingChange,
          match_duration: matchDuration,
          created_at: new Date()
        })
        .execute();

      // Update user rating
      await db
        .updateTable('users')
        .set({
          current_rating: newRating,
          peak_rating: db.fn('GREATEST', ['peak_rating', newRating]),
          games_played: sql`COALESCE(games_played, 0) + 1`,
          games_won: isWinner ? sql`COALESCE(games_won, 0) + 1` : sql`COALESCE(games_won, 0)`,
          updated_at: new Date()
        })
        .where('id', '=', player.playerId)
        .execute();

      console.log(`✅ Updated rating for ${player.playerId}: ${oldRating} → ${newRating} (${ratingChange >= 0 ? '+' : ''}${ratingChange})`);
    }

    // Clean up Redis matchmaking state
    await cleanupMatchmakingState(players.map(p => p.playerId));

    console.log(`✅ Match results created successfully for session ${sessionId}`);
  } catch (error) {
    console.error('❌ Failed to create match results:', error);
  }
}

/**
 * Calculate rating changes using ELO system
 */
async function calculateRatingChanges(players: any[], winnerId: string | null, gameMode: string): Promise<Record<string, number>> {
  const K_FACTOR = gameMode.includes('ranked') ? 32 : 16; // Higher K-factor for ranked games
  const changes: Record<string, number> = {};

  if (!winnerId || players.length !== 2) {
    // For draws or non-1v1 games, minimal rating changes
    players.forEach(player => {
      changes[player.playerId] = 0;
    });
    return changes;
  }

  const winner = players.find(p => p.playerId === winnerId);
  const loser = players.find(p => p.playerId !== winnerId);

  if (!winner || !loser) {
    players.forEach(player => {
      changes[player.playerId] = 0;
    });
    return changes;
  }

  const winnerRating = winner.rating || 1000;
  const loserRating = loser.rating || 1000;

  // Calculate expected scores
  const winnerExpected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const loserExpected = 1 - winnerExpected;

  // Calculate rating changes
  const winnerChange = Math.round(K_FACTOR * (1 - winnerExpected));
  const loserChange = Math.round(K_FACTOR * (0 - loserExpected));

  changes[winnerId] = winnerChange;
  changes[loser.playerId] = loserChange;

  return changes;
}

/**
 * Clean up Redis matchmaking state for completed players
 */
async function cleanupMatchmakingState(playerIds: string[]) {
  try {
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();

    if (redis) {
      for (const playerId of playerIds) {
        // Remove from all possible game mode queues
        const gameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p'];

        for (const gameMode of gameModes) {
          const queueKey = `matchmaking:${gameMode}`;
          await redis.zrem(queueKey, playerId);
        }
      }
    }

    console.log(`✅ Cleaned up Redis state for players: ${playerIds.join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to cleanup Redis state:', error);
  }
}

/**
 * Track quest progress for game completion
 */
async function trackQuestProgress(playerId: string, gameResult: { winner: string | null; gameMode: string; playerId: string }) {
  try {
    console.log(`📋 Tracking quest progress for player ${playerId}:`, gameResult);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update "play_games" quest
    await updateQuestProgressInDB(playerId, 'play_games', { count: 1 }, today);

    // If player won, update win-related quests
    if (gameResult.winner === playerId) {
      await updateQuestProgressInDB(playerId, 'win_matches', { count: 1 }, today);

      // Update ranked-specific quest if it's a ranked game
      if (gameResult.gameMode.includes('ranked')) {
        await updateQuestProgressInDB(playerId, 'play_ranked', { count: 1 }, today);
      }
    }

    console.log(`✅ Quest progress tracked for player ${playerId}`);
  } catch (error) {
    console.error(`❌ Failed to track quest progress for player ${playerId}:`, error);
  }
}

/**
 * Update quest progress in database
 */
async function updateQuestProgressInDB(userId: string, questType: string, progressIncrement: any, questDate: Date) {
  try {
    // Get existing progress
    const existingProgress = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .where('quest_type', '=', questType)
      .where('quest_date', '=', questDate)
      .executeTakeFirst();

    if (existingProgress) {
      // Update existing progress
      const currentProgress = existingProgress.progress as any;
      const newProgress = { ...currentProgress };

      // Increment count-based progress
      if (progressIncrement.count) {
        newProgress.count = (newProgress.count || 0) + progressIncrement.count;
      }

      // Check if quest is completed
      const target = existingProgress.target_progress as any;
      const isCompleted = newProgress.count >= target.count;

      await db
        .updateTable('user_daily_progress')
        .set({
          progress: newProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date() : existingProgress.completed_at,
          updated_at: new Date()
        })
        .where('id', '=', existingProgress.id)
        .execute();
    } else {
      // Get quest definition to create new progress entry
      const questDef = await db
        .selectFrom('daily_quest_definitions')
        .selectAll()
        .where('quest_type', '=', questType)
        .where('is_active', '=', true)
        .executeTakeFirst();

      if (questDef) {
        const initialProgress = { count: progressIncrement.count || 1 };
        const target = questDef.requirements;
        const isCompleted = initialProgress.count >= (target as any).count;

        await db
          .insertInto('user_daily_progress')
          .values({
            user_id: userId,
            quest_type: questType,
            quest_date: questDate,
            progress: initialProgress,
            target_progress: target,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date() : null,
            is_claimed: false,
            created_at: new Date(),
            updated_at: new Date()
          })
          .execute();
      }
    }
  } catch (error) {
    console.error(`❌ Failed to update quest progress in DB:`, error);
  }
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
