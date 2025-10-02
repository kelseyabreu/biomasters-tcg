/**
 * Offline Security Service
 * Handles cryptographic signing and verification of offline actions
 */

import CryptoJS from 'crypto-js';
import { createStorageAdapter } from './storageAdapter';
import { SyncActionType } from '@kelseyabreu/shared';

export interface OfflineAction {
  id: string;
  action: SyncActionType;  // Use shared enum instead of string literals

  // Action-specific data (varies by action type)
  cardId?: number;
  quantity?: number;
  pack_type?: string;
  deck_id?: string;
  deck_data?: any;
  battle_data?: {
    opponent_id?: string;
    stage_id?: string;
    stage_name?: string;
    deck_id?: string;
    victory_points?: number;
    turns_taken?: number;
    rewards?: {
      credits?: number;
      xp?: number;
      cards?: number[];
    };
  };
  reward_data?: {
    reward_type: string;
    reward_id: string;
    items_received: any[];
  };
  challenge_data?: {
    challenge_id: string;
    score: number;
    completion_time: number;
  };

  // Cryptographic chain data
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
  // 3-ID Architecture: Always use all three IDs for clarity
  client_user_id: string;           // Device-generated UUID (stable across guest→registered)
  firebase_user_id: string | null;  // Firebase UID (null for guests)
  db_user_id: string | null;        // Server-assigned UUID (null until first sync)
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

  // Optimistic locking for sync conflict detection
  collection_version: number;      // Increments on every local change
  last_synced_version: number;     // Server's version at last successful sync

  activeDeck?: SavedDeck; // Currently selected deck for battles
  savedDecks?: SavedDeck[]; // All saved decks
}

export interface SyncPayload {
  device_id: string;
  offline_actions: OfflineAction[];
  collection_state: OfflineCollection;
  client_version: string;
  last_known_server_state?: string;
  transaction_id: string; // Unique ID for idempotency protection
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
    action_data: any; // Full action payload for queue reconstruction
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

  // Track pending actions that haven't been saved to collection yet
  // This prevents nonce collisions when multiple actions are created rapidly
  private pendingActionsCount: number = 0;
  private lastPendingActionHash: string | null = null;

  // Track the hash of the last synced action for chain continuity
  // This is needed when the action queue is cleared after sync
  private lastSyncedActionHash: string | null = null;

  // Memoization: Track completed operations to prevent redundant work
  private loadedSigningKeyForUser: string | null = null;
  private initializedForUser: string | null = null;

  // Promise to track initialization state
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.deviceId = ''; // Will be initialized when ensureInitialized() is called
    // Don't auto-initialize - require explicit initialization to prevent race conditions
  }

  /**
   * Ensure the service is initialized before use
   * This prevents race conditions where methods are called before async init completes
   */
  async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return this.initPromise;
  }

  /**
   * Initialize the service asynchronously
   */
  private async init(): Promise<void> {
    console.log('🔧 [INIT] Starting offlineSecurityService initialization...');
    this.deviceId = await this.getOrCreateDeviceId();
    await this.loadSigningKey();
    console.log('✅ [INIT] offlineSecurityService initialization completed:', {
      deviceId: this.deviceId,
      hasSigningKey: !!this.signingKey,
      signingKeyVersion: this.signingKeyVersion
    });
  }

  /**
   * Generate or retrieve device ID
   * Device ID is stored per-user to avoid conflicts when switching users.
   * For offline-first scenarios, we generate a client-side device ID.
   * For online scenarios, the server will provide a device ID during registration.
   */
  private async getOrCreateDeviceId(): Promise<string> {
    // Try to get user-scoped device ID first
    let deviceId = await this.storageAdapter.getUserScopedItem(this.currentUserId, 'device_id');

    if (!deviceId) {
      // Fallback to global device ID for backward compatibility
      deviceId = await this.storageAdapter.getItem('device_id');

      if (deviceId && this.currentUserId) {
        // Migrate global device ID to user-scoped storage
        console.log('🔄 [DEVICE-ID] Migrating global device ID to user-scoped storage');
        await this.storageAdapter.setUserScopedItem(this.currentUserId, 'device_id', deviceId);
        // Don't remove global device ID yet for backward compatibility
      }
    }

    if (!deviceId) {
      // Generate a new device ID for offline-first scenarios
      // This will be replaced by server's device ID during registration if online
      deviceId = this.generateSecureId();
      console.log('🆔 [DEVICE-ID] Generated new device ID for offline-first scenario:', deviceId);

      // Store in user-scoped storage if we have a user ID
      if (this.currentUserId) {
        await this.storageAdapter.setUserScopedItem(this.currentUserId, 'device_id', deviceId);
      } else {
        // Store globally if no user ID yet
        await this.storageAdapter.setItem('device_id', deviceId);
      }
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
    const previousUserId = this.currentUserId;

    // IDEMPOTENCY: Skip if setting the same user ID again
    if (previousUserId === userId) {
      console.log(`🔍 [IDEMPOTENT] User ID already set to ${userId}, skipping redundant operation`);
      return;
    }

    this.currentUserId = userId;
    console.log(`🔑 Set current user ID for offline storage: ${userId || 'null'} (previous: ${previousUserId || 'null'})`);

    // Reset memoization flags for new user
    this.loadedSigningKeyForUser = null;
    this.initializedForUser = null;

    // IMPORTANT: Only regenerate device ID when switching between two DIFFERENT non-null users
    // Do NOT regenerate when:
    // - Setting user ID for the first time (null -> userId)
    // - Clearing user ID (userId -> null)
    if (previousUserId !== null && userId !== null && previousUserId !== userId) {
      console.log(`🔄 User changed from ${previousUserId} to ${userId}, regenerating device ID...`);
      this.regenerateDeviceId();
    } else {
      console.log(`🔍 Device ID kept: ${this.deviceId} (no regeneration needed)`);
    }

    // Reset server processed actions count for new user
    this.serverProcessedActionsCount = 0;
    this.pendingActionsCount = 0;
    this.lastPendingActionHash = null;
    this.lastSyncedActionHash = null;
    console.log(`🔗 Reset action counters for new user (serverProcessed: 0, pending: 0, lastSyncedHash: null)`);

    // Reload signing key for the new user
    this.loadSigningKey();
  }

  /**
   * Regenerate device ID (used when switching users)
   */
  private async regenerateDeviceId(): Promise<void> {
    const newDeviceId = this.generateSecureId();

    // Update in-memory device ID immediately
    this.deviceId = newDeviceId;

    // Use user-scoped storage if available, otherwise global storage
    if (this.currentUserId) {
      await this.storageAdapter.setUserScopedItem(this.currentUserId, 'device_id', newDeviceId);
      console.log(`🆔 Regenerated device ID for user ${this.currentUserId}: ${newDeviceId}`);
    } else {
      await this.storageAdapter.setItem('device_id', newDeviceId);
      console.log(`🆔 Regenerated global device ID: ${newDeviceId}`);
    }
  }

  /**
   * Load signing key from storage (user-scoped)
   */
  private async loadSigningKey(): Promise<void> {
    // MEMOIZATION: Skip if already loaded for this user
    if (this.loadedSigningKeyForUser === this.currentUserId) {
      console.log('🔍 [MEMOIZED] Signing key already loaded for user:', this.currentUserId);
      return;
    }

    const stored = await this.storageAdapter.getUserScopedItem(this.currentUserId, 'signing_key');
    console.log('🔑 [LOAD-KEY] Loading signing key from storage:', {
      userId: this.currentUserId,
      hasStoredKey: !!stored,
      timestamp: new Date().toISOString()
    });

    if (stored) {
      try {
        const keyData = JSON.parse(stored);
        console.log('🔑 [LOAD-KEY] Parsed key data:', {
          hasKey: !!keyData.key,
          keyPreview: keyData.key ? keyData.key.substring(0, 16) + '...' : null,
          keyLength: keyData.key ? keyData.key.length : 0,
          fullKey: keyData.key,
          version: keyData.version,
          expiresAt: new Date(keyData.expires_at).toISOString(),
          isExpired: keyData.expires_at <= Date.now(),
          currentTime: new Date().toISOString()
        });

        if (keyData.expires_at > Date.now()) {
          this.signingKey = keyData.key;
          this.signingKeyVersion = keyData.version;
          this.loadedSigningKeyForUser = this.currentUserId; // Mark as loaded
          console.log('🔑 [LOAD-KEY] Signing key loaded successfully:', {
            keyPreview: this.signingKey ? this.signingKey.substring(0, 16) + '...' : 'null',
            keyLength: this.signingKey ? this.signingKey.length : 0,
            version: this.signingKeyVersion
          });
        } else {
          // Key expired, remove it
          console.warn('🔑 [LOAD-KEY] Signing key expired, removing from storage');
          await this.storageAdapter.removeUserScopedItem(this.currentUserId, 'signing_key');
        }
      } catch (error) {
        console.warn('Failed to load signing key:', error);
      }
    } else {
      console.log('🔑 [LOAD-KEY] No signing key found in storage');
      this.loadedSigningKeyForUser = this.currentUserId; // Mark as attempted (no key found)
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
    console.log('🔑 [UPDATE-KEY] Received new signing key from server:', {
      keyPreview: key.substring(0, 16) + '...',
      keyLength: key.length,
      fullKey: key,
      version: version,
      expiresAt: new Date(expiresAt).toISOString(),
      currentUserId: this.currentUserId,
      previousKeyPreview: this.signingKey ? this.signingKey.substring(0, 16) + '...' : null,
      previousVersion: this.signingKeyVersion
    });

    this.signingKey = key;
    this.signingKeyVersion = version;
    this.loadedSigningKeyForUser = this.currentUserId; // Mark as loaded
    this.initializedForUser = this.currentUserId; // Mark as initialized

    const keyData = {
      key,
      version,
      expires_at: expiresAt
    };

    // Use current user ID for scoped storage
    await this.storageAdapter.setUserScopedItem(this.currentUserId, 'signing_key', JSON.stringify(keyData));
    console.log(`🔑 [UPDATE-KEY] Signing key saved to storage for user ${this.currentUserId}: version ${version}, expires ${new Date(expiresAt).toISOString()}`);

    // Update existing collection's signing key version if it exists
    await this.updateCollectionSigningKeyVersion(version);

    console.log('🔑 [UPDATE-KEY] Update complete:', {
      currentKeyPreview: this.signingKey.substring(0, 16) + '...',
      currentVersion: this.signingKeyVersion
    });
  }

  /**
   * Update the count of actions already processed by the server
   * This is used for correct nonce calculation
   */
  updateServerProcessedActionsCount(count: number): void {
    this.serverProcessedActionsCount = count;
    // Reset pending actions count and hash when server processes actions
    this.pendingActionsCount = 0;
    this.lastPendingActionHash = null;
    console.log(`🔗 Updated server processed actions count: ${count}, reset pending count`);
  }

  /**
   * Get the current count of actions processed by the server
   */
  getServerProcessedActionsCount(): number {
    return this.serverProcessedActionsCount;
  }

  /**
   * Update the hash of the last synced action for chain continuity
   * This should be called after successful sync with the hash of the last processed action
   */
  updateLastSyncedActionHash(actionHash: string | null): void {
    console.log('🔗 [SYNC-HASH] Updating last synced action hash:', {
      previousHash: this.lastSyncedActionHash ? this.lastSyncedActionHash.substring(0, 16) + '...' : null,
      newHash: actionHash ? actionHash.substring(0, 16) + '...' : null
    });
    this.lastSyncedActionHash = actionHash;
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
      const collectionForHashing: Omit<OfflineCollection, 'collection_hash'> = {
        client_user_id: updatedCollection.client_user_id,
        firebase_user_id: updatedCollection.firebase_user_id,
        db_user_id: updatedCollection.db_user_id,
        device_id: updatedCollection.device_id,
        cards_owned: updatedCollection.cards_owned,
        eco_credits: updatedCollection.eco_credits,
        xp_points: updatedCollection.xp_points,
        action_queue: updatedCollection.action_queue,
        last_sync: updatedCollection.last_sync,
        signing_key_version: updatedCollection.signing_key_version,
        collection_version: updatedCollection.collection_version,
        last_synced_version: updatedCollection.last_synced_version,
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
      this.initializedForUser = userId; // Mark as initialized
      console.log(`🔑 Session-based signing key initialized for user: ${userId} with version: ${this.signingKeyVersion}`);

      // Update existing collection's signing key version if it exists
      await this.updateCollectionSigningKeyVersion(this.signingKeyVersion);
    } else {
      // Fallback to derived key (for offline-only mode)
      this.signingKey = await this.deriveKeyFromUserId(userId);
      // Set fallback version to 1 for offline-only mode
      this.signingKeyVersion = 1;
      this.initializedForUser = userId; // Mark as initialized
      console.log(`🔑 Derived signing key initialized for user: ${userId} with fallback version 1`);

      // Update existing collection's signing key version if it exists
      this.updateCollectionSigningKeyVersion(1);
    }
  }

  /**
   * Get the hash of the last action in the chain for chain integrity
   */
  private async getLastActionHash(): Promise<string | null> {
    // If there's a pending action that hasn't been saved yet, use its hash
    if (this.lastPendingActionHash) {
      console.log('🔗 [HASH] Using last pending action hash:', {
        hash: this.lastPendingActionHash.substring(0, 16) + '...',
        pendingCount: this.pendingActionsCount
      });
      return this.lastPendingActionHash;
    }

    const collectionState = await this.getCollectionState();
    const actionQueue = collectionState.action_queue;

    console.log('🔗 [HASH] getLastActionHash called:', {
      queueLength: actionQueue.length,
      pendingActionsCount: this.pendingActionsCount,
      deviceId: this.deviceId,
      signingKeyVersion: this.signingKeyVersion,
      timestamp: new Date().toISOString()
    });

    if (actionQueue.length === 0) {
      // If queue is empty but we have a last synced action hash, use that for chain continuity
      if (this.lastSyncedActionHash) {
        console.log('🔗 [HASH] No actions in queue, using last synced action hash:', {
          hash: this.lastSyncedActionHash.substring(0, 16) + '...',
          serverProcessedCount: this.serverProcessedActionsCount
        });
        return this.lastSyncedActionHash;
      }

      console.log('🔗 [HASH] No actions in queue and no last synced hash, returning null (first action)');
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

    // Build hash payload with only defined fields (matching server behavior)
    const hashPayload: any = {
      id: lastAction.id,
      action: lastAction.action,
      timestamp: lastAction.timestamp,
      api_version: lastAction.api_version
    };

    // Only include optional fields if they exist (matching server behavior)
    if (lastAction.cardId !== undefined) {
      hashPayload.card_id = lastAction.cardId;
    }
    if (lastAction.quantity !== undefined) {
      hashPayload.quantity = lastAction.quantity;
    }
    if (lastAction.pack_type !== undefined) {
      hashPayload.pack_type = lastAction.pack_type;
    }
    if (lastAction.deck_id !== undefined) {
      hashPayload.deck_id = lastAction.deck_id;
    }

    // Add remaining fields in consistent order
    hashPayload.device_id = this.deviceId;
    hashPayload.key_version = lastAction.key_version;
    hashPayload.previous_hash = lastAction.previous_hash;
    hashPayload.nonce = lastAction.nonce;

    console.log('🔍 [HASH-DEBUG] Client hash calculation for action:', {
      actionId: lastAction.id,
      actionType: lastAction.action,
      hashPayload: hashPayload,
      payloadString: JSON.stringify(hashPayload),
      payloadLength: JSON.stringify(hashPayload).length
    });

    const lastActionPayload = JSON.stringify(hashPayload);
    const hash = CryptoJS.SHA256(lastActionPayload).toString();

    console.log('🔍 [HASH-DEBUG] Client calculated hash:', {
      actionId: lastAction.id,
      calculatedHash: hash,
      hashLength: hash.length,
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
    // Account for:
    // 1. Actions already processed by the server (serverProcessedActionsCount)
    // 2. Pending actions being created in this session but not yet saved (pendingActionsCount)
    // Note: We don't add localQueueLength because those actions already have nonces assigned
    const collectionState = await this.getCollectionState();
    const localQueueLength = collectionState.action_queue.length;
    const nonce = this.serverProcessedActionsCount + this.pendingActionsCount + 1;

    console.log('✍️ [SIGN] Action chain details:', {
      previousHash: previousHash ? previousHash.substring(0, 16) + '...' : null,
      nonce: nonce,
      localQueueLength: localQueueLength,
      pendingActionsCount: this.pendingActionsCount,
      serverProcessedCount: this.serverProcessedActionsCount,
      calculation: `${this.serverProcessedActionsCount} + ${this.pendingActionsCount} + 1 = ${nonce} (localQueue: ${localQueueLength} not counted)`
    });

    // Capture the key version at the time of signing - ensure it's valid (> 0)
    const keyVersion = this.signingKeyVersion;
    if (!keyVersion || keyVersion === 0) {
      console.error('❌ [SIGN] Invalid key version:', keyVersion);
      throw new Error('Invalid signing key version. Please wait for server authentication to complete.');
    }

    // Create payload structure with chain integrity
    // This must match the EXACT order and structure in server/src/routes/sync.ts verifyActionSignature function
    // Only include defined fields (matching server behavior)
    const payloadObj: any = {
      id: action.id,
      action: action.action,
      timestamp: action.timestamp,
      api_version: action.api_version
    };

    // Only include optional fields if they exist (matching server behavior)
    if (action.cardId !== undefined) {
      payloadObj.card_id = action.cardId;
    }
    if (action.quantity !== undefined) {
      payloadObj.quantity = action.quantity;
    }
    if (action.pack_type !== undefined) {
      payloadObj.pack_type = action.pack_type;
    }
    if (action.deck_id !== undefined) {
      payloadObj.deck_id = action.deck_id;
    }

    // Add remaining fields in consistent order
    payloadObj.device_id = this.deviceId;
    payloadObj.key_version = keyVersion;
    payloadObj.previous_hash = previousHash;
    payloadObj.nonce = nonce;

    const payload = JSON.stringify(payloadObj);

    console.log('✍️ [SIGN] Payload details:', {
      payloadLength: payload.length,
      keyVersion: keyVersion,
      deviceId: this.deviceId,
      nonce: nonce,
      previousHash: previousHash ? previousHash.substring(0, 16) + '...' : null,
      fullPayload: payload,
      signingKeyPreview: this.signingKey.substring(0, 16) + '...',
      signingKeyLength: this.signingKey.length
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
   * NOTE: This should only be called when a collection already exists
   * For creating new collections, use createInitialCollection with proper 3-ID parameters
   */
  private async getCollectionState(): Promise<OfflineCollection> {
    const existing = await this.loadOfflineCollection();
    if (existing) {
      return existing;
    }

    // Fallback: create minimal collection with client ID only
    // This should not happen in normal flow - collections should be created explicitly
    console.warn('⚠️ getCollectionState called without existing collection - creating fallback');
    return this.createInitialCollection(
      this.currentUserId || 'anonymous-' + Date.now(),
      null,
      null
    );
  }

  /**
   * Create signed offline action with chain integrity
   */
  async createAction(
    action: SyncActionType,
    data: Partial<OfflineAction>
  ): Promise<OfflineAction> {
    // Ensure service is initialized before creating actions
    await this.ensureInitialized();

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

    // Calculate and store the hash of this action for the next action in the chain
    // This must match the server's hash calculation exactly
    const hashPayload: any = {
      id: finalAction.id,
      action: finalAction.action,
      timestamp: finalAction.timestamp,
      api_version: finalAction.api_version
    };

    // Only include optional fields if they exist (matching server behavior)
    if (finalAction.cardId !== undefined) {
      hashPayload.card_id = finalAction.cardId;
    }
    if (finalAction.quantity !== undefined) {
      hashPayload.quantity = finalAction.quantity;
    }
    if (finalAction.pack_type !== undefined) {
      hashPayload.pack_type = finalAction.pack_type;
    }
    if (finalAction.deck_id !== undefined) {
      hashPayload.deck_id = finalAction.deck_id;
    }
    // NOTE: deck_data is NOT included in hash calculation (server doesn't include it either)

    // Add chain integrity fields
    hashPayload.device_id = this.deviceId;
    hashPayload.key_version = finalAction.key_version;
    hashPayload.previous_hash = finalAction.previous_hash;
    hashPayload.nonce = finalAction.nonce;

    const hashPayloadString = JSON.stringify(hashPayload);
    const actionHash = CryptoJS.SHA256(hashPayloadString).toString();

    console.log('🔍 [FRONTEND-HASH] Hash calculation for action:', {
      actionId: finalAction.id,
      actionType: finalAction.action,
      hashPayload: hashPayload,
      payloadString: hashPayloadString,
      payloadLength: hashPayloadString.length,
      calculatedHash: actionHash,
      hashLength: actionHash.length,
      hasDeckData: finalAction.deck_data !== undefined,
      deckDataIncludedInHash: hashPayload.deck_data !== undefined
    });

    // Store this hash for the next action to use as previous_hash
    this.lastPendingActionHash = actionHash;
    this.pendingActionsCount++;

    console.log('🏭 [CREATE] Final action created:', {
      id: finalAction.id,
      action: finalAction.action,
      nonce: finalAction.nonce,
      key_version: finalAction.key_version,
      signature: finalAction.signature ? finalAction.signature.substring(0, 16) + '...' : null,
      previous_hash: finalAction.previous_hash ? finalAction.previous_hash.substring(0, 16) + '...' : null,
      calculatedHash: actionHash.substring(0, 16) + '...',
      pendingActionsCount: this.pendingActionsCount
    });

    return finalAction;
  }

  /**
   * Calculate collection hash for integrity
   * Uses 3-ID architecture for consistent hashing
   */
  calculateCollectionHash(collection: Omit<OfflineCollection, 'collection_hash'>): string {
    const hashData = {
      client_user_id: collection.client_user_id,
      firebase_user_id: collection.firebase_user_id,
      db_user_id: collection.db_user_id,
      device_id: collection.device_id,
      cards_owned: collection.cards_owned,
      eco_credits: collection.eco_credits,
      xp_points: collection.xp_points,
      last_sync: collection.last_sync,
      signing_key_version: collection.signing_key_version
    };

    return CryptoJS.SHA256(JSON.stringify(hashData)).toString();
  }

  /**
   * Load offline collection from storage using deterministic 3-ID storage key
   * @param firebaseUserId - Firebase UID (for registered users)
   * @param dbUserId - Server-assigned UUID (for guest users)
   * @param clientUserId - Device-generated UUID (for anonymous users)
   */
  async loadOfflineCollection(
    firebaseUserId: string | null = null,
    dbUserId: string | null = null,
    clientUserId: string | null = null
  ): Promise<OfflineCollection | null> {
    // Ensure service is initialized before loading collection
    await this.ensureInitialized();

    try {
      // Determine storage key using same priority as getStorageKey
      // Priority: firebase_user_id > db_user_id > client_user_id
      const storageKey = firebaseUserId || dbUserId || clientUserId || this.currentUserId;

      if (!storageKey) {
        console.warn('⚠️ No storage key available to load collection');
        return null;
      }

      const stored = await this.storageAdapter.getUserScopedItem(storageKey, 'collection');

      if (!stored) {
        console.log(`📦 No stored collection found with storage key: ${storageKey}`);
        return null;
      }

      const collection: OfflineCollection = JSON.parse(stored);

      // Verify collection integrity - exclude the collection_hash field from the calculation
      const collectionForHashing: Omit<OfflineCollection, 'collection_hash'> = {
        client_user_id: collection.client_user_id,
        firebase_user_id: collection.firebase_user_id,
        db_user_id: collection.db_user_id,
        device_id: collection.device_id,
        cards_owned: collection.cards_owned,
        eco_credits: collection.eco_credits,
        xp_points: collection.xp_points,
        action_queue: collection.action_queue,
        last_sync: collection.last_sync,
        signing_key_version: collection.signing_key_version,
        collection_version: collection.collection_version || 1,
        last_synced_version: collection.last_synced_version || 0,
        activeDeck: collection.activeDeck,
        savedDecks: collection.savedDecks
      };

      const expectedHash = this.calculateCollectionHash(collectionForHashing);
      if (collection.collection_hash !== expectedHash) {
        console.warn(`⚠️ Collection integrity check failed for storage key: ${storageKey}. Data may have been tampered with.`, {
          expectedHash,
          actualHash: collection.collection_hash,
          signingKeyVersion: collection.signing_key_version,
          deviceId: collection.device_id
        });
        return null;
      }

      console.log(`📦 Loaded collection with storage key: ${storageKey}`, {
        client_user_id: collection.client_user_id,
        firebase_user_id: collection.firebase_user_id,
        db_user_id: collection.db_user_id,
        cards_count: Object.keys(collection.cards_owned).length,
        credits: collection.eco_credits,
        pending_actions: collection.action_queue.length
      });

      // CRITICAL: Sync device ID from collection to prevent mismatches
      // The collection's device ID is the source of truth
      if (collection.device_id && collection.device_id !== this.deviceId) {
        console.log(`🔄 [DEVICE-ID-SYNC] Syncing device ID from collection:`, {
          currentDeviceId: this.deviceId,
          collectionDeviceId: collection.device_id
        });
        this.deviceId = collection.device_id;

        // Save the synced device ID to storage
        if (this.currentUserId) {
          await this.storageAdapter.setUserScopedItem(this.currentUserId, 'device_id', this.deviceId);
        } else {
          await this.storageAdapter.setItem('device_id', this.deviceId);
        }
        console.log(`✅ [DEVICE-ID-SYNC] Device ID synced successfully: ${this.deviceId}`);
      }

      return collection;
    } catch (error) {
      console.error('Failed to load offline collection:', error);
      return null;
    }
  }

  /**
   * Save offline collection to storage (user-scoped)
   * Uses deterministic storage key based on 3-ID architecture
   */
  async saveOfflineCollection(collection: Omit<OfflineCollection, 'collection_hash'>): Promise<void> {
    const collectionWithHash: OfflineCollection = {
      ...collection,
      collection_hash: this.calculateCollectionHash(collection)
    };

    // Use deterministic storage key: firebase_user_id > db_user_id > client_user_id
    const storageKey = this.getStorageKey(collectionWithHash);

    await this.storageAdapter.setUserScopedItem(storageKey, 'collection', JSON.stringify(collectionWithHash));

    console.log(`💾 Saved collection with storage key: ${storageKey}`, {
      client_user_id: collection.client_user_id,
      firebase_user_id: collection.firebase_user_id,
      db_user_id: collection.db_user_id,
      cards_count: Object.keys(collection.cards_owned).length,
      credits: collection.eco_credits,
      pending_actions: collection.action_queue.length
    });
  }

  /**
   * Create initial collection for new user
   * @param clientUserId - Device-generated UUID (always present)
   * @param firebaseUserId - Firebase UID (null for anonymous/guest)
   * @param dbUserId - Server-assigned UUID (null for anonymous, present after guest registration)
   */
  createInitialCollection(
    clientUserId: string,
    firebaseUserId: string | null = null,
    dbUserId: string | null = null
  ): OfflineCollection {
    // CRITICAL: Device ID must be initialized before creating collection
    // This method should only be called after ensureInitialized()
    if (!this.deviceId) {
      throw new Error('Device ID not initialized. Call ensureInitialized() before creating collection.');
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
      client_user_id: clientUserId,
      firebase_user_id: firebaseUserId,
      db_user_id: dbUserId,
      device_id: this.deviceId,
      cards_owned: {},
      eco_credits: 100, // Starting credits
      xp_points: 0,
      action_queue: [],
      last_sync: 0,
      signing_key_version: signingKeyVersion,
      collection_version: 1,        // Start at version 1
      last_synced_version: 0        // Never synced yet
    };

    console.log(`📦 Created initial collection with 3-ID architecture:`, {
      client_user_id: clientUserId,
      firebase_user_id: firebaseUserId,
      db_user_id: dbUserId,
      device_id: this.deviceId,
      storage_key: this.getStorageKey(collection as OfflineCollection)
    });

    return {
      ...collection,
      collection_hash: this.calculateCollectionHash(collection)
    };
  }

  /**
   * Get deterministic storage key for a collection
   * Priority: firebase_user_id > db_user_id > client_user_id
   */
  getStorageKey(collection: OfflineCollection): string {
    return collection.firebase_user_id || collection.db_user_id || collection.client_user_id;
  }

  /**
   * Increment collection version (for optimistic locking)
   * Call this whenever the collection is modified locally
   */
  incrementCollectionVersion(collection: OfflineCollection): OfflineCollection {
    const updatedCollection = {
      ...collection,
      collection_version: collection.collection_version + 1
    };

    // Recalculate hash with new version
    const collectionForHashing: Omit<OfflineCollection, 'collection_hash'> = {
      client_user_id: updatedCollection.client_user_id,
      firebase_user_id: updatedCollection.firebase_user_id,
      db_user_id: updatedCollection.db_user_id,
      device_id: updatedCollection.device_id,
      cards_owned: updatedCollection.cards_owned,
      eco_credits: updatedCollection.eco_credits,
      xp_points: updatedCollection.xp_points,
      action_queue: updatedCollection.action_queue,
      last_sync: updatedCollection.last_sync,
      signing_key_version: updatedCollection.signing_key_version,
      collection_version: updatedCollection.collection_version,
      last_synced_version: updatedCollection.last_synced_version,
      activeDeck: updatedCollection.activeDeck,
      savedDecks: updatedCollection.savedDecks
    };

    updatedCollection.collection_hash = this.calculateCollectionHash(collectionForHashing);

    console.log('📈 [VERSION] Collection version incremented:', {
      oldVersion: collection.collection_version,
      newVersion: updatedCollection.collection_version
    });

    return updatedCollection;
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
    const collectionForHashing: Omit<OfflineCollection, 'collection_hash'> = {
      client_user_id: updatedCollection.client_user_id,
      firebase_user_id: updatedCollection.firebase_user_id,
      db_user_id: updatedCollection.db_user_id,
      device_id: updatedCollection.device_id,
      cards_owned: updatedCollection.cards_owned,
      eco_credits: updatedCollection.eco_credits,
      xp_points: updatedCollection.xp_points,
      action_queue: updatedCollection.action_queue,
      last_sync: updatedCollection.last_sync,
      signing_key_version: updatedCollection.signing_key_version,
      collection_version: updatedCollection.collection_version,
      last_synced_version: updatedCollection.last_synced_version,
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
   * Set device ID (used when server provides a device ID during registration)
   */
  async setDeviceId(deviceId: string): Promise<void> {
    console.log('🔧 [DEVICE-ID] Setting device ID:', {
      oldDeviceId: this.deviceId,
      newDeviceId: deviceId,
      userId: this.currentUserId
    });
    this.deviceId = deviceId;

    // Store in user-scoped storage if we have a user ID
    if (this.currentUserId) {
      await this.storageAdapter.setUserScopedItem(this.currentUserId, 'device_id', deviceId);
      console.log('✅ [DEVICE-ID] Device ID updated and saved to user-scoped storage');

      // Update the collection's device ID if it exists
      const collection = await this.getCollectionState();
      if (collection) {
        collection.device_id = deviceId;
        await this.saveOfflineCollection(collection);
        console.log('✅ [DEVICE-ID] Updated collection device ID');
      }
    } else {
      // Fallback to global storage if no user ID yet
      await this.storageAdapter.setItem('device_id', deviceId);
      console.log('✅ [DEVICE-ID] Device ID updated and saved to global storage');
    }
  }

  /**
   * Decrypt signing key using AES-256-CBC (matching server encryption)
   * @param encryptedData - Encrypted data in format "iv:encrypted"
   * @param secret - Secret key for decryption (guest secret)
   * @returns Decrypted signing key
   */
  private decryptSigningKey(encryptedData: string, secret: string): string {
    try {
      // Check if this is the new format (contains ':' separator)
      if (!encryptedData.includes(':')) {
        throw new Error('Invalid encrypted data format - missing IV separator');
      }

      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format - expected IV:encrypted');
      }

      const ivHex = parts[0]!;
      const encryptedHex = parts[1]!;

      // Normalize the secret key to 32 bytes using SHA-256 (matching server)
      const normalizedKey = CryptoJS.SHA256(secret);

      // Convert IV from hex to WordArray
      const iv = CryptoJS.enc.Hex.parse(ivHex);

      // Convert encrypted data from hex to WordArray
      const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);

      // Create cipherParams object
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: encrypted
      });

      // Decrypt using AES-256-CBC
      const decrypted = CryptoJS.AES.decrypt(cipherParams, normalizedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Convert to UTF-8 string
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error('Decryption resulted in empty string');
      }

      return decryptedString;
    } catch (error) {
      console.error('❌ [DECRYPT] Decryption failed:', error);
      throw new Error(`Failed to decrypt signing key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set signing key (used when server provides a signing key during registration)
   * @param encryptedKey - Encrypted signing key from server
   * @param keyVersion - Key version number
   */
  async setSigningKey(encryptedKey: string, keyVersion: number): Promise<void> {
    console.log('🔑 [SIGNING-KEY] Setting signing key from server:', {
      keyVersion,
      encryptedKeyPreview: encryptedKey.substring(0, 20) + '...',
      userId: this.currentUserId
    });

    if (!this.currentUserId) {
      console.error('❌ [SIGNING-KEY] Cannot set signing key without user ID');
      throw new Error('User ID required to set signing key');
    }

    // Get the encryption key from environment or use default
    // This should match the server's ENCRYPTION_KEY
    const encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY || 'biomasters-dev-key-32-chars-long!';

    try {
      const decryptedKey = this.decryptSigningKey(encryptedKey, encryptionKey);
      console.log('🔑 [SIGNING-KEY] Decrypted signing key:', {
        decryptedKeyPreview: decryptedKey.substring(0, 16) + '...',
        decryptedKeyLength: decryptedKey.length
      });

      // Update in-memory signing key
      this.signingKey = decryptedKey;
      this.signingKeyVersion = keyVersion;

      // Store encrypted key in user-scoped storage
      await this.storageAdapter.setUserScopedItem(this.currentUserId, 'signing_key', encryptedKey);
      await this.storageAdapter.setUserScopedItem(this.currentUserId, 'signing_key_version', keyVersion.toString());

      console.log('✅ [SIGNING-KEY] Signing key updated and saved');
    } catch (error) {
      console.error('❌ [SIGNING-KEY] Failed to decrypt signing key:', error);
      throw new Error('Failed to decrypt signing key from server');
    }
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
