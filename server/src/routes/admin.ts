import { Router } from 'express';
import { requireAdminUser } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { query, transaction } from '../config/database';
import { setCustomUserClaims } from '../config/firebase';

const router = Router();

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', requireAdminUser, strictRateLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, accountType, isActive } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const queryLimit = Math.min(parseInt(limit as string) || 50, 100);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    whereClause += ' AND (username ILIKE $' + (params.length + 1) + ' OR email ILIKE $' + (params.length + 1) + ')';
    params.push(`%${search}%`);
  }

  if (accountType) {
    whereClause += ' AND account_type = $' + (params.length + 1);
    params.push(accountType);
  }

  if (isActive !== undefined) {
    whereClause += ' AND is_active = $' + (params.length + 1);
    params.push(isActive === 'true');
  }

  const users = await query(`
    SELECT 
      id, firebase_uid, email, username, display_name, account_type,
      email_verified, is_active, is_banned, ban_reason,
      level, experience, gems, coins, dust,
      games_played, games_won, cards_collected, packs_opened,
      created_at, last_login_at
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, queryLimit, offset]);

  const total = await query(`
    SELECT COUNT(*) as count FROM users ${whereClause}
  `, params);

  res.json({
    users,
    pagination: {
      page: parseInt(page as string),
      limit: queryLimit,
      total: parseInt(total[0]?.count || '0'),
      pages: Math.ceil(parseInt(total[0]?.count || '0') / queryLimit)
    }
  });
}));

/**
 * PUT /api/admin/users/:userId/ban
 * Ban or unban a user
 */
router.put('/users/:userId/ban', requireAdminUser, strictRateLimiter, asyncHandler(async (req, res) => {
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

  const updatedUser = await query(`
    UPDATE users 
    SET 
      is_banned = $1,
      ban_reason = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING id, username, is_banned, ban_reason
  `, [isBanned, isBanned ? banReason : null, userId]);

  if (updatedUser.length === 0) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
    user: updatedUser[0]
  });
  return;
}));

/**
 * PUT /api/admin/users/:userId/account-type
 * Change user account type
 */
router.put('/users/:userId/account-type', requireAdminUser, strictRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { accountType } = req.body;

  const validAccountTypes = ['guest', 'registered', 'premium'];
  if (!validAccountTypes.includes(accountType)) {
    return res.status(400).json({
      error: 'INVALID_ACCOUNT_TYPE',
      message: 'Account type must be one of: ' + validAccountTypes.join(', ')
    });
  }

  const updatedUser = await query(`
    UPDATE users 
    SET 
      account_type = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING id, username, account_type, firebase_uid
  `, [accountType, userId]);

  if (updatedUser.length === 0) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  // Update Firebase custom claims
  try {
    await setCustomUserClaims(updatedUser[0].firebase_uid, {
      accountType,
      premium: accountType === 'premium'
    });
  } catch (error) {
    console.error('Failed to update Firebase claims:', error);
  }

  res.json({
    message: 'Account type updated successfully',
    user: updatedUser[0]
  });
  return;
}));

/**
 * POST /api/admin/users/:userId/currency
 * Add or remove currency from user account
 */
router.post('/users/:userId/currency', requireAdminUser, strictRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { gems, coins, dust, reason } = req.body;

  if (!reason || reason.length < 5) {
    return res.status(400).json({
      error: 'INVALID_REASON',
      message: 'Reason must be at least 5 characters long'
    });
  }

  // Update currency in transaction
  const result = await transaction(async (client) => {
    // Update user currency
    const updatedUser = await client.query(`
      UPDATE users 
      SET 
        gems = gems + COALESCE($1, 0),
        coins = coins + COALESCE($2, 0),
        dust = dust + COALESCE($3, 0),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, gems, coins, dust
    `, [gems || 0, coins || 0, dust || 0, userId]);

    if (updatedUser.rows.length === 0) {
      throw new Error('User not found');
    }

    // Log admin transaction
    await client.query(`
      INSERT INTO transactions (user_id, type, amount, currency, description, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      userId,
      'admin_adjustment',
      Math.abs(gems || coins || dust || 0),
      gems ? 'gems' : coins ? 'coins' : 'dust',
      `Admin adjustment: ${reason}`
    ]);

    return updatedUser.rows[0];
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
router.get('/analytics', requireAdminUser, strictRateLimiter, asyncHandler(async (_req, res) => {
  // Get user statistics
  const userStats = await query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_24h,
      COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours') as active_users_24h,
      COUNT(*) FILTER (WHERE account_type = 'premium') as premium_users,
      COUNT(*) FILTER (WHERE is_banned = true) as banned_users
    FROM users
  `);

  // Get game statistics
  const gameStats = await query(`
    SELECT 
      COUNT(*) as total_games,
      COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours') as games_24h,
      AVG(duration_seconds) as avg_game_duration,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_games
    FROM game_sessions
  `);

  // Get card statistics
  const cardStats = await query(`
    SELECT 
      COUNT(*) as total_cards_owned,
      COUNT(DISTINCT card_id) as unique_cards_owned,
      COUNT(*) FILTER (WHERE acquired_at >= NOW() - INTERVAL '24 hours') as cards_acquired_24h
    FROM user_cards
  `);

  // Get transaction statistics
  const transactionStats = await query(`
    SELECT 
      COUNT(*) as total_transactions,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_24h,
      SUM(amount) FILTER (WHERE currency = 'usd' AND created_at >= NOW() - INTERVAL '30 days') as revenue_30d
    FROM transactions
  `);

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
router.post('/physical-cards/generate', requireAdminUser, strictRateLimiter, asyncHandler(async (req, res) => {
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

    const result = await query(`
      INSERT INTO physical_redemptions (qr_code, serial_number, card_id, set_id, expiration_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, qr_code, serial_number
    `, [qrCode, serialNumber, cardId, setId, expirationDate]);

    codes.push(result[0]);
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

export default router;
