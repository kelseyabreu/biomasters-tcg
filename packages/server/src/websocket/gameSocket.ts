import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { sql } from 'kysely';
import { randomUUID } from 'crypto';
import { db } from '../database/kysely';
import { PhyloGameAction, deepSerialize, deepDeserialize } from '@kelseyabreu/shared';

// Global WebSocket server instance
let globalIo: SocketIOServer | null = null;

export function getGlobalIo(): SocketIOServer | null {
  return globalIo;
}

/**
 * Utility functions for game state serialization
 * Handles Map objects that don't serialize properly over WebSocket
 */
function serializeGameStateForTransmission(gameState: any): any {
  if (!gameState) return gameState;

  console.log('🔄 [SERIALIZATION] Starting deep serialization for game state:', {
    hasGameState: !!gameState,
    hasGrid: !!gameState.grid,
    hasEngineState: !!gameState.engineState,
    hasEngineGrid: !!(gameState.engineState?.grid),
    gridType: gameState.grid ? gameState.grid.constructor.name : 'undefined',
    engineGridType: gameState.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined'
  });

  // Use the new deep serialization to handle all Maps recursively
  const serialized = deepSerialize(gameState);

  // Log the results for debugging
  if (gameState.grid && gameState.grid instanceof Map) {
    console.log('🔄 [SERIALIZATION] Grid Map serialized:', {
      originalSize: gameState.grid.size,
      serializedType: serialized.grid?.__type,
      serializedEntries: serialized.grid?.entries?.length || 0
    });
  }

  if (gameState.engineState?.grid && gameState.engineState.grid instanceof Map) {
    console.log('🔄 [SERIALIZATION] EngineState grid Map serialized:', {
      originalSize: gameState.engineState.grid.size,
      serializedType: serialized.engineState?.grid?.__type,
      serializedEntries: serialized.engineState?.grid?.entries?.length || 0
    });
  }

  console.log('🔄 [SERIALIZATION] Deep serialization complete');
  return serialized;
}

/**
 * Filter game state to only show appropriate information to each player
 * Each player should only see their own cards and silhouettes/counts for opponents
 */
function filterGameStateForPlayer(gameState: any, requestingPlayerId: string): any {
  console.log('🔒 [PRIVACY FILTER] Starting filter for player:', requestingPlayerId, {
    hasGameState: !!gameState,
    hasEngineState: !!gameState?.engineState,
    hasEngineGrid: !!(gameState?.engineState?.grid),
    engineGridType: gameState?.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined'
  });

  if (!gameState || !gameState.engineState) {
    console.log('🔒 [PRIVACY FILTER] No game state or engine state, returning as-is');
    return gameState;
  }

  const filtered = { ...gameState };

  // Filter engineState players to hide opponent card details
  if (gameState.engineState.players) {
    filtered.engineState = {
      ...gameState.engineState,
      players: gameState.engineState.players.map((player: any) => {
        if (player.id === requestingPlayerId) {
          // Current player: show all their cards
          console.log(`🔒 [PRIVACY] Showing full hand to current player ${requestingPlayerId}: ${player.hand?.length || 0} cards`);
          return player;
        } else {
          // Opponent: hide card details, show only counts and silhouettes
          console.log(`🔒 [PRIVACY] Hiding opponent cards for player ${player.id}: ${player.hand?.length || 0} cards → silhouettes only`);
          return {
            ...player,
            hand: player.hand ? player.hand.map(() => ({
              instanceId: 'hidden-card',
              cardId: 0,
              isHidden: true,
              cardType: 'HIDDEN'
            })) : [],
            // Keep deck count but hide actual cards
            deck: player.deck ? new Array(player.deck.length).fill({
              instanceId: 'hidden-deck-card',
              cardId: 0,
              isHidden: true,
              cardType: 'HIDDEN'
            }) : []
          };
        }
      })
    };
  }

  return filtered;
}

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

/**
 * Initialize BioMasters game engine with selected decks
 */
export async function initializeBioMastersGame(sessionId: string, gameState: any, players: any[]) {
  try {
    console.log(`🎮 [WEBSOCKET] Initializing BioMasters engine for session ${sessionId}`);

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
    const { BioMastersEngine } = await import('@kelseyabreu/shared');
    const engine = new BioMastersEngine(
      cardDatabase,
      abilityDatabase,
      keywordDatabase,
      localizationManager
    );

    // Initialize game with basic player info
    const gameSettings = {
      maxPlayers: players.length,
      gridWidth: 9,
      gridHeight: 10,
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300
    };

    console.log(`🔍 [PLAYER-NAMES] Players data:`, players.map(p => ({
      id: p.playerId || p.id,
      name: p.name,
      username: p.username,
      allKeys: Object.keys(p)
    })));

    const basicPlayers = players.map((player: any) => ({
      id: player.playerId || player.id,
      name: player.name || player.username || `Player ${player.playerId?.slice(-4) || 'Unknown'}`
    }));

    const initialGameState = engine.initializeNewGame(sessionId, basicPlayers, gameSettings);

    // 🏠 DEBUG: Check HOME cards creation
    console.log('🏠 [GAME INIT] HOME cards analysis after engine initialization:', {
      gridSize: initialGameState.grid.size,
      gridEntries: Array.from(initialGameState.grid.entries()).map(([key, card]) => ({
        position: key,
        cardId: card.cardId,
        instanceId: card.instanceId,
        ownerId: card.ownerId,
        isHOME: card.isHOME,
        cardType: card.isHOME ? 'HOME' : 'REGULAR'
      })),
      homeCardsCount: Array.from(initialGameState.grid.values()).filter(card => card.isHOME).length,
      playersCount: basicPlayers.length,
      gameSettings: {
        gridWidth: gameSettings.gridWidth,
        gridHeight: gameSettings.gridHeight
      }
    });

    // Load and set up deck cards for each player
    for (const player of players) {
      if (!player.selectedDeckId) {
        throw new Error(`Player ${player.playerId || player.id} has no selected deck`);
      }

      console.log(`🔍 [DECK-LOADING] Loading deck for player ${player.playerId || player.id}, deckId: ${player.selectedDeckId}`);

      // Get deck cards from deck_cards table
      const deckCards = await db
        .selectFrom('deck_cards')
        .select(['species_name', 'position_in_deck'])
        .where('deck_id', '=', player.selectedDeckId)
        .orderBy('position_in_deck', 'asc')
        .execute();

      console.log(`🔍 [DECK-LOADING] Found ${deckCards.length} cards for deck ${player.selectedDeckId}:`, deckCards.map(dc => dc.species_name));

      // Find the player in the game state
      const gamePlayer = initialGameState.players.find(p => p.id === (player.playerId || player.id));
      if (gamePlayer) {
        // Set up the player's deck with actual card IDs
        gamePlayer.deck = deckCards.map(dc => `card-${dc.species_name}-${Date.now()}-${Math.random()}`);
        gamePlayer.energy = gameSettings.startingEnergy;

        // Draw starting hand
        for (let i = 0; i < gameSettings.startingHandSize && gamePlayer.deck.length > 0; i++) {
          const cardId = gamePlayer.deck.pop();
          if (cardId) {
            gamePlayer.hand.push(cardId);
          }
        }
      }
    }

    // Store engine state and settings in session
    gameState.engineState = initialGameState;
    gameState.gameSettings = gameSettings;
    gameState.engineInitialized = true;
    gameState.initializedAt = new Date();

    console.log(`✅ [WEBSOCKET] BioMasters engine initialized for session ${sessionId}`);
    console.log(`🔍 [WEBSOCKET] Game state: ${initialGameState.gamePhase}, Players: ${initialGameState.players.length}`);

  } catch (error) {
    console.error(`❌ [WEBSOCKET] Failed to initialize BioMasters engine:`, error);
    throw error;
  }
}

export function setupGameSocket(server: HTTPServer) {
  // Configure CORS origins for Socket.IO
  const allowedOrigins = [
    "https://biomasters.app",  // Production frontend
    "http://localhost:5173",   // Vite dev server
    "http://localhost:3000",   // Alternative dev server
    "http://localhost:3001"    // Alternative dev server
  ];

  // Add FRONTEND_URL if it's set and not already in the list
  if (process.env['FRONTEND_URL'] && !allowedOrigins.includes(process.env['FRONTEND_URL'])) {
    allowedOrigins.push(process.env['FRONTEND_URL']);
  }

  console.log('🔌 [Socket.IO] Configuring CORS for origins:', allowedOrigins);

  const io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
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

      // Regular token processing - check if it's a Firebase token or local token
      console.log(`🔍 [WebSocket] Processing regular token`);
      console.log(`🔍 [WebSocket] Token length: ${token.length}`);
      console.log(`🔍 [WebSocket] Token starts with: ${token.substring(0, 50)}...`);

      let decoded: any;
      let user: any;

      // Try Firebase token verification first (Firebase tokens use RS256 algorithm)
      // Decode the header to check the algorithm
      let isFirebaseToken = false;
      console.log(`🔍 [WebSocket] Starting token header analysis...`);

      try {
        const tokenParts = token.split('.');
        console.log(`🔍 [WebSocket] Token parts count: ${tokenParts.length}`);

        if (tokenParts.length === 3) {
          console.log(`🔍 [WebSocket] Decoding header part: ${tokenParts[0].substring(0, 20)}...`);
          const headerBuffer = Buffer.from(tokenParts[0], 'base64');
          const headerString = headerBuffer.toString();
          console.log(`🔍 [WebSocket] Header string: ${headerString}`);

          const header = JSON.parse(headerString);
          isFirebaseToken = header.alg === 'RS256';
          console.log(`🔍 [WebSocket] Token header parsed:`, header);
          console.log(`🔍 [WebSocket] Is Firebase token (RS256): ${isFirebaseToken}`);
        } else {
          console.log(`🔍 [WebSocket] Invalid token format, parts: ${tokenParts.length}`);
        }
      } catch (e) {
        console.log(`🔍 [WebSocket] Failed to decode token header:`, e instanceof Error ? e.message : String(e));
        console.log(`🔍 [WebSocket] Error stack:`, e instanceof Error ? e.stack : 'No stack');
      }

      console.log(`🔍 [WebSocket] About to check token type - isFirebaseToken: ${isFirebaseToken}`);

      if (isFirebaseToken) {
        console.log(`🔍 [WebSocket] Detected Firebase token, using Firebase Admin SDK`);
        try {
          console.log(`🔍 [WebSocket] Importing Firebase Admin Auth...`);
          const { getAuth } = await import('firebase-admin/auth');
          console.log(`🔍 [WebSocket] Calling getAuth().verifyIdToken()...`);
          decoded = await getAuth().verifyIdToken(token);
          console.log(`🔍 [WebSocket] Firebase token decoded successfully:`, { uid: decoded.uid, email: decoded.email });

          // Get user by Firebase UID
          console.log(`🔍 [WebSocket] Looking up user by firebase_uid: ${decoded.uid}`);
          user = await db
            .selectFrom('users')
            .selectAll()
            .where('firebase_uid', '=', decoded.uid)
            .executeTakeFirst();
          console.log(`🔍 [WebSocket] User lookup result:`, user ? { id: user.id, username: user.username } : 'Not found');
        } catch (firebaseError) {
          console.log(`❌ [WebSocket] Firebase token verification failed:`, firebaseError);
          console.log(`❌ [WebSocket] Firebase error type:`, firebaseError instanceof Error ? firebaseError.constructor.name : typeof firebaseError);
          console.log(`❌ [WebSocket] Firebase error message:`, firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
          throw firebaseError;
        }
      } else {
        console.log(`🔍 [WebSocket] Detected local token, using JWT_SECRET`);
        console.log(`🔍 [WebSocket] JWT_SECRET exists: ${!!process.env['JWT_SECRET']}`);
        try {
          // Local token (guest or test)
          decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
          console.log(`🔍 [WebSocket] Local token decoded:`, { userId: decoded.userId, guestId: decoded.guestId, isGuest: decoded.isGuest });

          // Get user from database
          console.log(`🔍 [WebSocket] Looking up user by id: ${decoded.userId}`);
          user = await db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', decoded.userId)
            .executeTakeFirst();
          console.log(`🔍 [WebSocket] User lookup result:`, user ? { id: user.id, username: user.username } : 'Not found');
        } catch (localError) {
          console.log(`❌ [WebSocket] Local token verification failed:`, localError);
          throw localError;
        }
      }

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

    // Initialize matchmaking state for new connection
    (socket as any).isWaitingForMatch = false;
    (socket as any).gameMode = null;
    console.log(`🔄 [WebSocket] Matchmaking state initialized for user ${socket.userId}`);

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

        // Deserialize game state to restore Maps properly
        const rawGameState = session.game_state as any; // JSONB is already an object
        const gameState = deepDeserialize(rawGameState);

        console.log('🔄 [JOIN SESSION] Deserializing game state:', {
          hasEngineState: !!gameState.engineState,
          hasEngineGrid: !!(gameState.engineState?.grid),
          engineGridType: gameState.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined',
          engineGridSize: gameState.engineState?.grid instanceof Map ? gameState.engineState.grid.size : 'not a Map'
        });
        console.log(`🔍 Game state players:`, gameState.players.map((p: any) => ({ id: p.id, playerId: p.playerId, name: p.name })));
        console.log(`🔍 Socket user ID: ${socket.userId}`);
        console.log(`🔍 Socket user ID type: ${typeof socket.userId}`);
        console.log(`🔍 Player IDs in game:`, gameState.players.map((p: any) => ({ id: p.id, type: typeof p.id, playerId: p.playerId, playerIdType: typeof p.playerId })));

        const isPlayerInGame = gameState.players.some((p: any) => p.id === socket.userId || p.playerId === socket.userId);
        console.log(`🔍 Is player in game: ${isPlayerInGame}`);

        if (!isPlayerInGame) {
          console.error(`❌ User ${socket.userId} not part of session ${sessionId}`);
          socket.emit('error', { message: 'You are not part of this game session' });
          return;
        }

        socket.sessionId = sessionId;
        socket.join(sessionId);

        // Send current game state (filtered for this player)
        const filteredGameState = filterGameStateForPlayer(session.game_state, socket.userId || 'unknown');
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
              gameState: serializeGameStateForTransmission(filteredGameState),
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

          // Notify all players that the game has started (send personalized state to each)
          const socketsInRoom = await io.in(sessionId).fetchSockets();
          for (const playerSocket of socketsInRoom) {
            const filteredGameState = filterGameStateForPlayer(updatedGameState, (playerSocket as any).userId || 'unknown');
            playerSocket.emit('game_state_update', {
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
                  gameState: serializeGameStateForTransmission(filteredGameState),
                  settings: session.settings,
                  createdAt: session.created_at,
                  updatedAt: new Date()
                }
              },
              timestamp: Date.now()
            });
          }

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
          const { BioMastersEngine } = await import('@kelseyabreu/shared');
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
        const { BioMastersEngine } = await import('@kelseyabreu/shared');

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

    // Handle deck selection
    socket.on('deck_selected', async (data: { deckId: string }) => {
      if (!socket.sessionId) {
        socket.emit('error', { message: 'You must join a session first' });
        return;
      }

      try {
        console.log(`🎯 [WEBSOCKET] Deck selection event - Session: ${socket.sessionId}, User: ${socket.userId}, Deck: ${data.deckId}`);

        // Verify deck belongs to user and is valid
        const deck = await db
          .selectFrom('decks')
          .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
          .select([
            'decks.id',
            'decks.name',
            'decks.user_id',
            db.fn.count('deck_cards.species_name').as('card_count')
          ])
          .where('decks.id', '=', data.deckId)
          .where('decks.user_id', '=', socket.userId!)
          .groupBy(['decks.id', 'decks.name', 'decks.user_id'])
          .executeTakeFirst();

        if (!deck) {
          socket.emit('error', { message: 'Deck not found or access denied' });
          return;
        }

        if (Number(deck.card_count) < 30) {
          socket.emit('error', { message: 'Deck must have at least 30 cards' });
          return;
        }

        // Get current session
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', socket.sessionId)
          .executeTakeFirst();

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Deserialize game state to restore Maps properly
        const rawGameState = session.game_state as any;
        const gameState = deepDeserialize(rawGameState);
        const players = gameState.players || [];

        console.log('🔄 [DECK SELECTION] Deserializing game state:', {
          hasEngineState: !!gameState.engineState,
          hasEngineGrid: !!(gameState.engineState?.grid),
          engineGridType: gameState.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined',
          engineGridSize: gameState.engineState?.grid instanceof Map ? gameState.engineState.grid.size : 'not a Map'
        });
        const playerIndex = players.findIndex((p: any) => p.playerId === socket.userId || p.id === socket.userId);

        if (playerIndex === -1) {
          socket.emit('error', { message: 'Player not found in session' });
          return;
        }

        // Update player's deck selection
        players[playerIndex].selectedDeckId = data.deckId;
        players[playerIndex].hasDeckSelected = true;
        players[playerIndex].deckSelectedAt = new Date();

        console.log(`✅ [WEBSOCKET] Player ${socket.userId} selected deck: ${data.deckId}`);

        // Check if all players have selected decks
        const allPlayersSelected = players.every((p: any) => p.hasDeckSelected === true);
        console.log(`🔍 [WEBSOCKET] Deck selection status: ${players.filter((p: any) => p.hasDeckSelected).length}/${players.length} players selected`);

        // Update game state
        gameState.players = players;

        if (allPlayersSelected) {
          console.log(`🎮 [WEBSOCKET] All players selected decks! Initializing game for session ${socket.sessionId}`);

          // Note: We don't need to clear the timer here since it's a setTimeout, not stored
          // The timer will check if deck selection is still in progress before executing

          // Initialize BioMasters game engine with selected decks
          await initializeBioMastersGame(socket.sessionId, gameState, players);

          // Transition to playing phase
          gameState.gamePhase = 'playing';
          gameState.deckSelectionCompleted = true;
          gameState.deckSelectionCompletedAt = new Date();

          // Clear deck selection timing
          delete gameState.deckSelectionTimeRemaining;
          delete gameState.deckSelectionDeadline;
        }

        // Serialize game state before storing (to handle Maps properly)
        const serializedGameState = deepSerialize(gameState);

        console.log('💾 [WEBSOCKET] Serializing game state for database storage:', {
          hasEngineState: !!gameState.engineState,
          hasEngineGrid: !!(gameState.engineState?.grid),
          engineGridSize: gameState.engineState?.grid instanceof Map ? gameState.engineState.grid.size : 'not a Map',
          serializedEngineGridType: serializedGameState.engineState?.grid?.__type,
          serializedEngineGridEntries: serializedGameState.engineState?.grid?.entries?.length || 0
        });

        // Update database with new game state and status
        await db
          .updateTable('game_sessions')
          .set({
            game_state: serializedGameState,
            status: allPlayersSelected ? 'playing' : 'waiting',
            updated_at: new Date()
          })
          .where('id', '=', socket.sessionId)
          .execute();

        // Broadcast deck selection update to all players
        io.to(socket.sessionId).emit('deck_selection_update', {
          type: 'deck_selection_update',
          sessionId: socket.sessionId,
          data: {
            playerId: socket.userId,
            deckSelected: true,
            deckId: data.deckId,
            deckName: deck.name,
            allPlayersSelected,
            gamePhase: gameState.gamePhase,
            players: players.map((p: any) => ({
              id: p.playerId || p.id,
              name: p.name || p.username,
              hasDeckSelected: p.hasDeckSelected || false,
              selectedDeckId: p.selectedDeckId
            }))
          },
          timestamp: Date.now()
        });

        if (allPlayersSelected) {
          // Broadcast game initialization with properly serialized game state
          io.to(socket.sessionId).emit('game_initialized', {
            type: 'game_initialized',
            sessionId: socket.sessionId,
            data: {
              gameState: serializeGameStateForTransmission(gameState),
              message: 'All decks selected! Game initialized.'
            },
            timestamp: Date.now()
          });

          // Also send a game_state_update to ensure clients get the latest state
          io.to(socket.sessionId).emit('game_state_update', {
            type: 'game_state_update',
            sessionId: socket.sessionId,
            data: {
              gameState: serializeGameStateForTransmission(gameState)
            },
            timestamp: Date.now()
          });
        }

      } catch (error) {
        console.error(`❌ [WEBSOCKET] Error handling deck selection:`, error);
        socket.emit('error', { message: 'Failed to select deck' });
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

          // Send updated game state to all players (personalized for each)
          const socketsInRoom = await io.in(socket.sessionId).fetchSockets();
          for (const playerSocket of socketsInRoom) {
            const filteredGameState = filterGameStateForPlayer(session.game_state, (playerSocket as any).userId || 'unknown');
            playerSocket.emit('game_state_update', {
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
                  gameState: serializeGameStateForTransmission(filteredGameState),
                  settings: session.settings,
                  createdAt: session.created_at,
                  updatedAt: new Date()
                }
              },
              timestamp: Date.now()
            });
          }

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

        // Mark this player as waiting for a match
        (socket as any).isWaitingForMatch = true;
        (socket as any).gameMode = data.gameMode;

        // Set a timeout to reset waiting state if no match is found
        if ((socket as any).matchmakingTimeout) {
          clearTimeout((socket as any).matchmakingTimeout);
        }
        (socket as any).matchmakingTimeout = setTimeout(() => {
          if ((socket as any).isWaitingForMatch) {
            console.log(`⏰ Matchmaking timeout for user ${socket.userId}, resetting waiting state`);
            (socket as any).isWaitingForMatch = false;
            (socket as any).gameMode = null;
            socket.emit('matchmaking_timeout', {
              message: 'No match found within timeout period',
              timestamp: Date.now()
            });
          }
        }, 60000); // 60 second timeout

        // Add to matchmaking queue (this would call the matchmaking logic)
        // For now, just acknowledge the request
        socket.emit('matchmaking_joined', {
          gameMode: data.gameMode,
          timestamp: Date.now()
        });

        // Check if there are other players waiting for a match
        const allSockets = Array.from(io.sockets.sockets.values());
        console.log(`🔍 Total connected sockets: ${allSockets.length}`);

        const waitingPlayers = allSockets
          .filter(s => {
            const hasUserId = !!(s as any).userId;
            const isDifferentUser = (s as any).userId !== socket.userId;
            const isWaiting = !!(s as any).isWaitingForMatch;
            const sameGameMode = (s as any).gameMode === data.gameMode;

            console.log(`🔍 Socket ${(s as any).userId}: hasUserId=${hasUserId}, isDifferentUser=${isDifferentUser}, isWaiting=${isWaiting}, sameGameMode=${sameGameMode}`);

            return hasUserId && isDifferentUser && isWaiting && sameGameMode;
          });

        console.log(`🔍 Found ${waitingPlayers.length} waiting players for ${data.gameMode}`);

        if (waitingPlayers.length > 0) {
          // Found a real opponent
          const opponentSocket = waitingPlayers[0] as any;
          const sessionId = randomUUID();

          console.log(`🎯 Creating real match session: ${sessionId} between ${socket.userId} and ${opponentSocket.userId}`);

          // Mark both players as no longer waiting
          (socket as any).isWaitingForMatch = false;
          (opponentSocket as any).isWaitingForMatch = false;

          // Clear matchmaking timeouts
          if ((socket as any).matchmakingTimeout) {
            clearTimeout((socket as any).matchmakingTimeout);
            (socket as any).matchmakingTimeout = null;
          }
          if ((opponentSocket as any).matchmakingTimeout) {
            clearTimeout((opponentSocket as any).matchmakingTimeout);
            (opponentSocket as any).matchmakingTimeout = null;
          }

          // Create the game session in the database
          try {
            const { default: db } = await import('../database/kysely');

            // Get user details for proper player mapping
            const userDetails = await db
              .selectFrom('users')
              .select(['id', 'username', 'display_name', 'firebase_uid'])
              .where('id', 'in', [socket.userId!, opponentSocket.userId!])
              .execute();

            console.log('🔍 [WEBSOCKET MATCH] User details for players:', userDetails);

            const players = [socket.userId!, opponentSocket.userId!].map((userId, index) => {
              const userDetail = userDetails.find(u => u.id === userId);
              return {
                playerId: userId,
                id: userId,
                name: userDetail?.display_name || userDetail?.username || `Player ${index + 1}`,
                username: userDetail?.username || userDetail?.display_name,
                firebaseUid: userDetail?.firebase_uid,
                rating: index === 0 ? 1000 : 1050,
                ready: false
              };
            });

            // Start deck selection phase with 60-second timer
            const deckSelectionDeadline = Date.now() + 60000; // 60 seconds from now

            const gameState = {
              gamePhase: 'setup', // Start in setup phase for deck selection
              players: players.map(p => ({
                ...p,
                hasDeckSelected: false,
                selectedDeckId: null
              })),
              createdAt: new Date(),
              gameMode: data.gameMode,
              deckSelectionDeadline,
              deckSelectionTimeRemaining: 60
            };

            // Set up 60-second auto-selection timer
            setTimeout(async () => {
              try {
                console.log(`⏰ [DECK SELECTION] 60-second timer expired for session ${sessionId}`);

                // Get current session state
                const currentSession = await db
                  .selectFrom('game_sessions')
                  .selectAll()
                  .where('id', '=', sessionId)
                  .executeTakeFirst();

                if (!currentSession) {
                  console.log(`⚠️ [DECK SELECTION] Session ${sessionId} not found during auto-selection`);
                  return;
                }

                const currentGameState = currentSession.game_state as any;

                // Check if deck selection is still in progress
                if (currentGameState.gamePhase !== 'setup' || currentGameState.deckSelectionCompleted) {
                  console.log(`⚠️ [DECK SELECTION] Session ${sessionId} no longer in deck selection phase`);
                  return;
                }

                const currentPlayers = currentGameState.players || [];
                let autoSelectionsNeeded = false;

                // Auto-select first deck for players who haven't selected
                for (const player of currentPlayers) {
                  if (!player.hasDeckSelected) {
                    console.log(`🎯 [DECK SELECTION] Auto-selecting first deck for player ${player.playerId}`);

                    // Get player's first valid deck (minimum 20 cards for starter decks)
                    const firstDeck = await db
                      .selectFrom('decks')
                      .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
                      .select([
                        'decks.id',
                        'decks.name',
                        db.fn.count('deck_cards.id').as('card_count')
                      ])
                      .where('decks.user_id', '=', player.playerId)
                      .groupBy(['decks.id', 'decks.name'])
                      .having(db.fn.count('deck_cards.id'), '>=', 20)
                      .orderBy('decks.created_at', 'asc')
                      .executeTakeFirst();

                    if (firstDeck) {
                      player.selectedDeckId = firstDeck.id;
                      player.hasDeckSelected = true;
                      player.deckSelectedAt = new Date();
                      player.autoSelected = true; // Mark as auto-selected
                      autoSelectionsNeeded = true;

                      console.log(`✅ [DECK SELECTION] Auto-selected deck "${firstDeck.name}" for player ${player.playerId}`);
                    } else {
                      console.error(`❌ [DECK SELECTION] No valid decks found for player ${player.playerId}`);
                    }
                  }
                }

                if (autoSelectionsNeeded) {
                  // All players now have decks selected, initialize the game
                  console.log(`🎮 [DECK SELECTION] Auto-selection complete, initializing game for session ${sessionId}`);

                  // Initialize BioMasters game engine
                  await initializeBioMastersGame(sessionId, currentGameState, currentPlayers);

                  // Transition to playing phase
                  currentGameState.gamePhase = 'playing';
                  currentGameState.deckSelectionCompleted = true;
                  currentGameState.deckSelectionCompletedAt = new Date();
                  currentGameState.autoSelectionOccurred = true;

                  // Clear deck selection timing
                  delete currentGameState.deckSelectionTimeRemaining;
                  delete currentGameState.deckSelectionDeadline;

                  // Serialize game state before storing (to handle Maps properly)
                  const serializedCurrentGameState = deepSerialize(currentGameState);

                  console.log('💾 [AUTO-SELECTION] Serializing game state for database storage:', {
                    hasEngineState: !!currentGameState.engineState,
                    hasEngineGrid: !!(currentGameState.engineState?.grid),
                    engineGridSize: currentGameState.engineState?.grid instanceof Map ? currentGameState.engineState.grid.size : 'not a Map',
                    serializedEngineGridType: serializedCurrentGameState.engineState?.grid?.__type,
                    serializedEngineGridEntries: serializedCurrentGameState.engineState?.grid?.entries?.length || 0
                  });

                  // Update database
                  await db
                    .updateTable('game_sessions')
                    .set({
                      game_state: serializedCurrentGameState,
                      status: 'playing',
                      updated_at: new Date()
                    })
                    .where('id', '=', sessionId)
                    .execute();

                  // Broadcast auto-selection and game initialization to all players
                  io.to(sessionId).emit('deck_selection_timeout', {
                    type: 'deck_selection_timeout',
                    sessionId,
                    data: {
                      message: 'Deck selection time expired. Auto-selecting first valid decks.',
                      autoSelections: currentPlayers
                        .filter((p: any) => p.autoSelected)
                        .map((p: any) => ({ playerId: p.playerId, deckId: p.selectedDeckId }))
                    },
                    timestamp: Date.now()
                  });

                  io.to(sessionId).emit('game_initialized', {
                    type: 'game_initialized',
                    sessionId,
                    data: {
                      gameState: serializeGameStateForTransmission(currentGameState),
                      message: 'Game initialized with auto-selected decks!'
                    },
                    timestamp: Date.now()
                  });

                  // Also send a game_state_update to ensure clients get the latest state
                  io.to(sessionId).emit('game_state_update', {
                    type: 'game_state_update',
                    sessionId,
                    data: {
                      gameState: serializeGameStateForTransmission(currentGameState)
                    },
                    timestamp: Date.now()
                  });

                  console.log(`✅ [DECK SELECTION] Session ${sessionId} auto-selection and initialization complete`);
                }

              } catch (error) {
                console.error(`❌ [DECK SELECTION] Error during auto-selection for session ${sessionId}:`, error);
              }
            }, 60000); // 60 seconds

            await db
              .insertInto('game_sessions')
              .values({
                id: sessionId,
                host_user_id: socket.userId!,
                status: 'waiting' as const,
                game_mode: data.gameMode as any,
                is_private: false,
                max_players: 2,
                current_players: 2,
                players: sql`${JSON.stringify(players)}::jsonb`,
                game_state: sql`${JSON.stringify(gameState)}::jsonb`,
                settings: sql`${JSON.stringify({})}::jsonb`,
                created_at: new Date(),
                updated_at: new Date()
              })
              .execute();

            console.log(`✅ Game session created in database: ${sessionId}`);

            // Emit match_found to both players
            const matchData1 = {
              sessionId,
              opponent: {
                id: opponentSocket.userId,
                username: (opponentSocket as any).username || 'Unknown Player',
                rating: 1050
              },
              gameMode: data.gameMode,
              estimatedWaitTime: 0
            };

            const matchData2 = {
              sessionId,
              opponent: {
                id: socket.userId,
                username: (socket as any).username || 'Unknown Player',
                rating: 1000
              },
              gameMode: data.gameMode,
              estimatedWaitTime: 0
            };

            console.log(`📤 Emitting match_found to player 1: ${socket.userId}`);
            socket.emit('match_found', matchData1);

            console.log(`📤 Emitting match_found to player 2: ${opponentSocket.userId}`);
            opponentSocket.emit('match_found', matchData2);

            console.log(`✅ Match found events sent to both players for session: ${sessionId}`);

          } catch (error) {
            console.error('❌ Error creating game session:', error);
            socket.emit('error', { message: 'Failed to create match session' });
            opponentSocket.emit('error', { message: 'Failed to create match session' });
          }
        } else {
          // No opponent found - player stays in queue waiting for real opponents
          console.log(`⏳ Player ${socket.userId} waiting in queue for real opponents (no simulated matches)`);

          // Emit queue status to let the client know they're waiting
          socket.emit('queue_status', {
            position: 1, // Could implement proper queue position tracking
            estimatedWait: 30000, // 30 seconds estimated wait
            playersInQueue: 1,
            timestamp: Date.now()
          });

          // Direct player to use proper matchmaking API instead of creating fake matches
          console.log(`🔄 Directing player ${socket.userId} to use proper matchmaking API`);

          socket.emit('use_matchmaking_api', {
            message: 'Please use the /api/matchmaking/find endpoint to join the queue',
            gameMode: data.gameMode,
            endpoint: '/api/matchmaking/find'
          });
        }

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

        // Get the game session from database
        const { default: db } = await import('../database/kysely');
        const session = await db
          .selectFrom('game_sessions')
          .selectAll()
          .where('id', '=', data.sessionId)
          .executeTakeFirst();

        if (!session) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        // Update player acceptance status in the game state
        const gameState = session.game_state as any;
        if (gameState && gameState.players) {
          const playerIndex = gameState.players.findIndex((p: any) => p.playerId === socket.userId);
          if (playerIndex !== -1) {
            gameState.players[playerIndex].ready = true;
            console.log(`✅ Player ${socket.userId} marked as ready in game state`);
          } else {
            console.log(`⚠️ Player ${socket.userId} not found in game state players`);
          }
        }

        // Update the database with the new game state
        await db
          .updateTable('game_sessions')
          .set({
            game_state: gameState,
            updated_at: new Date()
          })
          .where('id', '=', data.sessionId)
          .execute();

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

        // Check if all players have accepted
        const allPlayersReady = gameState.players.every((p: any) => p.ready);
        console.log(`🔍 Session ${data.sessionId}: All players ready? ${allPlayersReady}`);

        if (allPlayersReady) {
          console.log(`🎮 All players accepted! Starting deck selection for session ${data.sessionId}`);

          // Keep game in setup phase for deck selection - don't transition to playing yet
          // The 60-second timer will handle the transition to playing after deck selection
          gameState.startedAt = new Date();

          // Update database with started timestamp but keep in setup phase
          await db
            .updateTable('game_sessions')
            .set({
              status: 'playing', // Database status is playing, but gamePhase stays setup for deck selection
              game_state: gameState,
              updated_at: new Date()
            })
            .where('id', '=', data.sessionId)
            .execute();

          // Notify all players that deck selection is starting
          io.to(data.sessionId).emit('game_starting', {
            sessionId: data.sessionId,
            gameState: gameState,
            timestamp: Date.now()
          });

          console.log(`🎉 Deck selection started for session ${data.sessionId}! Players have 60 seconds to select decks.`);
        }

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

      // Reset matchmaking state on disconnect
      (socket as any).isWaitingForMatch = false;
      (socket as any).gameMode = null;

      // Clear matchmaking timeout
      if ((socket as any).matchmakingTimeout) {
        clearTimeout((socket as any).matchmakingTimeout);
        (socket as any).matchmakingTimeout = null;
      }

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

  // Subscribe to match found notifications from MatchmakingWorker
  setupMatchFoundSubscription(io);

  // Store global reference
  globalIo = io;

  return io;
}

/**
 * Setup subscription to match found notifications from MatchmakingWorker
 */
async function setupMatchFoundSubscription(io: SocketIOServer) {
  try {
    console.log('🔔 Setting up match found subscription...');

    // Import Pub/Sub configuration
    const { getSubscription, PUBSUB_SUBSCRIPTIONS } = await import('../config/pubsub');

    // Subscribe to match found notifications
    const subscription = getSubscription(PUBSUB_SUBSCRIPTIONS.MATCH_NOTIFICATIONS);

    subscription.on('message', (message) => {
      try {
        console.log('🔔 [MATCH NOTIFICATION] Received match found notification');
        console.log('🔔 [MATCH NOTIFICATION] Message data:', message.data.toString());
        console.log('🔔 [MATCH NOTIFICATION] Message attributes:', JSON.stringify(message.attributes, null, 2));

        const matchData = JSON.parse(message.data.toString());
        const { playerId, sessionId, gameMode } = message.attributes;

        console.log(`🔔 [MATCH NOTIFICATION] Notifying player ${playerId} about match ${sessionId}`);

        // Find the socket for this player
        const playerSocket = Array.from(io.sockets.sockets.values())
          .find(socket => (socket as any).userId === playerId);

        if (playerSocket) {
          console.log(`📤 [MATCH NOTIFICATION] Sending match_found to player ${playerId}`);
          playerSocket.emit('match_found', {
            sessionId,
            gameMode,
            players: matchData.players,
            estimatedStartTime: matchData.estimatedStartTime,
            timestamp: Date.now()
          });
          console.log(`✅ [MATCH NOTIFICATION] Match notification sent to player ${playerId}`);
        } else {
          console.log(`⚠️ [MATCH NOTIFICATION] Player ${playerId} not connected to WebSocket`);
        }

        message.ack();
      } catch (error) {
        console.error('❌ [MATCH NOTIFICATION] Error processing match notification:', error);
        message.nack();
      }
    });

    subscription.on('error', (error) => {
      console.error('❌ [MATCH NOTIFICATION] Subscription error:', error);
    });

    console.log('✅ Match found subscription setup complete');
  } catch (error) {
    console.error('❌ Failed to setup match found subscription:', error);
  }
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
