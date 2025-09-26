/**
 * Redemption Routes
 * Handles user redemptions for starter decks, promo codes, event rewards, etc.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { redemptionService } from '../services/redemptionService';
import { RedemptionType } from '@kelseyabreu/shared';

const router = Router();

/**
 * GET /api/redemptions/status
 * Get user's redemption status (what they've redeemed, what's available)
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const status = await redemptionService.getUserRedemptionStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting redemption status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get redemption status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/redemptions/starter-deck
 * Redeem starter deck (one-time only)
 */
router.post('/starter-deck', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await redemptionService.redeemStarterDeck(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      // Return appropriate status code based on error type
      const statusCode = result.code === 'ALREADY_REDEEMED' ? 409 : 400;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Error redeeming starter deck:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/redemptions/starter-pack
 * Redeem starter pack (one-time only)
 */
router.post('/starter-pack', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await redemptionService.redeemStarterPack(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      const statusCode = result.code === 'ALREADY_REDEEMED' ? 409 : 400;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Error redeeming starter pack:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/redemptions/promo-code
 * Redeem promo code
 */
router.post('/promo-code', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    
    // Validate input
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
        code: 'INVALID_INPUT'
      });
    }
    
    // Validate code format (alphanumeric, 3-20 characters)
    if (!/^[A-Za-z0-9]{3,20}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code format',
        code: 'INVALID_FORMAT'
      });
    }
    
    const result = await redemptionService.redeemPromoCode(userId, code);
    
    if (result.success) {
      res.json(result);
    } else {
      // Return appropriate status code based on error type
      let statusCode = 400;
      if (result.code === 'ALREADY_REDEEMED') statusCode = 409;
      else if (result.code === 'INVALID_CODE') statusCode = 404;
      else if (result.code === 'LIMIT_REACHED') statusCode = 410;
      
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Error redeeming promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/redemptions/history
 * Get user's redemption history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Get redemption history with pagination
    const redemptions = await redemptionService.getUserRedemptionHistory(userId, limit, offset);
    const total = await redemptionService.getUserRedemptionCount(userId);
    
    res.json({
      success: true,
      data: {
        redemptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting redemption history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get redemption history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/redemptions/available-codes
 * Get available promo codes for user (codes they haven't redeemed)
 */
router.get('/available-codes', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const availableCodes = await redemptionService.getAvailablePromoCodes(userId);
    
    res.json({
      success: true,
      data: {
        codes: availableCodes
      }
    });
  } catch (error) {
    console.error('Error getting available codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available codes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/redemptions/validate-code
 * Validate promo code without redeeming it
 */
router.post('/validate-code', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
        code: 'INVALID_INPUT'
      });
    }
    
    const validation = await redemptionService.validatePromoCode(userId, code);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo code',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/redemptions/types
 * Get available redemption types and their descriptions
 */
router.get('/types', requireAuth, async (req, res) => {
  try {
    const redemptionTypes = {
      [RedemptionType.STARTER_DECK]: {
        id: RedemptionType.STARTER_DECK,
        name: 'Starter Deck',
        description: 'Complete starter deck with forest and ocean ecosystems',
        one_time_only: true,
        rewards: 'Forest & Ocean starter decks (22 cards total)'
      },
      [RedemptionType.STARTER_PACK]: {
        id: RedemptionType.STARTER_PACK,
        name: 'Starter Pack',
        description: 'Bonus booster packs for new players',
        one_time_only: true,
        rewards: '3 booster packs + bonus cards'
      },
      [RedemptionType.PROMO_CODE]: {
        id: RedemptionType.PROMO_CODE,
        name: 'Promo Code',
        description: 'Special promotional codes with various rewards',
        one_time_only: false,
        rewards: 'Varies by code'
      }
    };
    
    res.json({
      success: true,
      data: redemptionTypes
    });
  } catch (error) {
    console.error('Error getting redemption types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get redemption types',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
