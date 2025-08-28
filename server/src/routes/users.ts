import { Router } from 'express';
import { requireVerifiedUser } from '../middleware/auth';
// import { requireResourceOwnership } from '../middleware/auth'; // Unused for now
import { apiRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { query, transaction } from '../config/database';
import { CacheManager } from '../config/redis';

const router = Router();

/**
 * GET /api/users/me
 * Get current user's detailed profile
 */
router.get('/me', requireVerifiedUser, asyncHandler(async (req, res) => {
  const user = req.user!;

  // Get user's deck count
  const deckCount = await query(
    'SELECT COUNT(*) as count FROM user_decks WHERE user_id = $1',
    [user.id]
  );

  // Get user's card collection count
  const cardCount = await query(
    'SELECT COUNT(DISTINCT card_id) as unique_cards, SUM(quantity) as total_cards FROM user_cards WHERE user_id = $1',
    [user.id]
  );

  // Get recent achievements
  const recentAchievements = await query(`
    SELECT achievement_id, unlocked_at, is_claimed 
    FROM user_achievements 
    WHERE user_id = $1 AND is_completed = true 
    ORDER BY unlocked_at DESC 
    LIMIT 5
  `, [user.id]);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      accountType: user.account_type,
      emailVerified: user.email_verified,
      level: user.level,
      experience: user.experience,
      title: user.title,
      currency: {
        gems: user.gems,
        coins: user.coins,
        dust: user.dust
      },
      stats: {
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        cardsCollected: user.cards_collected,
        packsOpened: user.packs_opened,
        deckCount: parseInt(deckCount[0]?.count || '0'),
        uniqueCards: parseInt(cardCount[0]?.unique_cards || '0'),
        totalCards: parseInt(cardCount[0]?.total_cards || '0')
      },
      preferences: user.preferences,
      recentAchievements,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
}));

/**
 * GET /api/users/:userId/profile
 * Get public profile of another user
 */
router.get('/:userId/profile', apiRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get user's public profile
  const users = await query(`
    SELECT 
      id, username, display_name, avatar_url, account_type,
      level, experience, title, games_played, games_won,
      cards_collected, packs_opened, created_at
    FROM users 
    WHERE id = $1 AND is_active = true AND is_banned = false
  `, [userId]);

  if (users.length === 0) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  const user = users[0];

  // Get public stats
  const deckCount = await query(
    'SELECT COUNT(*) as count FROM user_decks WHERE user_id = $1',
    [user.id]
  );

  const cardCount = await query(
    'SELECT COUNT(DISTINCT card_id) as unique_cards FROM user_cards WHERE user_id = $1',
    [user.id]
  );

  // Get public achievements (only completed ones)
  const achievements = await query(`
    SELECT achievement_id, unlocked_at 
    FROM user_achievements 
    WHERE user_id = $1 AND is_completed = true 
    ORDER BY unlocked_at DESC 
    LIMIT 10
  `, [user.id]);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      accountType: user.account_type,
      level: user.level,
      experience: user.experience,
      title: user.title,
      stats: {
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        winRate: user.games_played > 0 ? ((user.games_won / user.games_played) * 100).toFixed(1) : '0.0',
        cardsCollected: user.cards_collected,
        packsOpened: user.packs_opened,
        deckCount: parseInt(deckCount[0]?.count || '0'),
        uniqueCards: parseInt(cardCount[0]?.unique_cards || '0')
      },
      achievements,
      memberSince: user.created_at
    }
  });
  return;
}));

/**
 * PUT /api/users/me/currency
 * Update user currency (admin only or specific game actions)
 */
router.put('/me/currency', requireVerifiedUser, asyncHandler(async (req, res) => {
  const { gems, coins, dust, reason } = req.body;
  const user = req.user!;

  // Validate input
  if (gems !== undefined && (typeof gems !== 'number' || gems < 0)) {
    return res.status(400).json({
      error: 'INVALID_GEMS',
      message: 'Gems must be a non-negative number'
    });
  }

  if (coins !== undefined && (typeof coins !== 'number' || coins < 0)) {
    return res.status(400).json({
      error: 'INVALID_COINS',
      message: 'Coins must be a non-negative number'
    });
  }

  if (dust !== undefined && (typeof dust !== 'number' || dust < 0)) {
    return res.status(400).json({
      error: 'INVALID_DUST',
      message: 'Dust must be a non-negative number'
    });
  }

  // Update currency in transaction
  const updatedUser = await transaction(async (client) => {
    // Update user currency
    const result = await client.query(`
      UPDATE users 
      SET 
        gems = COALESCE($1, gems),
        coins = COALESCE($2, coins),
        dust = COALESCE($3, dust),
        updated_at = NOW()
      WHERE id = $4
      RETURNING gems, coins, dust
    `, [gems, coins, dust, user.id]);

    // Log transaction
    if (gems !== undefined || coins !== undefined || dust !== undefined) {
      await client.query(`
        INSERT INTO transactions (user_id, type, amount, currency, description, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        user.id,
        'reward',
        gems || coins || dust || 0,
        gems !== undefined ? 'gems' : coins !== undefined ? 'coins' : 'dust',
        reason || 'Currency update'
      ]);
    }

    return result.rows[0];
  });

  // Clear user cache
  const cacheKey = `user:${req.user!.firebase_uid}`;
  await CacheManager.delete(cacheKey);

  res.json({
    message: 'Currency updated successfully',
    currency: {
      gems: updatedUser.gems,
      coins: updatedUser.coins,
      dust: updatedUser.dust
    }
  });
  return;
}));

/**
 * GET /api/users/search
 * Search for users by username
 */
router.get('/search', apiRateLimiter, asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.status(400).json({
      error: 'INVALID_QUERY',
      message: 'Search query must be at least 2 characters long'
    });
  }

  const searchLimit = Math.min(parseInt(limit as string) || 10, 50);

  const users = await query(`
    SELECT 
      id, username, display_name, avatar_url, level, account_type
    FROM users 
    WHERE 
      (username ILIKE $1 OR display_name ILIKE $1)
      AND is_active = true 
      AND is_banned = false
    ORDER BY 
      CASE 
        WHEN username ILIKE $2 THEN 1
        WHEN display_name ILIKE $2 THEN 2
        ELSE 3
      END,
      username
    LIMIT $3
  `, [`%${q}%`, `${q}%`, searchLimit]);

  res.json({
    users: users.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      level: user.level,
      accountType: user.account_type
    })),
    total: users.length
  });
  return;
}));

/**
 * GET /api/users/leaderboard
 * Get leaderboard rankings
 */
router.get('/leaderboard', apiRateLimiter, asyncHandler(async (req, res) => {
  const { type = 'ranked', season = 'current', limit = 50 } = req.query;

  const leaderboardLimit = Math.min(parseInt(limit as string) || 50, 100);

  // Get leaderboard entries
  const entries = await query(`
    SELECT 
      le.rank, le.rating, le.games_played, le.games_won,
      u.id, u.username, u.display_name, u.avatar_url, u.level, u.account_type
    FROM leaderboard_entries le
    JOIN users u ON le.user_id = u.id
    WHERE 
      le.leaderboard_type = $1 
      AND le.season = $2
      AND u.is_active = true 
      AND u.is_banned = false
    ORDER BY le.rank ASC
    LIMIT $3
  `, [type, season, leaderboardLimit]);

  res.json({
    leaderboard: entries.map(entry => ({
      rank: entry.rank,
      rating: entry.rating,
      gamesPlayed: entry.games_played,
      gamesWon: entry.games_won,
      winRate: entry.games_played > 0 ? ((entry.games_won / entry.games_played) * 100).toFixed(1) : '0.0',
      user: {
        id: entry.id,
        username: entry.username,
        displayName: entry.display_name,
        avatarUrl: entry.avatar_url,
        level: entry.level,
        accountType: entry.account_type
      }
    })),
    type,
    season,
    total: entries.length
  });
}));

export default router;
