/**
 * Sync Service
 * Handles synchronization between offline and online data with conflict resolution
 */

import { apiService } from './apiService';
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
  private isSyncing = false;
  private lastSyncAttempt = 0;
  private readonly SYNC_COOLDOWN = 5000; // 5 seconds between sync attempts

  /**
   * Perform full synchronization with server
   */
  async syncWithServer(collection: OfflineCollection, authToken?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    const now = Date.now();
    if (now - this.lastSyncAttempt < this.SYNC_COOLDOWN) {
      throw new Error('Sync cooldown active. Please wait before syncing again.');
    }

    this.isSyncing = true;
    this.lastSyncAttempt = now;

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
      const response = await this.sendSyncRequest(syncPayload, authToken);

      // Process sync response
      return await this.processSyncResponse(collection, response);

    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        conflicts: [],
        discarded_actions: [],
        updated_collection: collection,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Send sync request to server
   */
  private async sendSyncRequest(payload: SyncPayload, authToken?: string): Promise<SyncResponse> {
    try {
      const token = authToken || apiService.getAuthToken();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

      console.log('🌐 Making sync HTTP request:', {
        url: `${API_BASE_URL}/api/sync`,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'None',
        payloadSize: JSON.stringify(payload).length
      });

      const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Sync request failed:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });

        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.log('❌ Failed to parse error response as JSON');
        }

        throw new Error((errorData as any).message || `Sync failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
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
    const mergedSpecies = { ...localCollection.species_owned };

    // For each species in server state, use the higher quantity (server is authoritative after sync)
    for (const [species, serverCard] of Object.entries(response.new_server_state.species_owned)) {
      mergedSpecies[species] = serverCard;
    }

    // For first-time sync, if server is empty but local has data, preserve local data
    const hasServerData = Object.keys(response.new_server_state.species_owned).length > 0;
    const hasLocalData = Object.keys(localCollection.species_owned).length > 0;

    console.log('🔄 Sync merge logic:', {
      hasServerData,
      hasLocalData,
      serverSpeciesCount: Object.keys(response.new_server_state.species_owned).length,
      localSpeciesCount: Object.keys(localCollection.species_owned).length,
      serverCredits: response.new_server_state.eco_credits,
      localCredits: localCollection.eco_credits
    });

    const finalSpecies = hasServerData || !hasLocalData ?
      mergedSpecies :
      localCollection.species_owned;

    const updatedCollection: OfflineCollection = {
      ...localCollection,
      species_owned: finalSpecies,
      eco_credits: Math.max(response.new_server_state.eco_credits, localCollection.eco_credits),
      xp_points: Math.max(response.new_server_state.xp_points, localCollection.xp_points),
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
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get time until next sync is allowed
   */
  getTimeUntilNextSync(): number {
    const timeSinceLastAttempt = Date.now() - this.lastSyncAttempt;
    return Math.max(0, this.SYNC_COOLDOWN - timeSinceLastAttempt);
  }

  /**
   * Force sync (bypasses cooldown) - use carefully
   */
  async forceSyncWithServer(collection: OfflineCollection, authToken?: string): Promise<SyncResult> {
    this.lastSyncAttempt = 0; // Reset cooldown
    return this.syncWithServer(collection, authToken);
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
