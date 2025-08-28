import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth';
import { packOpeningRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';

const router = Router();

/**
 * GET /api/cards/collection
 * Get user's card collection
 */
router.get('/collection', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { page = 1, limit = 50, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Get user's collection (species names only)
  let collectionQuery = db
    .selectFrom('user_cards')
    .select([
      'species_name',
      'quantity',
      'acquired_via',
      'first_acquired_at'
    ])
    .where('user_cards.user_id', '=', req.user.id)
    .orderBy('user_cards.first_acquired_at', 'desc');

  // Add search filter if provided (basic species name search)
  if (search && typeof search === 'string') {
    collectionQuery = collectionQuery.where('species_name', 'ilike', `%${search}%`);
  }

  // Apply pagination
  const collection = await collectionQuery
    .limit(Number(limit))
    .offset(offset)
    .execute();

  // Get total count for pagination
  let totalQuery = db
    .selectFrom('user_cards')
    .select(db.fn.count('species_name').as('total'))
    .where('user_cards.user_id', '=', req.user.id);

  if (search && typeof search === 'string') {
    totalQuery = totalQuery.where('species_name', 'ilike', `%${search}%`);
  }

  const totalResult = await totalQuery.execute();
  const total = totalResult[0]?.total || 0;

  res.json({
    success: true,
    collection,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      pages: Math.ceil(Number(total) / Number(limit))
    }
  });
  return;
}));

/**
 * POST /api/cards/open-pack
 * Open a booster pack
 */
router.post('/open-pack', requireAuth, packOpeningRateLimiter, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { pack_type = 'basic' } = req.body;

  // Pack costs
  const packCosts = { basic: 50, premium: 100, legendary: 200 };
  const cost = packCosts[pack_type as keyof typeof packCosts];

  if (!cost) {
    return res.status(400).json({
      error: 'INVALID_PACK_TYPE',
      message: 'Invalid pack type'
    });
  }

  // Check if user has enough credits
  if (req.user.eco_credits < cost) {
    return res.status(400).json({
      error: 'INSUFFICIENT_CREDITS',
      message: `Not enough eco credits. Need ${cost}, have ${req.user.eco_credits}`
    });
  }

  // Simple pack contents (in production, this would be more sophisticated)
  const availableSpecies = ['bear', 'tiger', 'eagle', 'whale', 'butterfly', 'oak-tree', 'grass', 'rabbit', 'fox'];
  const cardsPerPack = pack_type === 'basic' ? 3 : pack_type === 'premium' ? 5 : 7;
  const newSpecies: string[] = [];

  for (let i = 0; i < cardsPerPack; i++) {
    const randomSpecies = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
    if (randomSpecies) {
      newSpecies.push(randomSpecies);
    }
  }

  // Update user collection in transaction
  await db.transaction().execute(async (trx) => {
    // Deduct cost
    await trx
      .updateTable('users')
      .set({
        eco_credits: req.user!.eco_credits - cost,
        updated_at: new Date()
      })
      .where('id', '=', req.user!.id)
      .execute();

    // Add species to collection
    for (const species of newSpecies) {
      const existing = await trx
        .selectFrom('user_cards')
        .selectAll()
        .where('user_id', '=', req.user!.id)
        .where('species_name', '=', species)
        .executeTakeFirst();

      if (existing) {
        // Increase quantity
        await trx
          .updateTable('user_cards')
          .set({
            quantity: existing.quantity + 1,
            last_acquired_at: new Date()
          })
          .where('user_id', '=', req.user!.id)
          .where('species_name', '=', species)
          .execute();
      } else {
        // Add new species
        await trx
          .insertInto('user_cards')
          .values({
            user_id: req.user!.id,
            species_name: species,
            quantity: 1,
            acquired_via: 'pack'
          })
          .execute();
      }
    }

    // Record transaction
    await trx
      .insertInto('transactions')
      .values({
        user_id: req.user!.id,
        type: 'pack_purchase',
        description: `Opened ${pack_type} pack`,
        eco_credits_change: -cost
      })
      .execute();
  });

  res.json({
    success: true,
    message: 'Pack opened successfully',
    pack_type,
    species_granted: newSpecies,
    cost,
    remaining_credits: req.user.eco_credits - cost
  });
  return;
}));

/**
 * POST /api/cards/redeem-physical
 * Redeem a physical card
 */
router.post('/redeem-physical', requireRegisteredUser, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: 'MISSING_CODE',
      message: 'Redemption code is required'
    });
  }

  // Check if redemption code exists and is valid
  const redemption = await db
    .selectFrom('redemption_codes')
    .selectAll()
    .where('code', '=', code)
    .executeTakeFirst();

  if (!redemption) {
    return res.status(404).json({
      error: 'INVALID_CODE',
      message: 'Invalid redemption code'
    });
  }

  if (redemption.is_redeemed) {
    return res.status(409).json({
      error: 'ALREADY_REDEEMED',
      message: 'This code has already been redeemed'
    });
  }

  // Redeem the card
  await db.transaction().execute(async (trx) => {
    // Mark as redeemed
    await trx
      .updateTable('redemption_codes')
      .set({
        is_redeemed: true,
        redeemed_by_user_id: req.user!.id,
        redeemed_at: new Date()
      })
      .where('id', '=', redemption.id)
      .execute();

    // Add species to user collection
    const existing = await trx
      .selectFrom('user_cards')
      .selectAll()
      .where('user_id', '=', req.user!.id)
      .where('species_name', '=', redemption.species_name)
      .executeTakeFirst();

    if (existing) {
      // Increase quantity
      await trx
        .updateTable('user_cards')
        .set({
          quantity: existing.quantity + 1,
          last_acquired_at: new Date()
        })
        .where('user_id', '=', req.user!.id)
        .where('species_name', '=', redemption.species_name)
        .execute();
    } else {
      // Add new species
      await trx
        .insertInto('user_cards')
        .values({
          user_id: req.user!.id,
          species_name: redemption.species_name,
          quantity: 1,
          acquired_via: 'redeem'
        })
        .execute();
    }

    // Record transaction
    await trx
      .insertInto('transactions')
      .values({
        user_id: req.user!.id,
        type: 'reward',
        description: `Redeemed physical card: ${redemption.species_name}`,
        eco_credits_change: 0
      })
      .execute();
  });

  res.json({
    success: true,
    message: 'Physical card redeemed successfully',
    species_name: redemption.species_name,
    code: redemption.code
  });
  return;
}));

/**
 * GET /api/cards/daily-pack
 * Get daily free pack (simplified version)
 */
router.get('/daily-pack', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  // TODO: Implement daily pack logic with proper tracking
  // For now, just return availability info
  res.json({
    success: true,
    available: true,
    message: 'Daily pack system not yet implemented',
    nextAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  return;
}));

export default router;
