import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { setCustomUserClaims } from '../config/firebase';
import { CacheManager } from '../config/redis';

const router = Router();

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

  const codes = [];
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

export default router;
