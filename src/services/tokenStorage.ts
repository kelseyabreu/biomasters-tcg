/**
 * Secure Token Storage Service
 * Cross-platform secure storage for authentication tokens and sensitive data
 * 
 * Uses Capacitor Preferences which provides:
 * - iOS: Keychain Services (secure)
 * - Android: EncryptedSharedPreferences (secure)
 * - Web: localStorage (fallback)
 */

import { Preferences } from '@capacitor/preferences';

export interface TokenData {
  token: string;
  expiresAt?: number;
  refreshToken?: string;
}

export interface GuestCredentials {
  guestId: string;
  guestSecret: string;
  guestToken?: string;
}

/**
 * Secure token storage service
 * Abstracts platform-specific secure storage mechanisms
 */
export const tokenStorage = {
  /**
   * Store a value securely
   */
  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error(`❌ Failed to store ${key}:`, error);
      throw new Error(`Failed to store ${key}`);
    }
  },

  /**
   * Retrieve a value securely
   */
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error(`❌ Failed to retrieve ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove a value securely
   */
  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error(`❌ Failed to remove ${key}:`, error);
    }
  },

  /**
   * Clear all stored values (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
    }
  },

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
};

/**
 * Specialized methods for token management
 */
export const tokenManager = {
  // Guest token keys
  GUEST_ID_KEY: 'biomasters_guest_id',
  GUEST_SECRET_KEY: 'biomasters_guest_secret',
  GUEST_TOKEN_KEY: 'biomasters_guest_token',
  
  // Firebase token keys (though Firebase handles this automatically now)
  FIREBASE_TOKEN_KEY: 'biomasters_firebase_token',
  FIREBASE_REFRESH_KEY: 'biomasters_firebase_refresh',

  /**
   * Store guest credentials securely
   */
  async storeGuestCredentials(credentials: GuestCredentials): Promise<void> {
    await Promise.all([
      tokenStorage.set(this.GUEST_ID_KEY, credentials.guestId),
      tokenStorage.set(this.GUEST_SECRET_KEY, credentials.guestSecret),
      ...(credentials.guestToken ? [tokenStorage.set(this.GUEST_TOKEN_KEY, credentials.guestToken)] : [])
    ]);

  },

  /**
   * Retrieve guest credentials
   */
  async getGuestCredentials(): Promise<GuestCredentials | null> {
    try {
      const [guestId, guestSecret, guestToken] = await Promise.all([
        tokenStorage.get(this.GUEST_ID_KEY),
        tokenStorage.get(this.GUEST_SECRET_KEY),
        tokenStorage.get(this.GUEST_TOKEN_KEY)
      ]);

      if (!guestId || !guestSecret) {
        return null;
      }

      return {
        guestId,
        guestSecret,
        guestToken: guestToken || undefined
      };
    } catch (error) {
      console.error('❌ Failed to retrieve guest credentials:', error);
      return null;
    }
  },

  /**
   * Update guest token (after refresh)
   */
  async updateGuestToken(token: string): Promise<void> {
    await tokenStorage.set(this.GUEST_TOKEN_KEY, token);
    console.log('✅ Guest token updated');
  },

  /**
   * Clear guest credentials (on logout or conversion)
   */
  async clearGuestCredentials(): Promise<void> {
    await Promise.all([
      tokenStorage.remove(this.GUEST_ID_KEY),
      tokenStorage.remove(this.GUEST_SECRET_KEY),
      tokenStorage.remove(this.GUEST_TOKEN_KEY)
    ]);
    console.log('🧹 Guest credentials cleared');
  },

  /**
   * Store Firebase token data (backup, though Firebase handles this)
   */
  async storeFirebaseToken(tokenData: TokenData): Promise<void> {
    const data = JSON.stringify(tokenData);
    await tokenStorage.set(this.FIREBASE_TOKEN_KEY, data);
    console.log('✅ Firebase token stored as backup');
  },

  /**
   * Get Firebase token data (backup)
   */
  async getFirebaseToken(): Promise<TokenData | null> {
    try {
      const data = await tokenStorage.get(this.FIREBASE_TOKEN_KEY);
      if (!data) return null;
      
      const tokenData: TokenData = JSON.parse(data);
      
      // Check if token is expired
      if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
        await this.clearFirebaseToken();
        return null;
      }
      
      return tokenData;
    } catch (error) {
      console.error('❌ Failed to parse Firebase token data:', error);
      await this.clearFirebaseToken(); // Clear corrupted data
      return null;
    }
  },

  /**
   * Clear Firebase token data
   */
  async clearFirebaseToken(): Promise<void> {
    await Promise.all([
      tokenStorage.remove(this.FIREBASE_TOKEN_KEY),
      tokenStorage.remove(this.FIREBASE_REFRESH_KEY)
    ]);
    console.log('🧹 Firebase token data cleared');
  },

  /**
   * Clear all authentication data
   */
  async clearAllAuthData(): Promise<void> {
    await Promise.all([
      this.clearGuestCredentials(),
      this.clearFirebaseToken()
    ]);
    console.log('🧹 All authentication data cleared');
  }
};

export default tokenStorage;
