/**
 * Custom JWT system for guest authentication
 * Separate from Firebase auth to support offline-first guest accounts
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Guest tokens last 7 days
const SALT_ROUNDS = 12;

// Import unified GuestJWTPayload from shared types
import type { GuestJWTPayload } from '@kelseyabreu/shared';

// Legacy type (marked for removal)
export interface GuestJWTPayload_old {
  userId: string;
  guestId: string;
  isGuest: true;
  type: 'guest';
  iat?: number;
  exp?: number;
}

export interface GuestCredentials {
  guestId: string;
  guestSecret: string;
}

/**
 * Generate cryptographically secure guest credentials
 */
export function generateGuestCredentials(): GuestCredentials {
  return {
    guestId: crypto.randomUUID(),
    guestSecret: crypto.randomUUID()
  };
}

/**
 * Hash a guest secret for database storage
 */
export async function hashGuestSecret(guestSecret: string): Promise<string> {
  return bcrypt.hash(guestSecret, SALT_ROUNDS);
}

/**
 * Verify a guest secret against its hash
 */
export async function verifyGuestSecret(guestSecret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(guestSecret, hash);
}

/**
 * Generate a custom JWT for guest authentication
 */
export function generateGuestJWT(userId: string, guestId: string): string {
  const payload: GuestJWTPayload = {
    userId,
    guestId,
    isGuest: true,
    type: 'guest'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'biomasters-tcg',
    audience: 'biomasters-tcg-client'
  });
}

/**
 * Verify and decode a guest JWT
 */
export function verifyGuestJWT(token: string): GuestJWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'biomasters-tcg',
      audience: 'biomasters-tcg-client'
    }) as GuestJWTPayload;

    if (!decoded.isGuest || decoded.type !== 'guest') {
      throw new Error('Invalid guest token');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired guest token');
  }
}

/**
 * Generate auto username for guest accounts
 */
export function generateGuestUsername(guestId: string): string {
  // Take first 6 characters of UUID for readable username
  const shortId = guestId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `Guest-${shortId}`;
}

/**
 * Check if a token is a guest JWT (vs Firebase token)
 */
export function isGuestToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.isGuest === true && decoded?.type === 'guest';
  } catch {
    return false;
  }
}

/**
 * Extract guest ID from JWT without verification (for logging/debugging)
 */
export function extractGuestId(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as GuestJWTPayload;
    return decoded?.guestId || null;
  } catch {
    return null;
  }
}
