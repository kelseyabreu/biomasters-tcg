import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { authRateLimiter, accountCreationRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
import { NewUser, NewTransaction } from '../database/types';
// import { getFirebaseUser } from '../config/firebase'; // Unused for now
import { CacheManager } from '../config/redis';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user or sync existing Firebase user with database
 */
router.post('/register', authRateLimiter, accountCreationRateLimiter, authenticateToken, asyncHandler(async (req, res) => {
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
      error: 'USERNAME_TAKEN',
      message: 'Username is already taken'
    });
  }

  // Create user in database with transaction
  const result = await db.transaction().execute(async (trx) => {
    // Create user
    const userData: NewUser = {
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
      account_type: 'registered',
      is_guest: false,
      needs_registration: false,
      // Profile defaults
      display_name: username,
      avatar_url: null,
      level: 1,
      experience: 0,
      title: null,
      gems: 0,
      coins: 0,
      dust: 0,
      // Game statistics defaults
      games_played: 0,
      games_won: 0,
      cards_collected: 0,
      packs_opened: 0,
      // Metadata defaults
      preferences: null,
      last_login_at: null,
      // Missing required fields
      is_public_profile: false,
      email_notifications: true,
      push_notifications: true
    };

    const users = await trx
      .insertInto('users')
      .values(userData)
      .returning(['id', 'username', 'email', 'eco_credits', 'xp_points', 'created_at'])
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

  // Cache the new user
  const cacheKey = `user:${firebaseUid}`;
  await CacheManager.set(cacheKey, result, 300);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
      id: result.id,
      username: result.username,
      email: result.email,
      eco_credits: result.eco_credits,
      xp_points: result.xp_points,
      created_at: result.created_at
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
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      eco_credits: user.eco_credits,
      xp_points: user.xp_points,
      created_at: user.created_at
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
  const updateData: any = {};
  if (displayName !== undefined) updateData.display_name = displayName;
  if (preferences !== undefined) updateData.preferences = JSON.stringify(preferences);

  const updatedUser = await db
    .updateTable('users')
    .set(updateData)
    .where('firebase_uid', '=', firebaseUser.uid)
    .returning(['id', 'username', 'email', 'display_name', 'preferences'])
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
    user: updatedUser
  });
  return;
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

  console.log('🔑 Generating offline key for device registration:', {
    device_id,
    user_id: req.user!.id
  });

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

  console.log('✅ Device registered for offline sync:', {
    device_id,
    user_id: req.user!.id,
    key_expires_at: expiresAt
  });

  res.json({
    signing_key: signingKey,
    expires_at: expiresAt.toISOString(),
    device_id
  });
}));

export default router;
