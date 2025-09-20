/**
 * Express Request Type Extensions
 * Unified authentication context for cross-platform support
 */

import type {
  DatabaseUser,
  FirebaseUserData,
  GuestJWTPayload,
  AuthenticationContext
} from '@shared/types';

declare global {
  namespace Express {
    interface Request extends AuthenticationContext {
      // Unified authentication context
      user?: DatabaseUser;
      firebaseUser?: FirebaseUserData;
      guestUser?: GuestJWTPayload;
      isGuestAuth?: boolean;
      platform?: 'web' | 'ios' | 'android';
      isOffline?: boolean;
    }
  }
}

// ============================================================================
// LEGACY TYPES (MARKED FOR REMOVAL)
// ============================================================================



export {};
