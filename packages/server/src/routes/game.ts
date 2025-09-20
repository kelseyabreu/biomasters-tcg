import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// import { apiRateLimiter } from '../middleware/rateLimiter'; // Unused for now
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { z } from 'zod';
import crypto from 'crypto';
// import { NewDeck } from '../database/types'; // Unused for now
import { BioMastersEngine, GameSettings, ClientPlayerAction } from '@kelseyabreu/shared';
import { IUnifiedDataLoader } from '@kelseyabreu/shared';
import { createMockLocalizationManager } from '../utils/mockLocalizationManager';

const router = Router();



// Game session schemas
const createGameSessionSchema = z.object({
  gameMode: z.enum(['campaign', 'online', 'scenarios', 'tutorial']),
  isPrivate: z.boolean().default(false),
  maxPlayers: z.number().min(2).max(4).default(2),
  settings: z.object({
    eventFrequency: z.number().min(0).max(1).default(0.1),
    allowChallenges: z.boolean().default(true),
    startingHandSize: z.number().min(3).max(10).default(5),
    deckSize: z.number().min(5).max(20).default(10),
    turnTimeLimit: z.number().optional(),
    gameTimeLimit: z.number().optional()
  }).optional()
});

// const joinGameSessionSchema = z.object({
//   sessionId: z.string().uuid()
// });

// const gameActionSchema = z.object({
//   sessionId: z.string().uuid(),
//   action: z.object({
//     type: z.enum(['place_card', 'move_card', 'challenge', 'pass_turn']),
//     cardId: z.string().optional(),
//     position: z.object({
//       x: z.number(),
//       y: z.number()
//     }).optional(),
//     targetPosition: z.object({
//       x: z.number(),
//       y: z.number()
//     }).optional(),
//     challengeData: z.object({
//       targetCardId: z.string(),
//       targetPlayerId: z.string(),
//       claimType: z.string(),
//       evidence: z.string()
//     }).optional()
//   })
// });

/**
 * PATCH /api/game/sessions/:sessionId/ready
 * Mark player as ready in a game session
 */
router.patch('/sessions/:sessionId/ready', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { ready } = req.body;
  const userId = req.user!.id;

  console.log(`🚨🚨🚨 [READY ENDPOINT] CALLED!!! sessionId: ${sessionId}, userId: ${userId}, ready: ${ready}`);
  console.log(`🚨🚨🚨 [READY ENDPOINT] Request method: ${req.method}, URL: ${req.url}`);
  console.log(`🚨🚨🚨 [READY ENDPOINT] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔧 [READY ENDPOINT] Request headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔧 [READY ENDPOINT] Request body:`, JSON.stringify(req.body, null, 2));

  // Validate sessionId
  if (!sessionId) {
    console.log(`🔧 [READY ENDPOINT] ERROR: Missing session ID`);
    return res.status(400).json({
      error: 'INVALID_SESSION_ID',
      message: 'Session ID is required'
    });
  }

  // Validate input
  if (typeof ready !== 'boolean') {
    return res.status(400).json({
      error: 'INVALID_READY_STATE',
      message: 'Ready state must be a boolean'
    });
  }

  // Get game session
  console.log(`🔧 [READY ENDPOINT] Fetching session ${sessionId} from database...`);
  const gameSession = await db
    .selectFrom('game_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!gameSession) {
    console.log(`🔧 [READY ENDPOINT] ERROR: Session ${sessionId} not found in database`);
    return res.status(404).json({
      error: 'SESSION_NOT_FOUND',
      message: 'Game session not found'
    });
  }

  console.log(`🔧 [READY ENDPOINT] Session found:`, {
    id: gameSession.id,
    status: gameSession.status,
    host_user_id: gameSession.host_user_id,
    game_mode: gameSession.game_mode,
    current_players: gameSession.current_players,
    max_players: gameSession.max_players,
    players_type: typeof gameSession.players,
    players_length: Array.isArray(gameSession.players) ? gameSession.players.length : 'not array'
  });

  // Parse players (handle case where players field might not exist)
  if (!gameSession.players) {
    return res.status(400).json({
      error: 'INVALID_SESSION',
      message: 'Session has no player data'
    });
  }

  const players = Array.isArray(gameSession.players) ? gameSession.players : JSON.parse(gameSession.players as unknown as string);
  const playerIndex = players.findIndex((p: any) => p.playerId === userId);

  if (playerIndex === -1) {
    return res.status(403).json({
      error: 'NOT_IN_SESSION',
      message: 'You are not a player in this session'
    });
  }

  // Update player ready state
  players[playerIndex].ready = ready;

  // Check if all players are ready
  const allReady = players.every((p: any) => p.ready === true);
  const newStatus: 'waiting' | 'active' = allReady ? 'active' : 'waiting';

  // Update game session
  console.log(`🔧 [Game] Updating session ${sessionId} with players:`, JSON.stringify(players, null, 2));
  console.log(`🔧 [Game] All ready check: ${allReady} (${players.filter((p: any) => p.ready).length}/${players.length} ready)`);
  console.log(`🔧 [Game] New status: ${newStatus}`);

  // Convert to JSON string like MatchmakingWorker does
  const playersJson = JSON.stringify(players);
  console.log(`🔧 [Game] Players JSON string:`, playersJson);

  // Try updating without the players column first to isolate the issue
  console.log(`🔧 [Game] Attempting database update...`);

  try {
    await db
      .updateTable('game_sessions')
      .set({
        status: newStatus,
        updated_at: new Date()
      })
      .where('id', '=', sessionId)
      .execute();

    console.log(`✅ [Game] Status update successful, now updating players...`);

    // Now update players separately
    await db
      .updateTable('game_sessions')
      .set({
        players: playersJson as any
      })
      .where('id', '=', sessionId)
      .execute();

    console.log(`✅ [Game] Players update successful`);
  } catch (error) {
    console.error(`❌ [Game] Database update failed:`, error);
    throw error;
  }

  return res.json({
    success: true,
    ready,
    allPlayersReady: allReady,
    sessionStatus: newStatus
  });
}));

/**
 * GET /api/game/decks
 * Get user's saved decks (using normalized deck structure)
 */
router.get('/decks', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;

  // Get user's personal decks with card counts
  const decks = await db
    .selectFrom('decks')
    .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
    .select([
      'decks.id',
      'decks.name',
      'decks.created_at',
      'decks.updated_at',
      db.fn.count('deck_cards.id').as('card_count')
    ])
    .where('decks.user_id', '=', user.id)
    .where('decks.user_id', '!=', '00000000-0000-0000-0000-000000000000') // Exclude system decks
    .groupBy(['decks.id', 'decks.name', 'decks.created_at', 'decks.updated_at'])
    .orderBy('decks.updated_at', 'desc')
    .execute();

  // Get cards for each deck to maintain API compatibility
  const decksWithCards = await Promise.all(
    decks.map(async (deck) => {
      const deckCards = await db
        .selectFrom('deck_cards')
        .select(['card_id', db.fn.count('id').as('quantity')])
        .where('deck_id', '=', deck.id)
        .groupBy('card_id')
        .execute();

      const cards = deckCards.map(dc => ({
        cardId: dc.card_id,
        quantity: Number(dc.quantity)
      }));

      return {
        id: deck.id,
        name: deck.name,
        description: '', // No description in decks table
        cards: cards, // Normalized format instead of JSONB
        isValid: Number(deck.card_count) >= 20,
        isFavorite: false, // No favorite field in decks table
        format: 'standard',
        totalCards: Number(deck.card_count),
        winRate: 0, // No win rate in decks table
        gamesPlayed: 0, // No games played in decks table
        createdAt: deck.created_at,
        updatedAt: deck.updated_at
      };
    })
  );

  res.json({
    decks: decksWithCards
  });
}));

/**
 * POST /api/game/decks
 * Create a new deck
 */
router.post('/decks', requireAuth, asyncHandler(async (req, res) => {
  const { name, description, cards, format = 'standard' } = req.body;
  const user = req.user!;

  // Validate input
  if (!name || name.length < 1 || name.length > 100) {
    return res.status(400).json({
      error: 'INVALID_NAME',
      message: 'Deck name must be between 1 and 100 characters'
    });
  }

  if (!cards || !Array.isArray(cards)) {
    return res.status(400).json({
      error: 'INVALID_CARDS',
      message: 'Cards must be an array'
    });
  }

  // Check if deck name already exists for user
  const existingDeck = await db
    .selectFrom('decks')
    .select('id')
    .where('user_id', '=', user.id)
    .where('name', '=', name)
    .executeTakeFirst();

  if (existingDeck) {
    return res.status(409).json({
      error: 'DECK_EXISTS',
      message: 'A deck with this name already exists'
    });
  }

  // Calculate total cards
  const totalCards = cards.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0);

  // Validate deck composition
  const isValid = totalCards >= 20 && totalCards <= 40;

  // Create deck in transaction
  const newDeck = await db.transaction().execute(async (trx) => {
    // Create deck
    const deck = await trx
      .insertInto('decks')
      .values({
        user_id: user.id,
        name,
        deck_type: 1, // DeckType.CUSTOM
        is_public: false,
        is_claimable: false
      })
      .returning(['id', 'name', 'created_at', 'updated_at'])
      .executeTakeFirstOrThrow();

    // Add cards to deck_cards table
    let position = 1;
    for (const card of cards) {
      for (let i = 0; i < card.quantity; i++) {
        await trx
          .insertInto('deck_cards')
          .values({
            deck_id: deck.id,
            card_id: card.cardId || card.card_id,
            species_name: `card-${card.cardId || card.card_id}`,
            position_in_deck: position++
          })
          .execute();
      }
    }

    return deck;
  });

  res.status(201).json({
    message: 'Deck created successfully',
    deck: {
      id: newDeck.id,
      name: newDeck.name,
      description: description || '',
      cards: cards, // Return the input cards format for compatibility
      format: format,
      totalCards: totalCards,
      isValid: isValid,
      createdAt: newDeck.created_at,
      updatedAt: newDeck.updated_at
    }
  });
  return;
}));

/**
 * PUT /api/game/decks/:deckId
 * Update a deck
 */
router.put('/decks/:deckId', requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params;
  const { name, cards } = req.body;
  // const isFavorite = req.body.isFavorite; // Unused for now
  const user = req.user!;

  if (!deckId) {
    res.status(400).json({
      error: 'INVALID_DECK_ID',
      message: 'Deck ID is required'
    });
    return;
  }

  // Check if deck exists and belongs to user
  const existingDeck = await db
    .selectFrom('decks')
    .selectAll()
    .where('id', '=', deckId)
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  if (!existingDeck) {
    res.status(404).json({
      error: 'DECK_NOT_FOUND',
      message: 'Deck not found'
    });
    return;
  }

  // Update deck in transaction
  const updatedDeck = await db.transaction().execute(async (trx) => {
    // Update deck metadata
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    updateData.updated_at = new Date();

    const deck = await trx
      .updateTable('decks')
      .set(updateData)
      .where('id', '=', deckId)
      .where('user_id', '=', user.id)
      .returning(['id', 'name', 'user_id', 'created_at', 'updated_at'])
      .executeTakeFirst();

    if (!deck) {
      throw new Error('Failed to update deck');
    }

    // Update cards if provided
    if (cards && Array.isArray(cards)) {
      // Delete existing cards
      await trx
        .deleteFrom('deck_cards')
        .where('deck_id', '=', deckId)
        .execute();

      // Add new cards
      let position = 1;
      for (const card of cards) {
        for (let i = 0; i < card.quantity; i++) {
          await trx
            .insertInto('deck_cards')
            .values({
              deck_id: deckId,
              card_id: card.cardId || card.card_id,
              species_name: `card-${card.cardId || card.card_id}`,
              position_in_deck: position++
            })
            .execute();
        }
      }
    }

    return deck;
  });

  if (!updatedDeck) {
    res.status(404).json({
      error: 'Failed to update deck',
      message: 'Deck update failed'
    });
    return;
  }

  res.json({
    message: 'Deck updated successfully',
    deck: {
      id: updatedDeck.id,
      name: updatedDeck.name,
      user_id: updatedDeck.user_id,
      created_at: updatedDeck.created_at,
      updated_at: updatedDeck.updated_at
    }
  });
  return;
}));

/**
 * DELETE /api/game/decks/:deckId
 * Delete a deck
 */
router.delete('/decks/:deckId', requireAuth, asyncHandler(async (req, res) => {
  const { deckId } = req.params;
  const user = req.user!;

  if (!deckId) {
    res.status(400).json({
      error: 'INVALID_DECK_ID',
      message: 'Deck ID is required'
    });
    return;
  }

  const result = await db
    .deleteFrom('decks')
    .where('id', '=', deckId)
    .where('user_id', '=', user.id)
    .returning('id')
    .executeTakeFirst();

  if (!result) {
    res.status(404).json({
      error: 'DECK_NOT_FOUND',
      message: 'Deck not found'
    });
    return;
  }

  res.json({
    message: 'Deck deleted successfully'
  });
  return;
}));

/**
 * GET /api/game/achievements
 * Get user's achievements
 */
router.get('/achievements', requireAuth, asyncHandler(async (_req, res) => {
  // const user = req.user!; // TODO: Use when implementing achievements system

  // TODO: Implement achievements system with proper database table
  // For now, return empty achievements array
  const achievements: any[] = [];

  res.json({
    achievements: achievements.map(achievement => ({
      id: achievement.achievement_id,
      progress: achievement.progress,
      maxProgress: achievement.max_progress,
      isCompleted: achievement.is_completed,
      rewards: achievement.rewards,
      isClaimed: achievement.is_claimed,
      unlockedAt: achievement.unlocked_at,
      claimedAt: achievement.claimed_at
    }))
  });
}));

/**
 * POST /api/game/achievements/:achievementId/claim
 * Claim achievement rewards
 */
router.post('/achievements/:achievementId/claim', requireAuth, asyncHandler(async (req, res) => {
  const { achievementId } = req.params;
  // const user = req.user!; // Unused for now

  // For now, just return a placeholder response since achievements system is not fully implemented
  res.json({
    message: 'Achievement system not yet implemented',
    achievementId,
    status: 'placeholder'
  });
  return;
}));

/**
 * POST /api/game/sessions
 * Create a new game session
 */
router.post('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const validatedData = createGameSessionSchema.parse(req.body);
  const user = req.user!;

  // Create game session
  const sessionId = crypto.randomUUID();
  const gameSettings = validatedData.settings || {
    eventFrequency: 0.1,
    allowChallenges: true,
    startingHandSize: 5,
    deckSize: 10
  };

  const session = await db
    .insertInto('game_sessions')
    .values({
      id: sessionId,
      host_user_id: user.id,
      game_mode: validatedData.gameMode,
      is_private: validatedData.isPrivate,
      max_players: validatedData.maxPlayers || 2,
      current_players: 1,
      status: 'waiting',
      players: [{
        playerId: user.id,
        username: user.display_name || user.email,
        ready: false
      }],
      game_state: {
        phase: 'lobby',
        players: [{
          id: user.id,
          name: user.display_name || user.email,
          isReady: false
        }],
        settings: gameSettings
      },
      settings: gameSettings,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  res.status(201).json({
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
  });
}));

/**
 * GET /api/game/sessions
 * Get available game sessions
 */
router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const { gameMode, status = 'waiting' } = req.query;

  let query = db
    .selectFrom('game_sessions')
    .selectAll()
    .where('status', '=', status as 'waiting' | 'playing' | 'finished' | 'cancelled')
    .where('is_private', '=', false)
    .where(({ eb }) => eb('current_players', '<', eb.ref('max_players')))
    .orderBy('created_at', 'desc')
    .limit(20);

  if (gameMode) {
    query = query.where('game_mode', '=', gameMode as 'campaign' | 'online' | 'scenarios' | 'tutorial');
  }

  const sessions = await query.execute();

  res.json({
    sessions: sessions.map(session => ({
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
    }))
  });
}));

// ===== BioMasters Engine Endpoints =====

// In-memory game storage (in production, use Redis or database)
const activeGames = new Map<string, BioMastersEngine>();

/**
 * POST /api/game/biomasters/create
 * Create a new BioMasters game
 */
router.post('/biomasters/create', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });
    return;
  }

  const { gameSettings, players } = req.body;

  // Default game settings with proper grid size
  const playerCount = players?.length || 2;
  const gridSize = BioMastersEngine.getGridSize(playerCount);
  const defaultSettings: GameSettings = {
    maxPlayers: playerCount,
    gridWidth: gridSize.width,
    gridHeight: gridSize.height,
    startingHandSize: 5,
    maxHandSize: 10,
    startingEnergy: 3,
    turnTimeLimit: 300 // 5 minutes
  };

  const finalSettings = { ...defaultSettings, ...gameSettings };

  // Create game ID
  const gameId = `biomasters_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Default players if not provided
  const gamePlayers = players || [
    { id: req.user.id, name: req.user.display_name || 'Player 1' },
    { id: 'ai_player', name: 'AI Player' }
  ];

  try {
    // Get the global server data loader
    const serverDataLoader = (global as any).serverDataLoader as IUnifiedDataLoader;
    if (!serverDataLoader) {
      throw new Error('Server data loader not initialized');
    }

    // Load game data using unified data loader
    const [cardsResult, abilitiesResult] = await Promise.all([
      serverDataLoader.loadCards(),
      serverDataLoader.loadAbilities()
    ]);

    // Check for loading errors
    if (!cardsResult.success || !cardsResult.data) {
      throw new Error(`Failed to load cards: ${cardsResult.error}`);
    }
    if (!abilitiesResult.success || !abilitiesResult.data) {
      throw new Error(`Failed to load abilities: ${abilitiesResult.error}`);
    }

    // Convert arrays to Maps for engine compatibility
    const cardDatabase = new Map();
    for (const card of cardsResult.data) {
      cardDatabase.set(card.cardId, card);
    }

    const abilityDatabase = new Map();
    for (const ability of abilitiesResult.data) {
      abilityDatabase.set(ability.id, ability);
    }

    // Create empty keywords map for now (can be enhanced later)
    const keywordMap = new Map();

    // Create new game engine instance with injected data
    const mockLocalizationManager = createMockLocalizationManager();
    const gameEngine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordMap, mockLocalizationManager);

    // Initialize the game
    gameEngine.initializeNewGame(gameId, gamePlayers, finalSettings);

    // Store game in memory
    activeGames.set(gameId, gameEngine);

    res.json({
      success: true,
      game_id: gameId,
      game_state: gameEngine.getGameState(),
      message: 'BioMasters game created successfully'
    });
  } catch (error) {
    console.error('Error creating BioMasters game:', error);
    res.status(500).json({
      error: 'GAME_CREATION_ERROR',
      message: 'Failed to create BioMasters game'
    });
  }
}));

/**
 * GET /api/game/biomasters/:gameId/state
 * Get current BioMasters game state
 */
router.get('/biomasters/:gameId/state', requireAuth, asyncHandler(async (req, res) => {
  const gameId = req.params['gameId'];
  if (!gameId) {
    res.status(400).json({ error: 'Game ID required' });
    return;
  }

  const gameEngine = activeGames.get(gameId);
  if (!gameEngine) {
    res.status(404).json({
      error: 'GAME_NOT_FOUND',
      message: 'BioMasters game not found'
    });
    return;
  }

  res.json({
    success: true,
    game_state: gameEngine.getGameState()
  });
}));

/**
 * POST /api/game/biomasters/:gameId/action
 * Process a player action in BioMasters game
 */
router.post('/biomasters/:gameId/action', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });
    return;
  }

  const gameId = req.params['gameId'];
  if (!gameId) {
    res.status(400).json({ error: 'Game ID required' });
    return;
  }
  const { action } = req.body;

  const gameEngine = activeGames.get(gameId);
  if (!gameEngine) {
    res.status(404).json({
      error: 'GAME_NOT_FOUND',
      message: 'BioMasters game not found'
    });
    return;
  }

  // Validate action format
  if (!action || !action.type) {
    res.status(400).json({
      error: 'INVALID_ACTION',
      message: 'Action type is required'
    });
    return;
  }

  // Add player ID to action
  const playerAction: ClientPlayerAction = {
    ...action,
    playerId: req.user.id
  };

  try {
    // Process the action
    const result = gameEngine.processAction(playerAction);

    if (!result.isValid) {
      res.status(400).json({
        error: 'INVALID_ACTION',
        message: result.errorMessage || 'Action is not valid'
      });
      return;
    }

    res.json({
      success: true,
      game_state: result.newState || gameEngine.getGameState(),
      message: 'Action processed successfully'
    });
  } catch (error) {
    console.error('Error processing BioMasters action:', error);
    res.status(500).json({
      error: 'ACTION_PROCESSING_ERROR',
      message: 'Failed to process action'
    });
  }
}));

/**
 * GET /api/game/biomasters/:gameId/valid-actions
 * Get valid actions for current player in BioMasters game
 */
router.get('/biomasters/:gameId/valid-actions', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });
    return;
  }

  const gameId = req.params['gameId'];
  if (!gameId) {
    res.status(400).json({ error: 'Game ID required' });
    return;
  }

  const gameEngine = activeGames.get(gameId);
  if (!gameEngine) {
    res.status(404).json({
      error: 'GAME_NOT_FOUND',
      message: 'BioMasters game not found'
    });
    return;
  }

  const gameState = gameEngine.getGameState();
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!currentPlayer || currentPlayer.id !== req.user.id) {
    res.status(403).json({
      error: 'NOT_YOUR_TURN',
      message: 'It is not your turn'
    });
    return;
  }

  // Generate list of valid actions
  const validActions: Array<{type: string; description: string; cardId?: string; instanceId?: string; abilityId?: any}> = [];

  // Always can pass turn
  validActions.push({
    type: 'PASS_TURN',
    description: 'End your turn'
  });

  // Can play cards from hand
  for (const cardInstanceId of currentPlayer.hand) {
    validActions.push({
      type: 'PLAY_CARD',
      cardId: cardInstanceId,
      description: `Play card ${cardInstanceId}`
    });
  }

  // Can activate abilities of ready cards
  for (const [, card] of gameState.grid) {
    if (card.ownerId === req.user.id && !card.isExhausted) {
      const cardData = gameEngine.getCardDatabase().get(card.cardId);
      if (cardData && cardData.abilities && cardData.abilities.length > 0) {
        for (const abilityId of cardData.abilities) {
          validActions.push({
            type: 'ACTIVATE_ABILITY',
            instanceId: card.instanceId,
            abilityId,
            description: `Activate ability on ${gameEngine.getCardName(cardData)}`
          });
        }
      }
    }
  }

  res.json({
    success: true,
    valid_actions: validActions,
    current_player: currentPlayer.id,
    turn_number: gameState.turnNumber
  });
}));

/**
 * DELETE /api/game/biomasters/:gameId
 * End/delete a BioMasters game
 */
router.delete('/biomasters/:gameId', requireAuth, asyncHandler(async (req, res) => {
  const gameId = req.params['gameId'];
  if (!gameId) {
    res.status(400).json({ error: 'Game ID required' });
    return;
  }

  const gameEngine = activeGames.get(gameId);
  if (!gameEngine) {
    res.status(404).json({
      error: 'GAME_NOT_FOUND',
      message: 'BioMasters game not found'
    });
    return;
  }

  // Remove game from memory
  activeGames.delete(gameId);

  res.json({
    success: true,
    message: 'BioMasters game ended successfully'
  });
}));

/**
 * GET /api/game/biomasters/active
 * Get list of active BioMasters games for user
 */
router.get('/biomasters/active', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });
    return;
  }

  const userGames: Array<{game_id: string; players: Array<{id: string; name: string}>; current_player: string | null; turn_number: number; game_phase: any}> = [];

  for (const [gameId, gameEngine] of activeGames) {
    const gameState = gameEngine.getGameState();
    const isPlayerInGame = gameState.players.some(p => p.id === req.user!.id);

    if (isPlayerInGame) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      userGames.push({
        game_id: gameId,
        players: gameState.players.map(p => ({ id: p.id, name: p.name })),
        current_player: currentPlayer ? currentPlayer.id : null,
        turn_number: gameState.turnNumber,
        game_phase: gameState.gamePhase
      });
    }
  }

  res.json({
    success: true,
    active_games: userGames
  });
}));

export default router;
