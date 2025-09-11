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
    syncState?: { isSyncing: boolean; lastSyncAttempt: number }
  ): Promise<SyncResult & { newSyncState: { isSyncing: boolean; lastSyncAttempt: number } }> {
    const currentSyncState = syncState || { isSyncing: false, lastSyncAttempt: 0 };

    if (currentSyncState.isSyncing) {
      throw new Error('Sync already in progress');
    }

    const now = Date.now();
    if (now - currentSyncState.lastSyncAttempt < this.SYNC_COOLDOWN) {
      throw new Error('Sync cooldown active. Please wait before syncing again.');
    }

    const newSyncState = { isSyncing: true, lastSyncAttempt: now };

    try {
      // Prepare sync payload
      const syncPayload: SyncPayload = {
        device_id: collection.device_id,
        offline_actions: collection.action_queue,
        collection_state: collection,
        client_version: '1.0.0',
        last_known_server_state: collection.last_sync.toString()
      };

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
        hasAuthToken: !!authToken
      });

      const response = await gameApi.syncCollection(syncPayload);
      const syncResponse = response.data.data || response.data;

      // Process sync response
      const result = await this.processSyncResponse(collection, syncResponse);
      return {
        ...result,
        newSyncState: { isSyncing: false, lastSyncAttempt: now }
      };

    } catch (error) {
      console.error('Sync failed:', error);
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
    response: SyncResponse
  ): Promise<SyncResult> {
    const conflicts: SyncConflict[] = [];
    const discardedActions: string[] = [];

    // Handle conflicts
    if (response.conflicts && response.conflicts.length > 0) {
      for (const conflict of response.conflicts) {
        const userAction = localCollection.action_queue.find(a => a.id === conflict.action_id);
        
        if (userAction) {
          const resolvedConflict: SyncConflict = {
            action_id: conflict.action_id,
            reason: conflict.reason,
            server_state: conflict.server_state,
            user_action: userAction,
            resolution: this.resolveConflict(conflict, userAction)
          };

          conflicts.push(resolvedConflict);

          // If server wins, discard the user action
          if (resolvedConflict.resolution === 'server_wins') {
            discardedActions.push(conflict.action_id);
          }
        }
      }
    }

    // Add explicitly discarded actions
    if (response.discarded_actions) {
      discardedActions.push(...response.discarded_actions);
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
    syncState?: { isSyncing: boolean; lastSyncAttempt: number }
  ): Promise<SyncResult & { newSyncState: { isSyncing: boolean; lastSyncAttempt: number } }> {
    const resetSyncState = { isSyncing: false, lastSyncAttempt: 0 }; // Reset cooldown
    return this.syncWithServer(collection, authToken, resetSyncState);
  }

  /**
   * Validate collection integrity before sync
   */
  validateCollectionForSync(collection: OfflineCollection): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check collection hash
    const expectedHash = offlineSecurityService.calculateCollectionHash(collection);
    if (collection.collection_hash !== expectedHash) {
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
