/**
 * Rating System Routes
 * Handles ELO ratings, leaderboards, and match results
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { db } from '../database/kysely';
import { ApiResponse } from '@kelseyabreu/shared';

const router = express.Router();

// ============================================================================
// RATING MANAGEMENT
// ============================================================================

/**
 * Get current user's rating
 * GET /api/ratings/user
 */
router.get('/user', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    console.log(`📊 Getting rating for user: ${userId}`);

    const user = await db
      .selectFrom('users')
      .select(['id', 'username', 'current_rating', 'games_played', 'games_won'])
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

    return res.json({
      status: 'success',
      success: true,
      data: {
        rating: user.current_rating || 1000,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        winRate: user.games_played ? ((user.games_won || 0) / user.games_played * 100).toFixed(1) : '0.0'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Error getting user rating:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get player ratings
 * POST /api/ratings/players
 */
router.post('/players', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Players array is required',
        data: null
      } as ApiResponse);
    }

    // Validate UUIDs and filter out invalid ones
    const validPlayerIds: string[] = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    players.forEach(player => {
      if (player.id && uuidRegex.test(player.id)) {
        validPlayerIds.push(player.id);
      } else {
        console.warn(`⚠️ Invalid UUID format for player: ${player.id}`);
      }
    });

    if (validPlayerIds.length === 0) {
      return res.json({
      status: 'success',
      success: true,
        data: {}
      } as ApiResponse);
    }

    const ratings = await db
      .selectFrom('users')
      .select(['id', 'current_rating', 'peak_rating', 'games_played', 'games_won'])
      .where('id', 'in', validPlayerIds)
      .execute();

    const ratingsMap: Record<string, number> = {};
    ratings.forEach(rating => {
      ratingsMap[rating.id] = rating.current_rating || 1000;
    });

    return res.json({
      status: 'success',
      success: true,
      data: ratingsMap
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get player ratings error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Update player rating after match
 * POST /api/ratings/update
 */
router.post('/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { playerId, oldRating, newRating, ratingChange, gameMode, matchResult } = req.body;
    const requestingUserId = req.user!.id;

    // Validate that user can only update their own rating
    if (playerId !== requestingUserId) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Can only update own rating',
        data: null
      } as ApiResponse);
    }

    console.log(`📈 Updating rating for ${playerId}: ${oldRating} → ${newRating} (${ratingChange > 0 ? '+' : ''}${ratingChange})`);

    // Update user rating
    const isWin = ratingChange > 0;

    // First get current values
    const currentUser = await db
      .selectFrom('users')
      .select(['current_rating', 'peak_rating', 'games_played', 'games_won', 'win_streak'])
      .where('id', '=', playerId)
      .executeTakeFirst();

    const currentGamesPlayed = currentUser?.games_played || 0;
    const currentGamesWon = currentUser?.games_won || 0;
    const currentWinStreak = currentUser?.win_streak || 0;
    const currentPeakRating = currentUser?.peak_rating || 1000;

    await db
      .updateTable('users')
      .set({
        current_rating: newRating,
        peak_rating: Math.max(currentPeakRating, newRating),
        games_played: currentGamesPlayed + 1,
        games_won: isWin ? currentGamesWon + 1 : currentGamesWon,
        win_streak: isWin ? currentWinStreak + 1 : 0,
        updated_at: new Date()
      })
      .where('id', '=', playerId)
      .execute();

    // Record match result (create a dummy session for now)
    const sessionResult = await db
      .insertInto('game_sessions')
      .values({
        id: crypto.randomUUID(),
        host_user_id: playerId,
        game_mode: 'online',
        is_private: false,
        max_players: gameMode === 'ranked_1v1' || gameMode === 'casual_1v1' ? 2 : 4,
        current_players: 1,
        status: 'finished',
        players: [{
          playerId: playerId,
          username: 'Test Player',
          ready: true
        }],
        game_state: {},
        settings: {},
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id')
      .executeTakeFirst();

    if (sessionResult) {
      await db
        .insertInto('match_results')
        .values({
          session_id: sessionResult.id,
          player_user_id: playerId,
          opponent_user_id: playerId, // For testing, use same player as opponent
          game_mode: gameMode,
          result: matchResult, // 'win', 'loss', 'draw'
          rating_before: oldRating,
          rating_after: newRating,
          rating_change: ratingChange,
          created_at: new Date()
        })
        .execute();
    }

    return res.json({
      status: 'success',
      success: true,
      data: {
        playerId,
        newRating,
        ratingChange
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Update rating error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get leaderboard
 * GET /api/ratings/leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { gameMode = 'ranked_1v1', limit = 100 } = req.query;

    console.log(`🏆 Getting leaderboard for ${gameMode} (limit: ${limit})`);

    // Use the leaderboard view created in migration
    const leaderboard = await db
      .selectFrom('leaderboard_view')
      .selectAll()
      .where('games_played', '>=', 5) // Minimum games for ranking
      .orderBy('current_rating', 'desc')
      .limit(Number(limit))
      .execute();

    // Add rank numbers
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      winRate: entry.games_played > 0 ? Math.round((entry.games_won / entry.games_played) * 100) : 0
    }));

    return res.json({
      status: 'success',
      success: true,
      data: rankedLeaderboard
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get leaderboard error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get player's match history
 * GET /api/ratings/history/:playerId
 */
router.get('/history/:playerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { limit = 20, gameMode } = req.query;
    const requestingUserId = req.user!.id;

    // Users can only view their own match history (for now)
    if (playerId !== requestingUserId) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Can only view own match history',
        data: null
      } as ApiResponse);
    }

    let query = db
      .selectFrom('match_results')
      .selectAll()
      .where('player_user_id', '=', playerId)
      .orderBy('created_at', 'desc')
      .limit(Number(limit));

    if (gameMode) {
      query = query.where('game_mode', '=', gameMode as string);
    }

    const matchHistory = await query.execute();

    return res.json({
      status: 'success',
      success: true,
      data: matchHistory
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get match history error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get player's rating statistics
 * GET /api/ratings/stats/:playerId
 */
router.get('/stats/:playerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const requestingUserId = req.user!.id;

    // Users can only view their own stats (for now)
    if (playerId !== requestingUserId) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Can only view own stats',
        data: null
      } as ApiResponse);
    }

    const user = await db
      .selectFrom('users')
      .select([
        'current_rating',
        'peak_rating', 
        'games_played',
        'games_won',
        'win_streak'
      ])
      .where('id', '=', playerId)
      .executeTakeFirst();

    if (!user) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Player not found',
        data: null
      } as ApiResponse);
    }

    const winRate = user.games_played > 0 ? (user.games_won / user.games_played) * 100 : 0;
    const rank = await getUserRank(playerId);

    return res.json({
      status: 'success',
      success: true,
      data: {
        current: user.current_rating || 1000,
        peak: user.peak_rating || 1000,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        winRate: Math.round(winRate * 100) / 100,
        winStreak: user.win_streak || 0,
        rank: rank || 'Unranked',
        season: 'season_1'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get rating stats error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's rank based on rating
 */
async function getUserRank(userId: string): Promise<string> {
  const user = await db
    .selectFrom('users')
    .select(['current_rating'])
    .where('id', '=', userId)
    .executeTakeFirst();

  const rating = user?.current_rating || 1000;

  // Simple rank system based on rating
  if (rating >= 2000) return 'Master';
  if (rating >= 1800) return 'Diamond';
  if (rating >= 1600) return 'Platinum';
  if (rating >= 1400) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
}

export default router;
