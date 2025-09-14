/**
 * Quest System Routes
 * Handles daily quests, progress tracking, and reward claiming
 */

import express, { Request, Response } from 'express';
import { sql } from 'kysely';
import { authenticateToken } from '../middleware/auth';
import { db } from '../database/kysely';
import { ApiResponse } from '../../../shared/types';

const router = express.Router();

// ============================================================================
// DAILY QUEST MANAGEMENT
// ============================================================================

/**
 * Get all quests for current user
 * GET /api/quests/user
 */
router.get('/user', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📋 Getting all quests for user: ${userId}`);

    // Get all active quests for the user
    const quests = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('quest_date', 'desc')
      .execute();

    console.log(`📋 Found ${quests.length} quests for user`);

    return res.json({
      status: 'success',
      success: true,
      data: quests.map((quest: any) => ({
        id: quest.id,
        type: quest.quest_type,
        target: quest.target_progress,
        progress: quest.progress,
        status: quest.is_completed ? 'completed' : 'active',
        reward: null, // Will need to join with quest definitions for rewards
        createdAt: quest.quest_date,
        completedAt: quest.completed_at
      }))
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Error getting user quests:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get daily quests for user
 * GET /api/quests/daily
 */
router.get('/daily', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

    console.log(`📋 Getting daily quests for user ${userId} (${today})`);

    // Get user's quest progress for today
    const userProgress = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .where('quest_date', '=', today)
      .execute();

    // Get all available daily quest definitions
    const questDefinitions = await db
      .selectFrom('daily_quest_definitions')
      .selectAll()
      .where('is_active', '=', true)
      .execute();

    // Combine definitions with user progress
    const dailyQuests: Record<string, any> = {};

    for (const definition of questDefinitions) {
      const progress = userProgress.find(p => p.quest_type === definition.quest_type);

      // Safely parse JSON with fallbacks
      let targetCriteria;
      let rewards;
      let progressData;

      // Handle JSONB fields that might be objects or strings
      if (typeof definition.requirements === 'object') {
        targetCriteria = definition.requirements || { count: 1 };
      } else {
        try {
          targetCriteria = definition.requirements ? JSON.parse(definition.requirements) : { count: 1 };
        } catch (e) {
          console.warn(`⚠️ Invalid requirements JSON for quest ${definition.quest_type}`);
          targetCriteria = { count: 1 };
        }
      }

      if (typeof definition.rewards === 'object') {
        rewards = definition.rewards || { eco_credits: 50 };
      } else {
        try {
          rewards = definition.rewards ? JSON.parse(definition.rewards) : { eco_credits: 50 };
        } catch (e) {
          console.warn(`⚠️ Invalid rewards JSON for quest ${definition.quest_type}`);
          rewards = { eco_credits: 50 };
        }
      }

      if (typeof progress?.progress === 'object') {
        progressData = progress.progress || { count: 0 };
      } else {
        try {
          progressData = progress?.progress ? JSON.parse(progress.progress) : { count: 0 };
        } catch (e) {
          console.warn(`⚠️ Invalid progress JSON for quest ${definition.quest_type}`);
          progressData = { count: 0 };
        }
      }

      dailyQuests[definition.quest_type] = {
        progress: progressData,
        target: targetCriteria,
        isCompleted: progress?.is_completed || false,
        isClaimed: progress?.is_claimed || false,
        rewards: rewards
      };
    }

    return res.json({
      status: 'success',
      success: true,
      data: dailyQuests
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get daily quests error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Update quest progress
 * POST /api/quests/progress
 */
router.post('/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { questType, progress } = req.body;
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

    console.log(`📈 Updating quest progress for ${userId}: ${questType}`, progress);

    // Get quest definition
    const questDef = await db
      .selectFrom('daily_quest_definitions')
      .selectAll()
      .where('quest_type', '=', questType)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!questDef) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Invalid quest type',
        data: null
      } as ApiResponse);
    }

    // Get current progress
    const currentProgress = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .where('quest_type', '=', questType)
      .where('quest_date', '=', today)
      .executeTakeFirst();

    const target = typeof questDef.requirements === 'string' ? JSON.parse(questDef.requirements) : questDef.requirements;
    let updatedProgress = progress;

    if (currentProgress) {
      // Merge with existing progress
      const existing = typeof currentProgress.progress === 'object'
        ? currentProgress.progress
        : JSON.parse(currentProgress.progress);
      updatedProgress = { ...existing, ...progress };
    }

    // Check if quest is completed
    const isCompleted = checkQuestCompletion(updatedProgress, target);

    if (currentProgress) {
      // Update existing progress
      await db
        .updateTable('user_daily_progress')
        .set({
          progress: JSON.stringify(updatedProgress),
          is_completed: isCompleted,
          updated_at: new Date()
        })
        .where('user_id', '=', userId)
        .where('quest_type', '=', questType)
        .where('quest_date', '=', today)
        .execute();
    } else {
      // Create new progress entry
      await db
        .insertInto('user_daily_progress')
        .values({
          user_id: userId,
          quest_type: questType,
          quest_date: today,
          progress: JSON.stringify(updatedProgress),
          target_progress: JSON.stringify(target),
          is_completed: isCompleted,
          is_claimed: false,
          created_at: new Date()
        })
        .execute();
    }

    return res.json({
      status: 'success',
      success: true,
      data: {
        questType,
        progress: updatedProgress,
        isCompleted
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Update quest progress error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Claim quest reward
 * POST /api/quests/claim
 */
router.post('/claim', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { questType } = req.body;
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

    console.log(`🎁 User ${userId} claiming reward for quest: ${questType}`);

    // Get quest progress
    const progress = await db
      .selectFrom('user_daily_progress')
      .selectAll()
      .where('user_id', '=', userId)
      .where('quest_type', '=', questType)
      .where('quest_date', '=', today)
      .executeTakeFirst();

    if (!progress) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Quest progress not found',
        data: null
      } as ApiResponse);
    }

    if (!progress.is_completed) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Quest not completed',
        data: null
      } as ApiResponse);
    }

    if (progress.is_claimed) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Reward already claimed',
        data: null
      } as ApiResponse);
    }

    // Get quest definition for rewards
    const questDef = await db
      .selectFrom('daily_quest_definitions')
      .selectAll()
      .where('quest_type', '=', questType)
      .executeTakeFirst();

    if (!questDef) {
      return res.status(500).json({
      status: 'error',
      success: false,
        error: 'Quest definition not found',
        data: null
      } as ApiResponse);
    }

    const rewards = JSON.parse(questDef.rewards);

    // Mark as claimed
    await db
      .updateTable('user_daily_progress')
      .set({
        is_claimed: true,
        claimed_at: new Date(),
        updated_at: new Date()
      })
      .where('user_id', '=', userId)
      .where('quest_type', '=', questType)
      .where('quest_date', '=', today)
      .execute();

    // Apply rewards (this would integrate with existing economy system)
    if (rewards.eco_credits) {
      // TODO: Add eco credits to user account
      console.log(`💰 Awarded ${rewards.eco_credits} eco credits to ${userId}`);
    }

    if (rewards.xp_points) {
      // TODO: Add XP to user account
      console.log(`⭐ Awarded ${rewards.xp_points} XP to ${userId}`);
    }

    // Update user quest stats
    await db
      .updateTable('users')
      .set({
        total_quests_completed: sql`COALESCE(total_quests_completed, 0) + 1`,
        updated_at: new Date()
      })
      .where('id', '=', userId)
      .execute();

    return res.json({
      status: 'success',
      success: true,
      data: {
        questType,
        rewards,
        claimed: true
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Claim quest reward error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Internal server error',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get quest statistics for user
 * GET /api/quests/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await db
      .selectFrom('users')
      .select(['daily_quest_streak', 'total_quests_completed'])
      .where('id', '=', userId)
      .executeTakeFirst();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
    
    // Get today's quest completion status
    const todayQuests = await db
      .selectFrom('user_daily_progress')
      .select(['quest_type', 'is_completed', 'is_claimed'])
      .where('user_id', '=', userId)
      .where('quest_date', '=', today)
      .execute();

    const completedToday = todayQuests.filter(q => q.is_completed).length;
    const claimedToday = todayQuests.filter(q => q.is_claimed).length;

    return res.json({
      status: 'success',
      success: true,
      data: {
        questStreak: user?.daily_quest_streak || 0,
        totalQuestsCompleted: user?.total_quests_completed || 0,
        completedToday,
        claimedToday,
        lastQuestReset: today
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get quest stats error:', error);
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
 * Check if quest is completed based on progress and target
 */
function checkQuestCompletion(progress: any, target: any): boolean {
  if (!progress || !target) return false;
  
  // Simple count-based completion check
  if (typeof target.count === 'number' && typeof progress.count === 'number') {
    return progress.count >= target.count;
  }
  
  // Add more complex completion logic as needed
  return false;
}

export default router;
