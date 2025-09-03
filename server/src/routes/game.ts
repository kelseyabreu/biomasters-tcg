import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// import { apiRateLimiter } from '../middleware/rateLimiter'; // Unused for now
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { z } from 'zod';
import crypto from 'crypto';
// import { NewDeck } from '../database/types'; // Unused for now

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

const joinGameSessionSchema = z.object({
  sessionId: z.string().uuid()
});

const gameActionSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.object({
    type: z.enum(['place_card', 'move_card', 'challenge', 'pass_turn']),
    cardId: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    targetPosition: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    challengeData: z.object({
      targetCardId: z.string(),
      targetPlayerId: z.string(),
      claimType: z.string(),
      evidence: z.string()
    }).optional()
  })
});

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
      max_players: validatedData.maxPlayers,
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
    .where('status', '=', status as string)
    .where('is_private', '=', false)
    .where('current_players', '<', db.ref('max_players'))
    .orderBy('created_at', 'desc')
    .limit(20);

  if (gameMode) {
    query = query.where('game_mode', '=', gameMode as string);
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

/**
 * POST /api/game/sessions/:sessionId/join
 * Join a game session
 */
router.post('/sessions/:sessionId/join', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const user = req.user!;

  // Get current session
  const session = await db
    .selectFrom('game_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    res.status(404).json({ error: 'Game session not found' });
    return;
  }

  if (session.status !== 'waiting') {
    res.status(400).json({ error: 'Game session is not accepting new players' });
    return;
  }

  if (session.current_players >= session.max_players) {
    res.status(400).json({ error: 'Game session is full' });
    return;
  }

  // Parse current game state
  const gameState = JSON.parse(session.game_state);

  // Check if user is already in the game
  const existingPlayer = gameState.players.find((p: any) => p.id === user.id);
  if (existingPlayer) {
    res.status(400).json({ error: 'You are already in this game' });
    return;
  }

  // Add player to game state
  gameState.players.push({
    id: user.id,
    name: user.display_name || user.email,
    isReady: false
  });

  // Update session
  const updatedSession = await db
    .updateTable('game_sessions')
    .set({
      current_players: session.current_players + 1,
      game_state: JSON.stringify(gameState),
      updated_at: new Date()
    })
    .where('id', '=', sessionId)
    .returningAll()
    .executeTakeFirstOrThrow();

  res.json({
    session: {
      id: updatedSession.id,
      hostUserId: updatedSession.host_user_id,
      gameMode: updatedSession.game_mode,
      isPrivate: updatedSession.is_private,
      maxPlayers: updatedSession.max_players,
      currentPlayers: updatedSession.current_players,
      status: updatedSession.status,
      gameState: JSON.parse(updatedSession.game_state),
      settings: JSON.parse(updatedSession.settings),
      createdAt: updatedSession.created_at,
      updatedAt: updatedSession.updated_at
    }
  });
}));

/**
 * POST /api/game/sessions/:sessionId/ready
 * Mark player as ready
 */
router.post('/sessions/:sessionId/ready', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { ready = true } = req.body;
  const user = req.user!;

  // Get current session
  const session = await db
    .selectFrom('game_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    res.status(404).json({ error: 'Game session not found' });
    return;
  }

  // Parse current game state
  const gameState = JSON.parse(session.game_state);

  // Find and update player
  const playerIndex = gameState.players.findIndex((p: any) => p.id === user.id);
  if (playerIndex === -1) {
    res.status(400).json({ error: 'You are not in this game' });
    return;
  }

  gameState.players[playerIndex].isReady = ready;

  // Check if all players are ready
  const allReady = gameState.players.every((p: any) => p.isReady);
  const newStatus = allReady && gameState.players.length >= 2 ? 'playing' : 'waiting';

  if (allReady && gameState.players.length >= 2) {
    gameState.phase = 'playing';
  }

  // Update session
  const updatedSession = await db
    .updateTable('game_sessions')
    .set({
      status: newStatus,
      game_state: JSON.stringify(gameState),
      updated_at: new Date()
    })
    .where('id', '=', sessionId)
    .returningAll()
    .executeTakeFirstOrThrow();

  res.json({
    session: {
      id: updatedSession.id,
      hostUserId: updatedSession.host_user_id,
      gameMode: updatedSession.game_mode,
      isPrivate: updatedSession.is_private,
      maxPlayers: updatedSession.max_players,
      currentPlayers: updatedSession.current_players,
      status: updatedSession.status,
      gameState: JSON.parse(updatedSession.game_state),
      settings: JSON.parse(updatedSession.settings),
      createdAt: updatedSession.created_at,
      updatedAt: updatedSession.updated_at
    }
  });
}));

export default router;
