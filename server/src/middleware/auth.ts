import { Request, Response, NextFunction } from 'express';
import { verifyIdToken, getFirebaseUser } from '../config/firebase';
import { db } from '../database/kysely';
import { User } from '../database/types';
import { CacheManager } from '../config/redis';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: User;
      firebaseUser?: {
        uid: string;
        email?: string;
        email_verified?: boolean;
      };
    }
  }
}

/**
 * Authentication middleware that verifies Firebase ID tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
      return;
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(token);
    
    // Note: Firebase user data is already available in decodedToken
    // const firebaseUser = await getFirebaseUser(decodedToken.uid);

    // Attach Firebase user to request
    req.firebaseUser = {
      uid: decodedToken.uid,
      ...(decodedToken.email && { email: decodedToken.email }),
      ...(decodedToken.email_verified !== undefined && { email_verified: decodedToken.email_verified })
    };

    // Check cache for user data first
    const cacheKey = `user:${decodedToken.uid}`;
    let dbUser = await CacheManager.get(cacheKey);

    // If not in cache, fetch from database using Kysely
    if (!dbUser) {
      dbUser = await db
        .selectFrom('users')
        .selectAll()
        .where('firebase_uid', '=', decodedToken.uid)
        .executeTakeFirst();

      // Cache user data for 5 minutes
      if (dbUser) {
        await CacheManager.set(cacheKey, dbUser, 300);
      }
    }

    // Attach database user to request if found
    if (dbUser) {
      req.user = {
        ...dbUser,
        uid: decodedToken.uid,
        // Set default values for properties that might not be in the database yet
        email_verified: dbUser.email_verified ?? (decodedToken.email_verified || false),
        is_active: dbUser.is_active ?? true,
        is_banned: dbUser.is_banned ?? false,
        ban_reason: dbUser.ban_reason ?? null,
        account_type: dbUser.account_type ?? 'user',
        dbUser: {
          ...dbUser,
          email_verified: dbUser.email_verified ?? (decodedToken.email_verified || false),
          is_active: dbUser.is_active ?? true,
          is_banned: dbUser.is_banned ?? false,
          ban_reason: dbUser.ban_reason ?? null,
          account_type: dbUser.account_type ?? 'user'
        },
        firebaseUser: {
          uid: decodedToken.uid,
          email: decodedToken.email || undefined,
          email_verified: decodedToken.email_verified || undefined,
          customClaims: {}
        }
      };
    }

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

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
      await authenticateToken(req, res, next);
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

/**
 * Middleware to check if user is admin
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.firebase_uid) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  // Check Firebase custom claims for admin role
  // Get Firebase user to check custom claims
  const firebaseUser = await getFirebaseUser(req.user.firebase_uid);
  const customClaims = firebaseUser?.customClaims || {};
  
  if (!customClaims['admin']) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required'
    });
    return;
  }

  next();
}

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

      // Invalidate user cache to force refresh
      const cacheKey = `user:${req.user.firebase_uid}`;
      await CacheManager.delete(cacheKey);
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

/**
 * Common authentication chains
 */
export const requireAuth = [authenticateToken];
export const requireVerifiedUser = [authenticateToken, requireEmailVerification, requireDatabaseUser, requireActiveAccount];
export const requirePremiumUser = [authenticateToken, requireDatabaseUser, requireActiveAccount, requireAccountType(['premium'])];
export const requireAdminUser = [authenticateToken, requireAdmin];
