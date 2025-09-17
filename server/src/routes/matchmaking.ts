/**
 * Enhanced Matchmaking Routes with Pub/Sub Integration
 * Handles online multiplayer matchmaking, queue management, and match creation
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../database/kysely';
import { MatchmakingService } from '../services/MatchmakingService';
import { ApiResponse, MatchmakingRequest } from '../../../shared/types';

const router = express.Router();

// Global matchmaking service instance (can be overridden for testing)
let matchmakingService = new MatchmakingService();

// Function to set a custom matchmaking service (for testing)
export function setMatchmakingService(service: MatchmakingService) {
  matchmakingService = service;
  console.log(`🔧 [MATCHMAKING ROUTE] Matchmaking service updated`);
}

// Function to get the current matchmaking service
export function getMatchmakingService(): MatchmakingService {
  return matchmakingService;
}

// ============================================================================
// MATCHMAKING QUEUE MANAGEMENT
// ============================================================================

/**
 * Join matchmaking queue with Pub/Sub integration
 * POST /api/matchmaking/find
 */
router.post('/find', requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameMode, preferences = {} } = req.body;
    const userId = req.user!.id;

    console.log(`🔍 [MATCHMAKING ROUTE] User ${userId} joining matchmaking for ${gameMode}`);
    console.log(`🔍 [MATCHMAKING ROUTE] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [MATCHMAKING ROUTE] User object:`, JSON.stringify(req.user, null, 2));

    // Validate game mode
    console.log(`🔴 [MATCHMAKING ROUTE] Validating game mode: ${gameMode}`);
    const validGameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p'];
    if (!validGameModes.includes(gameMode)) {
      console.log(`🔴 [MATCHMAKING ROUTE] Invalid game mode: ${gameMode}`);
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Invalid game mode',
        data: null
      } as ApiResponse);
    }
    console.log(`✅ [MATCHMAKING ROUTE] Game mode validation passed`);

    // Check if user is already in queue
    console.log(`🔍 [MATCHMAKING ROUTE] Checking if user ${userId} is already in queue...`);
    const existingEntry = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();
    console.log(`🔍 [MATCHMAKING ROUTE] Existing queue entry check completed:`, existingEntry ? 'Found existing entry' : 'No existing entry');

    if (existingEntry) {
      console.log(`⚠️ [MATCHMAKING ROUTE] User ${userId} already in queue, returning 409`);
      return res.status(409).json({
        status: 'error',
        success: false,
        error: 'Already in matchmaking queue',
        data: null
      } as ApiResponse);
    }

    // Get user's current rating
    console.log(`🔍 [MATCHMAKING ROUTE] Getting user rating for ${userId}...`);
    const user = await db
      .selectFrom('users')
      .select(['current_rating'])
      .where('id', '=', userId)
      .executeTakeFirst();
    console.log(`🔍 [MATCHMAKING ROUTE] User rating query completed:`, user);

    const userRating = user?.current_rating || 1000;
    console.log(`🔍 [MATCHMAKING ROUTE] Using rating: ${userRating}`);

    console.log(`🚀 [MATCHMAKING ROUTE] About to call matchmakingService.requestMatch()...`);

    // Create matchmaking request
    const matchmakingRequest: MatchmakingRequest = {
      playerId: userId,
      gameMode,
      rating: userRating,
      preferences: {
        maxWaitTime: preferences.maxWaitTime || 600, // Default 10 minutes
        regionPreference: preferences.regionPreference
      },
      requestId: `req_${Date.now()}_${userId}`,
      timestamp: Date.now()
    };

    console.log(`🚀 [MATCHMAKING ROUTE] Created matchmaking request:`, JSON.stringify(matchmakingRequest, null, 2));

    // Submit to matchmaking service (handles Pub/Sub and Redis)
    console.log(`🚀 [MATCHMAKING ROUTE] Calling matchmakingService.requestMatch()...`);
    console.log(`🚀 [MATCHMAKING ROUTE] MatchmakingService instance:`, matchmakingService ? 'Present' : 'Missing');
    console.log(`🚀 [MATCHMAKING ROUTE] requestMatch method:`, typeof matchmakingService?.requestMatch);

    try {
      await matchmakingService.requestMatch(matchmakingRequest);
      console.log(`✅ [MATCHMAKING ROUTE] matchmakingService.requestMatch() completed successfully`);
    } catch (error) {
      console.error(`❌ [MATCHMAKING ROUTE] matchmakingService.requestMatch() failed:`, error);
      throw error;
    }

    // Get estimated wait time
    console.log(`🔍 [MATCHMAKING ROUTE] Getting estimated wait time...`);
    const estimatedWaitTime = await matchmakingService.getEstimatedWaitTime(gameMode, userRating);
    console.log(`🔍 [MATCHMAKING ROUTE] Estimated wait time: ${estimatedWaitTime}s`);

    console.log(`✅ [MATCHMAKING ROUTE] User ${userId} added to matchmaking queue for ${gameMode}`);
    return res.json({
      status: 'success',
      success: true,
      data: {
        inQueue: true,
        gameMode,
        requestId: matchmakingRequest.requestId,
        estimatedWaitTime,
        queuePosition: await getQueuePosition(userId, gameMode),
        message: 'Matchmaking request submitted successfully'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Matchmaking error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to join matchmaking queue',
      data: null
    } as ApiResponse);
  }
});

/**
 * Cancel matchmaking with Pub/Sub integration
 * DELETE /api/matchmaking/cancel
 */
router.delete('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameMode } = req.body;
    const userId = req.user!.id;

    console.log(`🚫 User ${userId} cancelling matchmaking for ${gameMode || 'any mode'}`);

    // Check if user is in queue
    const queueEntry = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!queueEntry) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Not in matchmaking queue',
        data: null
      } as ApiResponse);
    }

    // Use the game mode from the queue entry if not provided
    const targetGameMode = gameMode || queueEntry.game_mode;

    // Cancel through matchmaking service (handles Pub/Sub and Redis)
    await matchmakingService.cancelMatch(userId, targetGameMode);

    console.log(`✅ Matchmaking cancelled for user ${userId}`);
    return res.json({
      status: 'success',
      success: true,
      data: {
        cancelled: true,
        gameMode: targetGameMode,
        message: 'Matchmaking cancelled successfully'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Cancel matchmaking error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to cancel matchmaking',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get matchmaking status with enhanced information
 * GET /api/matchmaking/status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const queueEntry = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!queueEntry) {
      return res.json({
        status: 'success',
        success: true,
        data: {
          inQueue: false,
          queueStats: await matchmakingService.getQueueStats()
        }
      } as ApiResponse);
    }

    const queueTime = Date.now() - queueEntry.created_at.getTime();
    const estimatedWait = await matchmakingService.getEstimatedWaitTime(queueEntry.game_mode, queueEntry.rating);
    const queuePosition = await getQueuePosition(userId, queueEntry.game_mode);

    return res.json({
      status: 'success',
      success: true,
      data: {
        inQueue: true,
        gameMode: queueEntry.game_mode,
        queueTime: Math.floor(queueTime / 1000), // seconds
        estimatedWait,
        queuePosition,
        expiresAt: queueEntry.expires_at
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Matchmaking status error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get matchmaking status',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get queue statistics
 * GET /api/matchmaking/stats
 */
router.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const queueStats = await matchmakingService.getQueueStats();

    // Get recent match count (using game_sessions as fallback until migration runs)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMatches = await db
      .selectFrom('game_sessions')
      .select([
        'game_mode',
        db.fn.count('id').as('count')
      ])
      .where('created_at', '>=', oneHourAgo)
      .where('status', '=', 'finished')
      .groupBy('game_mode')
      .execute();

    return res.json({
      status: 'success',
      success: true,
      data: {
        queueStats,
        recentMatches: recentMatches.reduce((acc, match) => {
          acc[match.game_mode] = Number(match.count);
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date()
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Matchmaking stats error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get matchmaking statistics',
      data: null
    } as ApiResponse);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get queue position for a player
 */
async function getQueuePosition(userId: string, gameMode: string): Promise<number> {
  try {
    const queueEntry = await db
      .selectFrom('matchmaking_queue')
      .select(['created_at'])
      .where('user_id', '=', userId)
      .where('game_mode', '=', gameMode)
      .executeTakeFirst();

    if (!queueEntry) {
      return 0;
    }

    // Count players who joined before this user
    const result = await db
      .selectFrom('matchmaking_queue')
      .select(db.fn.count('id').as('count'))
      .where('game_mode', '=', gameMode)
      .where('created_at', '<', queueEntry.created_at)
      .executeTakeFirst();

    return Number(result?.count || 0) + 1; // +1 because position is 1-based
  } catch (error) {
    console.error('❌ Failed to get queue position:', error);
    return 0;
  }
}

// Legacy functions removed - now handled by MatchmakingService and MatchmakingWorker

export default router;
