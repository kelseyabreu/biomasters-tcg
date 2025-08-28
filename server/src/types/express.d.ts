/**
 * Express Request Type Extensions
 * Extends Express Request interface with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebase_uid: string;
        username: string;
        email: string;
        email_verified: boolean;
        eco_credits: number;
        xp_points: number;
        last_reward_claimed_at: Date | null;
        is_active: boolean;
        is_banned: boolean;
        ban_reason: string | null;
        account_type: string;
        created_at: Date;
        updated_at: Date;
        // Firebase user data
        uid: string;
        // Additional properties for compatibility
        dbUser?: {
          id: string;
          firebase_uid: string;
          username: string;
          email: string;
          email_verified: boolean;
          eco_credits: number;
          xp_points: number;
          last_reward_claimed_at: Date | null;
          is_active: boolean;
          is_banned: boolean;
          ban_reason: string | null;
          account_type: string;
          created_at: Date;
          updated_at: Date;
        };
        firebaseUser?: {
          uid: string;
          email?: string;
          email_verified?: boolean;
          customClaims?: Record<string, any>;
        };
      };
      firebaseUser?: {
        uid: string;
        email?: string;
        email_verified?: boolean;
      };
    }
  }
}

export {};
