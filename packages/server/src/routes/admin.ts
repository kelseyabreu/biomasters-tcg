import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { setCustomUserClaims } from '../config/firebase';
import { CacheManager } from '../config/ioredis';
import { sql } from 'kysely';
import admin from 'firebase-admin';

const router = Router();

/**
 * GET /api/admin/fix-deck-cards-schema
 * Fix deck_cards schema by adding card_id column
 */
router.get('/fix-deck-cards-schema', asyncHandler(async (_req, res) => {
  try {
    console.log('🔧 [ADMIN] Adding card_id column to deck_cards table...');

    // Add the card_id column using raw SQL
    await sql`ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS card_id INTEGER;`.execute(db);

    console.log('✅ [ADMIN] Added card_id column');

    // Check the schema using raw SQL
    const result = await sql`SELECT column_name, data_type, is_nullable
                             FROM information_schema.columns
                             WHERE table_name = 'deck_cards'
                             AND table_schema = 'public'
                             ORDER BY ordinal_position;`.execute(db);

    console.log('📋 [ADMIN] Updated deck_cards schema:');
    result.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    return res.json({
      success: true,
      message: 'Successfully added card_id column to deck_cards table',
      schema: result.rows
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error adding card_id column:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/admin/test-starter-decks
 * Test starter deck service for a user
 */
router.get('/test-starter-decks', asyncHandler(async (_req, res) => {
  try {
    console.log('🧪 [ADMIN] Testing starter deck service...');

    // Get the user ID from the logs (721eab5a-9239-4f66-b974-df7df6564b62)
    const testUserId = '721eab5a-9239-4f66-b974-df7df6564b62';

    // Import StarterDeckService
    const starterDeckService = (await import('../services/starterDeckService')).default;

    // Test auto-onboarding
    console.log(`🧪 [ADMIN] Testing auto-onboarding for user: ${testUserId}`);
    const result = await starterDeckService.giveStarterDecksToUser(testUserId);

    console.log(`🧪 [ADMIN] Starter deck result:`, result);

    // Check user's decks
    const userDecks = await db
      .selectFrom('decks')
      .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
      .select([
        'decks.id',
        'decks.name',
        'decks.created_at',
        db.fn.count('deck_cards.id').as('card_count')
      ])
      .where('decks.user_id', '=', testUserId)
      .groupBy(['decks.id', 'decks.name', 'decks.created_at'])
      .execute();

    console.log(`🧪 [ADMIN] User's decks after test:`, userDecks);

    // Check deck_cards for these decks
    const deckCards = await db
      .selectFrom('deck_cards')
      .selectAll()
      .where('deck_id', 'in', userDecks.map(d => d.id))
      .execute();

    console.log(`🧪 [ADMIN] Deck cards for user's decks:`, deckCards);

    return res.json({
      success: true,
      message: 'Starter deck service test completed',
      data: {
        starterDeckResult: result,
        userDecks: userDecks,
        deckCards: deckCards
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error testing starter deck service:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/admin/fix-empty-starter-decks
 * Delete empty starter decks and recreate them with cards
 */
router.get('/fix-empty-starter-decks', asyncHandler(async (_req, res) => {
  try {
    console.log('🔧 [ADMIN] Fixing empty starter decks...');

    // Get the user ID from the logs (721eab5a-9239-4f66-b974-df7df6564b62)
    const testUserId = '721eab5a-9239-4f66-b974-df7df6564b62';

    // Delete existing empty starter decks
    console.log(`🗑️ [ADMIN] Deleting empty starter decks for user: ${testUserId}`);
    const deletedDecks = await db
      .deleteFrom('decks')
      .where('user_id', '=', testUserId)
      .where('name', 'in', ['Forest Ecosystem Starter', 'Ocean Ecosystem Starter'])
      .returningAll()
      .execute();

    console.log(`🗑️ [ADMIN] Deleted ${deletedDecks.length} empty starter decks`);

    // Import StarterDeckService and force create new starter decks
    const starterDeckService = (await import('../services/starterDeckService')).default;

    console.log(`🎯 [ADMIN] Creating new starter decks with cards for user: ${testUserId}`);
    const result = await starterDeckService.giveStarterDecksToUser(testUserId);

    console.log(`🎯 [ADMIN] Starter deck creation result:`, result);

    // Check user's decks after recreation
    const userDecks = await db
      .selectFrom('decks')
      .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
      .select([
        'decks.id',
        'decks.name',
        'decks.created_at',
        db.fn.count('deck_cards.id').as('card_count')
      ])
      .where('decks.user_id', '=', testUserId)
      .groupBy(['decks.id', 'decks.name', 'decks.created_at'])
      .execute();

    console.log(`🎯 [ADMIN] User's decks after recreation:`, userDecks);

    return res.json({
      success: true,
      message: 'Empty starter decks fixed and recreated with cards',
      data: {
        deletedDecks: deletedDecks.length,
        starterDeckResult: result,
        userDecks: userDecks
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error fixing empty starter decks:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/admin/check-cards
 * Check what cards exist in the database
 */
router.get('/check-cards', asyncHandler(async (_req, res) => {
  try {
    console.log('🔍 [ADMIN] Checking cards in database...');

    // Get all cards from the database
    const cards = await db
      .selectFrom('cards')
      .selectAll()
      .orderBy('id', 'asc')
      .execute();

    console.log(`🔍 [ADMIN] Found ${cards.length} cards in database`);
    console.log('🔍 [ADMIN] Card IDs:', cards.map(c => c.id));

    // Check specific card IDs used in starter decks
    const starterCardIds = [1, 2, 4, 5, 6, 7, 9, 11, 13, 15, 19, 20, 21, 22, 26, 27, 29, 53];
    const existingStarterCards = cards.filter(c => starterCardIds.includes(c.id));
    const missingStarterCards = starterCardIds.filter(id => !cards.some(c => c.id === id));

    console.log(`🔍 [ADMIN] Starter deck cards that exist:`, existingStarterCards.map(c => `${c.id}:${c.common_name || c.scientific_name || c.card_name}`));
    console.log(`🔍 [ADMIN] Starter deck cards that are missing:`, missingStarterCards);

    return res.json({
      success: true,
      message: 'Card check completed',
      data: {
        totalCards: cards.length,
        allCards: cards,
        starterCardIds: starterCardIds,
        existingStarterCards: existingStarterCards,
        missingStarterCards: missingStarterCards
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error checking cards:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, accountType, isActive } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const queryLimit = Math.min(parseInt(limit as string) || 50, 100);

  // Build dynamic query using Kysely
  let usersQuery = db
    .selectFrom('users')
    .select([
      'id', 'firebase_uid', 'email', 'username', 'display_name', 'account_type',
      'email_verified', 'is_active', 'is_banned', 'ban_reason',
      'level', 'experience', 'gems', 'coins', 'dust',
      'games_played', 'games_won', 'cards_collected', 'packs_opened',
      'created_at', 'last_login_at'
    ]);

  if (search) {
    usersQuery = usersQuery.where((eb) => eb.or([
      eb('username', 'ilike', `%${search}%`),
      eb('email', 'ilike', `%${search}%`)
    ]));
  }

  if (accountType) {
    usersQuery = usersQuery.where('account_type', '=', accountType as string);
  }

  if (isActive !== undefined) {
    usersQuery = usersQuery.where('is_active', '=', isActive === 'true');
  }

  const users = await usersQuery
    .orderBy('created_at', 'desc')
    .limit(queryLimit)
    .offset(offset)
    .execute();

  // Get total count with same filters
  let countQuery = db.selectFrom('users').select(db.fn.count('id').as('count'));

  if (search) {
    countQuery = countQuery.where((eb) => eb.or([
      eb('username', 'ilike', `%${search}%`),
      eb('email', 'ilike', `%${search}%`)
    ]));
  }

  if (accountType) {
    countQuery = countQuery.where('account_type', '=', accountType as string);
  }

  if (isActive !== undefined) {
    countQuery = countQuery.where('is_active', '=', isActive === 'true');
  }

  const totalResult = await countQuery.executeTakeFirst();

  res.json({
    users,
    pagination: {
      page: parseInt(page as string),
      limit: queryLimit,
      total: parseInt(totalResult?.count as string) || 0,
      pages: Math.ceil((parseInt(totalResult?.count as string) || 0) / queryLimit)
    }
  });
}));

/**
 * PUT /api/admin/users/:userId/ban
 * Ban or unban a user
 */
router.put('/users/:userId/ban', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isBanned, banReason } = req.body;

  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'isBanned must be a boolean'
    });
  }

  if (isBanned && (!banReason || banReason.length < 5)) {
    return res.status(400).json({
      error: 'INVALID_BAN_REASON',
      message: 'Ban reason must be at least 5 characters long'
    });
  }

  const updatedUser = await db
    .updateTable('users')
    .set({
      is_banned: isBanned,
      ban_reason: isBanned ? banReason : null,
      updated_at: new Date()
    })
    .where('id', '=', userId as string)
    .returning(['id', 'username', 'is_banned', 'ban_reason'])
    .executeTakeFirst();

  if (!updatedUser) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
    user: updatedUser
  });
  return;
}));

/**
 * PUT /api/admin/users/:userId/account-type
 * Change user account type
 */
router.put('/users/:userId/account-type', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { accountType } = req.body;

  const validAccountTypes = ['guest', 'registered', 'premium'];
  if (!validAccountTypes.includes(accountType)) {
    return res.status(400).json({
      error: 'INVALID_ACCOUNT_TYPE',
      message: 'Account type must be one of: ' + validAccountTypes.join(', ')
    });
  }

  const updatedUser = await db
    .updateTable('users')
    .set({
      account_type: accountType,
      updated_at: new Date()
    })
    .where('id', '=', userId as string)
    .returning(['id', 'username', 'account_type', 'firebase_uid'])
    .executeTakeFirst();

  if (!updatedUser) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  // Update Firebase custom claims
  try {
    if (updatedUser.firebase_uid) {
      await setCustomUserClaims(updatedUser.firebase_uid, {
        accountType,
        premium: accountType === 'premium'
      });
    }
  } catch (error) {
    console.error('Failed to update Firebase claims:', error);
  }

  res.json({
    message: 'Account type updated successfully',
    user: updatedUser
  });
  return;
}));

/**
 * POST /api/admin/users/:userId/currency
 * Add or remove currency from user account
 */
router.post('/users/:userId/currency', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { gems, coins, dust, reason } = req.body;

  if (!reason || reason.length < 5) {
    return res.status(400).json({
      error: 'INVALID_REASON',
      message: 'Reason must be at least 5 characters long'
    });
  }

  // Update currency using Kysely transaction
  const result = await db.transaction().execute(async (trx) => {
    // Get current user values first
    const currentUser = await trx
      .selectFrom('users')
      .select(['gems', 'coins', 'dust'])
      .where('id', '=', userId as string)
      .executeTakeFirst();

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Update user currency
    const updatedUser = await trx
      .updateTable('users')
      .set({
        gems: (currentUser.gems || 0) + (gems || 0),
        coins: (currentUser.coins || 0) + (coins || 0),
        dust: (currentUser.dust || 0) + (dust || 0),
        updated_at: new Date()
      })
      .where('id', '=', userId as string)
      .returning(['id', 'username', 'gems', 'coins', 'dust'])
      .executeTakeFirstOrThrow();

    // Log admin transaction
    await trx
      .insertInto('transactions')
      .values({
        user_id: userId as string,
        type: 'admin_adjustment' as any,
        eco_credits_change: 0, // Required field
        description: `Admin adjustment: ${reason}`,
        created_at: new Date()
      })
      .execute();

    return updatedUser;
  });

  res.json({
    message: 'Currency updated successfully',
    user: result
  });
  return;
}));

/**
 * POST /api/admin/grant-currency
 * Grant currency to a user by username, email, or ID
 */
router.post('/grant-currency', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { identifier, gems, coins, dust, eco_credits, reason } = req.body;

  if (!identifier) {
    return res.status(400).json({
      error: 'MISSING_IDENTIFIER',
      message: 'Username, email, or user ID is required'
    });
  }

  if (!reason || reason.length < 5) {
    return res.status(400).json({
      error: 'INVALID_REASON',
      message: 'Reason must be at least 5 characters long'
    });
  }

  // Helper function to check if string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Find user by identifier (username, email, or ID)
  const user = await db
    .selectFrom('users')
    .select(['id', 'username', 'email', 'gems', 'coins', 'dust', 'eco_credits'])
    .where((eb) => {
      const conditions = [
        eb('username', '=', identifier),
        eb('email', '=', identifier)
      ];

      // Only add ID condition if identifier is a valid UUID
      if (isValidUUID(identifier)) {
        conditions.push(eb('id', '=', identifier));
      }

      return eb.or(conditions);
    })
    .executeTakeFirst();

  if (!user) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'No user found with that username, email, or ID'
    });
  }

  // Update currency using Kysely transaction
  const result = await db.transaction().execute(async (trx) => {
    // Update user currency
    const updatedUser = await trx
      .updateTable('users')
      .set({
        gems: (user!.gems || 0) + (gems || 0),
        coins: (user!.coins || 0) + (coins || 0),
        dust: (user!.dust || 0) + (dust || 0),
        eco_credits: (user!.eco_credits || 0) + (eco_credits || 0),
        updated_at: new Date()
      })
      .where('id', '=', user!.id)
      .returning(['id', 'username', 'email', 'gems', 'coins', 'dust', 'eco_credits'])
      .executeTakeFirst();

    // Log admin action
    console.log(`💰 [ADMIN] Currency granted to user ${user!.username} (${user!.id}):`, {
      gems: gems || 0,
      coins: coins || 0,
      dust: dust || 0,
      eco_credits: eco_credits || 0,
      reason,
      adminId: req.user?.id
    });

    return updatedUser;
  });

  res.json({
    message: 'Currency granted successfully',
    user: result
  });
  return;
}));

/**
 * POST /api/admin/grant-card
 * Grant cards to a user by username, email, or ID
 */
router.post('/grant-card', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { identifier, cardId, quantity = 1, reason } = req.body;

  if (!identifier) {
    return res.status(400).json({
      error: 'MISSING_IDENTIFIER',
      message: 'Username, email, or user ID is required'
    });
  }

  if (!cardId) {
    return res.status(400).json({
      error: 'MISSING_CARD_ID',
      message: 'Card ID is required'
    });
  }

  if (!reason || reason.length < 5) {
    return res.status(400).json({
      error: 'INVALID_REASON',
      message: 'Reason must be at least 5 characters long'
    });
  }

  if (quantity < 1 || quantity > 100) {
    return res.status(400).json({
      error: 'INVALID_QUANTITY',
      message: 'Quantity must be between 1 and 100'
    });
  }

  // Helper function to check if string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Find user by identifier (username, email, or ID)
  const user = await db
    .selectFrom('users')
    .select(['id', 'username', 'email'])
    .where((eb) => {
      const conditions = [
        eb('username', '=', identifier),
        eb('email', '=', identifier)
      ];

      // Only add ID condition if identifier is a valid UUID
      if (isValidUUID(identifier)) {
        conditions.push(eb('id', '=', identifier));
      }

      return eb.or(conditions);
    })
    .executeTakeFirst();

  if (!user) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'No user found with that username, email, or ID'
    });
  }

  // Verify card exists
  const card = await db
    .selectFrom('cards')
    .select(['id', 'common_name', 'scientific_name'])
    .where('id', '=', cardId)
    .executeTakeFirst();

  if (!card) {
    return res.status(404).json({
      error: 'CARD_NOT_FOUND',
      message: `Card with ID ${cardId} not found`
    });
  }

  // Grant card using transaction
  const result = await db.transaction().execute(async (trx) => {
    // Check if user already has this card
    const existingCard = await trx
      .selectFrom('user_cards')
      .select(['quantity'])
      .where('user_id', '=', user!.id)
      .where('card_id', '=', cardId)
      .executeTakeFirst();

    let updatedCard;
    if (existingCard) {
      // Update existing card quantity
      updatedCard = await trx
        .updateTable('user_cards')
        .set({
          quantity: existingCard.quantity + quantity,
          last_acquired_at: new Date()
        })
        .where('user_id', '=', user!.id)
        .where('card_id', '=', cardId)
        .returning(['user_id', 'card_id', 'quantity'])
        .executeTakeFirst();
    } else {
      // Insert new card
      updatedCard = await trx
        .insertInto('user_cards')
        .values({
          user_id: user!.id,
          card_id: cardId,
          quantity: quantity,
          acquisition_method: 'reward' as const,
          acquired_at: new Date(),
          first_acquired_at: new Date(),
          last_acquired_at: new Date()
        })
        .returning(['user_id', 'card_id', 'quantity'])
        .executeTakeFirst();
    }

    // Update user's cards_collected count
    await trx
      .updateTable('users')
      .set({
        cards_collected: sql`COALESCE((SELECT SUM(quantity) FROM user_cards WHERE user_id = ${user!.id}), 0)`,
        updated_at: new Date()
      })
      .where('id', '=', user!.id)
      .execute();

    // Log admin action
    console.log(`🃏 [ADMIN] Card granted to user ${user!.username} (${user!.id}):`, {
      cardId,
      cardName: card!.common_name || card!.scientific_name,
      quantity,
      reason,
      adminId: req.user?.id
    });

    return updatedCard;
  });

  res.json({
    message: 'Card granted successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    card: {
      id: card.id,
      name: card.common_name || card.scientific_name,
      quantity: result?.quantity
    }
  });
  return;
}));

/**
 * GET /api/admin/analytics
 * Get basic analytics data
 */
router.get('/analytics', requireAdmin, strictRateLimiter, asyncHandler(async (_req, res) => {
  // Get user statistics - requires analytics implementation with date functions
  const userStats = [{
    total_users: 0,
    new_users_24h: 0,
    active_users_24h: 0,
    premium_users: 0,
    banned_users: 0
  }];

  // Get game statistics - requires game_sessions table implementation
  const gameStats = [{
    total_games: 0,
    games_24h: 0,
    avg_game_duration: 0,
    completed_games: 0
  }];

  // Get card statistics using Kysely
  const cardStats = await db
    .selectFrom('user_cards')
    .select([
      db.fn.count('id').as('total_cards_owned'),
      db.fn.count('id').as('unique_cards_owned'), // TODO: Use COUNT(DISTINCT card_id)
      db.fn.count('id').as('cards_acquired_24h') // TODO: Add date filter when acquired_at exists
    ])
    .execute();

  // Get transaction statistics using Kysely
  const transactionStats = await db
    .selectFrom('transactions')
    .select([
      db.fn.count('id').as('total_transactions'),
      db.fn.count('id').as('transactions_24h'), // TODO: Add date filter
      db.fn.count('id').as('revenue_30d') // TODO: Implement proper sum with amount field
    ])
    .execute();

  res.json({
    users: userStats[0],
    games: gameStats[0],
    cards: cardStats[0],
    transactions: transactionStats[0],
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/admin/physical-cards/generate
 * Generate physical card redemption codes
 */
router.post('/physical-cards/generate', requireAdmin, strictRateLimiter, asyncHandler(async (req, res) => {
  const { cardId, setId, quantity = 1, expirationDays } = req.body;

  if (!cardId || !setId) {
    return res.status(400).json({
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'cardId and setId are required'
    });
  }

  const codes: Array<{id: string; qr_code: string; serial_number: string}> = [];
  const expirationDate = expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : null;

  for (let i = 0; i < quantity; i++) {
    const qrCode = `BMT-${setId}-${cardId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    const serialNumber = `${setId}-${String(i + 1).padStart(6, '0')}`;

    // TODO: Implement physical_redemptions table
    const result = {
      id: `temp-${i}`,
      qr_code: qrCode,
      serial_number: serialNumber
    };

    codes.push(result);
  }

  res.json({
    message: `Generated ${quantity} redemption codes`,
    codes,
    cardId,
    setId,
    expirationDate
  });
  return;
}));

/**
 * DELETE /api/admin/users/:userId
 * Delete a user account (admin only)
 * Removes user from Firebase Auth, database, and all related data
 */
router.delete('/users/:userId', requireAdmin, strictRateLimiter, asyncHandler(async (req, res): Promise<any> => {
  const { userId } = req.params;
  const adminUser = req.user!;

  if (!userId) {
    return res.status(400).json({
      error: 'INVALID_USER_ID',
      message: 'User ID is required'
    });
  }

  console.log(`🗑️ Admin ${adminUser.username} starting account deletion for user: ${userId}`);

  try {
    // Get user data before deletion for logging and Firebase cleanup
    const targetUser = await db
      .selectFrom('users')
      .select(['id', 'username', 'email', 'firebase_uid', 'is_guest', 'account_type'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!targetUser) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Prevent deletion of other admin users (safety check)
    if (targetUser.account_type === 'admin' && targetUser.id !== adminUser.id) {
      return res.status(403).json({
        error: 'CANNOT_DELETE_ADMIN',
        message: 'Cannot delete other admin users'
      });
    }

    // Start database transaction for atomic deletion
    await db.transaction().execute(async (trx) => {
      console.log('📊 Deleting user data from database...');

      // Delete from tables that don't have CASCADE DELETE or need special handling
      console.log('🧹 Cleaning up redemption codes...');
      await trx
        .updateTable('redemption_codes')
        .set({ redeemed_by_user_id: null })
        .where('redeemed_by_user_id', '=', userId)
        .execute();

      // Delete from device sync states (composite primary key)
      console.log('📱 Cleaning up device sync states...');
      await trx
        .deleteFrom('device_sync_states')
        .where('user_id', '=', userId)
        .execute();

      // Delete from sync actions log
      console.log('🔄 Cleaning up sync actions log...');
      await trx
        .deleteFrom('sync_actions_log')
        .where('user_id', '=', userId)
        .execute();

      // Delete from offline action queue
      console.log('📴 Cleaning up offline action queue...');
      await trx
        .deleteFrom('offline_action_queue')
        .where('user_id', '=', userId)
        .execute();

      // Delete from game sessions where user is host
      console.log('🎮 Cleaning up game sessions...');
      await trx
        .deleteFrom('game_sessions')
        .where('host_user_id', '=', userId)
        .execute();

      // Finally, delete the user record (this will cascade to remaining tables)
      console.log('👤 Deleting user record...');
      const deletedUser = await trx
        .deleteFrom('users')
        .where('id', '=', userId)
        .returning(['id', 'username', 'firebase_uid'])
        .executeTakeFirst();

      if (!deletedUser) {
        throw new Error('Failed to delete user from database');
      }

      console.log(`✅ Database deletion completed for user: ${deletedUser.username}`);
    });

    // Clear user cache
    console.log('🗑️ Clearing user cache...');
    if (targetUser.firebase_uid) {
      const cacheKey = `user:${targetUser.firebase_uid}`;
      await CacheManager.delete(cacheKey);
    }

    // Delete from Firebase Auth (only for registered users)
    if (targetUser.firebase_uid && !targetUser.is_guest) {
      console.log('🔥 Deleting user from Firebase Auth...');
      const { deleteFirebaseUser } = await import('../config/firebase');
      await deleteFirebaseUser(targetUser.firebase_uid);
      console.log('✅ Firebase user deleted successfully');
    } else {
      console.log('ℹ️ Skipping Firebase deletion for guest user');
    }

    console.log(`🎉 Admin deletion completed successfully for user: ${targetUser.username}`);

    res.json({
      success: true,
      message: 'User account deleted successfully',
      data: {
        deletedAt: new Date().toISOString(),
        deletedUserId: targetUser.id,
        deletedUsername: targetUser.username,
        deletedByAdmin: adminUser.username
      }
    });

  } catch (error) {
    console.error('❌ Admin account deletion failed:', error);

    // Provide specific error messages
    let errorMessage = 'Account deletion failed';
    if (error instanceof Error) {
      if (error.message.includes('Firebase')) {
        errorMessage = 'Failed to delete Firebase account. User may need to be manually removed from Firebase Console.';
      } else if (error.message.includes('database')) {
        errorMessage = 'Failed to delete account data from database.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
      success: false,
      error: 'ADMIN_DELETION_FAILED',
      message: errorMessage
    });
  }
}));

/**
 * GET /api/admin/test-session-decks
 * Test the session/decks endpoint for the user with starter decks
 */
router.get('/test-session-decks', asyncHandler(async (_req, res) => {
  try {
    console.log('🧪 [ADMIN] Testing session/decks endpoint...');

    // Test user who has starter decks
    const testUserId = '721eab5a-9239-4f66-b974-df7df6564b62';
    const testSessionId = 'test-session-123';

    console.log(`🧪 [ADMIN] Testing for user: ${testUserId}, session: ${testSessionId}`);

    // Simulate the session/decks endpoint logic
    const userDecks = await db
      .selectFrom('decks')
      .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
      .select([
        'decks.id',
        'decks.name',
        'decks.created_at',
        'decks.updated_at',
        db.fn.count('deck_cards.id').as('card_count')
      ])
      .where('decks.user_id', '=', testUserId)
      .groupBy(['decks.id', 'decks.name', 'decks.created_at', 'decks.updated_at'])
      .having(db.fn.count('deck_cards.id'), '>=', 20) // Minimum deck size
      .orderBy('decks.updated_at', 'desc')
      .execute();

    console.log(`🧪 [ADMIN] Found ${userDecks.length} valid decks for user`);
    console.log(`🧪 [ADMIN] Deck details:`, userDecks);

    return res.json({
      success: true,
      message: 'Session decks test completed',
      data: {
        userId: testUserId,
        sessionId: testSessionId,
        decks: userDecks,
        deckCount: userDecks.length
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error testing session decks:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * GET /api/admin/fix-template-decks
 * Check and fix template deck flags
 */
router.get('/fix-template-decks', asyncHandler(async (_req, res) => {
  try {
    console.log('🔧 [ADMIN] Checking template deck flags...');

    // Check current template deck flags
    const templateDecks = await db
      .selectFrom('decks')
      .select(['id', 'name', 'user_id', 'deck_type', 'is_public', 'is_claimable'])
      .where('id', 'in', ['f438ca2d-ba05-4d3b-8dcd-61c9d022d6a4', 'fe31875e-a6de-4d03-b87c-7161ddbeab6f'])
      .execute();

    console.log('🔧 [ADMIN] Current template deck flags:', templateDecks);

    // Fix the flags if needed
    const updateResult = await db
      .updateTable('decks')
      .set({
        is_public: true,
        is_claimable: true,
        deck_type: sql`CASE
          WHEN name LIKE '%Forest%' THEN 2
          WHEN name LIKE '%Ocean%' THEN 3
          ELSE deck_type
        END`
      })
      .where('id', 'in', ['f438ca2d-ba05-4d3b-8dcd-61c9d022d6a4', 'fe31875e-a6de-4d03-b87c-7161ddbeab6f'])
      .execute();

    console.log('🔧 [ADMIN] Update result:', updateResult);

    // Check flags after update
    const updatedDecks = await db
      .selectFrom('decks')
      .select(['id', 'name', 'user_id', 'deck_type', 'is_public', 'is_claimable'])
      .where('id', 'in', ['f438ca2d-ba05-4d3b-8dcd-61c9d022d6a4', 'fe31875e-a6de-4d03-b87c-7161ddbeab6f'])
      .execute();

    console.log('🔧 [ADMIN] Updated template deck flags:', updatedDecks);

    return res.json({
      success: true,
      message: 'Template deck flags fixed',
      data: {
        before: templateDecks,
        after: updatedDecks,
        updateResult: updateResult
      }
    });

  } catch (error: any) {
    console.error('🔧 [ADMIN] Error fixing template decks:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Check template deck cards
router.get('/check-template-deck-cards', asyncHandler(async (_req, res) => {
  try {
    console.log('🔧 [ADMIN] Checking template deck cards...');

    // Get template decks (system user decks)
    const templateDecks = await db
      .selectFrom('decks')
      .select(['id', 'name'])
      .where('user_id', '=', '00000000-0000-0000-0000-000000000000') // System user
      .where('is_claimable', '=', true)
      .execute();

    console.log('🔧 [ADMIN] Found template decks:', templateDecks.map(deck => ({
      id: deck.id,
      name: deck.name
    })));

    // Calculate card counts from deck_cards table
    const deckDetails: Array<{id: string; name: string; cardCount: number; cardsValid: boolean}> = [];
    for (const deck of templateDecks) {
      const cardCountResult = await db
        .selectFrom('deck_cards')
        .select(db.fn.count('id').as('card_count'))
        .where('deck_id', '=', deck.id)
        .executeTakeFirst();

      const cardCount = Number(cardCountResult?.card_count || 0);

      deckDetails.push({
        id: deck.id,
        name: deck.name,
        cardCount,
        cardsValid: cardCount >= 20
      });
    }

    console.log('🔧 [ADMIN] Deck card counts:', deckDetails);

    return res.json({
      status: 'success',
      success: true,
      data: {
        decks: deckDetails
      }
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Error checking template deck cards:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to check template deck cards',
      data: null
    });
  }
}));

// Fix template deck cards
router.get('/fix-template-deck-cards', asyncHandler(async (_req, res) => {
  try {
    console.log('🔧 [ADMIN] Fixing template deck cards...');

    // This endpoint now verifies that deck_cards table has the correct data
    // The actual deck cards should be populated by migrations, not JSONB

    // Get template decks (system user decks)
    const templateDecks = await db
      .selectFrom('decks')
      .select(['id', 'name'])
      .where('user_id', '=', '00000000-0000-0000-0000-000000000000') // System user
      .where('is_claimable', '=', true)
      .execute();

    console.log('🔧 [ADMIN] Found template decks:', templateDecks);

    // Verify deck_cards table has the correct data
    const deckDetails: Array<{id: string; name: string; cardCount: number; cardsValid: boolean; sampleCards: Array<{cardId: number; speciesName: string | undefined; position: number}>}> = [];
    for (const deck of templateDecks) {
      const deckCards = await db
        .selectFrom('deck_cards')
        .select(['card_id', 'species_name', 'position_in_deck'])
        .where('deck_id', '=', deck.id)
        .orderBy('position_in_deck', 'asc')
        .execute();

      const cardCount = deckCards.length;

      deckDetails.push({
        id: deck.id,
        name: deck.name,
        cardCount,
        cardsValid: cardCount >= 20,
        sampleCards: deckCards.slice(0, 5).map(dc => ({
          cardId: dc.card_id,
          speciesName: dc.species_name,
          position: dc.position_in_deck
        }))
      });
    }

    console.log('🔧 [ADMIN] Template deck verification complete');

    // Verify the deck_cards data

    console.log('🔧 [ADMIN] Template deck verification results:', deckDetails);

    return res.json({
      status: 'success',
      success: true,
      data: {
        message: 'Template deck cards verified successfully',
        decks: deckDetails,
        note: 'Template deck cards are now managed through deck_cards table, not JSONB'
      }
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Error verifying template deck cards:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to verify template deck cards',
      data: null
    });
  }
}));

/**
 * POST /api/admin/create-firebase-admin
 * Create Firebase admin user (system endpoint, no auth required for initial setup)
 */
router.post('/create-firebase-admin', strictRateLimiter, asyncHandler(async (_req, res) => {
  try {
    console.log('🔥 [ADMIN] Creating Firebase admin user...');

    const auth = admin.auth();
    const adminEmail = 'biomasters.tcg@gmail.com';
    const adminPassword = 'Biomasters12345';

    try {
      // Try to get existing user first
      const existingUser = await auth.getUserByEmail(adminEmail);
      console.log('✅ [ADMIN] Admin user already exists in Firebase:', existingUser.uid);

      // Update password for existing user
      await auth.updateUser(existingUser.uid, {
        password: adminPassword
      });
      console.log('✅ [ADMIN] Admin password updated');

      // Set custom claims for admin
      await auth.setCustomUserClaims(existingUser.uid, {
        admin: true,
        role: 'admin'
      });
      console.log('✅ [ADMIN] Admin custom claims set for existing user');

      return res.json({
        success: true,
        message: 'Admin user updated successfully',
        data: {
          email: adminEmail,
          uid: existingUser.uid,
          action: 'updated'
        }
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('👤 [ADMIN] Creating new Firebase admin user...');

        // Create new user
        const userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'System Administrator',
          emailVerified: true
        });

        console.log('✅ [ADMIN] Firebase admin user created:', userRecord.uid);

        // Set custom claims for admin
        await auth.setCustomUserClaims(userRecord.uid, {
          admin: true,
          role: 'admin'
        });
        console.log('✅ [ADMIN] Admin custom claims set');

        return res.json({
          success: true,
          message: 'Admin user created successfully',
          data: {
            email: adminEmail,
            uid: userRecord.uid,
            action: 'created'
          }
        });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to create admin Firebase user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create admin Firebase user',
      message: error.message
    });
  }
}));

export default router;
