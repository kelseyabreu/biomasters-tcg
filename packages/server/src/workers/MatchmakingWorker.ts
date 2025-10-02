/**
 * Matchmaking Worker with Google Cloud Pub/Sub and Redis Integration
 * Processes matchmaking requests and creates matches
 */

import { Message, Subscription } from '@google-cloud/pubsub';
import { getIORedisClient, isIORedisAvailable } from '../config/ioredis';
import crypto from 'crypto';
import { workerDb as db } from '../database/kysely';
import { getSubscription, publishMessage, PUBSUB_TOPICS, PUBSUB_SUBSCRIPTIONS } from '../config/pubsub';
import { MatchmakingRequest, MatchFound, MatchmakingQueueEntry, SessionStatus } from '@kelseyabreu/shared';

export class MatchmakingWorker {
    private isRunning = false;
    private cleanupInterval?: NodeJS.Timeout | null;
    private namespace: string;
    private subscriptions: Subscription[] = [];

    constructor(namespace: string = 'prod') {
        this.namespace = namespace;
        console.log(`🔴 [MatchmakingWorker] Initializing with namespace: ${namespace}...`);
    }

    private getRedis() {
        const client = getIORedisClient();
        if (!client || !isIORedisAvailable()) {
            throw new Error('Redis not available for matchmaking worker');
        }
        return client;
    }

    /**
     * Start the matchmaking worker
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ MatchmakingWorker is already running');
            return;
        }

        this.isRunning = true;
        console.log(`🚀 [MATCHMAKING WORKER] Starting MatchmakingWorker with namespace: ${this.namespace}...`);
        console.log(`🚀 [MATCHMAKING WORKER] Redis namespace: ${this.namespace}`);

        try {
            console.log(`🚀 [MATCHMAKING WORKER] About to subscribe to Pub/Sub topics...`);

            // Subscribe to matchmaking requests
            console.log(`🚀 [MATCHMAKING WORKER] Subscribing to matchmaking requests...`);
            await this.subscribeToMatchmakingRequests();

            // Subscribe to match cancellations
            console.log(`🚀 [MATCHMAKING WORKER] Subscribing to match cancellations...`);
            await this.subscribeToMatchCancellations();

            // Start periodic cleanup of expired requests
            this.startPeriodicCleanup();

            console.log('✅ MatchmakingWorker started successfully');
        } catch (error) {
            console.error('❌ Failed to start MatchmakingWorker:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the matchmaking worker
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping MatchmakingWorker...');
        this.isRunning = false;

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Close all active subscriptions
        for (const subscription of this.subscriptions) {
            try {
                await subscription.close();
                console.log('🔌 Closed Pub/Sub subscription');
            } catch (error) {
                console.warn('⚠️ Error closing subscription:', error);
            }
        }
        this.subscriptions = [];

        // Wait for any pending operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Upstash Redis doesn't need explicit connection closing

        console.log('✅ MatchmakingWorker stopped');
    }

    /**
     * Subscribe to matchmaking requests from Pub/Sub
     */
    private async subscribeToMatchmakingRequests(): Promise<void> {
        const subscription = getSubscription(PUBSUB_SUBSCRIPTIONS.MATCHMAKING_WORKER);
        this.subscriptions.push(subscription);

        subscription.on('message', this.handleMatchmakingRequest.bind(this));
        subscription.on('error', (error) => {
            console.error('❌ Matchmaking subscription error:', error);
        });

        console.log(`📬 Subscribed to ${PUBSUB_SUBSCRIPTIONS.MATCHMAKING_WORKER}`);
    }

    /**
     * Subscribe to match cancellations from Pub/Sub
     */
    private async subscribeToMatchCancellations(): Promise<void> {
        const subscription = getSubscription(PUBSUB_SUBSCRIPTIONS.MATCH_CANCELLATIONS);
        this.subscriptions.push(subscription);

        subscription.on('message', this.handleMatchCancellation.bind(this));
        subscription.on('error', (error) => {
            console.error('❌ Match cancellation subscription error:', error);
        });

        console.log(`📬 Subscribed to ${PUBSUB_SUBSCRIPTIONS.MATCH_CANCELLATIONS}`);
    }

    /**
     * Handle incoming matchmaking request
     */
    private async handleMatchmakingRequest(message: Message): Promise<void> {
        try {
            console.log(`🚀 [MATCHMAKING WORKER] ===== HANDLING MATCHMAKING REQUEST =====`);
            console.log(`🚀 [MATCHMAKING WORKER] Raw message data:`, message.data.toString());
            console.log(`🚀 [MATCHMAKING WORKER] Message attributes:`, JSON.stringify(message.attributes, null, 2));
            console.log(`🚀 [MATCHMAKING WORKER] Message ID:`, message.id);

            const request: MatchmakingRequest = JSON.parse(message.data.toString());
            console.log(`🔍 [MATCHMAKING WORKER] Processing matchmaking request for ${request.playerId} in ${request.gameMode}`);
            console.log(`🔍 [MATCHMAKING WORKER] Request details:`, JSON.stringify(request, null, 2));

            // Log message as received (generate UUID if message.id is not valid)
            const messageId = this.isValidUUID(message.id) ? message.id : crypto.randomUUID();
            console.log(`🔍 [MATCHMAKING WORKER] Using message ID: ${messageId}`);
            await this.logMessageProcessing(messageId, request.playerId, 'received');

            // For multi-player games, add a small delay to allow all players to join the queue
            if (request.gameMode === 'team_2v2' || request.gameMode === 'ffa_4p') {
                console.log(`⏱️ [MATCHMAKING WORKER] Multi-player game detected, waiting 2 seconds for all players...`);
                console.log(`⏱️ [MATCHMAKING WORKER] Current player: ${request.playerId} in ${request.gameMode}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Try to find a match
            console.log(`🔍 [MATCHMAKING WORKER] Searching for match for player ${request.playerId}...`);
            const match = await this.findMatch(request);

            if (match) {
                console.log(`✅ [MATCHMAKING WORKER] ===== MATCH FOUND! =====`);
                console.log(`✅ [MATCHMAKING WORKER] Session ID: ${match.sessionId}`);
                console.log(`✅ [MATCHMAKING WORKER] Game Mode: ${match.gameMode}`);
                console.log(`✅ [MATCHMAKING WORKER] Players in match: ${match.players.length}`);
                match.players.forEach((player, index) => {
                    console.log(`✅ [MATCHMAKING WORKER]   Player ${index + 1}: ${player.playerId} (rating: ${player.rating})`);
                });
                console.log(`✅ [MATCHMAKING WORKER] ===== CREATING MATCH =====`);
                await this.createMatch(match);

                // Remove matched players from queue
                console.log(`🔍 [MATCHMAKING WORKER] Removing matched players from queue...`);
                await this.removePlayersFromQueue(match.players, request.gameMode);

                // Log successful match creation
                await this.logMessageProcessing(messageId, request.playerId, 'processed');
                console.log(`🎉 [MATCHMAKING WORKER] Match creation completed successfully for session ${match.sessionId}!`);
            } else {
                console.log(`⏱️ [MATCHMAKING WORKER] No match found for ${request.playerId}, staying in queue`);
                await this.logMessageProcessing(messageId, request.playerId, 'processed');
            }

            console.log(`✅ [MATCHMAKING WORKER] Acknowledging message...`);
            message.ack();
            console.log(`✅ [MATCHMAKING WORKER] Message acknowledged successfully`);
        } catch (error) {
            console.error('❌ [MATCHMAKING WORKER] Error processing matchmaking request:', error);

            // Log the error
            try {
                const request = JSON.parse(message.data.toString());
                const errorMessageId = this.isValidUUID(message.id) ? message.id : crypto.randomUUID();
                await this.logMessageProcessing(errorMessageId, request.playerId, 'failed', (error as Error).message);
            } catch (parseError) {
                console.error('❌ [MATCHMAKING WORKER] Failed to parse message for error logging:', parseError);
            }

            console.log(`❌ [MATCHMAKING WORKER] Nacking message due to error...`);
            message.nack();
        }
    }

    /**
     * Handle match cancellation
     */
    private async handleMatchCancellation(message: Message): Promise<void> {
        try {
            const cancellation = JSON.parse(message.data.toString());
            console.log(`🚫 Processing match cancellation for ${cancellation.playerId}`);

            // Remove from Redis queue (already removed from DB by MatchmakingService)
            await this.removePlayerFromRedisQueue(cancellation.playerId, cancellation.gameMode);

            message.ack();
        } catch (error) {
            console.error('❌ Error processing match cancellation:', error);
            message.nack();
        }
    }

    /**
     * Get namespaced queue key
     */
    private getQueueKey(gameMode: string): string {
        return `${this.namespace}:matchmaking:${gameMode}`;
    }

    /**
     * Find a match for the requesting player
     */
    private async findMatch(request: MatchmakingRequest): Promise<MatchFound | null> {
        const queueKey = this.getQueueKey(request.gameMode);

        try {
            console.log(`🔍 [MATCHMAKING WORKER] ===== FINDING MATCH FOR ${request.playerId} =====`);
            console.log(`🔍 [MATCHMAKING WORKER] Queue key: ${queueKey}`);
            console.log(`🔍 [MATCHMAKING WORKER] Player rating: ${request.rating}`);

            // Step 1: Find potential match (no changes to queue yet)
            const potentialMatch = await this.findPotentialMatch(request, queueKey);
            if (!potentialMatch) {
                console.log(`⏱️ [MATCHMAKING WORKER] No potential match found for ${request.playerId}`);
                return null;
            }

            console.log(`🎯 [MATCHMAKING WORKER] Found potential match with ${potentialMatch.players.length} players`);

            // Step 2: Atomic reservation of all players
            const sessionId = crypto.randomUUID();
            const reservationSuccess = await this.atomicPlayerReservation(potentialMatch.players, sessionId);

            if (!reservationSuccess) {
                console.log(`🔒 [MATCHMAKING WORKER] Atomic reservation failed - another worker won the race`);
                return null;
            }

            console.log(`✅ [MATCHMAKING WORKER] Atomic reservation successful for session ${sessionId}!`);

            // Step 3: Create the final match object
            const match: MatchFound = {
                sessionId,
                players: potentialMatch.players,
                gameMode: request.gameMode,
                estimatedStartTime: Date.now() + 5000
            };

            return match;
        } catch (error) {
            console.error('❌ Error finding match:', error);
            return null;
        }
    }

    /**
     * Find potential match without modifying the queue
     */
    private async findPotentialMatch(request: MatchmakingRequest, queueKey: string): Promise<{ players: Array<{ playerId: string, rating: number }> } | null> {
        try {
            // Get all players in queue (read-only operation)
            const requests = await this.getRedis().zrange(queueKey, 0, -1);
            console.log(`🔍 [POTENTIAL MATCH] Found ${requests.length} players in queue`);

            if (requests.length === 0) {
                return null;
            }

            // Parse and filter valid requests
            const validRequests: MatchmakingRequest[] = [];
            for (const requestItem of requests) {
                try {
                    let requestStr: string;
                    if (typeof requestItem === 'string') {
                        requestStr = requestItem;
                    } else if (typeof requestItem === 'object' && requestItem !== null) {
                        requestStr = JSON.stringify(requestItem);
                    } else {
                        requestStr = String(requestItem);
                    }

                    const parsedRequest = JSON.parse(requestStr) as MatchmakingRequest;

                    if (parsedRequest.playerId && parsedRequest.gameMode && typeof parsedRequest.rating === 'number') {
                        validRequests.push(parsedRequest);
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing request:', parseError);
                }
            }

            // Determine required players for game mode
            const requiredPlayers = this.getRequiredPlayers(request.gameMode);
            if (validRequests.length < requiredPlayers) {
                console.log(`⏱️ [POTENTIAL MATCH] Not enough players: ${validRequests.length}/${requiredPlayers}`);
                return null;
            }

            // Find current player and compatible opponents
            const currentPlayer = validRequests.find(r => r.playerId === request.playerId);
            if (!currentPlayer) {
                console.log(`❌ [POTENTIAL MATCH] Current player ${request.playerId} not found in queue`);
                return null;
            }

            const otherPlayers = validRequests.filter(r => r.playerId !== request.playerId);

            // Calculate rating range based on wait time
            const waitTime = Date.now() - currentPlayer.timestamp;
            const ratingRange = this.calculateRatingRange(currentPlayer.rating, currentPlayer.timestamp);
            console.log(`⏰ [POTENTIAL MATCH] Wait time: ${waitTime}ms, rating range: ±${ratingRange}`);

            // Filter by rating compatibility
            const compatiblePlayers = otherPlayers.filter(player => {
                const ratingDiff = Math.abs(player.rating - currentPlayer.rating);
                return ratingDiff <= ratingRange;
            });

            if (compatiblePlayers.length < requiredPlayers - 1) {
                console.log(`⏱️ [POTENTIAL MATCH] Not enough compatible players: ${compatiblePlayers.length}/${requiredPlayers - 1}`);
                return null;
            }

            // Select best opponents
            const selectedOpponents = compatiblePlayers
                .sort((a, b) => Math.abs(a.rating - currentPlayer.rating) - Math.abs(b.rating - currentPlayer.rating))
                .slice(0, requiredPlayers - 1);

            console.log(`🎯 [POTENTIAL MATCH] Selected ${selectedOpponents.length} opponents for ${request.playerId}`);

            return {
                players: [
                    { playerId: request.playerId, rating: request.rating },
                    ...selectedOpponents.map(opponent => ({
                        playerId: opponent.playerId,
                        rating: opponent.rating
                    }))
                ]
            };
        } catch (error) {
            console.error('❌ Error finding potential match:', error);
            return null;
        }
    }

    /**
     * Atomic player reservation using Redis MULTI/EXEC
     */
    private async atomicPlayerReservation(players: Array<{ playerId: string, rating: number }>, sessionId: string): Promise<boolean> {
        try {
            console.log(`🔒 [ATOMIC RESERVATION] Attempting to reserve ${players.length} players for session ${sessionId}`);

            // Create reservation keys for all players
            const reservationKeys = players.map(player => `${this.namespace}:reserved:${player.playerId}`);
            const reservationTTL = 15000; // 15 seconds

            console.log(`🔒 [ATOMIC RESERVATION] Reservation keys:`, reservationKeys);

            // Use Redis MULTI for atomic transaction (not pipeline!)
            const transaction = this.getRedis().multi();

            // Add SET NX commands for each player to the transaction
            for (const key of reservationKeys) {
                transaction.set(key, sessionId, 'PX', reservationTTL, 'NX');
            }

            // Execute the transaction atomically
            const results = await transaction.exec();
            console.log(`🔒 [ATOMIC RESERVATION] Transaction results:`, results);

            // Check if ALL reservations succeeded
            // In Upstash Redis, successful SET NX returns 'OK', failed returns null
            const allSucceeded = results?.every((result: any) => result === 'OK') ?? false;

            if (allSucceeded) {
                console.log(`✅ [ATOMIC RESERVATION] Successfully reserved all ${players.length} players for session ${sessionId}`);
                return true;
            } else {
                console.log(`❌ [ATOMIC RESERVATION] Failed to reserve all players - another worker won the race`);
                console.log(`🔒 [ATOMIC RESERVATION] Individual results:`, results);

                // Clean up any partial reservations using another transaction
                const cleanupTransaction = this.getRedis().multi();
                for (const key of reservationKeys) {
                    cleanupTransaction.del(key);
                }
                await cleanupTransaction.exec();

                return false;
            }
        } catch (error) {
            console.error('❌ Error in atomic player reservation:', error);
            return false;
        }
    }

    /**
     * Create a match and notify players
     */
    private async createMatch(match: MatchFound): Promise<void> {
        try {
            console.log(`🎯 Creating match ${match.sessionId} with ${match.players.length} players`);

            // Store match in database
            await this.storeMatchInDatabase(match);

            // Notify players via Pub/Sub
            console.log(`📢 [MatchmakingWorker] ===== PUBLISHING MATCH_FOUND NOTIFICATIONS =====`);
            for (const player of match.players) {
                const attributes = {
                    playerId: player.playerId,
                    sessionId: match.sessionId,
                    gameMode: match.gameMode
                };
                console.log(`📢 [MatchmakingWorker] Publishing notification for player ${player.playerId}:`, JSON.stringify(attributes, null, 2));
                console.log(`📢 [MatchmakingWorker] Match data:`, JSON.stringify(match, null, 2));

                await publishMessage(
                    PUBSUB_TOPICS.MATCH_FOUND,
                    match,
                    attributes
                );
                console.log(`📢 [MatchmakingWorker] Published notification for player ${player.playerId}`);
            }

            // Store match history
            await this.createMatchHistory(match);

            // Clean up player reservations
            await this.cleanupPlayerReservations(match.players.map(p => `${this.namespace}:reserved:${p.playerId}`));

            console.log(`✅ Match ${match.sessionId} created successfully with players: ${match.players.map(p => p.playerId).join(', ')}`);
        } catch (error) {
            console.error(`❌ Failed to create match ${match.sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Clean up player reservations after match creation
     */
    private async cleanupPlayerReservations(reservationKeys: string[]): Promise<void> {
        try {
            console.log(`🧹 [CLEANUP] Removing ${reservationKeys.length} reservation keys`);

            // Use transaction for atomic cleanup
            const transaction = this.getRedis().multi();
            for (const key of reservationKeys) {
                transaction.del(key);
            }
            await transaction.exec();

            console.log(`✅ [CLEANUP] Successfully removed ${reservationKeys.length} reservation keys`);
        } catch (error) {
            console.error('❌ Error cleaning up player reservations:', error);
        }
    }

    /**
     * Store match in the database as a game session
     */
    private async storeMatchInDatabase(match: MatchFound): Promise<void> {
        try {
            // Get user details for all players
            const playerIds = match.players.map(p => p.playerId);
            console.log('🔴 [MatchmakingWorker] Looking up users for playerIds:', playerIds);

            // Add retry logic for database operations
            let users: any[] = [];
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    users = await db
                        .selectFrom('users')
                        .select(['id', 'username', 'display_name'])
                        .where('id', 'in', playerIds)
                        .execute();
                    break; // Success, exit retry loop
                } catch (dbError: any) {
                    retryCount++;
                    console.error(`❌ [MatchmakingWorker] Database error (attempt ${retryCount}/${maxRetries}):`, dbError.message);

                    if (retryCount >= maxRetries) {
                        throw new Error(`Database connection failed after ${maxRetries} attempts: ${dbError.message}`);
                    }

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            console.log('🔴 [MatchmakingWorker] Found users:', users.map(u => ({ id: u.id, username: u.username })));
            console.log('🔴 [MatchmakingWorker] Expected:', playerIds.length, 'Found:', users.length);

            if (users.length !== playerIds.length) {
                // Let's check what users exist in the database
                const allUsers = await db
                    .selectFrom('users')
                    .select(['id', 'username', 'firebase_uid'])
                    .execute();
                console.log('🔴 [MatchmakingWorker] All users in database:', allUsers.map(u => ({ id: u.id, username: u.username, firebase_uid: u.firebase_uid })));

                throw new Error(`Failed to get user details: expected ${playerIds.length}, found ${users.length}`);
            }

            // Create game settings
            const gameSettings = {
                eventFrequency: 0.1,
                allowChallenges: true,
                startingHandSize: 5,
                deckSize: 10,
                turnTimeLimit: 300
            };

            // Create players array with team assignments for game state
            const players = users.map((user, index) => {
                const basePlayer = {
                    playerId: user.id,
                    id: user.id,
                    name: user.display_name || user.username || `Player ${index + 1}`,
                    username: user.username || user.display_name,
                    firebaseUid: user.firebase_uid, // Include Firebase UID for frontend mapping
                    ready: false,
                    rating: match.players.find(p => p.playerId === user.id)?.rating || 1000
                };

                // Add team assignment for team-based modes
                if (match.gameMode === 'team_2v2') {
                    return {
                        ...basePlayer,
                        team: index < 2 ? 'team1' : 'team2'
                    };
                }

                // No team assignment for FFA or 1v1
                return basePlayer;
            });

            const initialGameState = {
                gamePhase: 'lobby',
                players,
                currentPlayerIndex: 0,
                turnNumber: 1,
                settings: gameSettings
            };

            // Debug the players object before insertion
            console.log('🔴 [MatchmakingWorker] Players object to insert:', JSON.stringify(players, null, 2));
            console.log('🔴 [MatchmakingWorker] Players object type:', typeof players);
            console.log('🔴 [MatchmakingWorker] Players is array:', Array.isArray(players));

            // Convert players to JSON string for JSONB column to avoid double-serialization
            const playersJson = JSON.stringify(players);
            console.log('🔴 [MatchmakingWorker] Players JSON string:', playersJson);

            // Insert game session
            await db
                .insertInto('game_sessions')
                .values({
                    id: match.sessionId,
                    host_user_id: match.players[0]?.playerId || '',
                    game_mode: match.gameMode as any, // Use actual game mode
                    is_private: false,
                    max_players: match.players.length,
                    current_players: match.players.length,
                    status: SessionStatus.WAITING,
                    players: playersJson as any, // Store players as JSON string for JSONB
                    game_state: initialGameState,
                    settings: gameSettings
                })
                .execute();

            console.log(`💾 Stored match ${match.sessionId} in database`);

            // Set lobby timeout marker in Redis (5 minutes)
            // GameWorker will clean up sessions that stay in waiting status too long
            await this.getRedis().setex(
                `session:${match.sessionId}:lobby_timeout`,
                300, // 5 minutes
                JSON.stringify({
                    sessionId: match.sessionId,
                    createdAt: Date.now(),
                    expectedPlayers: match.players.length
                })
            );

            console.log(`⏰ Set lobby timeout marker for session ${match.sessionId} (5 minutes)`);
        } catch (error) {
            console.error(`❌ Failed to store match in database:`, error);
            throw error;
        }
    }

    /**
     * Create match history record
     */
    private async createMatchHistory(match: MatchFound): Promise<void> {
        try {
            // Create match results for each player
            for (const player of match.players) {
                const opponent = match.players.find(p => p.playerId !== player.playerId);
                const values: any = {
                    session_id: match.sessionId,
                    player_user_id: player.playerId,
                    game_mode: match.gameMode,
                    result: 'draw', // Initial state, will be updated when match completes
                    rating_before: player.rating,
                    rating_after: player.rating, // Will be updated when match completes
                    rating_change: 0,
                    created_at: new Date()
                };

                if (opponent) {
                    values.opponent_user_id = opponent.playerId;
                }

                await db
                    .insertInto('match_results')
                    .values(values)
                    .execute();
            }

            console.log(`📊 Created match history for ${match.sessionId}`);
        } catch (error) {
            console.error(`❌ Failed to create match history:`, error);
            // Don't throw - this is not critical for match creation
        }
    }

    /**
     * Remove matched players from Redis queue
     */
    private async removePlayersFromQueue(players: Array<{ playerId: string }>, gameMode: string): Promise<void> {
        const queueKey = this.getQueueKey(gameMode);
        console.log(`🧹 [MATCHMAKING WORKER] Removing ${players.length} players from queue ${queueKey}`);
        console.log(`🧹 [MATCHMAKING WORKER] Players to remove:`, players.map(p => p.playerId));

        try {
            const requests = await this.getRedis().zrange(queueKey, 0, -1);
            console.log(`🧹 [MATCHMAKING WORKER] Queue ${queueKey} currently has ${requests.length} items before removal`);
            const playersToRemove = new Set(players.map(p => p.playerId));

            for (const requestItem of requests) {
                try {
                    console.log('🔴 [MatchmakingWorker] Processing request item for removal:', requestItem);
                    console.log('🔴 [MatchmakingWorker] Type of request item:', typeof requestItem);

                    // Handle different return types from Upstash Redis
                    let requestStr: string;
                    if (typeof requestItem === 'string') {
                        requestStr = requestItem;
                    } else if (typeof requestItem === 'object' && requestItem !== null) {
                        // Upstash might return objects directly
                        requestStr = JSON.stringify(requestItem);
                    } else {
                        console.log('🔴 [MatchmakingWorker] Unexpected request item type, converting to string');
                        requestStr = String(requestItem);
                    }

                    console.log('🔴 [MatchmakingWorker] Parsing request string for removal:', requestStr);
                    const request: MatchmakingQueueEntry = JSON.parse(requestStr);
                    console.log('🔴 [MatchmakingWorker] Parsed request for removal:', request);

                    if (playersToRemove.has(request.playerId)) {
                        console.log('🔴 [MatchmakingWorker] Found player to remove:', request.playerId);
                        await this.getRedis().zrem(queueKey, requestStr);
                        console.log(`🗑️ Removed ${request.playerId} from Redis queue`);
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse request for removal:', parseError);
                    console.error('❌ Request item was:', requestItem);
                    console.error('❌ Type was:', typeof requestItem);
                }
            }

            // Remove from database queue as well
            const playerIds = players.map(p => p.playerId);
            console.log(`🔴 [MatchmakingWorker] About to remove players from database queue:`, playerIds);

            const deleteResult = await db
                .deleteFrom('matchmaking_queue')
                .where('user_id', 'in', playerIds)
                .execute();

            console.log(`🗑️ Database deletion result:`, deleteResult);
            console.log(`🗑️ Removed ${playerIds.length} players from matchmaking queues`);

            // Verify final queue state
            const finalRequests = await this.getRedis().zrange(queueKey, 0, -1);
            console.log(`🧹 [MATCHMAKING WORKER] Queue ${queueKey} now has ${finalRequests.length} items remaining after removal`);
        } catch (error) {
            console.error('❌ Failed to remove players from queue:', error);
        }
    }

    /**
     * Remove a specific player from Redis queue
     */
    private async removePlayerFromRedisQueue(playerId: string, gameMode: string): Promise<void> {
        const queueKey = `matchmaking:${gameMode}`;

        try {
            console.log('🔴 [MatchmakingWorker] Getting Redis queue entries for:', queueKey);
            const requests = await this.getRedis().zrange(queueKey, 0, -1);
            console.log('🔴 [MatchmakingWorker] Raw Redis zrange result:', requests);
            console.log('🔴 [MatchmakingWorker] Type of requests:', typeof requests);

            for (const requestItem of requests) {
                try {
                    console.log('🔴 [MatchmakingWorker] Processing request item:', requestItem);
                    console.log('🔴 [MatchmakingWorker] Type of request item:', typeof requestItem);

                    // Handle different return types from Upstash Redis
                    let requestStr: string;
                    if (typeof requestItem === 'string') {
                        requestStr = requestItem;
                    } else if (typeof requestItem === 'object' && requestItem !== null) {
                        // Upstash might return objects directly
                        requestStr = JSON.stringify(requestItem);
                    } else {
                        console.log('🔴 [MatchmakingWorker] Unexpected request item type, converting to string');
                        requestStr = String(requestItem);
                    }

                    console.log('🔴 [MatchmakingWorker] Parsing request string:', requestStr);
                    const request: MatchmakingQueueEntry = JSON.parse(requestStr);
                    console.log('🔴 [MatchmakingWorker] Parsed request:', request);

                    if (request.playerId === playerId) {
                        console.log('🔴 [MatchmakingWorker] Found matching player, removing from queue');
                        await this.getRedis().zrem(queueKey, requestStr);
                        console.log(`🗑️ Removed ${playerId} from Redis queue ${queueKey}`);
                        break;
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse request for removal:', parseError);
                    console.error('❌ Request item was:', requestItem);
                    console.error('❌ Type was:', typeof requestItem);
                }
            }
        } catch (error) {
            console.error(`❌ Failed to remove player ${playerId} from Redis queue:`, error);
        }
    }



    /**
     * Calculate rating range based on wait time
     */
    private calculateRatingRange(_rating: number, requestTime: number): number {
        const waitTime = Date.now() - requestTime;
        const baseRange = 100;

        // Expand range over time to improve match probability
        const timeBonus = Math.floor(waitTime / 30000) * 50; // +50 every 30 seconds
        return Math.min(baseRange + timeBonus, 500); // Cap at 500 rating difference
    }

    /**
     * Get required number of total players for a game mode
     */
    private getRequiredPlayers(gameMode: string): number {
        switch (gameMode) {
            case 'ranked_1v1':
            case 'casual_1v1':
                return 2; // 2 total players
            case 'team_2v2':
                return 4; // 4 total players (2 teams of 2)
            case 'ffa_4p':
                return 4; // 4 total players (free-for-all)
            default:
                console.error(`❌ Unknown game mode: ${gameMode}`);
                return 2; // Default to 1v1
        }
    }



    /**
     * Start periodic cleanup of expired requests
     */
    private startPeriodicCleanup(): void {
        this.cleanupInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.cleanupExpiredRequests();
            }
        }, 30000); // Every 30 seconds

        console.log('🧹 Started periodic cleanup of expired requests');
    }

    /**
     * Cleanup expired requests from Redis and database
     */
    private async cleanupExpiredRequests(): Promise<void> {
        try {
            const gameModesPattern = 'matchmaking:*';
            const queues = await this.getRedis().keys(gameModesPattern);

            const expireTime = Date.now() - (10 * 60 * 1000); // 10 minutes
            let totalCleaned = 0;

            for (const queueKey of queues) {
                const removed = await this.getRedis().zremrangebyscore(queueKey, 0, expireTime);
                totalCleaned += removed;
            }

            // Also cleanup database entries
            const dbResult = await db
                .deleteFrom('matchmaking_queue')
                .where('expires_at', '<', new Date())
                .execute();

            if (totalCleaned > 0 || dbResult.length > 0) {
                console.log(`🧹 Cleaned up ${totalCleaned} expired Redis entries and ${dbResult.length} database entries`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup expired requests:', error);
        }
    }

    /**
     * Check if a string is a valid UUID
     */
    private isValidUUID(uuid: string | undefined): boolean {
        if (!uuid) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Log Pub/Sub message processing status
     */
    private async logMessageProcessing(
        messageId: string,
        playerId: string,
        status: 'received' | 'processed' | 'failed',
        errorMessage?: string
    ): Promise<void> {
        try {
            // Only log if both messageId and playerId are valid UUIDs
            if (!this.isValidUUID(messageId) || !this.isValidUUID(playerId)) {
                console.log(`⚠️ Skipping message log - invalid UUID format: messageId=${messageId}, playerId=${playerId}`);
                return;
            }

            await db
                .updateTable('pubsub_message_log')
                .set({
                    status,
                    error_message: errorMessage || null,
                    processed_at: new Date()
                })
                .where('id', '=', messageId)
                .where('player_id', '=', playerId)
                .execute();
        } catch (error) {
            console.error('❌ Failed to log message processing status:', error);
        }
    }

    /**
     * Get worker statistics
     */
    async getStats(): Promise<any> {
        try {
            const queueStats = await this.getQueueStats();
            const recentMatches = await this.getRecentMatchCount();

            return {
                isRunning: this.isRunning,
                queueStats,
                recentMatches,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ Failed to get worker stats:', error);
            return {
                isRunning: this.isRunning,
                error: (error as Error).message,
                timestamp: new Date()
            };
        }
    }

    /**
     * Get current queue statistics
     */
    private async getQueueStats(): Promise<Record<string, number>> {
        try {
            const queues = await this.getRedis().keys('matchmaking:*');
            const stats: Record<string, number> = {};

            for (const queueKey of queues) {
                const gameMode = queueKey.replace('matchmaking:', '');
                const size = await this.getRedis().zcard(queueKey);
                stats[gameMode] = size;
            }

            return stats;
        } catch (error) {
            console.error('❌ Failed to get queue stats:', error);
            return {};
        }
    }

    /**
     * Get recent match count (last hour)
     */
    private async getRecentMatchCount(): Promise<number> {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const result = await db
                .selectFrom('match_results')
                .select(db.fn.count('id').as('count'))
                .where('created_at', '>=', oneHourAgo)
                .executeTakeFirst();

            return Number(result?.count || 0);
        } catch (error) {
            console.error('❌ Failed to get recent match count:', error);
            return 0;
        }
    }
}