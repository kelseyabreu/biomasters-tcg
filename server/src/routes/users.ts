import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth';
// import { requireResourceOwnership } from '../middleware/auth'; // Unused for now
import { apiRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { CacheManager } from '../config/redis';

import type {
  PublicUser
} from '@shared/types';

const router = Router();

/**
 * GET /api/users/me
 * Get current user's detailed profile
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;

  // Get user's deck count
  const deckCountResult = await db
    .selectFrom('user_decks')
    .select(db.fn.count('id').as('count'))
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  // Get user's card collection count
  const cardCountResult = await db
    .selectFrom('user_cards')
    .select([
      db.fn.count('id').as('unique_cards'), // TODO: Use COUNT(DISTINCT card_id)
      db.fn.sum('quantity').as('total_cards')
    ])
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  // Get recent achievements - TODO: Implement achievements table
  const recentAchievements: any[] = [];

  // User is already unified from auth middleware
  const unifiedUser = user;

  res.json({
    user: {
      id: unifiedUser.id,
      username: unifiedUser.username,
      displayName: unifiedUser.display_name,
      email: unifiedUser.email,
      avatarUrl: unifiedUser.avatar_url,
      accountType: unifiedUser.account_type,
      emailVerified: unifiedUser.email_verified,
      level: unifiedUser.level,
      experience: unifiedUser.experience,
      title: unifiedUser.title,

      // Enhanced currency system
      currency: {
        gems: unifiedUser.gems,
        coins: unifiedUser.coins,
        dust: unifiedUser.dust,
        ecoCredits: unifiedUser.eco_credits,
        xpPoints: unifiedUser.xp_points
      },

      // Game statistics
      stats: {
        gamesPlayed: unifiedUser.games_played,
        gamesWon: unifiedUser.games_won,
        cardsCollected: unifiedUser.cards_collected,
        packsOpened: unifiedUser.packs_opened,
        deckCount: parseInt(deckCountResult?.count as string) || 0,
        uniqueCards: parseInt(cardCountResult?.unique_cards as string) || 0,
        totalCards: parseInt(cardCountResult?.total_cards as string) || 0
      },

      // Enhanced profile fields
      profile: {
        bio: unifiedUser.bio,
        location: unifiedUser.location,
        favoriteSpecies: unifiedUser.favorite_species,
        isPublicProfile: unifiedUser.is_public_profile
      },

      // Notification preferences
      notifications: {
        email: unifiedUser.email_notifications,
        push: unifiedUser.push_notifications
      },

      // Reward system
      rewards: {
        lastClaimedAt: unifiedUser.last_reward_claimed_at
      },

      // Legacy fields for backward compatibility
      preferences: unifiedUser.preferences,
      recentAchievements,
      createdAt: unifiedUser.created_at,
      lastLoginAt: unifiedUser.last_login_at
    }
  });
}));

/**
 * PUT /api/users/me
 * Update current user's profile
 */
router.put('/me', requireRegisteredUser, apiRateLimiter, asyncHandler(async (req, res) => {
  console.log('🔐 [Users] PUT /me route handler reached');
  const user = req.user!;
  const { displayName, bio, location, favoriteSpecies, isPublicProfile, emailNotifications, pushNotifications } = req.body;

  // Validate input
  if (displayName && (typeof displayName !== 'string' || displayName.length > 50)) {
    res.status(400).json({
      success: false,
      error: 'INVALID_DISPLAY_NAME',
      message: 'Display name must be a string with max 50 characters'
    });
    return;
  }

  if (bio && (typeof bio !== 'string' || bio.length > 200)) {
    res.status(400).json({
      error: 'INVALID_BIO',
      message: 'Bio must be a string with max 200 characters'
    });
    return;
  }

  if (location && (typeof location !== 'string' || location.length > 100)) {
    res.status(400).json({
      error: 'INVALID_LOCATION',
      message: 'Location must be a string with max 100 characters'
    });
    return;
  }

  if (favoriteSpecies && (typeof favoriteSpecies !== 'string' || favoriteSpecies.length > 100)) {
    res.status(400).json({
      error: 'INVALID_FAVORITE_SPECIES',
      message: 'Favorite species must be a string with max 100 characters'
    });
    return;
  }

  try {
    // Update user profile
    const updatedUser = await db
      .updateTable('users')
      .set({
        display_name: displayName?.trim() || user.display_name,
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        favorite_species: favoriteSpecies?.trim() || null,
        is_public_profile: isPublicProfile !== undefined ? isPublicProfile : user.is_public_profile,
        email_notifications: emailNotifications !== undefined ? emailNotifications : user.email_notifications,
        push_notifications: pushNotifications !== undefined ? pushNotifications : user.push_notifications,
        updated_at: new Date()
      })
      .where('id', '=', user.id)
      .returning([
        'id', 'username', 'display_name', 'email', 'bio', 'location',
        'favorite_species', 'is_public_profile', 'email_notifications',
        'push_notifications', 'updated_at'
      ])
      .executeTakeFirstOrThrow();

    // Clear user cache
    await CacheManager.delete(`user:${user.id}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile'
    });
  }
}));

/**
 * GET /api/users/:userId/profile
 * Get public profile of another user
 */
router.get('/:userId/profile', apiRateLimiter, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get user's public profile
  const user = await db
    .selectFrom('users')
    .select([
      'id', 'username', 'display_name', 'avatar_url', 'account_type',
      'level', 'experience', 'title', 'games_played', 'games_won',
      'cards_collected', 'packs_opened', 'created_at'
    ])
    .where('id', '=', userId as string)
    .where('is_active', '=', true)
    .where('is_banned', '=', false)
    .executeTakeFirst();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  // Get public stats
  const deckCountResult = await db
    .selectFrom('user_decks')
    .select(db.fn.count('id').as('count'))
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  const cardCountResult = await db
    .selectFrom('user_cards')
    .select(db.fn.count('id').as('unique_cards')) // TODO: Use COUNT(DISTINCT card_id)
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  // Get public achievements (only completed ones) - TODO: Implement achievements table
  const achievements: any[] = [];

  // Create PublicUser response following unified type structure
  const publicUser: PublicUser = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    account_type: user.account_type,
    level: user.level,
    experience: user.experience,
    title: user.title,
    games_played: user.games_played,
    games_won: user.games_won,
    cards_collected: user.cards_collected,
    packs_opened: user.packs_opened,
    created_at: user.created_at
  };

  res.json({
    user: {
      ...publicUser,
      // Additional computed fields for API response
      displayName: publicUser.display_name,
      avatarUrl: publicUser.avatar_url,
      accountType: publicUser.account_type,
      stats: {
        gamesPlayed: publicUser.games_played,
        gamesWon: publicUser.games_won,
        winRate: publicUser.games_played > 0 ? ((publicUser.games_won / publicUser.games_played) * 100).toFixed(1) : '0.0',
        cardsCollected: publicUser.cards_collected,
        packsOpened: publicUser.packs_opened,
        deckCount: parseInt(deckCountResult?.count as string) || 0,
        uniqueCards: parseInt(cardCountResult?.unique_cards as string) || 0
      },
      achievements,
      memberSince: publicUser.created_at
    }
  });
  return;
}));

/**
 * PUT /api/users/me/currency
 * Update user currency (admin only or specific game actions)
 */
router.put('/me/currency', requireRegisteredUser, asyncHandler(async (req, res) => {
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

  // Update currency using Kysely transaction
  const updatedUser = await db.transaction().execute(async (trx) => {
    // Build update object with only defined values
    const updateData: any = { updated_at: new Date() };
    if (gems !== undefined) updateData.gems = gems;
    if (coins !== undefined) updateData.coins = coins;
    if (dust !== undefined) updateData.dust = dust;

    // Update user currency
    const result = await trx
      .updateTable('users')
      .set(updateData)
      .where('id', '=', user.id)
      .returning(['gems', 'coins', 'dust'])
      .executeTakeFirstOrThrow();

    // Log transaction
    if (gems !== undefined || coins !== undefined || dust !== undefined) {
      await trx
        .insertInto('transactions')
        .values({
          user_id: user.id,
          type: 'reward',
          eco_credits_change: 0, // Required field
          description: reason || 'Currency update',
          created_at: new Date()
        })
        .execute();
    }

    return result;
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

  const users = await db
    .selectFrom('users')
    .select(['id', 'username', 'display_name', 'avatar_url', 'level', 'account_type'])
    .where((eb) => eb.or([
      eb('username', 'ilike', `%${q}%`),
      eb('display_name', 'ilike', `%${q}%`)
    ]))
    .where('is_active', '=', true)
    .where('is_banned', '=', false)
    .orderBy((eb) => eb.case()
      .when('username', 'ilike', `${q}%`).then(1)
      .when('display_name', 'ilike', `${q}%`).then(2)
      .else(3)
      .end()
    )
    .orderBy('username', 'asc')
    .limit(searchLimit)
    .execute();

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
  const { type = 'ranked', season = 'current' } = req.query;

  // const leaderboardLimit = Math.min(parseInt(limit as string) || 50, 100); // For future leaderboard implementation

  // Get leaderboard entries - requires leaderboard_entries table implementation
  const entries: any[] = [];

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
