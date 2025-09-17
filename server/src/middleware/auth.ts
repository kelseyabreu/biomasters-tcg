import { Request, Response, NextFunction } from 'express';
import { getFirebaseUser } from '../config/firebase';
import { scalableFirebaseAuth } from '../utils/firebase-scaling';
import { verifyGuestJWT, isGuestToken } from '../utils/guestAuth';
import { db } from '../database/kysely';
import { CacheManager } from '../config/redis';
import { adaptDatabaseUserToUnified } from '../database/types';
import type {
  DatabaseUser
} from '../../../shared/types';

// Note: Express Request types are now defined in server/src/types/express.d.ts
// using the unified authentication context

/**
 * The SINGLE unified authentication middleware.
 * It intelligently handles both Firebase and custom Guest JWTs.
 */
async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  console.log('🔐 [AUTH MIDDLEWARE] Authentication middleware called for:', req.method, req.path);
  console.log('🔐 [AUTH MIDDLEWARE] Request headers:', JSON.stringify(req.headers, null, 2));

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('🔐 [AUTH MIDDLEWARE] Authorization header:', authHeader ? 'Present' : 'Missing');
  console.log('🔐 [AUTH MIDDLEWARE] Token extracted:', token ? `Present (${token.substring(0, 50)}...)` : 'Missing');

  if (!token) {
    console.log('🔐 [AUTH MIDDLEWARE] No token provided, continuing without authentication');
    // No token, continue without authentication for public routes
    return next();
  }

  try {
    console.log('🔍 [AUTH MIDDLEWARE] Starting token verification...');

    if (isGuestToken(token)) {
      // --- Handle Guest JWT ---
      console.log('🔍 [AUTH MIDDLEWARE] Detected guest token');
      const guestPayload = verifyGuestJWT(token);
      console.log('🔍 [AUTH MIDDLEWARE] Guest payload:', JSON.stringify(guestPayload, null, 2));
      req.guestUser = guestPayload;
      req.isGuestAuth = true;

      // Fetch guest user from DB using the ID from the trusted JWT
      console.log('🔍 [AUTH MIDDLEWARE] Fetching guest user from database...');
      const guestDbUser = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', guestPayload.userId)
        .executeTakeFirst();

      if (guestDbUser) {
        req.user = adaptDatabaseUserToUnified(guestDbUser);
        console.log('✅ [AUTH MIDDLEWARE] Guest user found and set');
      } else {
        console.log('⚠️ [AUTH MIDDLEWARE] Guest user not found in database');
      }

    } else {
      // --- Handle Firebase JWT ---
      console.log('🔍 [AUTH MIDDLEWARE] Processing Firebase JWT token');
      let decodedToken;

      // In test environment, allow test tokens signed with JWT_SECRET
      if (process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'development') {
        console.log('🔍 [AUTH MIDDLEWARE] Development/test environment - checking for test tokens');
        try {
          const jwt = require('jsonwebtoken');
          const testToken = jwt.verify(token, process.env['JWT_SECRET'] || 'test-secret');
          console.log('🔍 [AUTH MIDDLEWARE] Test token verification result:', JSON.stringify(testToken, null, 2));
          if (testToken && typeof testToken === 'object' && testToken.test_token) {
            // This is a test token, use it directly
            console.log('✅ [AUTH MIDDLEWARE] Using test token');
            decodedToken = testToken;
          } else {
            // Not a test token, try Firebase verification
            console.log('🔍 [AUTH MIDDLEWARE] Not a test token, trying Firebase verification');
            decodedToken = await scalableFirebaseAuth.verifyIdToken(token);
          }
        } catch (testError) {
          // Test token verification failed, try Firebase
          console.log('🔐 [Auth] Test token verification failed, trying Firebase:', (testError as Error).message);
          decodedToken = await scalableFirebaseAuth.verifyIdToken(token);
        }
      } else {
        // Production: only use Firebase verification with scaling
        console.log('🔐 [Auth] Production environment - using scalable Firebase verification');
        decodedToken = await scalableFirebaseAuth.verifyIdToken(token);
      }

      console.log('✅ [AUTH MIDDLEWARE] Token decoded successfully, UID:', decodedToken.uid);
      console.log('🔍 [AUTH MIDDLEWARE] Decoded token details:', JSON.stringify(decodedToken, null, 2));

      req.firebaseUser = {
        uid: decodedToken.uid,
        ...(decodedToken.email && { email: decodedToken.email }),
        ...(decodedToken.email_verified !== undefined && { email_verified: decodedToken.email_verified })
      };
      req.isGuestAuth = false;
      console.log('🔍 [AUTH MIDDLEWARE] Firebase user set on request:', JSON.stringify(req.firebaseUser, null, 2));

      // Check cache first (skip in test environment if Redis not available)
      const cacheKey = `user:${decodedToken.uid}`;
      let dbUser: DatabaseUser | null = null;

      console.log('🔍 [AUTH MIDDLEWARE] Checking cache for user:', cacheKey);
      try {
        dbUser = await CacheManager.get<DatabaseUser>(cacheKey);
        console.log('🔍 [AUTH MIDDLEWARE] Cache result:', dbUser ? 'User found in cache' : 'User not in cache');
      } catch (cacheError) {
        console.log('⚠️ [AUTH MIDDLEWARE] Cache error:', (cacheError as Error).message);
        if (process.env['NODE_ENV'] === 'test') {
          dbUser = null;
        } else {
          throw cacheError;
        }
      }

      if (!dbUser) {
        console.log('🔍 [AUTH MIDDLEWARE] Fetching user from database by firebase_uid:', decodedToken.uid);
        const fetchedUser = await db
          .selectFrom('users')
          .selectAll()
          .where('firebase_uid', '=', decodedToken.uid)
          .executeTakeFirst();

        if (fetchedUser) {
          dbUser = adaptDatabaseUserToUnified(fetchedUser);
          try {
            await CacheManager.set(cacheKey, dbUser, 300); // Cache for 5 mins
          } catch (cacheError) {
            if (process.env['NODE_ENV'] !== 'test') {
              throw cacheError;
            }
          }
        }
      }

      if (dbUser) {
        console.log('🔐 [Auth] User found in database:', dbUser.username);
        req.user = dbUser;
      } else {
        console.log('🔐 [Auth] User not found in database for Firebase UID:', decodedToken.uid);
      }
    }
  } catch (error) {
    console.log('🔐 [Auth] Authentication failed:', (error as Error).message);
    // If token is invalid/expired, we just clear any auth info and continue.
    // Routes that require auth will handle the rejection.
    delete req.user;
    delete req.firebaseUser;
    delete req.guestUser;
    req.isGuestAuth = false;
  }

  return next();
}

// --- EXPORTABLE MIDDLEWARE CHAIN ---

/**
 * Use this for any route that requires a user to be logged in (either guest or registered).
 */
export const requireAuth = [
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    console.log('🔐 [Auth] Checking if user is authenticated...');
    console.log('🔐 [Auth] req.user:', req.user ? `Present (${req.user.username})` : 'Missing');
    console.log('🔐 [Auth] req.firebaseUser:', req.firebaseUser ? `Present (${req.firebaseUser.uid})` : 'Missing');

    if (!req.user) {
      console.log('🔐 [Auth] Authentication required - no user found');
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this resource.'
      });
      return;
    }
    console.log('🔐 [Auth] Authentication successful, proceeding...');
    next();
  }
];

/**
 * Use this for routes that require a FULLY REGISTERED (Firebase) user.
 */
export const requireRegisteredUser = [
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.isGuestAuth) {
      res.status(403).json({
        error: 'REGISTRATION_REQUIRED',
        message: 'This action requires a registered account.'
      });
      return;
    }
    // Check email verification - in test mode, also check Firebase token
    const isEmailVerified = req.user.email_verified ||
      (process.env['NODE_ENV'] === 'test' && req.firebaseUser?.email_verified);

    if (!isEmailVerified) {
      res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address.'
      });
      return;
    }
    next();
  }
];

/**
 * Use this for routes that require admin privileges.
 */
export const requireAdmin = [
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.isGuestAuth) {
      res.status(403).json({
        error: 'ADMIN_ACCESS_REQUIRED',
        message: 'Admin access required.'
      });
      return;
    }

    if (!req.user.email_verified) {
      res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address.'
      });
      return;
    }

    // Check Firebase custom claims for admin role
    if (req.firebaseUser?.uid) {
      try {
        const firebaseUser = await getFirebaseUser(req.firebaseUser.uid);
        const customClaims = firebaseUser.customClaims || {};

        if (customClaims['admin'] === true || customClaims['role'] === 'admin') {
          next();
          return;
        }
      } catch (error) {
        console.error('Error checking admin claims:', error);
      }
    }

    res.status(403).json({
      error: 'INSUFFICIENT_PRIVILEGES',
      message: 'Admin privileges required.'
    });
  }
];

/**
 * Use this for routes that require a valid Firebase token but don't require the user to exist in database yet
 * (e.g., registration endpoints)
 */
export const requireFirebaseAuth = [
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.firebaseUser) {
      res.status(401).json({
        error: 'FIREBASE_AUTH_REQUIRED',
        message: 'Valid Firebase authentication required.'
      });
      return;
    }
    next();
  }
];

/**
 * Legacy export for backward compatibility - use requireAuth instead
 * @deprecated Use requireAuth instead
 */
export const authenticateToken = requireAuth;

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // If token is provided, verify it
      await authenticate(req, res, next);
    } else {
      // If no token, continue without user data
      next();
    }
  } catch (error) {
    // If token verification fails, continue without user data
    console.warn('⚠️ Optional auth failed:', error);
    next();
  }
}

/**
 * Middleware to require email verification
 */
export function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      error: 'Email Not Verified',
      message: 'Please verify your email address to access this feature'
    });
    return;
  }

  next();
}

/**
 * Middleware to check if user exists in database
 */
export function requireDatabaseUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  if (!req.user.id) {
    res.status(404).json({
      error: 'User Not Found',
      message: 'User profile not found. Please complete registration.'
    });
    return;
  }

  next();
}

/**
 * Middleware to check user account status
 */
export function requireActiveAccount(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.id) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User profile required'
    });
    return;
  }

  const user = req.user;

  if (!user.is_active) {
    res.status(403).json({
      error: 'Account Inactive',
      message: 'Your account has been deactivated'
    });
    return;
  }

  if (user.is_banned) {
    res.status(403).json({
      error: 'Account Banned',
      message: user.ban_reason || 'Your account has been banned'
    });
    return;
  }

  next();
}

/**
 * Middleware to check user account type
 */
export function requireAccountType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User profile required'
      });
      return;
    }

    const userAccountType = req.user.account_type || 'user';

    if (!allowedTypes.includes(userAccountType)) {
      res.status(403).json({
        error: 'Insufficient Privileges',
        message: `This feature requires ${allowedTypes.join(' or ')} account`
      });
      return;
    }

    next();
  };
}

// Duplicate requireAdmin function removed - using the middleware array version above

/**
 * Middleware to validate user owns resource
 */
export function requireResourceOwnership(userIdField: string = 'user_id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    // Get resource user ID from request params, body, or query
    const resourceUserId = req.params[userIdField] || 
                          req.body[userIdField] || 
                          req.query[userIdField];

    if (!resourceUserId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Resource user ID not provided'
      });
      return;
    }

    // Check if user owns the resource or is admin
    const isOwner = req.user.id === resourceUserId;
    // Get Firebase user to check custom claims
    const firebaseUser = req.user.firebase_uid ? await getFirebaseUser(req.user.firebase_uid) : null;
    const isAdmin = firebaseUser?.customClaims?.['admin'];

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources'
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to log user activity
 */
export async function logUserActivity(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.id) {
    try {
      // Update last activity timestamp using Kysely
      await db
        .updateTable('users')
        .set({ updated_at: new Date() })
        .where('id', '=', req.user.id)
        .execute();

      // Invalidate user cache to force refresh (only for Firebase users)
      if (req.user.firebase_uid) {
        const cacheKey = `user:${req.user.firebase_uid}`;
        await CacheManager.delete(cacheKey);
      }
    } catch (error) {
      console.error('❌ Failed to log user activity:', error);
      // Don't fail the request if logging fails
    }
  }

  next();
}

/**
 * Create a combined authentication middleware chain
 */
export function createAuthChain(...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
  return [authenticateToken, ...middlewares];
}

// Legacy exports removed - using new unified authentication system above
