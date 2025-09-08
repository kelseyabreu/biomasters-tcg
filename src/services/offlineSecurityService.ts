/**
 * Offline Security Service
 * Handles cryptographic signing and verification of offline actions
 */

import CryptoJS from 'crypto-js';

export interface OfflineAction {
  id: string;
  action: 'pack_opened' | 'card_acquired' | 'deck_created' | 'deck_updated' | 'deck_deleted' | 'starter_pack_opened';
  cardId?: number;
  quantity?: number;
  pack_type?: string;
  deck_id?: string;
  deck_data?: any;
  timestamp: number;
  signature: string;
  api_version: string;
}

export interface DeckCard {
  cardId: number;
  quantity: number;
}

export interface SavedDeck {
  id: string;
  name: string;
  cards: DeckCard[];
  created: number;
  lastModified: number;
}

export interface OfflineCollection {
  user_id: string | null; // null for guest mode
  device_id: string;
  cards_owned: {
    [cardId: number]: {
      quantity: number;
      acquired_via: 'starter' | 'pack' | 'redeem' | 'reward';
      first_acquired: number;
      last_acquired: number;
    }
  };
  eco_credits: number;
  xp_points: number;
  action_queue: OfflineAction[];
  collection_hash: string;
  last_sync: number;
  signing_key_version: number;
  activeDeck?: SavedDeck; // Currently selected deck for battles
  savedDecks?: SavedDeck[]; // All saved decks
}

export interface SyncPayload {
  device_id: string;
  offline_actions: OfflineAction[];
  collection_state: OfflineCollection;
  client_version: string;
  last_known_server_state?: string;
}

export interface SyncResponse {
  success: boolean;
  conflicts?: Array<{
    action_id: string;
    reason: string;
    server_state: any;
  }>;
  discarded_actions?: string[];
  new_server_state: {
    cards_owned: Record<number, any>;
    eco_credits: number;
    xp_points: number;
  };
  new_signing_key?: {
    key: string;
    version: number;
    expires_at: number;
  };
}

class OfflineSecurityService {
  private static readonly API_VERSION = '1.0.0';
  private static readonly STORAGE_KEY_PREFIX = 'biomasters_offline_collection';
  private static readonly SIGNING_KEY_PREFIX = 'biomasters_signing_key';

  private signingKey: string | null = null;
  private signingKeyVersion: number = 0;
  private deviceId: string;
  private currentUserId: string | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadSigningKey();
  }

  /**
   * Generate or retrieve device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('biomasters_device_id');
    if (!deviceId) {
      deviceId = this.generateSecureId();
      localStorage.setItem('biomasters_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Generate cryptographically secure ID
   */
  private generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const random = CryptoJS.lib.WordArray.random(16).toString();
    return `${timestamp}-${random}`;
  }

  /**
   * Get user-scoped storage key for collections
   */
  private getUserScopedCollectionKey(userId: string | null): string {
    if (!userId) {
      console.warn('⚠️ No userId provided for storage key, using global key');
      return OfflineSecurityService.STORAGE_KEY_PREFIX;
    }
    return `user_${userId}_${OfflineSecurityService.STORAGE_KEY_PREFIX}`;
  }

  /**
   * Get user-scoped storage key for signing keys
   */
  private getUserScopedSigningKey(userId: string | null): string {
    if (!userId) {
      console.warn('⚠️ No userId provided for signing key, using global key');
      return OfflineSecurityService.SIGNING_KEY_PREFIX;
    }
    return `user_${userId}_${OfflineSecurityService.SIGNING_KEY_PREFIX}`;
  }

  /**
   * Set current user ID for scoped storage operations
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    console.log(`🔑 Set current user ID for offline storage: ${userId || 'null'}`);
  }

  /**
   * Load signing key from storage (user-scoped)
   */
  private loadSigningKey(): void {
    const keyStorageKey = this.getUserScopedSigningKey(this.currentUserId);
    const stored = localStorage.getItem(keyStorageKey);
    if (stored) {
      try {
        const keyData = JSON.parse(stored);
        if (keyData.expires_at > Date.now()) {
          this.signingKey = keyData.key;
          this.signingKeyVersion = keyData.version;
        } else {
          // Key expired, remove it
          localStorage.removeItem(keyStorageKey);
        }
      } catch (error) {
        console.warn('Failed to load signing key:', error);
      }
    }
  }

  /**
   * Check if signing key is initialized
   */
  isInitialized(): boolean {
    return !!this.signingKey;
  }

  /**
   * Update signing key from server
   */
  updateSigningKey(key: string, version: number, expiresAt: number): void {
    this.signingKey = key;
    this.signingKeyVersion = version;

    const keyData = {
      key,
      version,
      expires_at: expiresAt
    };

    localStorage.setItem(this.getUserScopedSigningKey(null), JSON.stringify(keyData));
  }

  /**
   * Initialize signing key from server session key
   */
  async initializeSigningKey(userId: string, sessionKey?: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID required for key initialization');
    }

    // Set current user ID for scoped storage
    this.setCurrentUserId(userId);

    if (sessionKey) {
      // Use session-based key from server
      this.signingKey = sessionKey;
      console.log(`🔑 Session-based signing key initialized for user: ${userId}`);
    } else {
      // Fallback to derived key (for offline-only mode)
      this.signingKey = await this.deriveKeyFromUserId(userId);
      console.log(`🔑 Derived signing key initialized for user: ${userId}`);
    }
  }

  /**
   * Generate HMAC signature for action
   */
  private signAction(action: Omit<OfflineAction, 'signature'>): string {
    if (!this.signingKey) {
      throw new Error('Signing key not initialized. User must be authenticated to perform offline actions.');
    }

    const payload = JSON.stringify({
      id: action.id,
      action: action.action,
      cardId: action.cardId,
      quantity: action.quantity,
      pack_type: action.pack_type,
      deck_id: action.deck_id,
      timestamp: action.timestamp,
      api_version: action.api_version,
      device_id: this.deviceId,
      key_version: this.signingKeyVersion
    });

    return CryptoJS.HmacSHA256(payload, this.signingKey).toString();
  }

  /**
   * Create signed offline action
   */
  createAction(
    action: 'pack_opened' | 'card_acquired' | 'deck_created' | 'deck_updated' | 'deck_deleted' | 'starter_pack_opened',
    data: Partial<OfflineAction>
  ): OfflineAction {
    const actionData: Omit<OfflineAction, 'signature'> = {
      id: this.generateSecureId(),
      action,
      timestamp: Date.now(),
      api_version: OfflineSecurityService.API_VERSION,
      ...data
    };

    const signature = this.signAction(actionData);

    return {
      ...actionData,
      signature
    };
  }

  /**
   * Calculate collection hash for integrity
   */
  calculateCollectionHash(collection: Omit<OfflineCollection, 'collection_hash'>): string {
    const hashData = {
      cards_owned: collection.cards_owned,
      eco_credits: collection.eco_credits,
      xp_points: collection.xp_points,
      device_id: collection.device_id,
      last_sync: collection.last_sync
    };

    return CryptoJS.SHA256(JSON.stringify(hashData)).toString();
  }

  /**
   * Load offline collection from storage (user-scoped)
   */
  loadOfflineCollection(userId?: string | null): OfflineCollection | null {
    try {
      const userIdToUse = userId !== undefined ? userId : this.currentUserId;
      const storageKey = this.getUserScopedCollectionKey(userIdToUse);
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        console.log(`📦 No stored collection found for user: ${userIdToUse || 'global'}`);
        return null;
      }

      const collection: OfflineCollection = JSON.parse(stored);

      // Verify collection integrity
      const expectedHash = this.calculateCollectionHash(collection);
      if (collection.collection_hash !== expectedHash) {
        console.warn(`⚠️ Collection integrity check failed for user: ${userIdToUse}. Data may have been tampered with.`);
        return null;
      }

      console.log(`📦 Loaded collection for user: ${userIdToUse}`, {
        cards_count: Object.keys(collection.cards_owned).length,
        credits: collection.eco_credits,
        pending_actions: collection.action_queue.length
      });

      return collection;
    } catch (error) {
      console.error('Failed to load offline collection:', error);
      return null;
    }
  }

  /**
   * Save offline collection to storage (user-scoped)
   */
  saveOfflineCollection(collection: Omit<OfflineCollection, 'collection_hash'>, userId?: string | null): void {
    const userIdToUse = userId !== undefined ? userId : this.currentUserId;
    const storageKey = this.getUserScopedCollectionKey(userIdToUse);

    const collectionWithHash: OfflineCollection = {
      ...collection,
      collection_hash: this.calculateCollectionHash(collection)
    };

    localStorage.setItem(storageKey, JSON.stringify(collectionWithHash));

    console.log(`💾 Saved collection for user: ${userIdToUse}`, {
      cards_count: Object.keys(collection.cards_owned).length,
      credits: collection.eco_credits,
      pending_actions: collection.action_queue.length,
      storageKey
    });
  }

  /**
   * Create initial collection for new user
   */
  createInitialCollection(userId: string | null = null): OfflineCollection {
    const collection: Omit<OfflineCollection, 'collection_hash'> = {
      user_id: userId,
      device_id: this.deviceId,
      cards_owned: {},
      eco_credits: 100, // Starting credits
      xp_points: 0,
      action_queue: [],
      last_sync: 0,
      signing_key_version: this.signingKeyVersion
    };

    return {
      ...collection,
      collection_hash: this.calculateCollectionHash(collection)
    };
  }

  /**
   * Add action to queue and update collection
   */
  addActionToQueue(collection: OfflineCollection, action: OfflineAction): OfflineCollection {
    const updatedCollection = {
      ...collection,
      action_queue: [...collection.action_queue, action]
    };

    // Update collection hash
    updatedCollection.collection_hash = this.calculateCollectionHash(updatedCollection);
    
    return updatedCollection;
  }

  /**
   * Check if signing key is available and valid
   */
  isSigningKeyValid(): boolean {
    return this.signingKey !== null && this.signingKeyVersion > 0;
  }

  /**
   * Derive cryptographic key from user ID using Web Crypto API
   */
  private async deriveKeyFromUserId(userId: string): Promise<string> {
    // Use Web Crypto API for proper key derivation
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + this.deviceId);

    // Create a hash of the user ID + device ID
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert to hex string
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Clear all offline data (for testing or reset)
   */
  clearOfflineData(): void {
    localStorage.removeItem(this.getUserScopedCollectionKey(null));
    localStorage.removeItem(this.getUserScopedSigningKey(null));
    localStorage.removeItem('biomasters_device_id');
  }
}

export const offlineSecurityService = new OfflineSecurityService();
export default offlineSecurityService;
