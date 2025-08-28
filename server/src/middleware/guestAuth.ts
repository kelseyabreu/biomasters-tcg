/**
 * Guest authentication middleware
 * Handles both Firebase tokens and custom guest JWTs
 */

import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../config/firebase';
import { verifyGuestJWT, isGuestToken, GuestJWTPayload } from '../utils/guestAuth';
import { db } from '../database/kysely';

// Extend Express Request type to include guest user data
declare global {
  namespace Express {
    interface Request {
      guestUser?: GuestJWTPayload;
      isGuestAuth?: boolean;
    }
  }
}

/**
 * Unified authentication middleware that handles both Firebase and guest tokens
 */
export async function authenticateUnified(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
      return;
    }

    // Check if this is a guest JWT or Firebase token
    if (isGuestToken(token)) {
      // Handle guest authentication
      await handleGuestAuth(req, res, next, token);
    } else {
      // Handle Firebase authentication (existing logic)
      await handleFirebaseAuth(req, res, next, token);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Handle guest JWT authentication
 */
async function handleGuestAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): Promise<void> {
  try {
    // Verify the guest JWT
    const guestPayload = verifyGuestJWT(token);
    
    // Get user from database using guest_id
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('guest_id', '=', guestPayload.guestId)
      .where('is_guest', '=', true)
      .executeTakeFirst();

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Guest account not found'
      });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is inactive'
      });
      return;
    }

    // Attach guest user data to request
    req.guestUser = guestPayload;
    req.user = user;
    req.isGuestAuth = true;
    delete req.firebaseUser; // No Firebase user for guests

    next();
  } catch (error) {
    console.error('Guest auth error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid guest token'
    });
  }
}

/**
 * Handle Firebase authentication (existing logic)
 */
async function handleFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string
): Promise<void> {
  try {
    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(token);
    
    // Attach Firebase user to request
    req.firebaseUser = {
      uid: decodedToken.uid,
      ...(decodedToken.email && { email: decodedToken.email }),
      ...(decodedToken.email_verified !== undefined && { email_verified: decodedToken.email_verified })
    };

    // Get user from database using firebase_uid
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('firebase_uid', '=', decodedToken.uid)
      .executeTakeFirst();

    if (user) {
      req.user = user;
    } else {
      delete req.user;
    }
    req.isGuestAuth = false;
    delete req.guestUser;

    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Firebase token'
    });
  }
}

/**
 * Middleware that requires authentication but allows both guest and registered users
 */
export const requireAnyAuth = authenticateUnified;

/**
 * Middleware that requires registered user authentication only
 */
export async function requireRegisteredAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticateUnified(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    if (req.isGuestAuth) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Registered account required'
      });
      return;
    }

    next();
  });
}

/**
 * Middleware that requires guest authentication only
 */
export async function requireGuestAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticateUnified(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    if (!req.isGuestAuth) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Guest account required'
      });
      return;
    }

    next();
  });
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalUnifiedAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    delete req.user;
    delete req.firebaseUser;
    delete req.guestUser;
    req.isGuestAuth = false;
    next();
    return;
  }

  // Try to authenticate if token is provided
  try {
    await authenticateUnified(req, res, next);
  } catch (error) {
    // Authentication failed, but continue without authentication
    delete req.user;
    delete req.firebaseUser;
    delete req.guestUser;
    req.isGuestAuth = false;
    next();
  }
}
