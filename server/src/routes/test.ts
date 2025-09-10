import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { CacheManager } from '../config/redis';

const router = Router();

/**
 * DELETE /api/test/cleanup
 * Clean up test data (only available in test/development environments)
 */
router.delete('/cleanup', asyncHandler(async (req, res): Promise<any> => {
  // Only allow in test/development environments
  if (process.env['NODE_ENV'] === 'production') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Test cleanup not allowed in production'
    });
  }

  const { testRun, userPattern } = req.body;

  console.log(`🧹 Starting test cleanup for: ${testRun || 'all test data'}`);

  try {
    let deletedUsers = 0;

    // Define patterns for test users
    const testPatterns = [
      'test@example.com',
      'playwright@test.com',
      'e2e-test-%',
      'test-user-%',
      'converted@example.com',
      'profile@example.com',
      'network@example.com'
    ];

    // Add custom pattern if provided
    if (userPattern) {
      testPatterns.push(userPattern);
    }

    // Start database transaction for atomic cleanup
    await db.transaction().execute(async (trx) => {
      for (const pattern of testPatterns) {
        console.log(`🔍 Cleaning up users matching pattern: ${pattern}`);

        // Find users matching the pattern
        let query = trx
          .selectFrom('users')
          .select(['id', 'username', 'email', 'firebase_uid']);

        if (pattern.includes('%')) {
          query = query.where('email', 'like', pattern);
        } else {
          query = query.where('email', '=', pattern);
        }

        const usersToDelete = await query.execute();

        for (const user of usersToDelete) {
          console.log(`🗑️ Deleting test user: ${user.email}`);

          // Delete from tables that don't have CASCADE DELETE
          await trx
            .updateTable('redemption_codes')
            .set({ redeemed_by_user_id: null })
            .where('redeemed_by_user_id', '=', user.id)
            .execute();

          await trx
            .deleteFrom('device_sync_states')
            .where('user_id', '=', user.id)
            .execute();

          await trx
            .deleteFrom('sync_actions_log')
            .where('user_id', '=', user.id)
            .execute();

          await trx
            .deleteFrom('offline_action_queue')
            .where('user_id', '=', user.id)
            .execute();

          await trx
            .deleteFrom('game_sessions')
            .where('host_user_id', '=', user.id)
            .execute();

          // Delete the user (CASCADE will handle related tables)
          await trx
            .deleteFrom('users')
            .where('id', '=', user.id)
            .execute();

          // Clear cache
          if (user.firebase_uid) {
            const cacheKey = `user:${user.firebase_uid}`;
            await CacheManager.delete(cacheKey);
          }

          deletedUsers++;
        }
      }
    });

    console.log(`✅ Test cleanup completed. Deleted ${deletedUsers} test users.`);

    res.json({
      success: true,
      message: 'Test cleanup completed successfully',
      data: {
        deletedUsers,
        cleanupTime: new Date().toISOString(),
        testRun: testRun || 'general-cleanup'
      }
    });

  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'CLEANUP_FAILED',
      message: error instanceof Error ? error.message : 'Test cleanup failed'
    });
  }
}));

/**
 * POST /api/test/create-user
 * Create a test user (only available in test/development environments)
 */
router.post('/create-user', asyncHandler(async (req, res): Promise<any> => {
  // Only allow in test/development environments
  if (process.env['NODE_ENV'] === 'production') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Test user creation not allowed in production'
    });
  }

  const { email, username, displayName, isGuest = false, firebaseUid } = req.body;

  if (!email || !username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Email and username are required'
    });
  }

  try {
    const userData: any = {
      firebase_uid: isGuest ? null : (firebaseUid || `test-${Date.now()}`),
      username,
      email,
      email_verified: !isGuest,
      display_name: displayName || username,
      is_guest: isGuest,
      account_type: isGuest ? 'guest' : 'registered',
      needs_registration: false,
      eco_credits: 100,
      xp_points: 0,
      is_active: true,
      is_banned: false,
      level: 1,
      experience: 0,
      gems: 0,
      coins: 100,
      dust: 0,
      games_played: 0,
      games_won: 0,
      cards_collected: 0,
      packs_opened: 0,
      is_public_profile: true,
      email_notifications: true,
      push_notifications: true,
      preferences: JSON.stringify({})
    };

    if (isGuest) {
      userData.guest_id = `guest-${Date.now()}`;
      userData.guest_secret_hash = 'test-hash';
    }

    const user = await db
      .insertInto('users')
      .values(userData)
      .returning(['id', 'username', 'email', 'firebase_uid', 'is_guest'])
      .executeTakeFirst();

    if (!user) {
      throw new Error('Failed to create test user');
    }

    console.log(`✅ Created test user: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firebaseUid: user.firebase_uid,
          isGuest: user.is_guest
        }
      }
    });

  } catch (error) {
    console.error('❌ Test user creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'USER_CREATION_FAILED',
      message: error instanceof Error ? error.message : 'Test user creation failed'
    });
  }
}));

export default router;
