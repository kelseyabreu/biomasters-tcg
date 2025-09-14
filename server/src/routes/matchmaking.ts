/**
 * Matchmaking Routes
 * Handles online multiplayer matchmaking, queue management, and match creation
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { db } from '../database/kysely';
import { ApiResponse } from '../../../shared/types';

const router = express.Router();

// ============================================================================
// MATCHMAKING QUEUE MANAGEMENT
// ============================================================================

/**
 * Join matchmaking queue
 * POST /api/matchmaking/find
 */
router.post('/find', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { gameMode, preferences = {} } = req.body;
    const userId = req.user!.id;

    console.log(`🔍 User ${userId} joining matchmaking for ${gameMode}`);

    // Validate game mode
    const validGameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p'];
    if (!validGameModes.includes(gameMode)) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Invalid game mode',
        data: null
      } as ApiResponse);
    }

    // Check if user is already in queue
    const existingEntry = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (existingEntry) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Already in matchmaking queue',
        data: null
      } as ApiResponse);
    }

    // Get user's current rating
    const user = await db
      .selectFrom('users')
      .select(['current_rating'])
      .where('id', '=', userId)
      .executeTakeFirst();

    const userRating = user?.current_rating || 1000;

    // Add to matchmaking queue
    await db
      .insertInto('matchmaking_queue')
      .values({
        user_id: userId,
        game_mode: gameMode,
        rating: userRating,
        preferences: JSON.stringify(preferences),
        created_at: new Date(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      })
      .execute();

    // Try to find a match immediately
    const matchResult = await findMatch(userId, gameMode, userRating);

    if (matchResult.matchFound) {
      console.log(`✅ Immediate match found for user ${userId}`);
      return res.json({
        status: 'success',
        success: true,
        data: matchResult
      } as ApiResponse);
    }

    // No immediate match, user is now in queue
    console.log(`⏱️ User ${userId} added to queue, waiting for match`);
    return res.json({
      status: 'success',
      success: true,
      data: {
        inQueue: true,
        gameMode,
        estimatedWaitTime: await getEstimatedWaitTime(gameMode, userRating)
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Matchmaking error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Cancel matchmaking
 * DELETE /api/matchmaking/cancel
 */
router.delete('/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    console.log(`🚫 User ${userId} cancelling matchmaking`);

    const result = await db
      .deleteFrom('matchmaking_queue')
      .where('user_id', '=', userId)
      .execute();

    if (result.length === 0) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Not in matchmaking queue',
        data: null
      } as ApiResponse);
    }

    return res.json({
      status: 'success',
      success: true,
      data: { cancelled: true }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Cancel matchmaking error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get matchmaking status
 * GET /api/matchmaking/status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
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
        data: { inQueue: false }
      } as ApiResponse);
    }

    const queueTime = Date.now() - queueEntry.created_at.getTime();
    const estimatedWait = await getEstimatedWaitTime(queueEntry.game_mode, queueEntry.rating);

    return res.json({
      status: 'success',
      success: true,
      data: {
        inQueue: true,
        gameMode: queueEntry.game_mode,
        queueTime: Math.floor(queueTime / 1000), // seconds
        estimatedWait
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Matchmaking status error:', error);
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
 * Get required number of opponents for a game mode
 */
function getRequiredOpponents(gameMode: string): number {
  switch (gameMode) {
    case 'ranked_1v1':
    case 'casual_1v1':
      return 1; // 1 opponent (2 total players)
    case 'team_2v2':
      return 3; // 3 opponents (4 total players, 2v2)
    case 'ffa_4p':
      return 3; // 3 opponents (4 total players, free-for-all)
    default:
      return 1; // Default to 1v1
  }
}

/**
 * Find a match for a user
 */
async function findMatch(userId: string, gameMode: string, userRating: number) {
  const ratingRange = 100; // ±100 rating points initially

  // Determine required number of opponents based on game mode
  const requiredOpponents = getRequiredOpponents(gameMode);
  console.log(`🔍 Looking for ${requiredOpponents} opponents for ${gameMode}`);

  // Look for opponents within rating range
  const opponents = await db
    .selectFrom('matchmaking_queue')
    .selectAll()
    .where('user_id', '!=', userId)
    .where('game_mode', '=', gameMode)
    .where('rating', '>=', userRating - ratingRange)
    .where('rating', '<=', userRating + ratingRange)
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'asc')
    .limit(10)
    .execute();

  console.log(`🔍 Found ${opponents.length} potential opponents, need ${requiredOpponents}`);

  if (opponents.length < requiredOpponents) {
    return { matchFound: false };
  }

  // Select the required number of opponents
  const selectedOpponents = opponents.slice(0, requiredOpponents);
  console.log(`✅ Selected ${selectedOpponents.length} opponents for match`);

  // Create actual game session in database
  const sessionId = crypto.randomUUID(); // Use proper UUID for database

  try {
    // Get user details for game session
    const allPlayerIds = [userId, ...selectedOpponents.map(o => o.user_id)];
    console.log(`🔍 Getting user details for: ${allPlayerIds.join(', ')}`);
    const users = await db
      .selectFrom('users')
      .select(['id', 'username', 'display_name', 'email'])
      .where('id', 'in', allPlayerIds)
      .execute();

    console.log(`🔍 Found ${users.length} users:`, users.map(u => ({ id: u.id, username: u.username })));

    if (users.length !== allPlayerIds.length) {
      console.error(`❌ Missing users: expected ${allPlayerIds.length}, found ${users.length}`);
      throw new Error('Failed to get user details for game session');
    }

  // Create game session with proper initial state
  const gameSettings = {
    eventFrequency: 0.1,
    allowChallenges: true,
    startingHandSize: 5,
    deckSize: 10,
    turnTimeLimit: 300
  };

  // Create players array from all matched users
  const players = users.map((user, index) => ({
    id: user.id,
    name: user.display_name || user.username || `Player ${index + 1}`,
    isReady: false
  }));

  const initialGameState = {
    gamePhase: 'lobby',
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    settings: gameSettings
  };

  console.log(`🔍 Game state players:`, initialGameState.players.map(p => ({ id: p.id, name: p.name })));

    // Insert game session into database (using objects for JSONB columns)
    console.log(`🔍 Creating game session: ${sessionId}`);
    await db
      .insertInto('game_sessions')
      .values({
        id: sessionId,
        host_user_id: userId,
        game_mode: 'online', // Map all matchmaking modes to 'online'
        is_private: false,
        max_players: gameMode === 'ffa_4p' ? 4 : gameMode === 'team_2v2' ? 4 : 2,
        current_players: allPlayerIds.length,
        status: 'waiting',
        game_state: initialGameState, // Pass object directly for JSONB
        settings: gameSettings, // Pass object directly for JSONB
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    console.log(`✅ Game session created: ${sessionId}`);

    // Remove all matched players from queue
    await db
      .deleteFrom('matchmaking_queue')
      .where('user_id', 'in', allPlayerIds)
      .execute();

    console.log(`🎯 Match created with game session: ${sessionId} (${allPlayerIds.length} players)`);

    // Create return data with all players
    const returnPlayers = users.map(user => {
      const queueEntry = selectedOpponents.find(o => o.user_id === user.id);
      return {
        id: user.id,
        rating: user.id === userId ? userRating : (queueEntry?.rating || 1000),
        name: user.display_name || user.username
      };
    });

    return {
      matchFound: true,
      sessionId,
      players: returnPlayers
    };
  } catch (error) {
    console.error(`❌ Error creating game session:`, error);
    throw error;
  }
}

/**
 * Get estimated wait time for matchmaking
 */
async function getEstimatedWaitTime(gameMode: string, _rating: number): Promise<number> {
  // Simple estimation based on queue size and rating distribution
  const queueSize = await db
    .selectFrom('matchmaking_queue')
    .select(db.fn.count('id').as('count'))
    .where('game_mode', '=', gameMode)
    .where('expires_at', '>', new Date())
    .executeTakeFirst();

  const count = Number(queueSize?.count || 0);
  
  // Base wait time: 30 seconds + 15 seconds per person in queue
  const baseWait = 30 + (count * 15);
  
  // Add randomness to make it feel more realistic
  const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  
  return Math.floor(baseWait * randomFactor);
}

export default router;
