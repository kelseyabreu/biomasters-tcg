import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
// import { apiRateLimiter } from '../middleware/rateLimiter'; // Unused for now
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
// import { NewDeck } from '../database/types'; // Unused for now

const router = Router();

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

export default router;
