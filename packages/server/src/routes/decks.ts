/**
 * Deck Management Routes
 * Create, update, delete, and manage user decks
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/kysely';
import { NewDeck, NewDeckCard } from '../database/types';
// import { DeckUpdate } from '../database/types'; // Unused for now
import { requireAuth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/decks
 * Get user's decks
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Please complete registration first'
      });
      return;
    }

    const decks = await db
      .selectFrom('decks')
      .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
      .select([
        'decks.id',
        'decks.name',
        'decks.created_at',
        'decks.updated_at',
        db.fn.count('deck_cards.species_name').as('card_count')
      ])
      .where('decks.user_id', '=', req.user.id)
      .groupBy(['decks.id', 'decks.name', 'decks.created_at', 'decks.updated_at'])
      .orderBy('decks.updated_at', 'desc')
      .execute();

    res.json({
      success: true,
      decks
    });

  } catch (error) {
    console.error('❌ Decks fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch decks',
      message: 'Unable to retrieve decks'
    });
  }
});

/**
 * GET /api/decks/:id
 * Get specific deck with cards
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Please complete registration first'
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Deck ID is required' });
      return;
    }

    // Get deck info
    const deck = await db
      .selectFrom('decks')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', req.user.id)
      .executeTakeFirst();

    if (!deck) {
      res.status(404).json({
        error: 'Deck not found',
        message: 'Deck does not exist or you do not have access'
      });
      return;
    }

    // Get deck cards
    const deckCards = await db
      .selectFrom('deck_cards')
      .select([
        'deck_cards.id as deck_card_id',
        'deck_cards.species_name',
        'deck_cards.position_in_deck'
      ])
      .where('deck_cards.deck_id', '=', id)
      .execute();

    res.json({
      success: true,
      deck: {
        ...deck,
        cards: deckCards
      }
    });

  } catch (error) {
    console.error('❌ Deck fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch deck',
      message: 'Unable to retrieve deck'
    });
  }
});

/**
 * POST /api/decks
 * Create a new deck
 */
router.post('/',
  requireAuth,
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Deck name must be 1-100 characters'),
    body('cards')
      .isArray()
      .withMessage('Cards must be an array'),
    body('cards.*.card_id')
      .isUUID()
      .withMessage('Each card must have a valid card_id')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(404).json({
          error: 'User not found',
          message: 'Please complete registration first'
        });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { name, cards } = req.body;

      // Validate that user owns all cards
      const cardIds = cards.map((c: any) => c.card_id);
      const ownedCards = await db
        .selectFrom('user_cards')
        .select(['card_id', 'quantity'])
        .where('user_id', '=', req.user.id)
        .where('card_id', 'in', cardIds)
        .execute();

      const ownedCardIds = ownedCards.map(c => c.card_id);
      const missingCards = cardIds.filter((id: number) => !ownedCardIds.includes(id));

      if (missingCards.length > 0) {
        res.status(400).json({
          error: 'Cards not owned',
          message: 'You do not own some of the cards in this deck',
          missing_cards: missingCards
        });
        return;
      }

      // Create deck in transaction
      const newDeck = await db.transaction().execute(async (trx) => {
        // Create deck
        const deckData: NewDeck = {
          user_id: req.user!.id,
          name
        };

        const [deck] = await trx
          .insertInto('decks')
          .values(deckData)
          .returning(['id', 'name', 'created_at', 'updated_at'])
          .execute();

        // Add cards to deck
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const deckCardData: NewDeckCard = {
            deck_id: deck?.id?.toString() || '0',
            card_id: card.card_id,
            species_name: card.species_name || `card-${card.card_id}`,
            position_in_deck: i + 1
          };

          await trx
            .insertInto('deck_cards')
            .values(deckCardData)
            .execute();
        }

        return deck;
      });

      res.status(201).json({
        success: true,
        message: 'Deck created successfully',
        deck: newDeck
      });

    } catch (error) {
      console.error('❌ Deck creation error:', error);
      res.status(500).json({
        error: 'Deck creation failed',
        message: 'Unable to create deck'
      });
    }
  }
);

/**
 * PUT /api/decks/:id
 * Update deck name
 */
router.put('/:id',
  requireAuth,
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Deck name must be 1-100 characters')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(404).json({
          error: 'User not found',
          message: 'Please complete registration first'
        });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Deck ID is required' });
        return;
      }

      // Check if deck exists and belongs to user
      const existingDeck = await db
        .selectFrom('decks')
        .select('id')
        .where('id', '=', id)
        .where('user_id', '=', req.user.id)
        .executeTakeFirst();

      if (!existingDeck) {
        res.status(404).json({
          error: 'Deck not found',
          message: 'Deck does not exist or you do not have access'
        });
        return;
      }

      // Update deck
      const updatedDeck = await db
        .updateTable('decks')
        .set({ 
          name,
          updated_at: new Date()
        })
        .where('id', '=', id)
        .returning(['id', 'name', 'updated_at'])
        .executeTakeFirst();

      res.json({
        success: true,
        message: 'Deck updated successfully',
        deck: updatedDeck
      });

    } catch (error) {
      console.error('❌ Deck update error:', error);
      res.status(500).json({
        error: 'Deck update failed',
        message: 'Unable to update deck'
      });
    }
  }
);

/**
 * DELETE /api/decks/:id
 * Delete a deck
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Please complete registration first'
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Deck ID is required' });
      return;
    }

    // Check if deck exists and belongs to user
    const existingDeck = await db
      .selectFrom('decks')
      .select('id')
      .where('id', '=', id)
      .where('user_id', '=', req.user.id)
      .executeTakeFirst();

    if (!existingDeck) {
      res.status(404).json({
        error: 'Deck not found',
        message: 'Deck does not exist or you do not have access'
      });
      return;
    }

    // Delete deck (cascade will handle deck_cards)
    await db
      .deleteFrom('decks')
      .where('id', '=', id)
      .execute();

    res.json({
      success: true,
      message: 'Deck deleted successfully'
    });

  } catch (error) {
    console.error('❌ Deck deletion error:', error);
    res.status(500).json({
      error: 'Deck deletion failed',
      message: 'Unable to delete deck'
    });
  }
});

export default router;
