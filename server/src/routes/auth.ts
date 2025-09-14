import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, requireFirebaseAuth } from '../middleware/auth';
import { authRateLimiter, accountCreationRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { NewTransaction } from '../database/types';
// import { getFirebaseUser } from '../config/firebase'; // Unused for now
import { CacheManager } from '../config/redis';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user or sync existing Firebase user with database
 */
router.post('/register', authRateLimiter, accountCreationRateLimiter, requireFirebaseAuth, asyncHandler(async (req, res) => {
  const { username } = req.body;
  const firebaseUid = req.firebaseUser?.uid;
  const email = req.firebaseUser?.email;

  // Validate input
  if (!username || username.length < 3 || username.length > 50) {
    return res.status(400).json({
      error: 'INVALID_USERNAME',
      message: 'Username must be between 3 and 50 characters'
    });
  }

  if (!firebaseUid || !email) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Firebase authentication required'
    });
  }

  // Check if user already exists in database
  const existingUser = await db
    .selectFrom('users')
    .select('id')
    .where('firebase_uid', '=', firebaseUid)
    .executeTakeFirst();

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'USER_EXISTS',
      message: 'User already registered'
    });
  }

  // Check if username is taken
  const usernameExists = await db
    .selectFrom('users')
    .select('id')
    .where('username', '=', username)
    .executeTakeFirst();

  if (usernameExists) {
    return res.status(409).json({
      success: false,
      error: 'USERNAME_TAKEN',
      message: 'Username is already taken'
    });
  }

  // Create user in database with transaction
  let result;
  try {
    result = await db.transaction().execute(async (trx) => {
    // Create user
    const userData = {
      firebase_uid: firebaseUid,
      username,
      email,
      email_verified: req.firebaseUser!.email_verified || false,
      eco_credits: 100, // Starting currency
      xp_points: 0,
      last_reward_claimed_at: null,
      is_active: true,
      is_banned: false,
      ban_reason: null,
      account_type: 'registered' as const,
      is_guest: false,
      needs_registration: false,
      // Profile defaults
      display_name: username,
      avatar_url: null,
      level: 1,
      experience: 0,
      title: null,
      gems: 0,
      coins: 100, // Starting coins
      dust: 0,
      // Game statistics defaults
      games_played: 0,
      games_won: 0,
      cards_collected: 0,
      packs_opened: 0,
      // Metadata defaults
      preferences: JSON.stringify({}),
      last_login_at: null,
      // Missing required fields
      is_public_profile: false,
      email_notifications: true,
      push_notifications: true,

      // Online multiplayer defaults
      current_rating: 1000,
      peak_rating: 1000,
      win_streak: 0,

      // Quest system defaults
      daily_quest_streak: 0,
      last_daily_reset: new Date(),
      total_quests_completed: 0
    };

    const users = await trx
      .insertInto('users')
      .values(userData)
      .returning(['id', 'username', 'email', 'display_name', 'eco_credits', 'xp_points', 'created_at'])
      .execute();
    const user = users[0];
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Record initial currency transaction
    const transactionData: NewTransaction = {
      user_id: user.id,
      type: 'reward',
      description: 'Welcome bonus - starting currency',
      eco_credits_change: 100
    };

    await trx
      .insertInto('transactions')
      .values(transactionData)
      .execute();

    return user;
  });

  if (!result) {
    res.status(500).json({
      error: 'Failed to create user',
      message: 'User registration failed'
    });
    return;
  }
  } catch (error) {
    console.error('🚨 REGISTRATION ERROR:', error);
    res.status(500).json({
      error: 'REGISTRATION_FAILED',
      message: error instanceof Error ? error.message : 'User registration failed'
    });
    return;
  }

  // Cache the new user
  const cacheKey = `user:${firebaseUid}`;
  await CacheManager.set(cacheKey, result, 300);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        display_name: result.display_name,
        user_type: 'REGISTERED',
        is_guest: false,
        eco_credits: result.eco_credits,
        xp_points: result.xp_points,
        created_at: result.created_at
      }
    }
  });
  return;
}));

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const firebaseUser = req.firebaseUser!;

  // Get user from database
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('firebase_uid', '=', firebaseUser.uid)
    .executeTakeFirst();

  if (!user) {
    res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        user_type: user.account_type?.toUpperCase() || 'REGISTERED',
        is_guest: user.is_guest,
        eco_credits: user.eco_credits,
        xp_points: user.xp_points,
        created_at: user.created_at
      }
    }
  });
}));



/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { displayName, preferences } = req.body;
  const firebaseUser = req.firebaseUser!;

  // Validate input
  if (displayName && (displayName.length < 1 || displayName.length > 100)) {
    return res.status(400).json({
      error: 'INVALID_DISPLAY_NAME',
      message: 'Display name must be between 1 and 100 characters'
    });
  }

  // Update user in database
  try {
    const updateData: any = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (preferences !== undefined) updateData.preferences = JSON.stringify(preferences);

    const updatedUser = await db
      .updateTable('users')
      .set(updateData)
      .where('firebase_uid', '=', firebaseUser.uid)
      .returning(['id', 'username', 'email', 'display_name', 'preferences', 'account_type'])
      .executeTakeFirst();

  if (!updatedUser) {
    res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        ...updatedUser,
        user_type: updatedUser.account_type?.toUpperCase() || 'REGISTERED',
        is_guest: false
      }
    }
  });
  return;
  } catch (error) {
    console.error('🚨 PROFILE UPDATE ERROR:', error);
    res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Profile update failed'
    });
    return;
  }
}));

/**
 * POST /api/auth/migrate-guest
 * Migrate guest data to registered account
 */
router.post('/migrate-guest', authenticateToken, asyncHandler(async (req, res) => {
  const { guestData } = req.body;
  const firebaseUser = req.firebaseUser!;

  if (!guestData) {
    return res.status(400).json({
      error: 'INVALID_DATA',
      message: 'Guest data is required'
    });
  }

  // Get user from database
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('firebase_uid', '=', firebaseUser.uid)
    .executeTakeFirst();

  if (!user) {
    res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: 'User not found. Please complete registration first.'
    });
    return;
  }

  // Migrate guest data in transaction
  await db.transaction().execute(async (trx) => {
    // Migrate saved decks if any
    if (guestData.savedDecks && Array.isArray(guestData.savedDecks)) {
      for (const deck of guestData.savedDecks) {
        // Check if deck name already exists
        const existingDeck = await trx
          .selectFrom('decks')
          .select('id')
          .where('user_id', '=', user.id)
          .where('name', '=', deck.name)
          .executeTakeFirst();

        if (!existingDeck) {
          await trx
            .insertInto('decks')
            .values({
              user_id: user.id,
              name: deck.name
            })
            .execute();
        }
      }
    }

    // Update user preferences if provided
    if (guestData.gameProgress || guestData.settings) {
      const mergedPreferences = {
        ...(user.preferences ? JSON.parse(user.preferences) : {}),
        ...guestData.gameProgress,
        ...guestData.settings
      };

      await trx
        .updateTable('users')
        .set({
          preferences: JSON.stringify(mergedPreferences)
        })
        .where('id', '=', user.id)
        .execute();
    }
  });

  // Clear user cache
  const cacheKey = `user:${firebaseUser.uid}`;
  await CacheManager.delete(cacheKey);

  res.json({
    message: 'Guest data migrated successfully'
  });
  return;
}));

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.json({
      authenticated: false,
      user: null
    });
  }

  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    res.status(401).json({
      authenticated: false,
      user: null
    });
    return;
  }

  // Check if user exists in database
  const user = await db
    .selectFrom('users')
    .select(['id', 'username', 'display_name', 'account_type', 'email_verified'])
    .where('firebase_uid', '=', firebaseUser.uid)
    .executeTakeFirst();

  res.json({
    authenticated: true,
    emailVerified: firebaseUser.email_verified,
    registrationComplete: !!user,
    user: user ? {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      accountType: user.account_type
    } : null
  });
  return;
}));

/**
 * POST /api/auth/offline-key
 * Generate session-based signing key for offline actions
 */
router.post('/offline-key', authenticateToken, asyncHandler(async (req, res) => {
  const { device_id } = req.body;

  if (!device_id) {
    res.status(400).json({ error: 'device_id is required' });
    return;
  }



  // Generate cryptographically secure signing key
  const signingKey = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store in database with user scoping and last_used_at timestamp
  await db
    .insertInto('device_sync_states')
    .values({
      device_id,
      user_id: req.user!.id,
      signing_key: signingKey,
      key_expires_at: expiresAt,
      last_sync_timestamp: 0,
      last_used_at: new Date()
    })
    .onConflict((oc) => oc
      .columns(['device_id', 'user_id'])
      .doUpdateSet({
        signing_key: signingKey,
        key_expires_at: expiresAt,
        last_used_at: new Date(),
        updated_at: new Date()
      })
    )
    .execute();



  res.json({
    signing_key: signingKey,
    expires_at: expiresAt.toISOString(),
    device_id
  });
}));

/**
 * DELETE /api/auth/account
 * Delete current user's account completely
 * Removes user from Firebase Auth, database, and all related data
 */
router.delete('/account', (req: Request, _res: Response, next: NextFunction) => {
  console.log('🌐 [Route] DELETE /account endpoint hit');
  console.log('🌐 [Route] Headers:', req.headers['authorization'] ? 'Auth header present' : 'No auth header');
  next();
}, authenticateToken, asyncHandler(async (req, res) => {
  const firebaseUser = req.firebaseUser;
  const guestUser = req.guestUser;
  const user = req.user!;

  console.log(`🗑️ Starting account deletion for user: ${user.id}`);
  console.log(`🗑️ User type: ${user.is_guest ? 'Guest' : 'Registered'}`);
  console.log(`🗑️ Firebase UID: ${firebaseUser?.uid || 'N/A'}`);
  console.log(`🗑️ Guest ID: ${guestUser?.guestId || 'N/A'}`);

  // Retry logic for database operations
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔗 Attempting database connection for account deletion (attempt ${attempt}/${maxRetries})...`);

      await db.transaction().execute(async (trx) => {
      console.log('📊 Deleting user data from database...');

      // Get user data for logging before deletion
      const userData = await trx
        .selectFrom('users')
        .select(['id', 'username', 'email', 'firebase_uid', 'is_guest'])
        .where('id', '=', user.id)
        .executeTakeFirst();

      if (!userData) {
        throw new Error('User not found in database');
      }

      // Delete from tables that don't have CASCADE DELETE or need special handling
      console.log('🧹 Cleaning up redemption codes...');
      await trx
        .updateTable('redemption_codes')
        .set({ redeemed_by_user_id: null })
        .where('redeemed_by_user_id', '=', user.id)
        .execute();

      // Delete from device sync states (composite primary key)
      console.log('📱 Cleaning up device sync states...');
      await trx
        .deleteFrom('device_sync_states')
        .where('user_id', '=', user.id)
        .execute();

      // Delete from sync actions log
      console.log('🔄 Cleaning up sync actions log...');
      await trx
        .deleteFrom('sync_actions_log')
        .where('user_id', '=', user.id)
        .execute();

      // Delete from offline action queue
      console.log('📴 Cleaning up offline action queue...');
      await trx
        .deleteFrom('offline_action_queue')
        .where('user_id', '=', user.id)
        .execute();

      // Delete from game sessions where user is host
      console.log('🎮 Cleaning up game sessions...');
      await trx
        .deleteFrom('game_sessions')
        .where('host_user_id', '=', user.id)
        .execute();

      // The following tables have CASCADE DELETE and will be automatically cleaned up:
      // - user_cards (CASCADE DELETE)
      // - user_decks (CASCADE DELETE)
      // - decks (CASCADE DELETE) -> deck_cards (CASCADE DELETE)
      // - transactions (CASCADE DELETE)

      // Finally, delete the user record (this will cascade to remaining tables)
      console.log('👤 Deleting user record...');
      const deletedUser = await trx
        .deleteFrom('users')
        .where('id', '=', user.id)
        .returning(['id', 'username', 'firebase_uid'])
        .executeTakeFirst();

      if (!deletedUser) {
        throw new Error('Failed to delete user from database');
      }

      console.log(`✅ Database deletion completed for user: ${deletedUser.username}`);
    });

    // Clear user cache (only for Firebase users)
    if (firebaseUser?.uid) {
      console.log('🗑️ Clearing user cache...');
      const cacheKey = `user:${firebaseUser.uid}`;
      await CacheManager.delete(cacheKey);
    } else {
      console.log('ℹ️ Skipping cache clear for guest user (no Firebase UID)');
    }

    // Delete from Firebase Auth (only for registered users)
    if (firebaseUser?.uid && !user.is_guest) {
      console.log('🔥 Deleting user from Firebase Auth...');
      const { deleteFirebaseUser } = await import('../config/firebase');
      try {
        await deleteFirebaseUser(firebaseUser.uid);
        console.log('✅ Firebase user deleted successfully');
      } catch (firebaseError: any) {
        console.error('🚨 FIREBASE DELETION FAILED 🚨');
        console.error('🚨 This is likely a Firebase IAM permissions issue');
        console.error('🚨 Error details:', firebaseError.message);

        if (firebaseError.message.includes('serviceusage.serviceUsageConsumer')) {
          console.error('🚨 SOLUTION: Grant the Firebase service account the "Service Usage Consumer" role');
          console.error('🚨 Go to: https://console.developers.google.com/iam-admin/iam/project?project=biomasters-tcg');
          console.error('🚨 Find your firebase-adminsdk service account and add the role: roles/serviceusage.serviceUsageConsumer');
        }

        // Re-throw the error to fail the account deletion
        throw new Error(`Firebase user deletion failed: ${firebaseError.message}`);
      }
    } else {
      console.log('ℹ️ Skipping Firebase deletion for guest user');
    }

    console.log(`🎉 Account deletion completed successfully for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        deletedAt: new Date().toISOString(),
        userId: user.id,
        username: user.username
      }
    });

    // If we reach here, the operation was successful, so break out of retry loop
    return;

    } catch (error) {
      lastError = error;
      console.error(`❌ Account deletion attempt ${attempt} failed:`, (error as Error).message);

      // Check if this is a retryable error (database connection issues)
      const isRetryable = (error as Error).message.includes('Connection terminated') ||
                         (error as Error).message.includes('ECONNRESET') ||
                         (error as Error).message.includes('connection') ||
                         (error as Error).message.includes('timeout') ||
                         (error as Error).message.includes('ETIMEDOUT');

      if (!isRetryable || attempt === maxRetries) {
        // Either not retryable or we've exhausted retries
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  const error = lastError;
  console.error('❌ Account deletion failed:', error);

  // Provide specific error messages based on error type
  let errorMessage = 'Account deletion failed';
  let errorCode = 'ACCOUNT_DELETION_FAILED';

  if (error instanceof Error) {
    // Handle database connection errors specifically
    if (error.message.includes('Connection terminated') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')) {
      errorMessage = 'Database connection error. Please try again in a moment.';
      errorCode = 'DATABASE_CONNECTION_ERROR';
      console.error('🔌 Database connection issue during account deletion');
    } else if (error.message.includes('Firebase') || error.message.includes('serviceusage.serviceUsageConsumer')) {
      console.error('🚨🚨🚨 FIREBASE PERMISSIONS ERROR 🚨🚨🚨');
      console.error('🚨 The Firebase service account needs additional permissions');
      console.error('🚨 Go to: https://console.developers.google.com/iam-admin/iam/project?project=biomasters-tcg');
      console.error('🚨 Add role: roles/serviceusage.serviceUsageConsumer to your firebase-adminsdk service account');
      errorMessage = 'Firebase permissions error: Service account needs "Service Usage Consumer" role';
      errorCode = 'FIREBASE_PERMISSIONS_ERROR';
    } else if (error.message.includes('database')) {
      errorMessage = 'Failed to delete account data. Please try again.';
      errorCode = 'DATABASE_DELETION_FAILED';
    } else {
      errorMessage = error.message;
    }
  }

  res.status(500).json({
    success: false,
    error: errorCode,
    message: errorMessage,
    details: process.env['NODE_ENV'] === 'development' ? error.message : undefined
  });
}));

export default router;
