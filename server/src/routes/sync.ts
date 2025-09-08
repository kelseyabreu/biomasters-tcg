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
import { speciesNameToCardId } from '../utils/cardIdMapping';

const router = Router();

/**
 * Verify HMAC signature for offline action
 */
function verifyActionSignature(action: Omit<OfflineAction, 'signature'>, signature: string, signingKey: string): boolean {
  const payload = JSON.stringify(action);
  const expectedSignature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

interface OfflineAction {
  id: string;
  action: 'pack_opened' | 'card_acquired' | 'deck_created' | 'deck_updated' | 'starter_pack_opened';
  species_name?: string;
  quantity?: number;
  pack_type?: string;
  deck_id?: string;
  deck_data?: any;
  timestamp: number;
  signature: string;
  api_version: string;
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
      let serverXP = currentXP;
      const serverCollection = new Map(
        currentCollection.map(card => [card.card_id.toString(), card])
      );
      console.log('✅ Server state initialized:', {
        serverCredits,
        serverXP,
        collectionSize: serverCollection.size
      });

      // Get signing key for this device
      console.log('🔍 Fetching device state for:', { device_id, userId });
      const deviceState = await db
        .selectFrom('device_sync_states')
        .select(['signing_key', 'key_expires_at'])
        .where('device_id', '=', device_id)
        .where('user_id', '=', userId)
        .executeTakeFirst();

      console.log('✅ Device state fetched:', {
        hasDeviceState: !!deviceState,
        keyExpiry: deviceState?.key_expires_at,
        hasSigningKey: !!deviceState?.signing_key
      });

      if (!deviceState) {
        console.log('❌ Device state not found - device not registered for offline sync');
        res.status(400).json({
          error: 'Device not registered for offline sync',
          conflicts: [],
          server_state: { credits: serverCredits }
        });
        return;
      }
      console.log('✅ Device state validation passed');

      console.log('🔍 Checking signing key expiry...');
      if (new Date() > new Date(deviceState.key_expires_at)) {
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
          if (!verifyActionSignature(actionPayload, signature, deviceState.signing_key)) {
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
                .some(card => card.acquired_via === 'starter');
              
              if (hasStarterCards) {
                conflicts.push({
                  action_id: action.id,
                  reason: 'starter_pack_already_opened',
                  server_state: { credits: serverCredits }
                });
                discardedActions.push(action.id);
                continue;
              }

              // Add starter pack species
              const starterSpecies = [
                { species: 'grass', cardId: 3 },
                { species: 'rabbit', cardId: 4 },
                { species: 'fox', cardId: 53 },
                { species: 'oak-tree', cardId: 1 },
                { species: 'butterfly', cardId: 34 }
              ];
              for (const { species, cardId } of starterSpecies) {
                serverCollection.set(species, {
                  id: `temp_${species}`,
                  user_id: req.user.id,
                  card_id: cardId,
                  quantity: 1,
                  acquired_via: 'starter',
                  first_acquired_at: new Date(action.timestamp),
                  last_acquired_at: new Date(action.timestamp)
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
              if (action.species_name && action.quantity) {
                const existing = serverCollection.get(action.species_name);
                if (existing) {
                  existing.quantity += action.quantity;
                  existing.last_acquired_at = new Date(action.timestamp);
                } else {
                  const cardId = speciesNameToCardId(action.species_name) || 0;
                  serverCollection.set(action.species_name, {
                    id: `temp_${action.species_name}`,
                    user_id: req.user.id,
                    card_id: cardId,
                    quantity: action.quantity,
                    acquired_via: 'pack',
                    first_acquired_at: new Date(action.timestamp),
                    last_acquired_at: new Date(action.timestamp)
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

        // Upsert each card individually using CardId system
        for (const [speciesName, card] of serverCollection) {
          const cardId = speciesNameToCardId(speciesName);

          if (!cardId) {
            console.warn(`Unknown species in sync: ${speciesName} - skipping`);
            continue;
          }

          await trx
            .insertInto('user_cards')
            .values({
              user_id: req.user!.id,
              card_id: cardId,
              quantity: card.quantity,
              acquired_via: card.acquired_via,
              first_acquired_at: card.first_acquired_at
            })
            .onConflict((oc) => oc
              .columns(['user_id', 'card_id'])
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

      // Prepare response
      const response = {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        discarded_actions: discardedActions.length > 0 ? discardedActions : undefined,
        new_server_state: {
          cards_owned: Object.fromEntries(
            Array.from(serverCollection.entries()).map(([species, card]) => [
              species,
              {
                quantity: card.quantity,
                acquired_via: card.acquired_via,
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
