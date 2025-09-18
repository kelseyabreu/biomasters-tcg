/**
 * Products API Routes
 * Handles the universal product system for BioMasters TCG
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { starterDeckService } from '../services/starterDeckService';
import { DeckType } from '@shared/enums';

const router = express.Router();

/**
 * GET /api/products/starter-decks
 * Get all available starter decks
 */
router.get('/starter-decks', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const starterDecks = await starterDeckService.getStarterDecks();
    
    res.json({
      success: true,
      starter_decks: starterDecks,
      metadata: {
        total_decks: starterDecks.length,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching starter decks:', error);
    res.status(500).json({
      error: 'STARTER_DECKS_ERROR',
      message: 'Failed to fetch starter decks'
    });
  }
}));

/**
 * POST /api/products/claim-starter-decks
 * Claim starter decks for the authenticated user
 */
router.post('/claim-starter-decks', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    // Check if user already has starter decks
    const hasStarterDecks = await starterDeckService.userHasStarterDecks(userId);
    if (hasStarterDecks) {
      return res.status(400).json({
        error: 'ALREADY_CLAIMED',
        message: 'User already has starter decks'
      });
    }

    // Give starter decks to user
    const result = await starterDeckService.giveStarterDecksToUser(userId);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Starter decks claimed successfully',
        deck_ids: result.deckIds,
        decks_created: result.deckIds.length
      });
    } else {
      return res.status(500).json({
        error: 'CLAIM_FAILED',
        message: 'Failed to claim starter decks'
      });
    }
  } catch (error) {
    console.error('Error claiming starter decks:', error);
    return res.status(500).json({
      error: 'CLAIM_ERROR',
      message: 'Failed to claim starter decks'
    });
  }
}));

/**
 * GET /api/products/user-starter-status
 * Check if the authenticated user has starter decks
 */
router.get('/user-starter-status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    const hasStarterDecks = await starterDeckService.userHasStarterDecks(userId);

    return res.json({
      success: true,
      has_starter_decks: hasStarterDecks,
      user_id: userId
    });
  } catch (error) {
    console.error('Error checking user starter status:', error);
    return res.status(500).json({
      error: 'STATUS_ERROR',
      message: 'Failed to check starter deck status'
    });
  }
}));

/**
 * GET /api/products/deck/:deckId
 * Get detailed information about a specific starter deck
 */
router.get('/deck/:deckId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { deckId } = req.params;
    
    // For now, use hardcoded data since migration might not be complete
    const starterDecks = await starterDeckService.getStarterDecks();
    const deck = starterDecks.find(d => d.id === deckId);
    
    if (!deck) {
      return res.status(404).json({
        error: 'DECK_NOT_FOUND',
        message: 'Starter deck not found'
      });
    }

    return res.json({
      success: true,
      deck: deck
    });
  } catch (error) {
    console.error('Error fetching deck details:', error);
    return res.status(500).json({
      error: 'DECK_ERROR',
      message: 'Failed to fetch deck details'
    });
  }
}));

/**
 * POST /api/products/auto-claim-for-new-user
 * Automatically claim starter decks for new users (called during registration/first login)
 */
router.post('/auto-claim-for-new-user', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    // Check if user already has starter decks
    const hasStarterDecks = await starterDeckService.userHasStarterDecks(userId);
    if (hasStarterDecks) {
      return res.json({
        success: true,
        message: 'User already has starter decks',
        deck_ids: [],
        decks_created: 0,
        already_had_decks: true
      });
    }

    // Give starter decks to user
    const result = await starterDeckService.giveStarterDecksToUser(userId);

    return res.json({
      success: result.success,
      message: result.success ? 'Starter decks auto-claimed successfully' : 'Failed to auto-claim starter decks',
      deck_ids: result.deckIds,
      decks_created: result.deckIds.length,
      already_had_decks: false
    });
  } catch (error) {
    console.error('Error auto-claiming starter decks:', error);
    return res.status(500).json({
      error: 'AUTO_CLAIM_ERROR',
      message: 'Failed to auto-claim starter decks'
    });
  }
}));

/**
 * GET /api/products/deck-types
 * Get all available deck types with descriptions
 */
router.get('/deck-types', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const deckTypes = [
      {
        id: DeckType.CUSTOM,
        name: 'Custom',
        description: 'Player-created custom decks',
        is_starter: false
      },
      {
        id: DeckType.STARTER_FOREST,
        name: 'Forest Starter',
        description: 'Forest ecosystem starter deck',
        is_starter: true
      },
      {
        id: DeckType.STARTER_OCEAN,
        name: 'Ocean Starter', 
        description: 'Ocean ecosystem starter deck',
        is_starter: true
      },
      {
        id: DeckType.THEME_ARCTIC,
        name: 'Arctic Theme',
        description: 'Arctic ecosystem themed deck',
        is_starter: false
      },
      {
        id: DeckType.THEME_DESERT,
        name: 'Desert Theme',
        description: 'Desert ecosystem themed deck',
        is_starter: false
      },
      {
        id: DeckType.THEME_RAINFOREST,
        name: 'Rainforest Theme',
        description: 'Rainforest ecosystem themed deck',
        is_starter: false
      },
      {
        id: DeckType.TOURNAMENT_BALANCED,
        name: 'Tournament Balanced',
        description: 'Tournament legal balanced deck',
        is_starter: false
      },
      {
        id: DeckType.EDUCATIONAL_CONSERVATION,
        name: 'Conservation Education',
        description: 'Educational conservation focused deck',
        is_starter: false
      }
    ];

    res.json({
      success: true,
      deck_types: deckTypes,
      total_types: deckTypes.length
    });
  } catch (error) {
    console.error('Error fetching deck types:', error);
    res.status(500).json({
      error: 'DECK_TYPES_ERROR',
      message: 'Failed to fetch deck types'
    });
  }
}));

/**
 * GET /api/products/starter-status
 * Check starter deck status for the authenticated user
 */
router.get('/starter-status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    const status = await starterDeckService.getUserStarterDeckStatus(userId);

    return res.json({
      success: true,
      starter_status: status
    });
  } catch (error) {
    console.error('Error checking starter deck status:', error);
    return res.status(500).json({
      error: 'STATUS_ERROR',
      message: 'Failed to check starter deck status'
    });
  }
}));

export default router;
