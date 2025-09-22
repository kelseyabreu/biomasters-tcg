/**
 * Sync Routes
 * Handles synchronization between offline and online data
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/kysely';
import { NewTransaction } from '../database/types';
// import { NewUserCard } from '../database/types'; // Unused for now
import { requireAuth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { decrypt } from '../utils/encryption';
// import { speciesNameToCardId_old } from '@kelseyabreu/shared'; // Disabled - function removed

const router = Router();

/**
 * Verify action chain integrity by checking previous_hash
 */
async function verifyActionChain(actions: OfflineAction[], deviceId: string, _keyVersion: number, userId: string): Promise<boolean> {
  try {
    // Get count of successful actions for this device to determine expected nonce start
    const actionCount = await db
      .selectFrom('sync_actions_log')
      .select(db => db.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .where('device_id', '=', deviceId)
      .where('status', '=', 'success')
      .executeTakeFirst();

    const successfulActionCount = Number(actionCount?.count || 0);
    const expectedNonceStart = successfulActionCount + 1;

    console.log(`🔍 [CHAIN-VERIFY] Device has ${successfulActionCount} successful actions, expecting nonce to start at ${expectedNonceStart}`);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action) {
        console.log(`❌ [CHAIN-VERIFY] Action at index ${i} is undefined`);
        return false;
      }

      const expectedNonce = expectedNonceStart + i;

      // First action in this batch should continue from where DB left off
      if (i === 0) {
        // For the very first action ever (no previous successful actions AND nonce is 1), previous_hash should be null
        if (successfulActionCount === 0 && action.nonce === 1) {
          if (action.previous_hash !== null) {
            console.log(`❌ [CHAIN-VERIFY] First ever action should have null previous_hash, got: ${action.previous_hash}`);
            return false;
          }
        }
        // For all other cases (continuing chains or multiple actions in first sync), accept the previous_hash
        // The client is responsible for maintaining proper chain integrity locally

        if (action.nonce !== expectedNonce) {
          console.log(`❌ [CHAIN-VERIFY] First action nonce mismatch: expected ${expectedNonce}, got: ${action.nonce}`);
          return false;
        }
        continue;
      }

      // Subsequent actions should have correct previous_hash
      const previousAction = actions[i - 1];
      if (!previousAction) {
        console.log(`❌ [CHAIN-VERIFY] Previous action at index ${i - 1} is undefined`);
        return false;
      }

      const expectedPreviousHash = crypto.createHash('sha256').update(JSON.stringify({
        id: previousAction.id,
        action: previousAction.action,
        card_id: previousAction.card_id,
        quantity: previousAction.quantity,
        pack_type: previousAction.pack_type,
        deck_id: previousAction.deck_id,
        timestamp: previousAction.timestamp,
        api_version: previousAction.api_version,
        device_id: deviceId,
        key_version: previousAction.key_version, // Use the action's original key version, not current device key version
        previous_hash: previousAction.previous_hash,
        nonce: previousAction.nonce
      })).digest('hex');

      if (action.previous_hash !== expectedPreviousHash) {
        console.log(`❌ [CHAIN-VERIFY] Invalid previous_hash for action ${i}:`, {
          actionId: action.id,
          expectedHash: expectedPreviousHash,
          actualHash: action.previous_hash
        });
        return false;
      }

      // Verify nonce sequence
      if (action.nonce !== expectedNonce) {
        console.log(`❌ [CHAIN-VERIFY] Invalid nonce for action ${i}: expected ${expectedNonce}, got ${action.nonce}`);
        return false;
      }
    }

    console.log(`✅ [CHAIN-VERIFY] Action chain integrity verified for ${actions.length} actions`);
    return true;
  } catch (error) {
    console.error('❌ [CHAIN-VERIFY] Error verifying action chain:', error);
    return false;
  }
}

/**
 * Verify HMAC signature for offline action
 * Must match the payload structure used in frontend offlineSecurityService.ts
 */
function verifyActionSignature(action: Omit<OfflineAction, 'signature'>, signature: string, signingKey: string, deviceId: string, keyVersion?: number): boolean {
  try {
    // Validate inputs
    if (!signature || !signingKey || !action) {
      console.log('❌ Missing required parameters for signature verification');
      return false;
    }

    // Validate signature format (should be hex)
    if (!/^[a-fA-F0-9]+$/.test(signature)) {
      console.log('❌ Invalid signature format (not hex)');
      return false;
    }

    // Create payload structure that matches frontend signing EXACTLY
    // This must match the EXACT order and structure in src/services/offlineSecurityService.ts signAction method
    // The frontend always includes ALL fields in this exact order, even if undefined
    // JSON.stringify will omit undefined values, so we need to match that behavior exactly

    // Create payload with chain integrity fields
    const frontendPayload = JSON.stringify({
      id: action.id,
      action: action.action,
      card_id: action.card_id,
      quantity: action.quantity,
      pack_type: action.pack_type,
      deck_id: action.deck_id,
      timestamp: action.timestamp,
      api_version: action.api_version,
      device_id: deviceId,
      key_version: action.key_version, // Use the action's original key version
      previous_hash: action.previous_hash,
      nonce: action.nonce
    });

    console.log('🔍 [SIGNATURE-VERIFY] Frontend payload test:', {
      actionId: action.id,
      frontendPayload: frontendPayload,
      actionKeys: Object.keys(action),
      hasCardId: 'cardId' in action,
      hasQuantity: 'quantity' in action,
      hasPackType: 'pack_type' in action,
      hasDeckId: 'deck_id' in action
    });

    const payload = frontendPayload;

    console.log('🔍 [SIGNATURE-VERIFY] Payload for verification:', {
      actionId: action.id,
      payloadLength: payload.length,
      deviceId: deviceId,
      deviceKeyVersion: keyVersion,
      actionKeyVersion: action.key_version,
      usedKeyVersion: action.key_version || keyVersion || 1,
      payload: payload
    });

    const expectedSignature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');

    console.log('🔍 [SIGNATURE-VERIFY] Signature comparison:', {
      actionId: action.id,
      receivedSignature: signature,
      expectedSignature: expectedSignature,
      signaturesMatch: signature === expectedSignature
    });

    // Ensure both signatures are the same length
    if (signature.length !== expectedSignature.length) {
      console.log('❌ Signature length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (error) {
    console.error('❌ Error during signature verification:', error);
    return false;
  }
}

/**
 * Retrieve historical signing keys for a batch of actions
 * Returns a Map of key_version -> decrypted_signing_key
 */
async function getHistoricalSigningKeys(deviceId: string, userId: string, keyVersions: number[]): Promise<Map<number, string>> {
  if (keyVersions.length === 0) {
    return new Map();
  }

  console.log('🔍 [KEY-LOOKUP] Fetching historical signing keys:', {
    deviceId,
    userId,
    keyVersions
  });

  const keys = await db
    .selectFrom('device_signing_keys')
    .select(['signing_key', 'key_version'])
    .where('device_id', '=', deviceId)
    .where('user_id', '=', userId)
    .where('key_version', 'in', keyVersions.map(v => BigInt(v)))
    .execute();

  const keyMap = new Map<number, string>();

  for (const key of keys) {
    try {
      const decryptedKey = decrypt(key.signing_key);
      keyMap.set(Number(key.key_version), decryptedKey);
    } catch (error) {
      console.error('❌ [KEY-LOOKUP] Failed to decrypt signing key:', {
        keyVersion: key.key_version,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log('✅ [KEY-LOOKUP] Retrieved signing keys:', {
    requested: keyVersions,
    found: Array.from(keyMap.keys()),
    missing: keyVersions.filter(v => !keyMap.has(v))
  });

  return keyMap;
}

interface OfflineAction {
  id: string;
  action: 'pack_opened' | 'card_acquired' | 'deck_created' | 'deck_updated' | 'starter_pack_opened';
  card_id?: number;        // New cardId system
  species_name?: string;   // Legacy support during transition
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

interface SyncPayload {
  device_id: string;
  offline_actions: OfflineAction[];
  collection_state: any;
  client_version: string;
  last_known_server_state?: string;
}

/**
 * POST /api/sync
 * Synchronize offline actions with server
 */
router.post('/',
  requireAuth,
  [
    body('device_id').isString().notEmpty(),
    body('offline_actions').isArray(),
    body('collection_state').isObject(),
    body('client_version').isString().notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('🔄 Sync request received:', {
        user: req.user ? { id: req.user.id, isGuest: req.user.is_guest } : 'No user',
        bodyKeys: Object.keys(req.body),
        deviceId: req.body.device_id,
        actionsCount: Array.isArray(req.body.offline_actions) ? req.body.offline_actions.length : 'Not array',
        clientVersion: req.body.client_version,
        hasCollectionState: !!req.body.collection_state
      });

      if (!req.user) {
        console.log('❌ Sync failed: No user found');
        res.status(404).json({
          error: 'User not found',
          message: 'Please complete registration first'
        });
        return;
      }

      // Check validation errors first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Sync validation failed:', {
          errors: errors.array(),
          receivedBody: {
            device_id: req.body.device_id,
            offline_actions: Array.isArray(req.body.offline_actions) ? `Array[${req.body.offline_actions.length}]` : typeof req.body.offline_actions,
            collection_state: typeof req.body.collection_state,
            client_version: req.body.client_version,
            last_known_server_state: req.body.last_known_server_state
          }
        });
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
          message: 'Request body validation failed'
        });
        return;
      }



      console.log('✅ Sync validation passed, processing request...');

      const syncPayload: SyncPayload = req.body;
      const { device_id } = syncPayload;
      const userId = req.user.id;
      const conflicts: any[] = [];
      const discardedActions: string[] = [];

      // Additional payload validation
      if (!syncPayload.collection_state) {
        console.log('❌ Missing collection_state in sync payload');
        res.status(400).json({
          error: 'Invalid sync payload',
          message: 'collection_state is required',
          details: 'Missing collection_state field'
        });
        return;
      }

      if (!Array.isArray(syncPayload.offline_actions)) {
        console.log('❌ Invalid offline_actions format in sync payload');
        res.status(400).json({
          error: 'Invalid sync payload',
          message: 'offline_actions must be an array',
          details: 'Invalid offline_actions format'
        });
        return;
      }

      // Validate device_id format
      if (!device_id || typeof device_id !== 'string' || device_id.length < 10) {
        console.log('❌ Invalid device_id format in sync payload');
        res.status(400).json({
          error: 'Invalid device_id',
          message: 'device_id must be a valid string',
          details: 'Invalid device_id format'
        });
        return;
      }

      console.log('🔍 Sync payload details:', {
        device_id,
        userId,
        actionsToProcess: syncPayload.offline_actions.length,
        collectionStateKeys: Object.keys(syncPayload.collection_state)
      });

      // Get current server state
      console.log('🔍 Fetching current collection from database...');
      const currentCollection = await db
        .selectFrom('user_cards')
        .selectAll()
        .where('user_id', '=', req.user.id)
        .execute();

      console.log('✅ Current collection fetched:', {
        collectionSize: currentCollection.length,
        species: currentCollection.map(c => c.card_id.toString())
      });

      const currentCredits = req.user.eco_credits;
      const currentXP = req.user.xp_points;

      console.log('🔍 Current user state:', {
        credits: currentCredits,
        xp: currentXP,
        userId: req.user.id
      });

      // Process actions chronologically
      console.log('🔍 Sorting actions by timestamp...');
      const sortedActions = syncPayload.offline_actions.sort((a, b) => a.timestamp - b.timestamp);
      console.log('✅ Actions sorted:', {
        totalActions: sortedActions.length,
        actionTypes: sortedActions.map(a => a.action),
        timestamps: sortedActions.map(a => a.timestamp)
      });

      console.log('🔍 Initializing server state...');
      let serverCredits = currentCredits;
      const serverXP = currentXP;
      const serverCollection = new Map(
        currentCollection.map(card => [card.card_id.toString(), card])
      );
      console.log('✅ Server state initialized:', {
        serverCredits,
        serverXP,
        collectionSize: serverCollection.size
      });

      // Get device sync state and current active signing key
      console.log('🔍 Fetching device state for:', { device_id, userId });
      const deviceSyncState = await db
        .selectFrom('device_sync_states')
        .select(['current_key_version'])
        .where('device_id', '=', device_id)
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!deviceSyncState) {
        console.log('❌ Device sync state not found');
        // Handle missing device state below
      }

      // Get current active signing key
      const currentSigningKey = deviceSyncState ? await db
        .selectFrom('device_signing_keys')
        .select(['signing_key', 'key_version', 'expires_at'])
        .where('device_id', '=', device_id)
        .where('user_id', '=', userId)
        .where('key_version', '=', deviceSyncState.current_key_version)
        .where('status', '=', 'ACTIVE')
        .executeTakeFirst() : null;

      console.log('✅ Device state fetched:', {
        hasDeviceState: !!deviceSyncState,
        hasSigningKey: !!currentSigningKey,
        currentKeyVersion: deviceSyncState?.current_key_version,
        keyExpiry: currentSigningKey?.expires_at
      });

      if (!deviceSyncState || !currentSigningKey) {
        console.log('❌ Device state not found - device not registered for offline sync', {
          device_id,
          userId,
          userEmail: req.user.email,
          isGuest: req.user.is_guest,
          hasDeviceState: !!deviceSyncState,
          hasSigningKey: !!currentSigningKey,
          timestamp: new Date().toISOString()
        });

        // Check if there are any devices registered for this user
        const allUserDevices = await db
          .selectFrom('device_sync_states')
          .select(['device_id', 'last_used_at', 'current_key_version'])
          .where('user_id', '=', userId)
          .execute();

        console.log('🔍 All devices for user:', {
          userId,
          deviceCount: allUserDevices.length,
          devices: allUserDevices.map(d => ({
            device_id: d.device_id,
            last_used_at: d.last_used_at,
            current_key_version: d.current_key_version
          }))
        });

        res.status(400).json({
          error: 'Device not registered for offline sync',
          conflicts: [],
          server_state: { credits: serverCredits },
          debug: {
            device_id,
            userId,
            registeredDevices: allUserDevices.length,
            message: 'Device must be registered before sync operations'
          }
        });
        return;
      }
      console.log('✅ Device state validation passed');

      console.log('🔍 Checking signing key expiry...');
      if (new Date() > new Date(currentSigningKey.expires_at)) {
        console.log('❌ Signing key expired');
        res.status(400).json({
          error: 'Signing key expired. Please re-authenticate.',
          conflicts: [],
          server_state: { credits: serverCredits }
        });
        return;
      }
      console.log('✅ Signing key is valid');

      console.log('🔄 Processing actions:', {
        totalActions: sortedActions.length,
        actionTypes: sortedActions.map(a => a.action)
      });

      // Verify action chain integrity before processing individual actions
      if (sortedActions.length > 0) {
        const isValidChain = await verifyActionChain(sortedActions, device_id, Number(currentSigningKey.key_version) || 1, userId);
        if (!isValidChain) {
          console.log('❌ Action chain integrity verification failed');
          res.status(409).json({
            success: false,
            conflicts: [{
              action_id: 'chain_integrity',
              reason: 'invalid_action_chain',
              server_state: { credits: serverCredits }
            }],
            discarded_actions: sortedActions.map(a => a.id),
            new_server_state: {
              cards_owned: currentCollection,
              eco_credits: serverCredits,
              xp_points: serverXP
            }
          });
          return;
        }
        console.log('✅ Action chain integrity verified');
      }

      // Gather all unique key versions needed for signature verification
      const keyVersionsNeeded = [...new Set(sortedActions.map(a => a.key_version).filter(v => v != null))];
      console.log('🔍 Key versions needed for verification:', keyVersionsNeeded);

      // Fetch all historical signing keys in one batch
      const historicalKeys = await getHistoricalSigningKeys(device_id, userId, keyVersionsNeeded);

      for (const action of sortedActions) {
        try {
          console.log('🔍 Processing action:', {
            id: action.id,
            type: action.action,
            timestamp: action.timestamp,
            hasSignature: !!action.signature
          });
          // Validate action signature
          if (!action.signature) {
            conflicts.push({
              action_id: action.id,
              reason: 'missing_signature',
              server_state: { credits: serverCredits }
            });
            discardedActions.push(action.id);
            continue;
          }

          // Verify HMAC signature
          const { signature, ...actionPayload } = action;

          console.log('🔍 [SIGNATURE-VERIFY] Key version debugging:', {
            actionId: action.id,
            currentKeyVersion: currentSigningKey.key_version,
            actionKeyVersion: action.key_version,
            availableHistoricalKeys: Array.from(historicalKeys.keys())
          });

          // Get the correct signing key for this action's version
          let isValidSignature = false;
          const actionKeyVersion = action.key_version || currentSigningKey.key_version;

          // Check for invalid key version 0
          if (actionKeyVersion === 0) {
            console.log('❌ [SIGNATURE-VERIFY] Invalid key version 0 detected:', {
              actionId: action.id,
              actionKeyVersion,
              message: 'Actions with key version 0 are invalid - client needs to wait for proper key initialization'
            });

            conflicts.push({
              action_id: action.id,
              reason: 'invalid_key_version',
              server_state: {
                credits: serverCredits,
                error: 'Invalid key version 0. Please wait for authentication to complete before creating actions.'
              }
            });
            discardedActions.push(action.id);
            continue;
          }

          const signingKeyForAction = historicalKeys.get(Number(actionKeyVersion));

          if (!signingKeyForAction) {
            console.log('❌ [SIGNATURE-VERIFY] No signing key found for version:', {
              actionId: action.id,
              actionKeyVersion,
              availableVersions: Array.from(historicalKeys.keys()),
              message: 'Historical signing key not found - treating as conflict'
            });

            // No key available for this version - treat as signature conflict
            isValidSignature = false;
          } else {
            // Use the correct historical signing key for verification
            console.log('✅ [SIGNATURE-VERIFY] Using historical key for verification:', {
              actionId: action.id,
              keyVersion: actionKeyVersion
            });

            isValidSignature = verifyActionSignature(actionPayload, signature, signingKeyForAction, device_id, Number(actionKeyVersion));
          }

          if (!isValidSignature) {
            console.log('❌ Invalid signature for action:', {
              actionId: action.id,
              actionType: action.action,
              timestamp: action.timestamp,
              signatureLength: signature?.length || 0,
              signingKeyLength: signingKeyForAction?.length || 0,
              deviceId: device_id,
              userId: userId,
              actionKeyVersion: actionKeyVersion,
              currentKeyVersion: currentSigningKey.key_version
            });

            conflicts.push({
              action_id: action.id,
              reason: 'invalid_signature',
              server_state: { credits: serverCredits }
            });
            continue;
          }

          // Check for duplicate actions
          const existingAction = await db
            .selectFrom('sync_actions_log')
            .select('id')
            .where('user_id', '=', userId)
            .where('action_id', '=', action.id)
            .executeTakeFirst();

          if (existingAction) {
            conflicts.push({
              action_id: action.id,
              reason: 'duplicate_action',
              server_state: { credits: serverCredits }
            });
            continue;
          }

          // Validate action timestamp (not too old)
          const actionAge = Date.now() - action.timestamp;
          if (actionAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
            conflicts.push({
              action_id: action.id,
              reason: 'timestamp_too_old',
              server_state: { credits: serverCredits }
            });
            discardedActions.push(action.id);
            continue;
          }

          // Process different action types
          switch (action.action) {
            case 'starter_pack_opened':
              // Validate user doesn't already have starter pack
              const hasStarterCards = Array.from(serverCollection.values())
                .some(card => card.acquisition_method === 'starter');
              
              if (hasStarterCards) {
                conflicts.push({
                  action_id: action.id,
                  reason: 'starter_pack_already_opened',
                  server_state: { credits: serverCredits }
                });
                discardedActions.push(action.id);
                continue;
              }

              // Add starter pack species (using valid card IDs from database)
              const starterSpecies = [
                { species: 'grass', cardId: 3 },      // Riverbank Grass
                { species: 'rabbit', cardId: 4 },     // European Rabbit
                { species: 'salmon', cardId: 5 },     // Sockeye Salmon (replacing fox)
                { species: 'oak-tree', cardId: 1 },   // Oak Tree
                { species: 'vulture', cardId: 9 }     // Turkey Vulture (replacing butterfly)
              ];
              for (const { species, cardId } of starterSpecies) {
                serverCollection.set(species, {
                  id: `temp_${species}`,
                  user_id: req.user.id,
                  card_id: cardId,
                  quantity: 1,
                  acquisition_method: 'starter',
                  acquired_at: new Date(action.timestamp),
                  first_acquired_at: new Date(action.timestamp),
                  last_acquired_at: new Date(action.timestamp),
                  is_foil: false,
                  variant: null,
                  condition: 'mint',
                  metadata: '{}'
                });
              }
              break;

            case 'pack_opened':
              const packCosts = { basic: 50, premium: 100, legendary: 200 };
              const cost = packCosts[action.pack_type as keyof typeof packCosts] || 50;

              if (serverCredits < cost) {
                conflicts.push({
                  action_id: action.id,
                  reason: 'insufficient_credits',
                  server_state: { credits: serverCredits }
                });
                discardedActions.push(action.id);
                continue;
              }

              serverCredits -= cost;
              // Note: In real implementation, pack contents would be determined server-side
              break;

            case 'card_acquired':
              // Support both new cardId system and legacy species_name
              let cardId: number | null = null;
              let cardKey: string = '';

              if (action.card_id) {
                // New cardId system
                cardId = action.card_id;
                cardKey = `card_${cardId}`;
              } else if (action.species_name) {
                // Legacy species_name system - disabled, use cardId instead
                console.warn('Legacy species_name system is deprecated, use cardId instead');
                continue; // Skip this action
              }

              if (cardId && action.quantity) {
                const existing = serverCollection.get(cardKey);
                if (existing) {
                  existing.quantity += action.quantity;
                  existing.last_acquired_at = new Date(action.timestamp);
                } else {
                  serverCollection.set(cardKey, {
                    id: `temp_${cardKey}`,
                    user_id: req.user.id,
                    card_id: cardId,
                    quantity: action.quantity,
                    acquisition_method: 'pack',
                    acquired_at: new Date(action.timestamp),
                    first_acquired_at: new Date(action.timestamp),
                    last_acquired_at: new Date(action.timestamp),
                    is_foil: false,
                    variant: null,
                    condition: 'mint',
                    metadata: '{}'
                  });
                }
              }
              break;

            default:
              console.warn(`Unknown action type: ${action.action}`);
          }

        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error);
          conflicts.push({
            action_id: action.id,
            reason: 'processing_error',
            server_state: { credits: serverCredits }
          });
          discardedActions.push(action.id);
        }
      }

      // Update database with final state using CardId system
      await db.transaction().execute(async (trx) => {

        // Validate user exists in the users table
        const userExists = await trx
          .selectFrom('users')
          .select('id')
          .where('id', '=', req.user!.id)
          .executeTakeFirst();

        if (!userExists) {
          console.error(`❌ User ID ${req.user!.id} does not exist in users table`);
          throw new Error(`User ${req.user!.id} not found in database`);
        }

        // Validate all card IDs exist in the cards table first
        const cardIds = Array.from(serverCollection.values())
          .map(card => card.card_id)
          .filter(id => id && id > 0);

        if (cardIds.length > 0) {
          const existingCards = await trx
            .selectFrom('cards')
            .select('card_id')
            .where('card_id', 'in', cardIds)
            .execute();

          const existingCardIds = new Set(existingCards.map(card => card.card_id).filter(Boolean));

          // Log any missing cards
          const missingCardIds = cardIds.filter(id => !existingCardIds.has(id));
          if (missingCardIds.length > 0) {
            console.error(`❌ Missing card IDs in database: ${missingCardIds.join(', ')}`);
            console.error(`Available card IDs: ${Array.from(existingCardIds).filter(id => id !== null).sort((a, b) => a! - b!).join(', ')}`);
          }
        }

        // Upsert each card individually using CardId system
        for (const [cardKey, card] of serverCollection) {
          const cardId = card.card_id;

          if (!cardId || cardId <= 0) {
            console.warn(`Invalid cardId in sync: ${cardKey} (cardId: ${cardId}) - skipping`);
            continue;
          }

          // Verify card exists in database before inserting (using card_id field)
          const cardExists = await trx
            .selectFrom('cards')
            .select('card_id')
            .where('card_id', '=', cardId)
            .executeTakeFirst();

          if (!cardExists) {
            console.error(`❌ Card ID ${cardId} does not exist in cards table - skipping`);
            continue;
          }

          await trx
            .insertInto('user_cards')
            .values({
              user_id: req.user!.id,
              card_id: cardId,
              quantity: card.quantity,
              acquisition_method: card.acquisition_method,
              first_acquired_at: card.first_acquired_at,
              variant: null // Default variant for standard cards
            })
            .onConflict((oc) => oc
              .columns(['user_id', 'card_id', 'variant'])
              .doUpdateSet({
                quantity: card.quantity,
                last_acquired_at: card.last_acquired_at || card.first_acquired_at
              })
            )
            .execute();
        }

        // Update user credits and XP
        await trx
          .updateTable('users')
          .set({
            eco_credits: serverCredits,
            xp_points: serverXP,
            updated_at: new Date()
          })
          .where('id', '=', req.user!.id)
          .execute();

        // Record sync transaction
        const syncTransaction: NewTransaction = {
          user_id: req.user!.id,
          type: 'reward',
          description: `Sync completed - ${sortedActions.length - discardedActions.length} actions processed`,
          eco_credits_change: 0
        };

        await trx
          .insertInto('transactions')
          .values(syncTransaction)
          .execute();

        // Log only actions that weren't already processed (avoid duplicates)
        const conflictActionIds = conflicts.map(c => c.action_id);
        const actionsToLog = sortedActions.filter(action =>
          !conflictActionIds.includes(action.id) ||
          conflicts.find(c => c.action_id === action.id)?.reason !== 'duplicate_action'
        );

        const actionLogs = actionsToLog.map(action => ({
          user_id: req.user!.id,
          device_id: device_id,
          action_id: action.id,
          action_type: action.action,
          status: discardedActions.includes(action.id) ? 'rejected' as const : 'success' as const,
          conflict_reason: conflicts.find(c => c.action_id === action.id)?.reason || null
        }));

        if (actionLogs.length > 0) {
          // Use ON CONFLICT to handle duplicate action IDs gracefully
          for (const actionLog of actionLogs) {
            await trx
              .insertInto('sync_actions_log')
              .values(actionLog)
              .onConflict((oc) => oc
                .columns(['user_id', 'action_id'])
                .doUpdateSet({
                  status: actionLog.status,
                  conflict_reason: actionLog.conflict_reason,
                  processed_at: new Date()
                })
              )
              .execute();
          }
        }
      });

      // Generate new signing key for security
      const newSigningKey = {
        key: CryptoJS.lib.WordArray.random(32).toString(),
        version: Date.now(),
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Add all successfully processed actions to discarded_actions so client removes them from queue
      const allProcessedActions = sortedActions.map(action => action.id);
      const finalDiscardedActions = [...new Set([...discardedActions, ...allProcessedActions])];

      console.log('🔄 [SYNC] Preparing response with discarded actions:', {
        originalDiscardedCount: discardedActions.length,
        allProcessedCount: allProcessedActions.length,
        finalDiscardedCount: finalDiscardedActions.length,
        finalDiscardedActions: finalDiscardedActions
      });

      // Get existing action chain for this device to help client rebuild queue
      const existingActions = await db
        .selectFrom('sync_actions_log')
        .select(['action_id', 'action_type', 'processed_at'])
        .where('user_id', '=', userId)
        .where('device_id', '=', device_id)
        .where('status', '=', 'success')
        .orderBy('processed_at', 'asc')
        .execute();

      console.log('🔗 [SYNC-RESPONSE] Including existing action chain:', {
        deviceId: device_id,
        existingActionsCount: existingActions.length,
        actionIds: existingActions.map(a => a.action_id)
      });

      // Prepare response
      const response = {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        discarded_actions: finalDiscardedActions.length > 0 ? finalDiscardedActions : undefined,
        existing_action_chain: existingActions.length > 0 ? existingActions : undefined,
        new_server_state: {
          cards_owned: Object.fromEntries(
            Array.from(serverCollection.entries()).map(([species, card]) => [
              species,
              {
                quantity: card.quantity,
                acquired_via: card.acquisition_method,
                first_acquired: card.first_acquired_at.getTime(),
                last_acquired: card.last_acquired_at.getTime()
              }
            ])
          ),
          eco_credits: serverCredits,
          xp_points: serverXP
        },
        new_signing_key: newSigningKey
      };

      // Update last_used_at timestamp for this device/user combination
      await db
        .updateTable('device_sync_states')
        .set({
          last_used_at: new Date(),
          updated_at: new Date()
        })
        .where('device_id', '=', device_id)
        .where('user_id', '=', userId)
        .execute();

      console.log('✅ Updated last_used_at timestamp for device:', { device_id, userId });

      res.json(response);

    } catch (error) {
      console.error('❌ Sync error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        user: req.user ? { id: req.user.id, isGuest: req.user.is_guest } : 'No user',
        deviceId: req.body?.device_id,
        actionsCount: Array.isArray(req.body?.offline_actions) ? req.body.offline_actions.length : 'Not array'
      });

      // Handle specific error types with appropriate HTTP status codes
      if (error instanceof Error) {
        // Database constraint violations
        if (error.message.includes('constraint') || error.message.includes('UNIQUE')) {
          console.log('❌ Database constraint violation during sync:', {
            error: error.message,
            userId: req.user?.id,
            deviceId: req.body?.device_id,
            timestamp: new Date().toISOString()
          });
          res.status(409).json({
            error: 'Data conflict',
            message: 'A data conflict occurred during sync. Please try again.',
            details: 'Database constraint violation',
            conflicts: [],
            server_state: { credits: 0 } // Will be updated by client retry
          });
          return;
        }

        // ON CONFLICT specification errors
        if (error.message.includes('ON CONFLICT specification')) {
          console.log('❌ Database schema mismatch during sync:', {
            error: error.message,
            userId: req.user?.id,
            deviceId: req.body?.device_id,
            timestamp: new Date().toISOString()
          });
          res.status(500).json({
            error: 'Database schema error',
            message: 'A database schema issue occurred. Please contact support.',
            details: 'ON CONFLICT constraint mismatch',
            conflicts: [],
            server_state: { credits: 0 }
          });
          return;
        }

        // Database connection issues
        if (error.message.includes('connection') || error.message.includes('timeout')) {
          console.log('❌ Database connection issue during sync');
          res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'Database connection issue. Please try again in a moment.',
            details: 'Database connection error',
            retry_after: 30
          });
          return;
        }

        // Invalid data format
        if (error.message.includes('invalid') || error.message.includes('parse')) {
          console.log('❌ Invalid data format in sync request');
          res.status(400).json({
            error: 'Invalid request data',
            message: 'The sync request contains invalid data format.',
            details: error.message
          });
          return;
        }
      }

      // Generic server error for unhandled cases
      res.status(500).json({
        error: 'Sync failed',
        message: 'Unable to synchronize data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/sync/status
 * Get sync status and pending actions count
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Please complete registration first'
      });
      return;
    }

    // Get user's current state
    const collection = await db
      .selectFrom('user_cards')
      .select([
        db.fn.count('card_id').as('species_count'),
        db.fn.sum('quantity').as('total_cards')
      ])
      .where('user_id', '=', req.user.id)
      .executeTakeFirst();

    res.json({
      success: true,
      server_state: {
        species_count: Number(collection?.species_count || 0),
        total_cards: Number(collection?.total_cards || 0),
        eco_credits: req.user.eco_credits,
        xp_points: req.user.xp_points,
        last_updated: req.user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: 'Unable to retrieve sync status'
    });
  }
});

export default router;
