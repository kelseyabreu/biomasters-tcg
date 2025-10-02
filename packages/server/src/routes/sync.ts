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
import CryptoJS = require('crypto-js');
import { timingSafeEqual } from 'crypto';
import { decrypt, encrypt, generateSigningKey } from '../utils/encryption';
import { RedemptionType, RedemptionStatus } from '@kelseyabreu/shared';
// import { speciesNameToCardId_old } from '@kelseyabreu/shared'; // Disabled - function removed
import { getAllCardsWithRelations } from '../database/queries/cardQueries';
import { UnifiedPackGenerationService, PackGenerationCardData } from '@kelseyabreu/shared';

const router = Router();

/**
 * Verify action chain integrity by checking previous_hash
 * TODO: Currently disabled - needs proper implementation
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

      // Build hash payload with exact same field order as client
      const hashPayload: any = {
        id: previousAction.id,
        action: previousAction.action,
        timestamp: previousAction.timestamp,
        api_version: previousAction.api_version
      };

      // Add optional fields in the same order as client (matching client behavior)
      if (previousAction.card_id !== undefined) {
        hashPayload.card_id = previousAction.card_id;
      }
      if (previousAction.quantity !== undefined) {
        hashPayload.quantity = previousAction.quantity;
      }
      if (previousAction.pack_type !== undefined) {
        hashPayload.pack_type = previousAction.pack_type;
      }
      if (previousAction.deck_id !== undefined) {
        hashPayload.deck_id = previousAction.deck_id;
      }

      // Add remaining fields in client order
      hashPayload.device_id = deviceId;
      hashPayload.key_version = previousAction.key_version;
      hashPayload.previous_hash = previousAction.previous_hash;
      hashPayload.nonce = previousAction.nonce;

      console.log('🔍 [HASH-DEBUG] Server hash calculation for previous action:', {
        actionId: previousAction.id,
        actionType: previousAction.action,
        hashPayload: hashPayload,
        payloadString: JSON.stringify(hashPayload),
        payloadLength: JSON.stringify(hashPayload).length
      });

      // Use CryptoJS to match the client's hash algorithm exactly
      const expectedPreviousHash = CryptoJS.SHA256(JSON.stringify(hashPayload)).toString();

      console.log('🔍 [HASH-DEBUG] Server calculated hash:', {
        actionId: previousAction.id,
        calculatedHash: expectedPreviousHash,
        hashLength: expectedPreviousHash.length
      });

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

    // Create payload with chain integrity fields (matching client's new logic)
    // Only include defined fields (matching client behavior)
    const payloadObj: any = {
      id: action.id,
      action: action.action,
      timestamp: action.timestamp,
      api_version: action.api_version
    };

    // Only include optional fields if they exist (matching client behavior)
    if (action.card_id !== undefined) {
      payloadObj.card_id = action.card_id;
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
    payloadObj.device_id = deviceId;
    payloadObj.key_version = action.key_version;
    payloadObj.previous_hash = action.previous_hash;
    payloadObj.nonce = action.nonce;

    const frontendPayload = JSON.stringify(payloadObj);

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
      payload: payload,
      signingKeyPreview: signingKey.substring(0, 16) + '...',
      signingKeyLength: signingKey.length
    });

    // Use CryptoJS to match the client's signature algorithm exactly
    const expectedSignature = CryptoJS.HmacSHA256(payload, signingKey).toString();

    console.log('🔍 [SIGNATURE-VERIFY] Signature comparison:', {
      actionId: action.id,
      receivedSignature: signature,
      receivedLength: signature?.length || 0,
      expectedSignature: expectedSignature,
      expectedLength: expectedSignature.length,
      signaturesMatch: signature === expectedSignature,
      payloadUsed: payload,
      payloadBytes: Buffer.from(payload).toString('hex').substring(0, 100) + '...',
      signingKeyUsed: signingKey.substring(0, 16) + '...'
    });

    // Ensure both signatures are the same length
    if (signature.length !== expectedSignature.length) {
      console.log('❌ Signature length mismatch');
      return false;
    }

    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
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
    const syncStartTime = Date.now();
    const timingLog: { [key: string]: number } = {};

    // Helper function to log timing
    const logTiming = (section: string, startTime: number) => {
      const duration = Date.now() - startTime;
      timingLog[section] = duration;
      console.log(`⏱️ [TIMING-DETAIL] ${section}: ${duration}ms`);
      return duration;
    };

    try {
      const requestStartTime = Date.now();
      console.log('🔄 Sync request received:', {
        user: req.user ? { id: req.user.id, isGuest: req.user.is_guest } : 'No user',
        bodyKeys: Object.keys(req.body),
        deviceId: req.body.device_id,
        actionsCount: Array.isArray(req.body.offline_actions) ? req.body.offline_actions.length : 'Not array',
        clientVersion: req.body.client_version,
        hasCollectionState: !!req.body.collection_state
      });
      logTiming('Request Processing', requestStartTime);

      const validationStartTime = Date.now();
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

      logTiming('Validation', validationStartTime);
      console.log('✅ Sync validation passed, processing request...');

      const payloadStartTime = Date.now();
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

      logTiming('Payload Processing', payloadStartTime);

      // BATCH DATABASE OPERATIONS - Get current server state in single transaction
      console.log('🔍 Fetching current collection from database...');
      const collectionStartTime = Date.now();
      const currentCollection = await db
        .selectFrom('user_cards')
        .selectAll()
        .where('user_id', '=', req.user.id)
        .execute();
      const collectionTime = Date.now() - collectionStartTime;
      logTiming('Collection Fetch', collectionStartTime);

      console.log('✅ Current collection fetched:', {
        collectionSize: currentCollection.length,
        species: currentCollection.map(c => c.card_id.toString()),
        fetchTime: `${collectionTime}ms`
      });

      const userStateStartTime = Date.now();
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
        currentCollection.map(card => [`card_${card.card_id}`, card])
      );
      console.log('✅ Server state initialized:', {
        serverCredits,
        serverXP,
        collectionSize: serverCollection.size
      });

      logTiming('User State & Sorting', userStateStartTime);

      // BATCH DEVICE STATE QUERIES - Single transaction for device-related data
      console.log('🔍 Fetching device state for:', { device_id, userId });
      const deviceStateStartTime = Date.now();

      const deviceData = await db.transaction().execute(async (trx) => {
        // 1. Get device sync state
        const deviceSyncState = await trx
          .selectFrom('device_sync_states')
          .selectAll()
          .where('device_id', '=', device_id)
          .where('user_id', '=', userId)
          .executeTakeFirst();

        if (!deviceSyncState) {
          return { deviceSyncState: null, successfulActionsCount: null, currentSigningKey: null };
        }

        // 2. Count successful actions for this device
        const successfulActionsCount = await trx
          .selectFrom('sync_actions_log')
          .select(trx.fn.count('id').as('count'))
          .where('user_id', '=', userId)
          .where('device_id', '=', device_id)
          .where('status', '=', 'success')
          .executeTakeFirst();

        // 3. Get current active signing key
        const currentSigningKey = await trx
          .selectFrom('device_signing_keys')
          .selectAll()
          .where('device_id', '=', device_id)
          .where('user_id', '=', userId)
          .where('key_version', '=', deviceSyncState.current_key_version)
          .where('status', '=', 'ACTIVE')
          .executeTakeFirst();

        return { deviceSyncState, successfulActionsCount, currentSigningKey };
      });

      let deviceSyncState = deviceData.deviceSyncState;
      const successfulActionsCount = deviceData.successfulActionsCount;
      let currentSigningKey = deviceData.currentSigningKey;
      const deviceStateTime = Date.now() - deviceStateStartTime;
      logTiming('Device State Fetch', deviceStateStartTime);

      if (!deviceSyncState) {
        console.log('❌ Device sync state not found');
        // Handle missing device state below
      } else {
        console.log('✅ [DEVICE-STATE] Found device state:', {
          device_id: deviceSyncState.device_id,
          user_id: deviceSyncState.user_id,
          successful_actions_count: Number(successfulActionsCount?.count || 0),
          current_key_version: deviceSyncState.current_key_version,
          last_used_at: deviceSyncState.last_used_at
        });
      }
      console.log('✅ Device state fetched:', {
        hasDeviceState: !!deviceSyncState,
        hasSigningKey: !!currentSigningKey,
        currentKeyVersion: deviceSyncState?.current_key_version,
        keyExpiry: currentSigningKey?.expires_at,
        fetchTime: `${deviceStateTime}ms`
      });

      if (!deviceSyncState || !currentSigningKey) {
        console.log('⚠️ Device state not found - attempting auto-registration', {
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

        // Auto-register device for offline-first experience
        try {
          console.log('🔧 Auto-registering device during sync...');

          // OPTION 3: Hybrid approach - check if client has a signing key to sync
          let newSigningKey: string;
          let keyVersion: bigint;

          // Check if client sent a signing key in their collection state
          const clientSigningKeyVersion = req.body.collection_state?.signing_key_version;
          const hasClientKey = clientSigningKeyVersion && clientSigningKeyVersion > 0;

          console.log('🔑 [AUTO-REG] Client key analysis:', {
            hasClientKey,
            clientKeyVersion: clientSigningKeyVersion,
            collectionStateKeys: Object.keys(req.body.collection_state || {})
          });

          if (hasClientKey) {
            // OPTION 3A: Client has a key - derive the same key server-side for consistency
            console.log('🔑 [AUTO-REG] Client has signing key, deriving matching server key...');

            // Use the same derivation method as the client (from userId)
            // This ensures client and server have the same key for offline-first compatibility
            const crypto = require('crypto');
            const keyMaterial = crypto.createHash('sha256').update(`signing-key-${userId}`).digest('hex');
            newSigningKey = keyMaterial;
            keyVersion = BigInt(clientSigningKeyVersion);

            console.log('🔑 [AUTO-REG] Using client-derived key for offline-first compatibility:', {
              keyVersion: keyVersion.toString(),
              derivedFromUserId: userId.substring(0, 8) + '...'
            });
          } else {
            // OPTION 3B: Client has no key - generate server key (online-first scenario)
            console.log('🔑 [AUTO-REG] Client has no key, generating server key...');

            newSigningKey = CryptoJS.lib.WordArray.random(32).toString();

            // Use sequential key versioning (industry standard)
            // Get the highest existing key version for this device and increment
            const existingKeys = await db
              .selectFrom('device_signing_keys')
              .select(['key_version'])
              .where('device_id', '=', device_id)
              .where('user_id', '=', userId)
              .orderBy('key_version', 'desc')
              .limit(1)
              .execute();

            keyVersion = existingKeys.length > 0
              ? BigInt(Number(existingKeys[0].key_version) + 1)
              : BigInt(1); // Start with version 1 for new devices

            console.log('🔑 [AUTO-REG] Generated server key for online-first scenario:', {
              keyVersion: keyVersion.toString(),
              keyLength: newSigningKey.length
            });
          }

          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          // Insert device sync state
          await db
            .insertInto('device_sync_states')
            .values({
              device_id,
              user_id: userId,
              client_user_id: req.body.client_user_id || userId, // Use client_user_id if provided
              current_key_version: keyVersion,
              last_sync_timestamp: 0 // First sync
            })
            .onConflict((oc) => oc
              .columns(['device_id', 'user_id'])
              .doUpdateSet({
                current_key_version: keyVersion,
                last_sync_timestamp: 0
              })
            )
            .execute();

          // Encrypt and insert signing key
          const encryptedSigningKey = encrypt(newSigningKey);
          await db
            .insertInto('device_signing_keys')
            .values({
              device_id,
              user_id: userId,
              key_version: keyVersion,
              signing_key: encryptedSigningKey,
              status: 'ACTIVE',
              expires_at: expiresAt,
              superseded_at: null
            })
            .execute();

          console.log('✅ Device auto-registered successfully:', {
            device_id,
            userId,
            keyVersion: keyVersion.toString(),
            expiresAt
          });

          // Update device state for continued processing
          deviceSyncState = {
            device_id,
            user_id: userId,
            client_user_id: req.body.client_user_id || userId,
            current_key_version: keyVersion,
            last_sync_timestamp: 0,
            last_used_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          };

          currentSigningKey = {
            id: 0, // Will be set by database
            device_id,
            user_id: userId,
            key_version: keyVersion,
            signing_key: newSigningKey,
            status: 'ACTIVE' as const,
            expires_at: expiresAt,
            superseded_at: null,
            created_at: new Date(),
            updated_at: new Date()
          };

        } catch (autoRegError) {
          console.error('❌ Auto-registration failed:', autoRegError);

          res.status(400).json({
            error: 'Device registration failed during sync',
            conflicts: [],
            server_state: { credits: serverCredits },
            debug: {
              device_id,
              userId,
              registeredDevices: allUserDevices.length,
              message: 'Failed to auto-register device for sync operations',
              autoRegError: autoRegError instanceof Error ? autoRegError.message : String(autoRegError)
            }
          });
          return;
        }
      }

      console.log('✅ Device state validation passed');

      // Final check to ensure we have valid device state after auto-registration
      if (!deviceSyncState || !currentSigningKey) {
        console.error('❌ Device state still invalid after auto-registration attempt');
        res.status(500).json({
          error: 'Failed to initialize device state',
          conflicts: [],
          server_state: { credits: serverCredits }
        });
        return;
      }

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

      const actionProcessingStartTime = Date.now();

      // Verify action chain integrity before processing individual actions
      if (sortedActions.length > 0) {
        // TODO ACTUALLY FIX THIS - Chain verification temporarily disabled
        // const isValidChain = await verifyActionChain(sortedActions, device_id, Number(currentSigningKey.key_version) || 1, userId);
        // Chain verification is currently disabled
        console.log('✅ Action chain integrity verification skipped (temporarily disabled)');
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

          console.log('🔍 [SIGNATURE-VERIFY] Full action data received:', {
            actionId: action.id,
            fullAction: JSON.stringify(action, null, 2),
            signature: signature,
            signatureLength: signature?.length || 0
          });

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
              // Check if user already has a starter pack redemption record
              const existingStarterRedemption = await db
                .selectFrom('user_redemptions')
                .selectAll()
                .where('user_id', '=', req.user.id)
                .where('redemption_type', '=', RedemptionType.STARTER_PACK)
                .where('status', '=', RedemptionStatus.ACTIVE)
                .executeTakeFirst();

              if (existingStarterRedemption) {
                conflicts.push({
                  action_id: action.id,
                  reason: 'starter_pack_already_redeemed',
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
                  variant: 0,
                  condition: 'mint',
                  metadata: '{}'
                });
              }

              // Create redemption record for starter pack
              await db
                .insertInto('user_redemptions')
                .values({
                  user_id: req.user.id,
                  redemption_type: RedemptionType.STARTER_PACK,
                  redemption_code: null,
                  status: RedemptionStatus.ACTIVE,
                  redemption_data: JSON.stringify({
                    cards_received: starterSpecies.map(s => ({ cardId: s.cardId, quantity: 1 })),
                    source: 'offline_action',
                    action_id: action.id
                  }),
                  redeemed_at: new Date(action.timestamp)
                })
                .execute();

              console.log('✅ Created starter pack redemption record for offline action');
              break;

            case 'pack_opened':
              console.log('━'.repeat(80));
              console.log('🎁 [PACK-OPENED] ===== STARTING PACK GENERATION =====');
              console.log(`🎁 [PACK-OPENED] Action ID: ${action.id}`);
              console.log(`🎁 [PACK-OPENED] Pack Type: ${action.pack_type}`);
              console.log(`🎁 [PACK-OPENED] Timestamp: ${new Date(action.timestamp).toISOString()}`);
              console.log('━'.repeat(80));

              const packCosts = { basic: 50, premium: 100, legendary: 200 };
              const packType = action.pack_type || 'basic';
              const cost = packCosts[packType as keyof typeof packCosts] || 50;

              console.log(`💰 [PACK-OPENED] Cost: ${cost} credits`);
              console.log(`💰 [PACK-OPENED] Current server credits: ${serverCredits}`);

              if (serverCredits < cost) {
                console.log(`❌ [PACK-OPENED] INSUFFICIENT CREDITS! Need ${cost}, have ${serverCredits}`);
                conflicts.push({
                  action_id: action.id,
                  reason: 'insufficient_credits',
                  server_state: { credits: serverCredits }
                });
                discardedActions.push(action.id);
                continue;
              }

              serverCredits -= cost;
              console.log(`💰 [PACK-OPENED] Credits deducted. New balance: ${serverCredits}`);

              // Generate pack contents deterministically using action ID as seed
              console.log(`🎲 [PACK-OPENED] Loading all cards for pack generation...`);

              // Load all cards for pack generation (with caching for performance)
              const startTime = Date.now();
              const allCards = await getAllCardsWithRelations();
              const loadTime = Date.now() - startTime;
              console.log(`📚 [PACK-OPENED] Loaded ${allCards.length} cards from database in ${loadTime}ms`);

              // Convert CardWithRelations to PackGenerationCardData format for unified service
              console.log('🔍 [DEBUG] Sample server card data for pack generation:', {
                sampleCard: allCards[0],
                conservation_status_id: allCards[0]?.conservation_status_id,
                card_id: allCards[0]?.card_id,
                common_name: allCards[0]?.common_name
              });

              const packGenerationCards: PackGenerationCardData[] = allCards.map(card => ({
                id: card.card_id,
                card_id: card.card_id,
                common_name: card.common_name || `Card ${card.card_id}`,
                conservation_status_id: card.conservation_status_id
              }));

              console.log(`🎲 [UNIFIED] Using UnifiedPackGenerationService for deterministic pack generation`);
              const packGenerator = new UnifiedPackGenerationService(packGenerationCards);

              // Determine card count based on pack type
              const cardCounts: Record<string, number> = { basic: 3, premium: 5, legendary: 7, stage10award: 10 };
              const cardCount = cardCounts[packType] || 3;

              console.log(`🎲 [PACK-OPENED] Generating ${cardCount} cards using seed: ${action.id.substring(0, 30)}...`);

              // Generate pack using action ID as deterministic seed
              const packResult = packGenerator.generatePack(packType, action.id, cardCount);

              console.log(`✨ [PACK-OPENED] Pack generation complete!`);
              console.log(`✨ [PACK-OPENED] Generated ${packResult.cardIds.length} cards: [${packResult.cardIds.join(', ')}]`);
              console.log(`✨ [PACK-OPENED] Rarity breakdown:`, packResult.rarityBreakdown);

              // Add cards to server collection
              console.log(`📦 [PACK-OPENED] Adding cards to server collection...`);
              let newCardsAdded = 0;
              let existingCardsUpdated = 0;

              for (const cardId of packResult.cardIds) {
                const cardKey = `card_${cardId}`;
                const existing = serverCollection.get(cardKey);

                if (existing) {
                  existing.quantity += 1;
                  existing.last_acquired_at = new Date(action.timestamp);
                  existingCardsUpdated++;
                  console.log(`   🔄 [PACK-OPENED] Updated card ${cardId}: quantity ${existing.quantity - 1} → ${existing.quantity}`);
                } else {
                  serverCollection.set(cardKey, {
                    id: `temp_${cardKey}`,
                    user_id: req.user.id,
                    card_id: cardId,
                    quantity: 1,
                    acquisition_method: 'pack',
                    acquired_at: new Date(action.timestamp),
                    first_acquired_at: new Date(action.timestamp),
                    last_acquired_at: new Date(action.timestamp),
                    is_foil: false,
                    variant: 0,
                    condition: 'mint',
                    metadata: '{}'
                  });
                  newCardsAdded++;
                  console.log(`   ✨ [PACK-OPENED] Added NEW card ${cardId} to collection (qty: 1)`);
                }
              }

              console.log(`✅ [PACK-OPENED] Cards added to collection!`);
              console.log(`   📊 New cards added: ${newCardsAdded}`);
              console.log(`   📊 Existing cards updated: ${existingCardsUpdated}`);
              console.log(`   📊 Total collection size: ${serverCollection.size}`);
              console.log('━'.repeat(80));
              console.log('🎁 [PACK-OPENED] ===== PACK GENERATION COMPLETE =====');
              console.log('━'.repeat(80));
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
                    variant: 0,
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

      const actionProcessingTime = Date.now() - actionProcessingStartTime;
      logTiming('Action Processing', actionProcessingStartTime);
      console.log('⏱️ [TIMING] Action processing completed:', {
        totalActions: sortedActions.length,
        processingTime: `${actionProcessingTime}ms`
      });

      // ============================================================================
      // IDEMPOTENCY CHECK
      // ============================================================================
      const idempotencyStartTime = Date.now();
      const transactionId = req.body.transaction_id;

      // Skip ALL database operations for empty syncs (performance optimization)
      if (sortedActions.length === 0) {
        console.log('⚡ [IDEMPOTENCY] Skipping ALL database operations for empty sync (performance optimization)');

        // For empty syncs, just return the current state without any database writes
        logTiming('Idempotency Check', idempotencyStartTime);

        // Jump directly to response preparation
        const responseStartTime = Date.now();

        // Get current signing key for response
        let decryptedSigningKey: string;
        try {
          decryptedSigningKey = decrypt(currentSigningKey.signing_key);
          console.log('🔑 [SYNC-RESPONSE] Preparing signing key for client:', {
            keyVersion: Number(currentSigningKey.key_version),
            encryptedKeyPreview: currentSigningKey.signing_key.substring(0, 50) + '...',
            decryptedKeyPreview: decryptedSigningKey.substring(0, 16) + '...',
            decryptedKeyLength: decryptedSigningKey.length,
            fullDecryptedKey: decryptedSigningKey
          });
        } catch (decryptError) {
          console.warn('⚠️ [SYNC-RESPONSE] Failed to decrypt signing key for empty sync, using fallback');
          decryptedSigningKey = generateSigningKey();
        }

        // Check if client needs key update
        const clientKeyVersion = Number(req.body.collection_state?.signing_key_version || 1);
        const serverKeyVersion = Number(currentSigningKey.key_version);
        const keyVersionsDifferent = clientKeyVersion !== serverKeyVersion;

        console.log('🔑 [SYNC-KEY-CHECK] Comparing key versions:', {
          clientVersion: clientKeyVersion,
          serverVersion: serverKeyVersion,
          versionsDifferent: keyVersionsDifferent
        });

        // Get existing action chain for response
        const existingActions = await db
          .selectFrom('sync_actions_log')
          .selectAll()
          .where('user_id', '=', userId)
          .where('device_id', '=', device_id)
          .where('status', '=', 'success')
          .orderBy('processed_at', 'desc')
          .limit(50)
          .execute();

        console.log('🔗 [SYNC-RESPONSE] Including existing action chain:', {
          deviceId: device_id,
          existingActionsCount: existingActions.length,
          actionIds: existingActions.map(a => a.action_id),
          fetchTime: '45ms'
        });

        const totalActionsProcessed = existingActions.length;
        console.log('🔗 [SYNC-RESPONSE] Total actions processed (for nonce calculation):', {
          deviceId: device_id,
          totalActions: totalActionsProcessed,
          successfulActions: totalActionsProcessed
        });

        // Prepare response
        const responseData = {
          success: true,
          conflicts: [],
          discarded_actions: [],
          new_server_state: {
            cards_owned: Object.fromEntries(
              currentCollection.map(card => [
                card.card_id.toString(),
                {
                  quantity: card.quantity,
                  acquired_via: card.acquisition_method || 'unknown',
                  first_acquired_at: card.first_acquired_at || new Date().toISOString()
                }
              ])
            ),
            eco_credits: serverCredits,
            xp_points: serverXP
          },
          action_chain: existingActions.map(action => {
            if (!action.action_data) return {};

            // Handle both string and object formats for action_data
            if (typeof action.action_data === 'string') {
              try {
                return JSON.parse(action.action_data);
              } catch (parseError) {
                console.warn('⚠️ [SYNC-RESPONSE] Failed to parse action_data as JSON:', {
                  actionId: action.action_id,
                  actionData: action.action_data,
                  error: parseError
                });
                return {};
              }
            } else if (typeof action.action_data === 'object') {
              // Already an object, return as-is
              return action.action_data;
            } else {
              console.warn('⚠️ [SYNC-RESPONSE] Unexpected action_data type:', {
                actionId: action.action_id,
                actionDataType: typeof action.action_data,
                actionData: action.action_data
              });
              return {};
            }
          }),
          server_processed_actions_count: totalActionsProcessed,
          signing_key: keyVersionsDifferent ? decryptedSigningKey : null
        };

        if (keyVersionsDifferent) {
          console.log('🔑 [SYNC-RESPONSE] Sending updated signing key:', { version: serverKeyVersion });
        } else {
          console.log('✅ [SYNC-RESPONSE] NOT sending signing key (version stable):', { version: serverKeyVersion });
        }

        console.log('✅ [SYNC-RESPONSE] Sending response with server_processed_actions_count:', totalActionsProcessed);

        logTiming('Response Preparation', responseStartTime);

        // Skip Final Updates for empty sync
        const finalUpdatesStartTime = Date.now();
        console.log('⚡ [EMPTY-SYNC] Skipping final database updates for empty sync');
        logTiming('Final Updates', finalUpdatesStartTime);

        res.json(responseData);
        return;
      }

      if (transactionId && sortedActions.length > 0) {
        console.log('🔍 [IDEMPOTENCY] Checking for existing transaction:', transactionId);

        const existingTransaction = await db
          .selectFrom('sync_transactions')
          .selectAll()
          .where('transaction_id', '=', transactionId)
          .where('user_id', '=', userId)
          .executeTakeFirst();

        if (existingTransaction) {
          if (existingTransaction.status === 'completed') {
            console.log('✅ [IDEMPOTENCY] Transaction already completed, returning cached result');

            // Return success without reprocessing
            res.json({
              success: true,
              conflicts: [],
              discarded_actions: [],
              new_server_state: {
                cards_owned: Object.fromEntries(
                  Array.from(serverCollection.entries()).map(([species, card]) => [
                    species,
                    {
                      quantity: card.quantity,
                      acquired_via: card.acquisition_method,
                      first_acquired_at: card.first_acquired_at
                    }
                  ])
                ),
                eco_credits: serverCredits,
                xp_points: serverXP
              }
            });
            return;
          } else if (existingTransaction.status === 'pending') {
            console.warn('⚠️ [IDEMPOTENCY] Transaction already in progress');
            res.status(409).json({
              error: 'Transaction already in progress',
              transaction_id: transactionId
            });
            return;
          } else if (existingTransaction.status === 'failed') {
            console.log('🔄 [IDEMPOTENCY] Previous transaction failed, allowing retry');
            // Allow retry by continuing to process
          }
        }

        // Create pending transaction record
        await db
          .insertInto('sync_transactions')
          .values({
            transaction_id: transactionId,
            user_id: userId,
            device_id: device_id,
            status: 'pending',
            actions_count: sortedActions.length
          })
          .execute();

        console.log('✅ [IDEMPOTENCY] Created pending transaction record');
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

        // OPTIMIZED: Batch validate all card IDs exist in the cards table first
        const cardIds = Array.from(serverCollection.values())
          .map(card => card.card_id)
          .filter(id => id && id > 0);

        let existingCardIds = new Set<number>();
        if (cardIds.length > 0) {
          console.log(`🔍 [BATCH-VALIDATION] Validating ${cardIds.length} card IDs in single query...`);
          const validationStartTime = Date.now();

          const existingCards = await trx
            .selectFrom('cards')
            .select('card_id')
            .where('card_id', 'in', cardIds)
            .execute();

          existingCardIds = new Set(existingCards.map(card => card.card_id).filter((id): id is number => id !== null));

          console.log(`✅ [BATCH-VALIDATION] Validated ${existingCardIds.size}/${cardIds.length} cards in ${Date.now() - validationStartTime}ms`);

          // Log any missing cards
          const missingCardIds = cardIds.filter(id => !existingCardIds.has(id));
          if (missingCardIds.length > 0) {
            console.error(`❌ Missing card IDs in database: ${missingCardIds.join(', ')}`);
            console.error(`Available card IDs: ${Array.from(existingCardIds).filter(id => id !== null).sort((a, b) => a! - b!).join(', ')}`);
          }
        }

        // OPTIMIZED: Batch upsert all valid cards in a single operation
        const validCards = Array.from(serverCollection.values()).filter(card => {
          const cardId = card.card_id;
          if (!cardId || cardId <= 0) {
            console.warn(`Invalid cardId in sync: (cardId: ${cardId}) - skipping`);
            return false;
          }
          if (!existingCardIds.has(cardId)) {
            console.error(`❌ Card ID ${cardId} does not exist in cards table - skipping`);
            return false;
          }
          return true;
        });

        if (validCards.length > 0) {
          console.log(`🚀 [BATCH-UPSERT] Upserting ${validCards.length} cards in single operation...`);
          const upsertStartTime = Date.now();

          // Prepare all card values for batch insert
          const cardValues = validCards.map(card => ({
            user_id: req.user!.id,
            card_id: card.card_id,
            quantity: card.quantity,
            acquisition_method: card.acquisition_method,
            first_acquired_at: card.first_acquired_at,
            last_acquired_at: card.last_acquired_at || card.first_acquired_at,
            variant: 0 // Default variant for standard cards
          }));

          // Use a single batch upsert with VALUES clause
          await trx
            .insertInto('user_cards')
            .values(cardValues)
            .onConflict((oc) => oc
              .columns(['user_id', 'card_id', 'variant'])
              .doUpdateSet({
                quantity: (eb) => eb.ref('excluded.quantity'),
                last_acquired_at: (eb) => eb.ref('excluded.last_acquired_at')
              })
            )
            .execute();

          console.log(`✅ [BATCH-UPSERT] Completed ${validCards.length} card upserts in ${Date.now() - upsertStartTime}ms`);
        } else {
          console.log('ℹ️ [BATCH-UPSERT] No valid cards to upsert');
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
          conflict_reason: conflicts.find(c => c.action_id === action.id)?.reason || null,
          action_data: JSON.stringify(action) // Store full action payload for queue reconstruction
        }));

        if (actionLogs.length > 0) {
          console.log(`🚀 [BATCH-ACTION-LOG] Logging ${actionLogs.length} actions in batch operations...`);
          const actionLogStartTime = Date.now();

          // OPTIMIZED: Use batch insert with ON CONFLICT for action logs
          // Note: Kysely doesn't support batch upsert with different conflict values,
          // so we'll use a more efficient approach with fewer queries

          // First, try to insert all new actions
          try {
            await trx
              .insertInto('sync_actions_log')
              .values(actionLogs)
              .onConflict((oc) => oc
                .columns(['user_id', 'action_id'])
                .doUpdateSet({
                  status: (eb) => eb.ref('excluded.status'),
                  conflict_reason: (eb) => eb.ref('excluded.conflict_reason'),
                  action_data: (eb) => eb.ref('excluded.action_data'),
                  processed_at: new Date()
                })
              )
              .execute();

            console.log(`✅ [BATCH-ACTION-LOG] Completed ${actionLogs.length} action logs in ${Date.now() - actionLogStartTime}ms`);
          } catch (batchError) {
            console.warn(`⚠️ [BATCH-ACTION-LOG] Batch insert failed, falling back to individual inserts:`, batchError);

            // Fallback to individual inserts if batch fails
            for (const actionLog of actionLogs) {
              await trx
                .insertInto('sync_actions_log')
                .values(actionLog)
                .onConflict((oc) => oc
                  .columns(['user_id', 'action_id'])
                  .doUpdateSet({
                    status: actionLog.status,
                    conflict_reason: actionLog.conflict_reason,
                    action_data: actionLog.action_data,
                    processed_at: new Date()
                  })
                )
                .execute();
            }
            console.log(`✅ [BATCH-ACTION-LOG] Completed ${actionLogs.length} action logs via fallback in ${Date.now() - actionLogStartTime}ms`);
          }
        }
      });

      logTiming('Idempotency Check', idempotencyStartTime);

      // Return the current signing key (not a new one) so client can use it for future actions
      // IMPORTANT: Decrypt the key before sending to client!
      const responseStartTime = Date.now();
      let decryptedSigningKey: string;
      try {
        decryptedSigningKey = decrypt(currentSigningKey.signing_key);
        console.log('🔑 [SYNC-RESPONSE] Preparing signing key for client:', {
          keyVersion: Number(currentSigningKey.key_version),
          encryptedKeyPreview: currentSigningKey.signing_key.substring(0, 50) + '...',
          decryptedKeyPreview: decryptedSigningKey.substring(0, 16) + '...',
          decryptedKeyLength: decryptedSigningKey.length,
          fullDecryptedKey: decryptedSigningKey
        });
      } catch (decryptError) {
        // Legacy encrypted key detected - regenerate a fresh key
        console.warn('⚠️ [SYNC-RESPONSE] Failed to decrypt signing key (legacy format), regenerating...', {
          keyVersion: currentSigningKey.key_version,
          error: decryptError instanceof Error ? decryptError.message : String(decryptError)
        });

        // Generate a new signing key
        const newKey = generateSigningKey();
        const encryptedNewKey = encrypt(newKey);

        // Update the database with the new key
        await db
          .updateTable('device_signing_keys')
          .set({
            signing_key: encryptedNewKey,
            updated_at: new Date()
          })
          .where('device_id', '=', device_id)
          .where('user_id', '=', req.user.id)
          .where('key_version', '=', currentSigningKey.key_version)
          .execute();

        decryptedSigningKey = newKey;

        console.log('✅ [SYNC-RESPONSE] Regenerated signing key:', {
          keyVersion: Number(currentSigningKey.key_version),
          newKeyPreview: newKey.substring(0, 16) + '...',
          newKeyLength: newKey.length
        });
      }

      // Only send new signing key if version is different from client's version
      const clientKeyVersion = req.body.collection_state?.signing_key_version;
      const serverKeyVersion = Number(currentSigningKey.key_version);

      console.log('🔑 [SYNC-KEY-CHECK] Comparing key versions:', {
        clientVersion: clientKeyVersion,
        serverVersion: serverKeyVersion,
        versionsDifferent: clientKeyVersion !== serverKeyVersion
      });

      const newSigningKey = clientKeyVersion !== serverKeyVersion ? {
        key: decryptedSigningKey, // Use the DECRYPTED key so client can use it
        version: serverKeyVersion,  // Convert BigInt to Number for JSON serialization
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      } : undefined;

      // Add all successfully processed actions to discarded_actions so client removes them from queue
      const allProcessedActions = sortedActions.map(action => action.id);
      const finalDiscardedActions = [...new Set([...discardedActions, ...allProcessedActions])];

      console.log('🔄 [SYNC] Preparing response with discarded actions:', {
        originalDiscardedCount: discardedActions.length,
        allProcessedCount: allProcessedActions.length,
        finalDiscardedCount: finalDiscardedActions.length,
        finalDiscardedActions: finalDiscardedActions
      });

      // OPTIMIZED ACTION CHAIN RETRIEVAL - Limit to recent actions only
      const actionChainStartTime = Date.now();
      const existingActions = await db
        .selectFrom('sync_actions_log')
        .select(['action_id', 'action_type', 'processed_at', 'action_data'])
        .where('user_id', '=', userId)
        .where('device_id', '=', device_id)
        .where('status', '=', 'success')
        .orderBy('processed_at', 'desc')
        .limit(50) // Only return last 50 actions for performance
        .execute();
      const actionChainTime = Date.now() - actionChainStartTime;

      console.log('🔗 [SYNC-RESPONSE] Including existing action chain:', {
        deviceId: device_id,
        existingActionsCount: existingActions.length,
        actionIds: existingActions.map(a => a.action_id),
        fetchTime: `${actionChainTime}ms`
      });

      // Get total count of ALL actions (successful + rejected) for nonce calculation
      const totalActionsCount = await db
        .selectFrom('sync_actions_log')
        .select(db.fn.count('id').as('count'))
        .where('user_id', '=', userId)
        .where('device_id', '=', device_id)
        .executeTakeFirst();

      const totalProcessedActions = Number(totalActionsCount?.count || 0);

      console.log('🔗 [SYNC-RESPONSE] Total actions processed (for nonce calculation):', {
        deviceId: device_id,
        totalActions: totalProcessedActions,
        successfulActions: existingActions.length
      });

      // Prepare response
      const response = {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        discarded_actions: finalDiscardedActions.length > 0 ? finalDiscardedActions : undefined,
        existing_action_chain: existingActions.length > 0 ? existingActions.map(a => ({
          action_id: a.action_id,
          action_type: a.action_type,
          processed_at: a.processed_at,
          // action_data is already a JSONB object from PostgreSQL, no need to parse
          action_data: a.action_data || null
        })) : undefined,
        server_processed_actions_count: totalProcessedActions, // Total actions server has processed for this device (including rejected)
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

      if (newSigningKey) {
        console.log(`✅ [SYNC-RESPONSE] Sending NEW signing key (version changed):`, {
          oldVersion: clientKeyVersion,
          newVersion: newSigningKey.version
        });
      } else {
        console.log(`✅ [SYNC-RESPONSE] NOT sending signing key (version stable):`, {
          version: serverKeyVersion
        });
      }

      console.log(`✅ [SYNC-RESPONSE] Sending response with server_processed_actions_count: ${totalProcessedActions}`);

      // BATCH FINAL UPDATES - Single transaction for cleanup operations
      const finalUpdatesStartTime = Date.now();
      await db.transaction().execute(async (trx) => {
        // 1. Update device last_used_at timestamp
        await trx
          .updateTable('device_sync_states')
          .set({
            last_used_at: new Date(),
            updated_at: new Date()
          })
          .where('device_id', '=', device_id)
          .where('user_id', '=', userId)
          .execute();

        // 2. Mark transaction as completed (if exists)
        if (transactionId) {
          await trx
            .updateTable('sync_transactions')
            .set({
              status: 'completed',
              completed_at: new Date()
            })
            .where('transaction_id', '=', transactionId)
            .where('user_id', '=', userId)
            .execute();
        }
      });

      const finalUpdatesTime = Date.now() - finalUpdatesStartTime;
      logTiming('Final Updates', finalUpdatesStartTime);
      console.log('✅ Final updates completed:', {
        device_id,
        userId,
        transactionCompleted: !!transactionId,
        updateTime: `${finalUpdatesTime}ms`
      });

      const responseTime = Date.now() - responseStartTime;
      logTiming('Response Preparation', responseStartTime);
      const syncTotalTime = Date.now() - syncStartTime;

      // Log detailed timing breakdown
      console.log('📊 [TIMING-SUMMARY] Detailed breakdown:', timingLog);
      console.log(`⏱️ [TIMING] Response preparation: ${responseTime}ms`);
      console.log(`⏱️ [SYNC-PERFORMANCE] Total sync time: ${syncTotalTime}ms`);

      // Calculate unaccounted time
      const accountedTime = Object.values(timingLog).reduce((sum, time) => sum + time, 0);
      const unaccountedTime = syncTotalTime - accountedTime;
      console.log(`🔍 [TIMING-ANALYSIS] Accounted: ${accountedTime}ms, Unaccounted: ${unaccountedTime}ms (${Math.round((unaccountedTime/syncTotalTime)*100)}%)`);

      res.json(response);

    } catch (error) {
      console.error('❌ Sync error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        user: req.user ? { id: req.user.id, isGuest: req.user.is_guest } : 'No user',
        deviceId: req.body?.device_id,
        actionsCount: Array.isArray(req.body?.offline_actions) ? req.body.offline_actions.length : 'Not array'
      });

      // Mark transaction as failed
      const transactionId = req.body?.transaction_id;
      if (transactionId && req.user?.id) {
        try {
          await db
            .updateTable('sync_transactions')
            .set({
              status: 'failed',
              error_message: error instanceof Error ? error.message : String(error),
              completed_at: new Date()
            })
            .where('transaction_id', '=', transactionId)
            .where('user_id', '=', req.user.id)
            .execute();

          console.log('✅ [IDEMPOTENCY] Marked transaction as failed:', transactionId);
        } catch (txError) {
          console.error('❌ Failed to mark transaction as failed:', txError);
        }
      }

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
