/**
 * Sync Service
 * Handles synchronization between offline and online data with conflict resolution
 */

import { gameApi } from './apiClient';
import { offlineSecurityService, OfflineCollection, OfflineAction, SyncPayload, SyncResponse } from './offlineSecurityService';

export interface SyncConflict {
  action_id: string;
  reason: string;
  server_state: any;
  user_action: OfflineAction;
  resolution: 'server_wins' | 'user_wins' | 'merge' | 'manual';
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  discarded_actions: string[];
  updated_collection: OfflineCollection;
  error?: string;
}

class SyncService {
  private readonly SYNC_COOLDOWN = 5000; // 5 seconds between sync attempts

  /**
   * Perform full synchronization with server
   * Now stateless - sync state tracking moved to calling code
   */
  async syncWithServer(
    collection: OfflineCollection,
    authToken?: string,
    syncState?: { isSyncing: boolean; lastSyncAttempt: number },
    conflictResolutions?: Record<string, 'server_wins' | 'user_wins' | 'merge'>
  ): Promise<SyncResult & { newSyncState: { isSyncing: boolean; lastSyncAttempt: number } }> {
    const currentSyncState = syncState || { isSyncing: false, lastSyncAttempt: 0 };

    console.log('🔄 [SYNC-SERVICE] Starting sync with server...', {
      hasConflictResolutions: !!conflictResolutions,
      resolutionCount: conflictResolutions ? Object.keys(conflictResolutions).length : 0,
      resolutions: conflictResolutions,
      timestamp: new Date().toISOString()
    });

    if (currentSyncState.isSyncing) {
      throw new Error('Sync already in progress');
    }

    const now = Date.now();
    const isTestEnvironment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!isTestEnvironment && now - currentSyncState.lastSyncAttempt < this.SYNC_COOLDOWN) {
      console.log('⏳ [SYNC] Sync cooldown active, waiting...', {
        timeSinceLastAttempt: now - currentSyncState.lastSyncAttempt,
        cooldownPeriod: this.SYNC_COOLDOWN,
        isTestEnvironment
      });
      throw new Error('Sync cooldown active. Please wait before syncing again.');
    }

    if (isTestEnvironment) {
      console.log('🧪 [SYNC] Test environment detected, bypassing sync cooldown');
    }

    const newSyncState = { isSyncing: true, lastSyncAttempt: now };

    // Prepare sync payload outside try block so it's available in catch
    const syncPayload: SyncPayload = {
      device_id: collection.device_id,
      offline_actions: collection.action_queue,
      collection_state: collection,
      client_version: '1.0.0',
      last_known_server_state: collection.last_sync.toString()
    };

    try {

      console.log('🔄 Sending sync payload:', {
        device_id: syncPayload.device_id,
        actions_count: syncPayload.offline_actions.length,
        client_version: syncPayload.client_version,
        has_collection_state: !!syncPayload.collection_state,
        collection_keys: Object.keys(syncPayload.collection_state),
        authToken: authToken ? 'Present' : 'Missing'
      });

      // Send to server for validation and processing
      console.log('🌐 Making sync HTTP request:', {
        payloadSize: JSON.stringify(syncPayload).length,
        hasAuthToken: !!authToken,
        syncPayloadDetails: {
          device_id: syncPayload.device_id,
          client_version: syncPayload.client_version,
          offline_actions: syncPayload.offline_actions?.map(action => ({
            action_id: action.id,
            action_type: action.action,
            timestamp: action.timestamp
          })) || [],
          collection_state: {
            user_id: syncPayload.collection_state?.user_id,
            device_id: syncPayload.collection_state?.device_id,
            eco_credits: syncPayload.collection_state?.eco_credits,
            xp_points: syncPayload.collection_state?.xp_points,
            last_sync: syncPayload.collection_state?.last_sync,
            collection_hash: syncPayload.collection_state?.collection_hash
          },
          conflict_resolutions: conflictResolutions
        }
      });

      console.log('🔍 [SYNC] Exact payload being sent to server:', {
        payloadKeys: Object.keys(syncPayload),
        device_id: syncPayload.device_id,
        device_id_type: typeof syncPayload.device_id,
        offline_actions_type: typeof syncPayload.offline_actions,
        offline_actions_isArray: Array.isArray(syncPayload.offline_actions),
        offline_actions_length: syncPayload.offline_actions?.length,
        collection_state_type: typeof syncPayload.collection_state,
        collection_state_keys: syncPayload.collection_state ? Object.keys(syncPayload.collection_state) : 'null',
        client_version: syncPayload.client_version,
        client_version_type: typeof syncPayload.client_version,
        last_known_server_state: syncPayload.last_known_server_state,
        last_known_server_state_type: typeof syncPayload.last_known_server_state
      });

      console.log('🔍 [SYNC] Full payload structure:', JSON.stringify(syncPayload, null, 2));

      const response = await gameApi.syncCollection(syncPayload);
      const syncResponse = response.data.data || response.data;

      // Process sync response
      const result = await this.processSyncResponse(collection, syncResponse, conflictResolutions);
      return {
        ...result,
        newSyncState: { isSyncing: false, lastSyncAttempt: now }
      };

    } catch (error) {
      console.error('❌ [SYNC] Sync failed with detailed error:', {
        error: error instanceof Error ? error.message : 'Unknown sync error',
        errorType: error?.constructor?.name,
        errorStack: error instanceof Error ? error.stack : undefined,
        isAxiosError: (error as any)?.isAxiosError,
        responseStatus: (error as any)?.response?.status,
        responseData: (error as any)?.response?.data,
        requestConfig: (error as any)?.config ? {
          url: (error as any).config.url,
          method: (error as any).config.method,
          headers: (error as any).config.headers
        } : undefined,
        syncPayload: typeof syncPayload !== 'undefined' ? {
          device_id: syncPayload.device_id,
          offline_actions_count: syncPayload.offline_actions?.length || 0,
          collection_state_keys: syncPayload.collection_state ? Object.keys(syncPayload.collection_state) : [],
          client_version: syncPayload.client_version,
          last_known_server_state: syncPayload.last_known_server_state
        } : 'syncPayload not yet defined - error occurred before payload creation',
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        conflicts: [],
        discarded_actions: [],
        updated_collection: collection,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        newSyncState: { isSyncing: false, lastSyncAttempt: now }
      };
    }
  }



  /**
   * Process sync response and handle conflicts
   */
  private async processSyncResponse(
    localCollection: OfflineCollection,
    response: SyncResponse,
    conflictResolutions?: Record<string, 'server_wins' | 'user_wins' | 'merge'>
  ): Promise<SyncResult> {
    const conflicts: SyncConflict[] = [];
    const discardedActions: string[] = [];

    // Handle conflicts
    if (response.conflicts && response.conflicts.length > 0) {
      console.log('🔍 [SYNC-SERVICE] Processing conflicts...', {
        conflictCount: response.conflicts.length,
        hasUserResolutions: !!conflictResolutions,
        userResolutions: conflictResolutions
      });

      for (const conflict of response.conflicts) {
        const userAction = localCollection.action_queue.find(a => a.id === conflict.action_id);

        if (userAction) {
          // Use user-provided resolution if available, otherwise auto-resolve
          const userResolution = conflictResolutions?.[conflict.action_id];
          const finalResolution = userResolution || this.resolveConflict(conflict, userAction);

          console.log('🔧 [SYNC-SERVICE] Resolving conflict:', {
            actionId: conflict.action_id,
            reason: conflict.reason,
            userResolution,
            finalResolution,
            wasUserProvided: !!userResolution
          });

          const resolvedConflict: SyncConflict = {
            action_id: conflict.action_id,
            reason: conflict.reason,
            server_state: conflict.server_state,
            user_action: userAction,
            resolution: finalResolution
          };

          conflicts.push(resolvedConflict);

          // If server wins, discard the user action
          if (resolvedConflict.resolution === 'server_wins') {
            console.log('📤 [SYNC-SERVICE] Discarding action (server wins):', conflict.action_id);
            discardedActions.push(conflict.action_id);
          } else if (resolvedConflict.resolution === 'user_wins') {
            console.log('📥 [SYNC-SERVICE] Keeping action (user wins):', conflict.action_id);
          }
        }
      }
    }

    // Add explicitly discarded actions
    if (response.discarded_actions) {
      discardedActions.push(...response.discarded_actions);
    }

    // Handle existing action chain from server (for nonce calculation only)
    if (response.existing_action_chain && response.existing_action_chain.length > 0) {
      console.log('🔗 [SYNC-SERVICE] Server provided existing action chain for nonce calculation:', {
        actionCount: response.existing_action_chain.length,
        actionIds: response.existing_action_chain.map(a => a.action_id)
      });

      // Update the offline security service with the count of server-processed actions
      // This will be used to calculate the correct starting nonce for new actions
      // DO NOT remove these from local queue - they represent user progress
      offlineSecurityService.updateServerProcessedActionsCount(response.existing_action_chain.length);
      console.log('🔗 [SYNC-SERVICE] Updated server processed actions count for correct nonce calculation');
    }

    // Update signing key if provided
    if (response.new_signing_key) {
      offlineSecurityService.updateSigningKey(
        response.new_signing_key.key,
        response.new_signing_key.version,
        response.new_signing_key.expires_at
      );
    }

    // Merge local and server state intelligently
    const mergedCards = { ...localCollection.cards_owned };

    // For each card in server state, use the higher quantity (server is authoritative after sync)
    for (const [cardId, serverCard] of Object.entries(response.new_server_state.cards_owned)) {
      mergedCards[parseInt(cardId)] = serverCard;
    }

    // For first-time sync, if server is empty but local has data, preserve local data
    const hasServerData = Object.keys(response.new_server_state.cards_owned).length > 0;
    const hasLocalData = Object.keys(localCollection.cards_owned).length > 0;

    console.log('🔄 Sync merge logic:', {
      hasServerData,
      hasLocalData,
      serverCardsCount: Object.keys(response.new_server_state.cards_owned).length,
      localCardsCount: Object.keys(localCollection.cards_owned).length,
      serverCredits: response.new_server_state.eco_credits,
      localCredits: localCollection.eco_credits
    });

    const finalCards = hasServerData || !hasLocalData ?
      mergedCards :
      localCollection.cards_owned;

    console.log('💰 Credit sync details:', {
      local_credits: localCollection.eco_credits,
      server_credits: response.new_server_state.eco_credits,
      credit_change: response.new_server_state.eco_credits - localCollection.eco_credits,
      actions_processed: localCollection.action_queue.length - discardedActions.length
    });

    const updatedCollection: OfflineCollection = {
      ...localCollection,
      cards_owned: finalCards,
      eco_credits: response.new_server_state.eco_credits, // Use server credits as authoritative
      xp_points: response.new_server_state.xp_points, // Use server XP as authoritative
      action_queue: localCollection.action_queue.filter(
        action => !discardedActions.includes(action.id)
      ),
      last_sync: Date.now(),
      signing_key_version: response.new_signing_key?.version || localCollection.signing_key_version
    };

    // Recalculate collection hash
    const finalCollection = {
      ...updatedCollection,
      collection_hash: offlineSecurityService.calculateCollectionHash(updatedCollection)
    };

    return {
      success: response.success,
      conflicts,
      discarded_actions: discardedActions,
      updated_collection: finalCollection
    };
  }

  /**
   * Resolve sync conflicts automatically where possible
   */
  private resolveConflict(conflict: any, userAction: OfflineAction): 'server_wins' | 'user_wins' | 'merge' | 'manual' {
    // Automatic resolution rules
    switch (conflict.reason) {
      case 'insufficient_credits':
      case 'invalid_pack_type':
      case 'card_not_owned':
        // Server wins for validation errors
        return 'server_wins';

      case 'timestamp_too_old':
        // If action is more than 24 hours old, server wins
        const actionAge = Date.now() - userAction.timestamp;
        return actionAge > 24 * 60 * 60 * 1000 ? 'server_wins' : 'manual';

      case 'duplicate_action':
        // Server wins for duplicates
        return 'server_wins';

      case 'version_mismatch':
        // Manual resolution needed for version conflicts
        return 'manual';

      default:
        // Unknown conflicts require manual resolution
        return 'manual';
    }
  }

  /**
   * Get user-friendly conflict explanations
   */
  getConflictExplanation(conflict: SyncConflict): string {
    switch (conflict.reason) {
      case 'insufficient_credits':
        return `You tried to open a pack but didn't have enough credits. Your credits have been restored to the server amount.`;

      case 'invalid_pack_type':
        return `The pack type you tried to open is no longer available. This action has been cancelled.`;

      case 'card_not_owned':
        return `You tried to use a card you don't own. Your collection has been updated to match the server.`;

      case 'timestamp_too_old':
        return `This action was performed too long ago and conflicts with recent server changes. It has been discarded.`;

      case 'duplicate_action':
        return `This action was already processed on another device. The duplicate has been removed.`;

      case 'version_mismatch':
        return `Your game version is outdated. Please update to continue syncing.`;

      case 'invalid_signature':
        return `This action's security signature is invalid. This can happen when your device's security key has expired or been reset. Your signing key has been refreshed.`;

      case 'missing_signature':
        return `This action is missing a required security signature. This action has been discarded for security reasons.`;

      case 'starter_pack_already_opened':
        return `You've already opened your starter pack on another device. This duplicate action has been discarded.`;

      default:
        return `An unknown conflict occurred: ${conflict.reason}. Please contact support if this persists.`;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(syncState: { isSyncing: boolean; lastSyncAttempt: number }): boolean {
    return syncState.isSyncing;
  }

  /**
   * Get time until next sync is allowed
   */
  getTimeUntilNextSync(syncState: { isSyncing: boolean; lastSyncAttempt: number }): number {
    const timeSinceLastAttempt = Date.now() - syncState.lastSyncAttempt;
    return Math.max(0, this.SYNC_COOLDOWN - timeSinceLastAttempt);
  }

  /**
   * Force sync (bypasses cooldown) - use carefully
   */
  async forceSyncWithServer(
    collection: OfflineCollection,
    authToken?: string,
    syncState?: { isSyncing: boolean; lastSyncAttempt: number },
    conflictResolutions?: Record<string, 'server_wins' | 'user_wins' | 'merge'>
  ): Promise<SyncResult & { newSyncState: { isSyncing: boolean; lastSyncAttempt: number } }> {
    const resetSyncState = { isSyncing: false, lastSyncAttempt: 0 }; // Reset cooldown
    return this.syncWithServer(collection, authToken, resetSyncState, conflictResolutions);
  }

  /**
   * Validate collection integrity before sync
   */
  validateCollectionForSync(collection: OfflineCollection): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check collection hash - exclude the collection_hash field from the calculation
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

    const expectedHash = offlineSecurityService.calculateCollectionHash(collectionForHashing);
    if (collection.collection_hash !== expectedHash) {
      console.error(`❌ Collection integrity check failed:`, {
        expectedHash,
        actualHash: collection.collection_hash,
        signingKeyVersion: collection.signing_key_version,
        deviceId: collection.device_id,
        userId: collection.user_id
      });
      errors.push('Collection integrity check failed');
    }

    // Check for unsigned actions
    const unsignedActions = collection.action_queue.filter(action => !action.signature);
    if (unsignedActions.length > 0) {
      errors.push(`${unsignedActions.length} unsigned actions found`);
    }

    // Check for future timestamps
    const now = Date.now();
    const futureActions = collection.action_queue.filter(action => action.timestamp > now + 60000); // 1 minute tolerance
    if (futureActions.length > 0) {
      errors.push(`${futureActions.length} actions have future timestamps`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const syncService = new SyncService();
export default syncService;
