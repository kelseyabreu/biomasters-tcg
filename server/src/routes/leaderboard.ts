/**
 * Leaderboard Routes
 * Handles leaderboard queries for different game modes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/kysely';
import { ApiResponse } from '@shared/types';

const router = Router();

/**
 * Get leaderboard for a specific game mode
 * GET /api/leaderboard/:gameMode
 */
router.get('/:gameMode', async (req: Request, res: Response) => {
  try {
    const { gameMode } = req.params;
    const { limit = 100, season = 'current' } = req.query;

    console.log(`🏆 Getting leaderboard for ${gameMode} (limit: ${limit}, season: ${season})`);

    // Validate game mode
    const validGameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p', 'all'];
    if (!gameMode || !validGameModes.includes(gameMode)) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Invalid game mode',
        data: null
      } as ApiResponse);
    }

    // Use the leaderboard view created in migration
    let query = db
      .selectFrom('leaderboard_view')
      .selectAll()
      .where('games_played', '>=', 5) // Minimum games for ranking
      .orderBy('current_rating', 'desc')
      .limit(Number(limit));

    // For specific game modes, we would filter by game mode if we had that data
    // For now, we'll use the general leaderboard
    
    const leaderboard = await query.execute();

    // Add rank numbers and format response
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.user_id,
        username: entry.username,
        displayName: entry.username // Use username as fallback for display name
      },
      rating: entry.current_rating,
      peakRating: entry.peak_rating,
      gamesPlayed: entry.games_played,
      gamesWon: entry.games_won,
      winRate: entry.games_played > 0 ? Math.round((entry.games_won / entry.games_played) * 100) : 0,
      winStreak: 0, // Not available in leaderboard view
      lastActive: null // Not available in leaderboard view
    }));

    return res.json({
      status: 'success',
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        gameMode,
        season,
        total: rankedLeaderboard.length,
        lastUpdated: new Date()
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get leaderboard error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get leaderboard',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get global leaderboard (all game modes combined)
 * GET /api/leaderboard
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 100, type = 'rating' } = req.query;

    console.log(`🌍 Getting global leaderboard (limit: ${limit}, type: ${type})`);

    let orderBy: string;
    switch (type) {
      case 'games':
        orderBy = 'games_played';
        break;
      case 'wins':
        orderBy = 'games_won';
        break;
      case 'winrate':
        orderBy = 'win_rate';
        break;
      case 'rating':
      default:
        orderBy = 'current_rating';
        break;
    }

    const leaderboard = await db
      .selectFrom('leaderboard_view')
      .selectAll()
      .where('games_played', '>=', 5) // Minimum games for ranking
      .orderBy(orderBy as any, 'desc')
      .limit(Number(limit))
      .execute();

    // Add rank numbers and format response
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.user_id,
        username: entry.username,
        displayName: entry.username // Use username as fallback for display name
      },
      rating: entry.current_rating,
      peakRating: entry.peak_rating,
      gamesPlayed: entry.games_played,
      gamesWon: entry.games_won,
      winRate: entry.games_played > 0 ? Math.round((entry.games_won / entry.games_played) * 100) : 0,
      winStreak: 0, // Not available in leaderboard view
      lastActive: null // Not available in leaderboard view
    }));

    return res.json({
      status: 'success',
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        type,
        total: rankedLeaderboard.length,
        lastUpdated: new Date()
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get global leaderboard error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get global leaderboard',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get user's position in leaderboard
 * GET /api/leaderboard/position/:userId
 */
router.get('/position/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { gameMode = 'all' } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'User ID is required',
        data: null
      } as ApiResponse);
    }

    console.log(`📍 Getting leaderboard position for user ${userId} in ${gameMode}`);

    // Get user's current stats
    const user = await db
      .selectFrom('users')
      .select([
        'id',
        'username',
        'display_name',
        'current_rating',
        'peak_rating',
        'games_played',
        'games_won',
        'win_streak'
      ])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'User not found',
        data: null
      } as ApiResponse);
    }

    // Calculate user's rank
    const higherRatedUsers = await db
      .selectFrom('users')
      .select(db.fn.count('id').as('count'))
      .where('current_rating', '>', user.current_rating)
      .where('games_played', '>=', 5)
      .where('is_active', '=', true)
      .executeTakeFirst();

    const rank = Number(higherRatedUsers?.count || 0) + 1;

    // Get total ranked users
    const totalRankedUsers = await db
      .selectFrom('users')
      .select(db.fn.count('id').as('count'))
      .where('games_played', '>=', 5)
      .where('is_active', '=', true)
      .executeTakeFirst();

    const total = Number(totalRankedUsers?.count || 0);

    return res.json({
      status: 'success',
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name
        },
        rank,
        rating: user.current_rating,
        peakRating: user.peak_rating,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        winRate: user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0,
        winStreak: user.win_streak || 0,
        totalRankedUsers: total,
        percentile: total > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get leaderboard position error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get leaderboard position',
      data: null
    } as ApiResponse);
  }
});

export default router;
