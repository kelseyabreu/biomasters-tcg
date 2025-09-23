/**
 * Offline Security Service
 * Handles cryptographic signing and verification of offline actions
 */

import CryptoJS from 'crypto-js';
import { createStorageAdapter } from './storageAdapter';

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
  previous_hash: string | null; // Hash of the previous action in the chain (null for first action)
  nonce: number; // Sequential number for this device/user combination
  key_version: number; // The key version this action was signed with
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
  existing_action_chain?: Array<{
    action_id: string;
    action_type: string;
    processed_at: string;
  }>;
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

  private signingKey: string | null = null;
  private signingKeyVersion: number = 0;
  private deviceId: string;
  private currentUserId: string | null = null;

  // Enhanced storage adapter for cross-platform support
  private storageAdapter = createStorageAdapter({
    keyPrefix: 'offline_security_',
    debug: false
  });
  private serverProcessedActionsCount: number = 0;

  constructor() {
    this.deviceId = ''; // Will be initialized in init()
    this.init();
  }

  /**
   * Initialize the service asynchronously
   */
  private async init(): Promise<void> {
    this.deviceId = await this.getOrCreateDeviceId();
    await this.loadSigningKey();
  }

  /**
   * Generate or retrieve device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await this.storageAdapter.getItem('device_id');
    if (!deviceId) {
      deviceId = this.generateSecureId();
      await this.storageAdapter.setItem('device_id', deviceId);
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
   * Set current user ID for scoped storage operations
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    console.log(`🔑 Set current user ID for offline storage: ${userId || 'null'}`);

    // Reload signing key for the new user
    this.loadSigningKey();
  }

  /**
   * Load signing key from storage (user-scoped)
   */
  private async loadSigningKey(): Promise<void> {
    const stored = await this.storageAdapter.getUserScopedItem(this.currentUserId, 'signing_key');
    if (stored) {
      try {
        const keyData = JSON.parse(stored);
        if (keyData.expires_at > Date.now()) {
          this.signingKey = keyData.key;
          this.signingKeyVersion = keyData.version;
        } else {
          // Key expired, remove it
          await this.storageAdapter.removeUserScopedItem(this.currentUserId, 'signing_key');
        }
      } catch (error) {
        console.warn('Failed to load signing key:', error);
      }
    }
  }

  /**
   * Check if signing key is initialized and ready for creating actions
   */
  isInitialized(): boolean {
    return !!(this.signingKey && this.signingKeyVersion && this.signingKeyVersion > 0);
  }

  /**
   * Check if signing key is ready for creating actions
   */
  isSigningKeyReady(): boolean {
    return !!(this.signingKey && this.signingKeyVersion && this.signingKeyVersion > 0);
  }

  /**
   * Get current signing key version
   */
  getCurrentKeyVersion(): number {
    return this.signingKeyVersion;
  }

  /**
   * Update signing key from server
   */
  async updateSigningKey(key: string, version: number, expiresAt: number): Promise<void> {
    this.signingKey = key;
    this.signingKeyVersion = version;

    const keyData = {
      key,
      version,
      expires_at: expiresAt
    };

    // Use current user ID for scoped storage
    await this.storageAdapter.setUserScopedItem(this.currentUserId, 'signing_key', JSON.stringify(keyData));
    console.log(`🔑 Updated signing key for user ${this.currentUserId}: version ${version}, expires ${new Date(expiresAt).toISOString()}`);

    // Update existing collection's signing key version if it exists
    await this.updateCollectionSigningKeyVersion(version);
  }

  /**
   * Update the count of actions already processed by the server
   * This is used for correct nonce calculation
   */
  updateServerProcessedActionsCount(count: number): void {
    this.serverProcessedActionsCount = count;
    console.log(`🔗 Updated server processed actions count: ${count}`);
  }

  /**
   * Update collection's signing key version and recalculate hash
   */
  private async updateCollectionSigningKeyVersion(newVersion: number): Promise<void> {
    const existingCollection = await this.loadOfflineCollection();
    if (existingCollection && existingCollection.signing_key_version !== newVersion) {
      console.log(`🔑 Updating collection signing key version from ${existingCollection.signing_key_version} to ${newVersion}`);

      const updatedCollection = {
        ...existingCollection,
        signing_key_version: newVersion
      };

      // Recalculate hash with new signing key version - exclude the collection_hash field
      const collectionForHashing = {
        user_id: updatedCollection.user_id,
        device_id: updatedCollection.device_id,
        cards_owned: updatedCollection.cards_owned,
        eco_credits: updatedCollection.eco_credits,
        xp_points: updatedCollection.xp_points,
        action_queue: updatedCollection.action_queue,
        last_sync: updatedCollection.last_sync,
        signing_key_version: updatedCollection.signing_key_version,
        activeDeck: updatedCollection.activeDeck,
        savedDecks: updatedCollection.savedDecks
      };

      updatedCollection.collection_hash = this.calculateCollectionHash(collectionForHashing);

      // Save updated collection
      await this.saveOfflineCollection(updatedCollection);
      console.log(`✅ Collection signing key version updated and hash recalculated`);
    }
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
      // For session keys, use a timestamp-based version to ensure uniqueness
      this.signingKeyVersion = Date.now();
      console.log(`🔑 Session-based signing key initialized for user: ${userId} with version: ${this.signingKeyVersion}`);

      // Update existing collection's signing key version if it exists
      await this.updateCollectionSigningKeyVersion(this.signingKeyVersion);
    } else {
      // Fallback to derived key (for offline-only mode)
      this.signingKey = await this.deriveKeyFromUserId(userId);
      // Set fallback version to 1 for offline-only mode
      this.signingKeyVersion = 1;
      console.log(`🔑 Derived signing key initialized for user: ${userId} with fallback version 1`);

      // Update existing collection's signing key version if it exists
      this.updateCollectionSigningKeyVersion(1);
    }
  }

  /**
   * Get the hash of the last action in the chain for chain integrity
   */
  private async getLastActionHash(): Promise<string | null> {
    const collectionState = await this.getCollectionState();
    const actionQueue = collectionState.action_queue;

    console.log('🔗 [HASH] getLastActionHash called:', {
      queueLength: actionQueue.length,
      deviceId: this.deviceId,
      signingKeyVersion: this.signingKeyVersion,
      timestamp: new Date().toISOString()
    });

    if (actionQueue.length === 0) {
      console.log('🔗 [HASH] No actions in queue, returning null (first action)');
      return null; // First action in chain
    }

    // Get the last action and create its hash (without signature)
    const lastAction = actionQueue[actionQueue.length - 1];
    console.log('🔗 [HASH] Last action details:', {
      id: lastAction.id,
      action: lastAction.action,
      cardId: lastAction.cardId,
      nonce: lastAction.nonce,
      key_version: lastAction.key_version,
      timestamp: lastAction.timestamp,
      previous_hash: lastAction.previous_hash ? lastAction.previous_hash.substring(0, 16) + '...' : null
    });

    const lastActionPayload = JSON.stringify({
      id: lastAction.id,
      action: lastAction.action,
      card_id: lastAction.cardId, // Use card_id to match server expectations
      quantity: lastAction.quantity,
      pack_type: lastAction.pack_type,
      deck_id: lastAction.deck_id,
      timestamp: lastAction.timestamp,
      api_version: lastAction.api_version,
      device_id: this.deviceId,
      key_version: lastAction.key_version, // Use the key version the action was signed with
      previous_hash: lastAction.previous_hash,
      nonce: lastAction.nonce
    });

    const hash = CryptoJS.SHA256(lastActionPayload).toString();
    console.log('🔗 [HASH] Calculated hash:', {
      payloadLength: lastActionPayload.length,
      hash: hash.substring(0, 16) + '...',
      fullHash: hash
    });

    return hash;
  }

  /**
   * Generate HMAC signature for action with chain integrity
   */
  private async signAction(action: Omit<OfflineAction, 'signature' | 'previous_hash' | 'nonce' | 'key_version'>): Promise<{ signature: string; previous_hash: string | null; nonce: number; key_version: number }> {
    console.log('✍️ [SIGN] signAction called:', {
      actionId: action.id,
      actionType: action.action,
      cardId: action.cardId,
      timestamp: action.timestamp,
      deviceId: this.deviceId,
      currentKeyVersion: this.signingKeyVersion,
      hasSigningKey: !!this.signingKey
    });

    if (!this.signingKey) {
      console.error('❌ [SIGN] No signing key available');
      throw new Error('Signing key not initialized. User must be authenticated to perform offline actions.');
    }

    // Get the hash of the previous action for chain integrity
    const previousHash = await this.getLastActionHash();

    // Generate a nonce (sequential number for this device/user combination)
    // Account for actions already processed by the server
    const collectionState = await this.getCollectionState();
    const localQueueLength = collectionState.action_queue.length;
    const nonce = this.serverProcessedActionsCount + localQueueLength + 1;

    console.log('✍️ [SIGN] Action chain details:', {
      previousHash: previousHash ? previousHash.substring(0, 16) + '...' : null,
      nonce: nonce,
      localQueueLength: localQueueLength,
      serverProcessedCount: this.serverProcessedActionsCount,
      calculation: `${this.serverProcessedActionsCount} + ${localQueueLength} + 1 = ${nonce}`
    });

    // Capture the key version at the time of signing - ensure it's valid (> 0)
    const keyVersion = this.signingKeyVersion;
    if (!keyVersion || keyVersion === 0) {
      console.error('❌ [SIGN] Invalid key version:', keyVersion);
      throw new Error('Invalid signing key version. Please wait for server authentication to complete.');
    }

    // Create payload structure with chain integrity
    // This must match the EXACT order and structure in server/src/routes/sync.ts verifyActionSignature function
    const payload = JSON.stringify({
      id: action.id,
      action: action.action,
      card_id: action.cardId, // Use card_id to match server expectations
      quantity: action.quantity,
      pack_type: action.pack_type,
      deck_id: action.deck_id,
      timestamp: action.timestamp,
      api_version: action.api_version,
      device_id: this.deviceId,
      key_version: keyVersion,
      previous_hash: previousHash,
      nonce: nonce
    });

    console.log('✍️ [SIGN] Payload details:', {
      payloadLength: payload.length,
      keyVersion: keyVersion,
      deviceId: this.deviceId,
      nonce: nonce,
      previousHash: previousHash ? previousHash.substring(0, 16) + '...' : null
    });

    const signature = CryptoJS.HmacSHA256(payload, this.signingKey).toString();
    console.log('✍️ [SIGN] Signature generated:', {
      signatureLength: signature.length,
      signature: signature.substring(0, 16) + '...',
      fullSignature: signature
    });

    return { signature, previous_hash: previousHash, nonce, key_version: keyVersion };
  }

  /**
   * Get current collection state (helper method)
   */
  private async getCollectionState(): Promise<OfflineCollection> {
    const existing = await this.loadOfflineCollection();
    if (existing) {
      return existing;
    }

    // Return initial collection if none exists
    return this.createInitialCollection(this.currentUserId);
  }

  /**
   * Create signed offline action with chain integrity
   */
  async createAction(
    action: 'pack_opened' | 'card_acquired' | 'deck_created' | 'deck_updated' | 'deck_deleted' | 'starter_pack_opened',
    data: Partial<OfflineAction>
  ): Promise<OfflineAction> {
    console.log('🏭 [CREATE] createAction called:', {
      actionType: action,
      data: data,
      deviceId: this.deviceId,
      signingKeyVersion: this.signingKeyVersion,
      hasSigningKey: !!this.signingKey,
      timestamp: new Date().toISOString()
    });

    const actionData: Omit<OfflineAction, 'signature' | 'previous_hash' | 'nonce' | 'key_version'> = {
      id: this.generateSecureId(),
      action,
      timestamp: Date.now(),
      api_version: OfflineSecurityService.API_VERSION,
      ...data
    };

    console.log('🏭 [CREATE] Action data prepared:', {
      id: actionData.id,
      action: actionData.action,
      cardId: actionData.cardId,
      pack_type: actionData.pack_type,
      timestamp: actionData.timestamp,
      api_version: actionData.api_version
    });

    const { signature, previous_hash, nonce, key_version } = await this.signAction(actionData);

    const finalAction = {
      ...actionData,
      signature,
      previous_hash,
      nonce,
      key_version
    };

    console.log('🏭 [CREATE] Final action created:', {
      id: finalAction.id,
      action: finalAction.action,
      nonce: finalAction.nonce,
      key_version: finalAction.key_version,
      signature: finalAction.signature ? finalAction.signature.substring(0, 16) + '...' : null,
      previous_hash: finalAction.previous_hash ? finalAction.previous_hash.substring(0, 16) + '...' : null
    });

    return finalAction;
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
      last_sync: collection.last_sync,
      signing_key_version: collection.signing_key_version
    };

    return CryptoJS.SHA256(JSON.stringify(hashData)).toString();
  }

  /**
   * Load offline collection from storage (user-scoped)
   */
  async loadOfflineCollection(userId?: string | null): Promise<OfflineCollection | null> {
    try {
      const userIdToUse = userId !== undefined ? userId : this.currentUserId;
      const stored = await this.storageAdapter.getUserScopedItem(userIdToUse, 'collection');

      if (!stored) {
        console.log(`📦 No stored collection found for user: ${userIdToUse || 'global'}`);
        return null;
      }

      const collection: OfflineCollection = JSON.parse(stored);

      // Verify collection integrity - exclude the collection_hash field from the calculation
      const collectionForHashing = {
        user_id: collection.user_id,
        device_id: collection.device_id,
        cards_owned: collection.cards_owned,
        eco_credits: collection.eco_credits,
        xp_points: collection.xp_points,
        action_queue: collection.action_queue,
        last_sync: collection.last_sync,
        signing_key_version: collection.signing_key_version,
        activeDeck: collection.activeDeck,
        savedDecks: collection.savedDecks
      };

      const expectedHash = this.calculateCollectionHash(collectionForHashing);
      if (collection.collection_hash !== expectedHash) {
        console.warn(`⚠️ Collection integrity check failed for user: ${userIdToUse}. Data may have been tampered with.`, {
          expectedHash,
          actualHash: collection.collection_hash,
          signingKeyVersion: collection.signing_key_version,
          deviceId: collection.device_id
        });
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
  async saveOfflineCollection(collection: Omit<OfflineCollection, 'collection_hash'>, userId?: string | null): Promise<void> {
    const userIdToUse = userId !== undefined ? userId : this.currentUserId;

    const collectionWithHash: OfflineCollection = {
      ...collection,
      collection_hash: this.calculateCollectionHash(collection)
    };

    await this.storageAdapter.setUserScopedItem(userIdToUse, 'collection', JSON.stringify(collectionWithHash));

    console.log(`💾 Saved collection for user: ${userIdToUse}`, {
      cards_count: Object.keys(collection.cards_owned).length,
      credits: collection.eco_credits,
      pending_actions: collection.action_queue.length
    });
  }

  /**
   * Create initial collection for new user
   */
  createInitialCollection(userId: string | null = null): OfflineCollection {
    // Ensure we have the correct user context and signing key loaded
    if (userId && userId !== this.currentUserId) {
      this.setCurrentUserId(userId);
    }

    // Wait for signing key to be properly initialized before creating collection
    // This ensures the collection starts with the correct signing key version
    let signingKeyVersion = this.signingKeyVersion;

    // If no signing key is loaded yet, use 1 as the fallback version
    // This prevents key version 0 issues and will be updated when proper key is initialized
    if (!signingKeyVersion || signingKeyVersion === 0) {
      signingKeyVersion = 1;
      console.log(`📦 Creating initial collection with fallback signing key version: 1 (will be updated when proper key is initialized)`);
    } else {
      console.log(`📦 Creating initial collection with current signing key version: ${signingKeyVersion}`);
    }

    const collection: Omit<OfflineCollection, 'collection_hash'> = {
      user_id: userId,
      device_id: this.deviceId,
      cards_owned: {},
      eco_credits: 100, // Starting credits
      xp_points: 0,
      action_queue: [],
      last_sync: 0,
      signing_key_version: signingKeyVersion
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
    console.log('📝 [QUEUE] addActionToQueue called:', {
      actionId: action.id,
      actionType: action.action,
      cardId: action.cardId,
      nonce: action.nonce,
      keyVersion: action.key_version,
      currentQueueLength: collection.action_queue.length,
      timestamp: new Date().toISOString()
    });

    const updatedCollection = {
      ...collection,
      action_queue: [...collection.action_queue, action]
    };

    console.log('📝 [QUEUE] Action added to queue:', {
      newQueueLength: updatedCollection.action_queue.length,
      actionDetails: {
        id: action.id,
        action: action.action,
        nonce: action.nonce,
        signature: action.signature ? action.signature.substring(0, 16) + '...' : null,
        previous_hash: action.previous_hash ? action.previous_hash.substring(0, 16) + '...' : null
      }
    });

    // Update collection hash - exclude the collection_hash field from the calculation
    const collectionForHashing = {
      user_id: updatedCollection.user_id,
      device_id: updatedCollection.device_id,
      cards_owned: updatedCollection.cards_owned,
      eco_credits: updatedCollection.eco_credits,
      xp_points: updatedCollection.xp_points,
      action_queue: updatedCollection.action_queue,
      last_sync: updatedCollection.last_sync,
      signing_key_version: updatedCollection.signing_key_version,
      activeDeck: updatedCollection.activeDeck,
      savedDecks: updatedCollection.savedDecks
    };

    updatedCollection.collection_hash = this.calculateCollectionHash(collectionForHashing);

    console.log('📝 [QUEUE] Collection hash updated:', {
      newHash: updatedCollection.collection_hash ? updatedCollection.collection_hash.substring(0, 16) + '...' : null,
      queueLength: updatedCollection.action_queue.length
    });

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
  async clearOfflineData(): Promise<void> {
    await this.storageAdapter.removeUserScopedItem(null, 'collection');
    await this.storageAdapter.removeUserScopedItem(null, 'signing_key');
    await this.storageAdapter.removeItem('device_id');
  }
}

export const offlineSecurityService = new OfflineSecurityService();
export default offlineSecurityService;
