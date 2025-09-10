/**
 * Guest authentication routes
 * Handles lazy registration, guest login, and conversion
 */

import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';
import { verifyIdToken } from '../config/firebase';
import { db, withRetry } from '../database/kysely';
import {
  generateGuestCredentials,
  hashGuestSecret,
  verifyGuestSecret,
  generateGuestJWT,
  generateGuestUsername
} from '../utils/guestAuth';
import { NewOfflineAction } from '../database/types';

const router = Router();

/**
 * POST /api/guest/create
 * Create immediate online guest account (online-first flow)
 * Different from register-and-sync which handles offline→online migration
 */
router.post('/create', authRateLimiter, asyncHandler(async (req, res) => {
  const { username, deviceId } = req.body;

  // Generate guest credentials
  const guestCredentials = generateGuestCredentials();
  const guestSecretHash = await hashGuestSecret(guestCredentials.guestSecret);
  const guestUsername = username || generateGuestUsername(guestCredentials.guestId);

  // Check if guest already exists (prevent duplicates)
  const existingGuest = await db
    .selectFrom('users')
    .select('id')
    .where('guest_id', '=', guestCredentials.guestId)
    .executeTakeFirst();

  if (existingGuest) {
    return res.status(409).json({
      error: 'GUEST_EXISTS',
      message: 'Guest account already exists'
    });
  }

  // Create guest account in transaction
  const result = await withRetry(async () => {
    return await db.transaction().execute(async (trx) => {
    // Create guest user account
    const userData = {
      guest_id: guestCredentials.guestId,
      guest_secret_hash: guestSecretHash,
      username: guestUsername,
      email: `${guestCredentials.guestId}@guest.local`, // Placeholder email
      email_verified: false,
      eco_credits: 100, // Starting currency
      xp_points: 0,
      last_reward_claimed_at: null,
      is_guest: true,
      needs_registration: false,
      account_type: 'guest',
      firebase_uid: null,
      display_name: guestUsername,
      avatar_url: null,
      level: 1,
      experience: 0,
      title: null,
      gems: 0,
      coins: 100, // Starting currency
      dust: 0,
      games_played: 0,
      games_won: 0,
      cards_collected: 0,
      packs_opened: 0,
      preferences: null,
      last_login_at: null,
      is_active: true,
      is_banned: false,
      ban_reason: null,
      // Missing required fields
      is_public_profile: false,
      email_notifications: false,
      push_notifications: false
    };

    const users = await trx
      .insertInto('users')
      .values(userData)
      .returning(['id', 'username', 'guest_id', 'coins', 'gems', 'dust'])
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Failed to create guest user');
    }

    // Create device sync state for offline sync if deviceId provided
    if (deviceId) {
      const signingKey = crypto.randomBytes(32).toString('hex');
      const keyExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await trx
        .insertInto('device_sync_states')
        .values({
          device_id: deviceId,
          user_id: user.id,
          signing_key: signingKey,
          key_expires_at: keyExpiresAt,
          last_sync_timestamp: 0,
          last_used_at: new Date()
        })
        .execute();
    }

    return user;
    });
  });

  // Generate JWT for immediate use
  const guestJWT = generateGuestJWT(result.id, guestCredentials.guestId);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: result.id,
        username: result.username,
        guestId: result.guest_id,
        user_type: 'GUEST',
        is_guest: true,
        coins: result.coins,
        gems: result.gems,
        dust: result.dust
      }
    },
    auth: {
      guestSecret: guestCredentials.guestSecret,
      token: guestJWT,
      expiresIn: '7d'
    }
  });
  return;
}));

/**
 * POST /api/guest/register-and-sync
 * Lazy registration endpoint for first-time guest sync (offline→online flow)
 */
router.post('/register-and-sync', authRateLimiter, asyncHandler(async (req, res) => {
  const { guestId, initialUsername, actionQueue, deviceId } = req.body;

  // Validate input
  if (!guestId || !Array.isArray(actionQueue)) {
    return res.status(400).json({
      error: 'INVALID_DATA',
      message: 'guestId and actionQueue are required'
    });
  }

  // Check if guest already exists (prevent replay attacks)
  const existingGuest = await withRetry(async () => {
    return await db
      .selectFrom('users')
      .select('id')
      .where('guest_id', '=', guestId)
      .executeTakeFirst();
  });

  if (existingGuest) {
    return res.status(409).json({
      error: 'GUEST_EXISTS',
      message: 'Guest account already exists'
    });
  }

  // Generate guest credentials
  const guestSecret = generateGuestCredentials().guestSecret;
  const guestSecretHash = await hashGuestSecret(guestSecret);
  const username = initialUsername || generateGuestUsername(guestId);

  // Create guest account and process action queue in transaction
  const result = await withRetry(async () => {
    return await db.transaction().execute(async (trx) => {
    // 1. Create guest user account
    const userData = {
      guest_id: guestId,
      guest_secret_hash: guestSecretHash,
      username,
      email: `${guestId}@guest.local`, // Placeholder email
      email_verified: false,
      eco_credits: 100, // Starting currency
      xp_points: 0,
      last_reward_claimed_at: null,
      is_guest: true,
      needs_registration: false,
      account_type: 'guest',
      firebase_uid: null,
      display_name: username,
      avatar_url: null,
      level: 1,
      experience: 0,
      title: null,
      gems: 0,
      coins: 100, // Starting currency
      dust: 0,
      games_played: 0,
      games_won: 0,
      cards_collected: 0,
      packs_opened: 0,
      preferences: null,
      last_login_at: null,
      is_active: true,
      is_banned: false,
      ban_reason: null,
      // Missing required fields
      is_public_profile: false,
      email_notifications: false,
      push_notifications: false
    };

    const users = await trx
      .insertInto('users')
      .values(userData)
      .returning(['id', 'username', 'guest_id', 'coins', 'gems', 'dust'])
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Failed to create guest user');
    }

    // 2. Process offline action queue
    let processedActions = 0;
    const errors: string[] = [];

    for (const action of actionQueue) {
      try {
        // Store action in queue for processing
        const actionData: NewOfflineAction = {
          user_id: user.id,
          device_id: deviceId || 'unknown',
          action_type: action.action || 'unknown',
          action_payload: JSON.stringify(action.payload || {}),
          action_signature: action.signature || null, // NULL for unsigned actions
          client_timestamp: action.timestamp || Date.now(),
          is_processed: false,
          processing_error: null
        };

        await trx
          .insertInto('offline_action_queue')
          .values(actionData)
          .execute();

        // TODO: Process the action based on type
        // For now, just mark as processed
        processedActions++;
      } catch (error) {
        console.error('Error processing action:', error);
        errors.push(`Action ${action.action}: ${error}`);
      }
    }

    // 3. Create or update device sync state for offline sync
    if (deviceId) {
      const signingKey = crypto.randomBytes(32).toString('hex');
      const keyExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await trx
        .insertInto('device_sync_states')
        .values({
          device_id: deviceId,
          user_id: user.id,
          signing_key: signingKey,
          key_expires_at: keyExpiresAt,
          last_sync_timestamp: 0,
          last_used_at: new Date()
        })
        .onConflict((oc) => oc
          .columns(['device_id', 'user_id'])
          .doUpdateSet({
            signing_key: signingKey,
            key_expires_at: keyExpiresAt,
            last_sync_timestamp: 0,
            last_used_at: new Date(),
            updated_at: new Date()
          })
        )
        .execute();

      console.log('✅ Device sync state created/updated for device:', deviceId);
    }

    return { user, processedActions, errors };
  });
  });

  // Generate JWT for immediate use
  const guestJWT = generateGuestJWT(result.user.id, guestId);

  res.status(201).json({
    success: true,
    message: 'Guest account created and synced successfully',
    user: {
      id: result.user.id,
      username: result.user.username,
      guestId: result.user.guest_id,
      coins: result.user.coins,
      gems: result.user.gems,
      dust: result.user.dust
    },
    auth: {
      guestSecret,
      token: guestJWT,
      expiresIn: '7d'
    },
    sync: {
      actionsProcessed: result.processedActions,
      errors: result.errors
    }
  });
  return;
}));

/**
 * POST /api/guest/login
 * Login existing guest account
 */
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const { guestId, guestSecret } = req.body;

  if (!guestId || !guestSecret) {
    return res.status(400).json({
      error: 'INVALID_CREDENTIALS',
      message: 'guestId and guestSecret are required'
    });
  }

  // Find guest user
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('guest_id', '=', guestId)
    .where('is_guest', '=', true)
    .executeTakeFirst();

  if (!user) {
    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid guest credentials'
    });
  }

  if (!user.is_active) {
    return res.status(401).json({
      error: 'ACCOUNT_INACTIVE',
      message: 'Guest account is inactive'
    });
  }

  // Verify guest secret
  if (!user.guest_secret_hash || !await verifyGuestSecret(guestSecret, user.guest_secret_hash)) {
    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid guest credentials'
    });
  }

  // Update last login
  await withRetry(async () => {
    return await db
      .updateTable('users')
      .set({ last_login_at: new Date() })
      .where('id', '=', user.id)
      .execute();
  });

  // Generate new JWT
  const guestJWT = generateGuestJWT(user.id, guestId);

  res.json({
    success: true,
    message: 'Guest login successful',
    user: {
      id: user.id,
      username: user.username,
      guestId: user.guest_id,
      coins: user.coins,
      gems: user.gems,
      dust: user.dust,
      level: user.level,
      experience: user.experience
    },
    auth: {
      token: guestJWT,
      expiresIn: '7d'
    }
  });
  return;
}));

/**
 * POST /api/guest/convert
 * Convert guest account to registered Firebase account
 */
router.post('/convert', requireAuth, asyncHandler(async (req, res) => {
  const guestUser = req.user!;
  const { firebaseToken } = req.body;

  // Verify this is a guest account
  if (!guestUser.is_guest || !req.isGuestAuth) {
    return res.status(400).json({
      error: 'NOT_GUEST',
      message: 'Account is not a guest account'
    });
  }

  // Security check: Ensure guest account hasn't already been converted
  if (guestUser.firebase_uid) {
    return res.status(409).json({
      error: 'ALREADY_CONVERTED',
      message: 'This guest account has already been converted.'
    });
  }

  // Verify Firebase token from request body
  if (!firebaseToken) {
    return res.status(400).json({
      error: 'FIREBASE_TOKEN_REQUIRED',
      message: 'Firebase token is required for account conversion'
    });
  }

  let firebaseUser;
  try {
    const decodedToken = await verifyIdToken(firebaseToken);
    firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };
  } catch (error) {
    return res.status(400).json({
      error: 'INVALID_FIREBASE_TOKEN',
      message: 'Invalid Firebase token'
    });
  }

  // Check if Firebase user already has an account
  const existingUser = await db
    .selectFrom('users')
    .select('id')
    .where('firebase_uid', '=', firebaseUser.uid)
    .executeTakeFirst();

  if (existingUser) {
    return res.status(409).json({
      error: 'FIREBASE_USER_EXISTS',
      message: 'Firebase user already has an account'
    });
  }

  // Convert guest to registered account
  await withRetry(async () => {
    return await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('users')
      .set({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || guestUser.email,
        email_verified: firebaseUser.email_verified || false,
        is_guest: false,
        account_type: 'registered',
        guest_secret_hash: null, // Clear guest credentials
        updated_at: new Date()
      })
      .where('id', '=', guestUser.id)
      .execute();
    });
  });

  res.json({
    success: true,
    message: 'Guest account converted to registered account successfully',
    data: {
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: firebaseUser.email,
        user_type: 'REGISTERED',
        is_guest: false,
        accountType: 'registered'
      }
    }
  });
  return;
}));

/**
 * GET /api/guest/status
 * Get guest account status
 */
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const guestUser = req.guestUser!;

  res.json({
    authenticated: true,
    isGuest: true,
    user: {
      id: user.id,
      username: user.username,
      guestId: guestUser.guestId,
      accountType: user.account_type,
      coins: user.coins,
      gems: user.gems,
      dust: user.dust,
      level: user.level,
      experience: user.experience,
      lastLogin: user.last_login_at
    }
  });
  return;
}));

export default router;
