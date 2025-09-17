/**
 * Match Management Routes
 * Handles match history, forfeit, and match-related operations
 */

import { Router, Request, Response } from 'express';
import { sql } from 'kysely';
import { db } from '../database/kysely';
import { requireAuth } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

/**
 * Get match history for authenticated user
 * GET /api/matches/history
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, gameMode } = req.query;
    const userId = req.user!.id;
    const offset = (Number(page) - 1) * Number(limit);

    console.log(`📚 Getting match history for user ${userId} (page: ${page}, limit: ${limit})`);

    let query = db
      .selectFrom('match_results as mr')
      .leftJoin('users as opponent', 'mr.opponent_user_id', 'opponent.id')
      .leftJoin('game_sessions as gs', 'mr.session_id', 'gs.id')
      .select([
        'mr.id',
        'mr.session_id',
        'mr.game_mode',
        'mr.result',
        'mr.rating_before',
        'mr.rating_after',
        'mr.rating_change',
        'mr.match_duration',
        'mr.created_at',
        'opponent.username as opponent_username',
        'opponent.display_name as opponent_display_name',
        'gs.status as session_status'
      ])
      .where('mr.player_user_id', '=', userId)
      .orderBy('mr.created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    if (gameMode) {
      query = query.where('mr.game_mode', '=', gameMode as string);
    }

    const matches = await query.execute();

    // Get total count for pagination
    let countQuery = db
      .selectFrom('match_results')
      .select(db.fn.count('id').as('total'))
      .where('player_user_id', '=', userId);

    if (gameMode) {
      countQuery = countQuery.where('game_mode', '=', gameMode as string);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    return res.json({
      status: 'success',
      success: true,
      data: {
        matches: matches.map(match => ({
          id: match.id,
          sessionId: match.session_id,
          gameMode: match.game_mode,
          result: match.result,
          ratingBefore: match.rating_before,
          ratingAfter: match.rating_after,
          ratingChange: match.rating_change,
          duration: match.match_duration,
          opponent: {
            username: match.opponent_username,
            displayName: match.opponent_display_name
          },
          createdAt: match.created_at,
          sessionStatus: match.session_status
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get match history error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get match history',
      data: null
    } as ApiResponse);
  }
});

/**
 * Forfeit an active match
 * POST /api/matches/:sessionId/forfeit
 */
router.post('/:sessionId/forfeit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required',
        data: null
      } as ApiResponse);
    }

    console.log(`🏳️ User ${userId} forfeiting match ${sessionId}`);

    // Get the game session
    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    // Check if user is part of this session
    const players = session.players as any[];
    const userInSession = players.some(p => p.playerId === userId);

    if (!userInSession) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'You are not part of this game session',
        data: null
      } as ApiResponse);
    }

    // Check if game is still active
    if (session.status !== 'playing' && session.status !== 'waiting') {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Game is not active',
        data: null
      } as ApiResponse);
    }

    // Update game session to finished
    const gameState = session.game_state as any;
    const winnerId = players.find(p => p.playerId !== userId)?.playerId || null;
    
    gameState.gamePhase = 'completed';
    gameState.winner = winnerId;
    gameState.completedAt = new Date();
    gameState.forfeitedBy = userId;

    await db
      .updateTable('game_sessions')
      .set({
        status: 'finished',
        game_state: gameState,
        updated_at: new Date()
      })
      .where('id', '=', sessionId)
      .execute();

    // Create match results
    const matchDuration = Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000);
    const gameMode = session.game_mode || 'casual_1v1';

    for (const player of players) {
      const isWinner = player.playerId === winnerId;
      const result = isWinner ? 'win' : 'loss';
      const ratingChange = isWinner ? 16 : -16; // Standard forfeit rating change
      const oldRating = player.rating || 1000;
      const newRating = oldRating + ratingChange;

      // Insert match result
      await db
        .insertInto('match_results')
        .values({
          session_id: sessionId,
          player_user_id: player.playerId,
          opponent_user_id: players.find(p => p.playerId !== player.playerId)?.playerId || null,
          game_mode: gameMode,
          result,
          rating_before: oldRating,
          rating_after: newRating,
          rating_change: ratingChange,
          match_duration: matchDuration,
          created_at: new Date()
        })
        .execute();

      // Update user rating using SQL expressions
      await db
        .updateTable('users')
        .set({
          current_rating: newRating,
          peak_rating: db.fn('GREATEST', ['peak_rating', newRating]),
          games_played: sql`COALESCE(games_played, 0) + 1`,
          games_won: isWinner ? sql`COALESCE(games_won, 0) + 1` : sql`COALESCE(games_won, 0)`,
          updated_at: new Date()
        })
        .where('id', '=', player.playerId)
        .execute();
    }

    console.log(`✅ Match ${sessionId} forfeited by ${userId}, winner: ${winnerId}`);

    return res.json({
      status: 'success',
      success: true,
      data: {
        sessionId,
        forfeited: true,
        winner: winnerId,
        message: 'Match forfeited successfully'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Forfeit match error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to forfeit match',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get match details
 * GET /api/matches/:sessionId
 */
router.get('/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required',
        data: null
      } as ApiResponse);
    }

    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    // Check if user has access to this session
    const players = session.players as any[];
    const userInSession = players.some(p => p.playerId === userId);

    if (!userInSession) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'Access denied',
        data: null
      } as ApiResponse);
    }

    return res.json({
      status: 'success',
      success: true,
      data: {
        sessionId: session.id,
        gameMode: session.game_mode,
        status: session.status,
        players: players,
        gameState: session.game_state,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get match details error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get match details',
      data: null
    } as ApiResponse);
  }
});

export default router;
