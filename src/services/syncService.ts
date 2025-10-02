/**
 * Sync Service
 * Handles synchronization between offline and online data with conflict resolution
 */

import { gameApi } from './apiClient';
import { offlineSecurityService, OfflineCollection, OfflineAction, SyncPayload, SyncResponse } from './offlineSecurityService';
import CryptoJS from 'crypto-js';

export interface SyncConflict {
  action_id: string;
  reason: string;
  server_state: any;
  user_action: OfflineAction;
  resolution: 'server_wins' | 'user_wins' | 'merge' | 'manual';
  cascade_impact?: CascadeImpact; // Impact of rolling back this action
}

export interface CascadeImpact {
  total_actions_affected: number;
  cards_lost: Array<{ cardId: number; quantity: number }>;
  credits_refunded: number;
  xp_lost: number;
  decks_invalidated: Array<{ deck_id: string; deck_name: string; reason: string }>;
  battles_invalidated: Array<{ battle_id?: string; stage_name?: string; reason: string }>;
  dependent_actions: Array<{
    action_id: string;
    action_type: string;
    description: string;
  }>;
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

    // Generate unique transaction ID for idempotency
    const transactionId = `txn_${collection.device_id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Prepare sync payload outside try block so it's available in catch
    const syncPayload: SyncPayload = {
      device_id: collection.device_id,
      offline_actions: collection.action_queue,
      collection_state: collection,
      client_version: '1.0.0',
      last_known_server_state: collection.last_sync.toString(),
      transaction_id: transactionId
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
            client_user_id: syncPayload.collection_state?.client_user_id,
            firebase_user_id: syncPayload.collection_state?.firebase_user_id,
            db_user_id: syncPayload.collection_state?.db_user_id,
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

      // Check if the error response contains server_processed_actions_count
      // This happens when there's a nonce mismatch - we need to synchronize our counter
      const errorResponse = (error as any)?.response?.data;
      if (errorResponse?.server_processed_actions_count !== undefined) {
        console.log('🔗 [SYNC-ERROR] Server sent processed actions count in error response:', {
          count: errorResponse.server_processed_actions_count,
          currentCount: offlineSecurityService.getServerProcessedActionsCount()
        });
        offlineSecurityService.updateServerProcessedActionsCount(errorResponse.server_processed_actions_count);
        console.log('✅ [SYNC-ERROR] Updated server processed actions count from error response');
      }

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

          // Calculate cascade impact for this conflict
          const cascadeImpact = this.calculateCascadeImpact(conflict.action_id, localCollection);

          const resolvedConflict: SyncConflict = {
            action_id: conflict.action_id,
            reason: conflict.reason,
            server_state: conflict.server_state,
            user_action: userAction,
            resolution: finalResolution,
            cascade_impact: cascadeImpact
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

    // Update server processed actions count from server response
    // The server sends the total count of successfully processed actions for this device
    const serverProcessedCount = (response as any).server_processed_actions_count ?? response.existing_action_chain?.length ?? 0;

    if (serverProcessedCount > 0) {
      console.log('🔗 [SYNC-SERVICE] Updating server processed actions count:', {
        count: serverProcessedCount,
        source: (response as any).server_processed_actions_count !== undefined ? 'server_processed_actions_count' : 'existing_action_chain'
      });

      // Update the offline security service with the count of server-processed actions
      // This will be used to calculate the correct starting nonce for new actions
      offlineSecurityService.updateServerProcessedActionsCount(serverProcessedCount);
      console.log('🔗 [SYNC-SERVICE] Updated server processed actions count for correct nonce calculation');
    }

    // Calculate and store the hash of the last synced action for chain continuity
    // This is needed when the action queue is cleared after sync
    if (response.existing_action_chain && response.existing_action_chain.length > 0) {
      const lastSyncedAction = response.existing_action_chain[response.existing_action_chain.length - 1];

      // Reconstruct the action from the server's action_data
      const actionData = lastSyncedAction.action_data;

      // Build hash payload matching the frontend's hash calculation
      const hashPayload: any = {
        id: actionData.id,
        action: actionData.action,
        timestamp: actionData.timestamp,
        api_version: actionData.api_version
      };

      // Add optional fields if they exist
      if (actionData.card_id !== undefined) {
        hashPayload.card_id = actionData.card_id;
      }
      if (actionData.quantity !== undefined) {
        hashPayload.quantity = actionData.quantity;
      }
      if (actionData.pack_type !== undefined) {
        hashPayload.pack_type = actionData.pack_type;
      }
      if (actionData.deck_id !== undefined) {
        hashPayload.deck_id = actionData.deck_id;
      }

      // Add chain integrity fields
      hashPayload.device_id = actionData.device_id;
      hashPayload.key_version = actionData.key_version;
      hashPayload.previous_hash = actionData.previous_hash;
      hashPayload.nonce = actionData.nonce;

      // Calculate the hash
      const lastActionHash = CryptoJS.SHA256(JSON.stringify(hashPayload)).toString();

      console.log('🔗 [SYNC-HASH] Calculated hash of last synced action:', {
        actionId: actionData.id,
        actionType: actionData.action,
        nonce: actionData.nonce,
        hash: lastActionHash.substring(0, 16) + '...',
        fullHash: lastActionHash
      });

      // Store the hash for future action chaining
      offlineSecurityService.updateLastSyncedActionHash(lastActionHash);
    } else {
      // No actions synced, clear the last synced action hash
      offlineSecurityService.updateLastSyncedActionHash(null);
    }

    // Handle existing action chain from server (for nonce calculation only)
    if (response.existing_action_chain && response.existing_action_chain.length > 0) {
      console.log('🔗 [SYNC-SERVICE] Server provided existing action chain for nonce calculation:', {
        actionCount: response.existing_action_chain.length,
        actionIds: response.existing_action_chain.map(a => a.action_id)
      });

      // NEW: Reconcile local action queue with server's processed actions
      console.log('🔗 [SYNC-RECONCILE] Reconciling action queue with server...');

      const serverActionIds = new Set(
        response.existing_action_chain.map(a => a.action_id)
      );
      const localActionIds = new Set(
        localCollection.action_queue.map(a => a.id)
      );

      // Find actions that exist on server but not locally (lost during refresh)
      const missingFromLocal = response.existing_action_chain.filter(
        serverAction => !localActionIds.has(serverAction.action_id)
      );

      // Find actions that exist locally but not on server (need to sync)
      const missingFromServer = localCollection.action_queue.filter(
        localAction => !serverActionIds.has(localAction.id)
      );

      console.log('🔗 [SYNC-RECONCILE] Reconciliation analysis:', {
        serverActionCount: response.existing_action_chain.length,
        localActionCount: localCollection.action_queue.length,
        missingFromLocal: missingFromLocal.length,
        missingFromServer: missingFromServer.length
      });

      // Strategy: Server is source of truth for processed actions
      // Remove all actions that server has already processed
      const unprocessedActions = localCollection.action_queue.filter(
        action => !serverActionIds.has(action.id)
      );

      // Update local queue to only contain unprocessed actions
      localCollection.action_queue = unprocessedActions;

      console.log('✅ [SYNC-RECONCILE] Queue reconciled:', {
        remainingActions: unprocessedActions.length,
        removedActions: localActionIds.size - unprocessedActions.length
      });
    }

    // Update signing key ONLY if server provided a new one (version changed)
    if (response.new_signing_key) {
      console.log('🔑 [SYNC] Server provided new signing key:', {
        oldVersion: localCollection.signing_key_version,
        newVersion: response.new_signing_key.version,
        versionChanged: localCollection.signing_key_version !== response.new_signing_key.version
      });

      await offlineSecurityService.updateSigningKey(
        response.new_signing_key.key,
        response.new_signing_key.version,
        response.new_signing_key.expires_at
      );
    } else {
      console.log('🔑 [SYNC] No new signing key from server (version stable):', {
        currentVersion: localCollection.signing_key_version
      });
    }

    // Merge local and server state intelligently
    const mergedCards = { ...localCollection.cards_owned };

    console.log('🔄 [SYNC] Merging server cards into local collection:', {
      serverCardsRaw: response.new_server_state.cards_owned,
      serverCardKeys: Object.keys(response.new_server_state.cards_owned),
      localCardKeys: Object.keys(localCollection.cards_owned)
    });

    // For each card in server state, use the higher quantity (server is authoritative after sync)
    for (const [cardId, serverCard] of Object.entries(response.new_server_state.cards_owned)) {
      // Server returns card IDs as strings like "card_1", extract the numeric part
      const numericCardId = typeof cardId === 'string' && cardId.startsWith('card_')
        ? parseInt(cardId.replace('card_', ''))
        : parseInt(cardId);

      console.log('🔄 [SYNC] Processing card:', {
        originalKey: cardId,
        numericCardId,
        isValid: !isNaN(numericCardId),
        cardData: serverCard
      });

      if (!isNaN(numericCardId)) {
        mergedCards[numericCardId] = serverCard;
      } else {
        console.warn('⚠️ [SYNC] Invalid card ID from server:', cardId);
      }
    }

    console.log('🔄 [SYNC] Merged cards result:', {
      mergedCardKeys: Object.keys(mergedCards),
      mergedCardCount: Object.keys(mergedCards).length,
      mergedCards
    });

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

    // Apply cascade rollback for all discarded actions
    let rolledBackCollection = localCollection;
    for (const discardedActionId of discardedActions) {
      console.log('🔄 [SYNC-SERVICE] Applying cascade rollback for discarded action:', discardedActionId);
      rolledBackCollection = this.rollbackActionCascade(discardedActionId, rolledBackCollection);
    }

    // Only update signing key version if server sent a new one
    // Server only sends new_signing_key when version has changed
    const currentKeyVersion = rolledBackCollection.signing_key_version;
    const serverKeyVersion = response.new_signing_key?.version;
    const shouldUpdateKeyVersion = serverKeyVersion !== undefined;

    console.log('🔑 [SYNC] Signing key version decision:', {
      currentVersion: currentKeyVersion,
      serverVersion: serverKeyVersion,
      serverSentNewKey: !!response.new_signing_key,
      willUpdate: shouldUpdateKeyVersion
    });

    const updatedCollection: OfflineCollection = {
      ...rolledBackCollection,
      cards_owned: finalCards,
      eco_credits: response.new_server_state.eco_credits, // Use server credits as authoritative
      xp_points: response.new_server_state.xp_points, // Use server XP as authoritative
      last_sync: Date.now(),
      signing_key_version: shouldUpdateKeyVersion ? serverKeyVersion : currentKeyVersion
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

      case 'timestamp_too_old': {
        // If action is more than 24 hours old, server wins
        const actionAge = Date.now() - userAction.timestamp;
        return actionAge > 24 * 60 * 60 * 1000 ? 'server_wins' : 'manual';
      }

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
      collection_version: collection.collection_version,
      last_synced_version: collection.last_synced_version,
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
        clientUserId: collection.client_user_id,
        firebaseUserId: collection.firebase_user_id,
        dbUserId: collection.db_user_id
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

  /**
   * Calculate cascade impact of rolling back an action
   * Analyzes all dependent actions that would need to be rolled back
   */
  calculateCascadeImpact(
    actionId: string,
    collection: OfflineCollection
  ): CascadeImpact {
    console.log('🔍 [CASCADE] Calculating cascade impact for action:', actionId);

    const impact: CascadeImpact = {
      total_actions_affected: 0,
      cards_lost: [],
      credits_refunded: 0,
      xp_lost: 0,
      decks_invalidated: [],
      battles_invalidated: [],
      dependent_actions: []
    };

    // Find the action being rolled back
    const targetAction = collection.action_queue.find(a => a.id === actionId);
    if (!targetAction) {
      console.warn('⚠️ [CASCADE] Action not found in queue:', actionId);
      return impact;
    }

    // Track cards affected by this action
    const affectedCardIds = new Set<number>();

    // Analyze the target action
    if (targetAction.action === 'pack_opened' || targetAction.action === 'starter_pack_opened') {
      // Find all card_acquired actions that came from this pack
      // (They would have timestamps shortly after the pack opening)
      const packTimestamp = targetAction.timestamp;
      const cardActions = collection.action_queue.filter(
        a => a.action === 'card_acquired' &&
             a.timestamp > packTimestamp &&
             a.timestamp < packTimestamp + 60000 // Within 1 minute
      );

      cardActions.forEach(cardAction => {
        if (cardAction.cardId) {
          affectedCardIds.add(cardAction.cardId);
          impact.cards_lost.push({
            cardId: cardAction.cardId,
            quantity: cardAction.quantity || 1
          });
          impact.dependent_actions.push({
            action_id: cardAction.id,
            action_type: cardAction.action,
            description: `Card ${cardAction.cardId} acquired from pack`
          });
        }
      });
    } else if (targetAction.action === 'card_acquired' && targetAction.cardId) {
      affectedCardIds.add(targetAction.cardId);
      impact.cards_lost.push({
        cardId: targetAction.cardId,
        quantity: targetAction.quantity || 1
      });
    }

    // Find decks that use the affected cards
    if (affectedCardIds.size > 0 && collection.savedDecks) {
      collection.savedDecks.forEach(deck => {
        const usesAffectedCard = deck.cards.some(
          deckCard => affectedCardIds.has(deckCard.cardId)
        );

        if (usesAffectedCard) {
          impact.decks_invalidated.push({
            deck_id: deck.id,
            deck_name: deck.name,
            reason: `Uses cards that would be removed: ${Array.from(affectedCardIds).join(', ')}`
          });

          // Find deck_created action
          const deckCreatedAction = collection.action_queue.find(
            a => a.action === 'deck_created' && a.deck_id === deck.id
          );
          if (deckCreatedAction) {
            impact.dependent_actions.push({
              action_id: deckCreatedAction.id,
              action_type: deckCreatedAction.action,
              description: `Deck "${deck.name}" uses affected cards`
            });
          }
        }
      });
    }

    // Find battles that used invalidated decks
    const invalidatedDeckIds = new Set(impact.decks_invalidated.map(d => d.deck_id));
    if (invalidatedDeckIds.size > 0) {
      const battleActions = collection.action_queue.filter(
        a => (a.action === 'battle_won' || a.action === 'battle_lost') &&
             a.battle_data?.deck_id &&
             invalidatedDeckIds.has(a.battle_data.deck_id)
      );

      battleActions.forEach(battleAction => {
        impact.battles_invalidated.push({
          stage_name: battleAction.battle_data?.stage_name || 'Unknown',
          reason: `Used invalidated deck`
        });
        impact.dependent_actions.push({
          action_id: battleAction.id,
          action_type: battleAction.action,
          description: `Battle at ${battleAction.battle_data?.stage_name || 'Unknown'} used invalidated deck`
        });

        // Track rewards that would be lost
        if (battleAction.battle_data?.rewards) {
          if (battleAction.battle_data.rewards.credits) {
            impact.credits_refunded += battleAction.battle_data.rewards.credits;
          }
          if (battleAction.battle_data.rewards.xp) {
            impact.xp_lost += battleAction.battle_data.rewards.xp;
          }
        }
      });
    }

    impact.total_actions_affected = impact.dependent_actions.length + 1; // +1 for the original action

    console.log('📊 [CASCADE] Cascade impact calculated:', impact);
    return impact;
  }

  /**
   * Rollback an action and all its dependent actions
   */
  rollbackActionCascade(
    actionId: string,
    collection: OfflineCollection
  ): OfflineCollection {
    console.log('🔄 [ROLLBACK] Rolling back action cascade:', actionId);

    const impact = this.calculateCascadeImpact(actionId, collection);

    // Collect all action IDs to remove
    const actionsToRemove = new Set([
      actionId,
      ...impact.dependent_actions.map(a => a.action_id)
    ]);

    console.log('🗑️ [ROLLBACK] Removing actions:', Array.from(actionsToRemove));

    // Remove actions from queue
    const updatedQueue = collection.action_queue.filter(
      action => !actionsToRemove.has(action.id)
    );

    // Revert cards
    const updatedCards = { ...collection.cards_owned };
    impact.cards_lost.forEach(({ cardId, quantity }) => {
      if (updatedCards[cardId]) {
        updatedCards[cardId] = {
          ...updatedCards[cardId],
          quantity: Math.max(0, updatedCards[cardId].quantity - quantity)
        };
        // Remove card entry if quantity is 0
        if (updatedCards[cardId].quantity === 0) {
          delete updatedCards[cardId];
        }
      }
    });

    // Remove invalidated decks
    const invalidatedDeckIds = new Set(impact.decks_invalidated.map(d => d.deck_id));
    const updatedDecks = (collection.savedDecks || []).filter(
      deck => !invalidatedDeckIds.has(deck.id)
    );

    // Clear active deck if it was invalidated
    const updatedActiveDeck = collection.activeDeck && invalidatedDeckIds.has(collection.activeDeck.id)
      ? undefined
      : collection.activeDeck;

    // Revert credits and XP
    const updatedCredits = collection.eco_credits - impact.credits_refunded;
    const updatedXP = collection.xp_points - impact.xp_lost;

    const rolledBackCollection: OfflineCollection = {
      ...collection,
      action_queue: updatedQueue,
      cards_owned: updatedCards,
      savedDecks: updatedDecks,
      activeDeck: updatedActiveDeck,
      eco_credits: Math.max(0, updatedCredits),
      xp_points: Math.max(0, updatedXP)
    };

    console.log('✅ [ROLLBACK] Cascade rollback complete:', {
      actionsRemoved: actionsToRemove.size,
      cardsLost: impact.cards_lost.length,
      decksRemoved: invalidatedDeckIds.size,
      creditsRefunded: impact.credits_refunded,
      xpLost: impact.xp_lost
    });

    return rolledBackCollection;
  }
}

export const syncService = new SyncService();
export default syncService;
