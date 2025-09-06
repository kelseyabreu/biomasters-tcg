import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// import { apiRateLimiter } from '../middleware/rateLimiter'; // Unused for now
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { z } from 'zod';
import crypto from 'crypto';
// import { NewDeck } from '../database/types'; // Unused for now
import { BioMastersEngine, GameSettings, PlayerAction, CardData as SharedCardData, AbilityData as SharedAbilityData } from '../../../shared/game-engine/BioMastersEngine';
import { gameDataManager } from '../services/GameDataManager';

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
 * GET /api/game/decks
 * Get user's saved decks
 */
router.get('/decks', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;

  const decks = await db
    .selectFrom('user_decks')
    .selectAll()
    .where('user_id', '=', user.id)
    .orderBy('is_favorite', 'desc')
    .orderBy('updated_at', 'desc')
    .execute();

  res.json({
    decks: decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cards: deck.cards,
      isValid: deck.is_valid,
      isFavorite: deck.is_favorite,
      format: deck.format,
      totalCards: deck.total_cards,
      winRate: deck.win_rate,
      gamesPlayed: deck.games_played,
      createdAt: deck.created_at,
      updatedAt: deck.updated_at
    }))
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
    .selectFrom('user_decks')
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

  // TODO: Validate deck composition and card ownership
  const isValid = totalCards >= 30 && totalCards <= 40;

  // Create deck
  const newDeck = await db
    .insertInto('user_decks')
    .values({
      user_id: user.id,
      name,
      description,
      cards: JSON.stringify(cards),
      format,
      total_cards: totalCards,
      is_valid: isValid,
      is_favorite: false,
      games_played: 0,
      win_rate: 0
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  res.status(201).json({
    message: 'Deck created successfully',
    deck: {
      id: newDeck.id,
      name: newDeck.name,
      description: newDeck.description,
      cards: newDeck.cards,
      format: newDeck.format,
      totalCards: newDeck.total_cards,
      isValid: newDeck.is_valid
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
  const { name, description, cards } = req.body;
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

  // For now, just update basic deck info
  // let totalCards = 30; // Default deck size - unused for now
  // let isValid = true; // Deck validation - unused for now

  if (cards) {
    // totalCards = cards.reduce((sum: number, card: any) => sum + (card.quantity || 0), 0);
    // isValid = totalCards >= 30 && totalCards <= 40; // Validation logic for future use
    console.log(`Deck has ${cards.length} card types`); // Placeholder for deck validation
  }

  // Update deck
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  const updatedDeck = await db
    .updateTable('decks')
    .set(updateData)
    .where('id', '=', deckId)
    .where('user_id', '=', user.id)
    .returning(['id', 'name', 'user_id', 'created_at', 'updated_at'])
    .executeTakeFirst();

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
      game_state: JSON.stringify({
        phase: 'lobby',
        players: [{
          id: user.id,
          name: user.display_name || user.email,
          isReady: false
        }],
        settings: gameSettings
      }),
      settings: JSON.stringify(gameSettings),
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
      gameState: JSON.parse(session.game_state),
      settings: JSON.parse(session.settings),
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
      gameState: JSON.parse(session.game_state),
      settings: JSON.parse(session.settings),
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
    // Ensure game data is loaded
    if (!gameDataManager.isDataLoaded()) {
      await gameDataManager.loadGameData();
    }

    // Convert server data to shared format
    const cardDatabase = new Map<number, SharedCardData>();
    gameDataManager.getCards().forEach((serverCard, id) => {
      const sharedCard: SharedCardData = {
        cardId: serverCard.cardId,
        trophicLevel: serverCard.trophicLevel,
        trophicCategory: serverCard.trophicCategory,
        domain: serverCard.domain,
        cost: serverCard.cost,
        keywords: serverCard.keywords,
        abilities: serverCard.abilities || [], // Default to empty array if missing
        victoryPoints: serverCard.victoryPoints || 0, // Default to 0 if missing
        commonName: serverCard.commonName,
        scientificName: serverCard.scientificName || '' // Default to empty string if missing
      };
      cardDatabase.set(id, sharedCard);
    });

    const abilityDatabase = new Map<number, SharedAbilityData>();
    gameDataManager.getAbilities().forEach((serverAbility, id) => {
      const sharedAbility: SharedAbilityData = {
        abilityId: serverAbility.abilityID,
        abilityID: serverAbility.abilityID, // Legacy support
        name: `Ability ${serverAbility.abilityID}`, // Default name since server doesn't have it
        description: `Ability with trigger ${serverAbility.triggerID}`, // Default description
        cost: {}, // Default empty cost
        effects: serverAbility.effects,
        triggerID: serverAbility.triggerID
      };
      abilityDatabase.set(id, sharedAbility);
    });

    const keywordMap = new Map<number, string>();
    gameDataManager.getKeywords().forEach((keyword, id) => {
      keywordMap.set(id, keyword.keyword_name);
    });

    // Create new game engine instance with injected data
    const gameEngine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordMap);

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
  const playerAction: PlayerAction = {
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
  const validActions = [];

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
            description: `Activate ability on ${cardData.commonName}`
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

  const userGames = [];

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
