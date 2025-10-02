/**
 * Enhanced Matchmaking Service with Google Cloud Pub/Sub Integration
 * Handles distributed matchmaking with Redis queues and Pub/Sub messaging
 */

import { getIORedisClient, isIORedisAvailable } from '../config/ioredis';
import { workerDb as db } from '../database/kysely';
import { getPubSubClient, PUBSUB_TOPICS, publishMessage } from '../config/pubsub';
import { MatchmakingRequest, MatchmakingQueueEntry } from '@kelseyabreu/shared';

export class MatchmakingService {
    private namespace: string;

    constructor(namespace: string = 'prod') {
        this.namespace = namespace;
        console.log(`🔴 [MatchmakingService] Initializing with namespace: ${namespace}...`);
    }

    private getRedis() {
        const client = getIORedisClient();
        if (!client || !isIORedisAvailable()) {
            // In test environment, provide more detailed error information
            if (process.env['NODE_ENV'] === 'test') {
                console.error('🔴 [MatchmakingService] Redis not available in test environment');
                console.error('🔴 [MatchmakingService] Client exists:', !!client);
                console.error('🔴 [MatchmakingService] Redis available:', isIORedisAvailable());
                throw new Error('Redis not available for matchmaking - check tunnel connection');
            }
            throw new Error('Redis not available for matchmaking');
        }
        return client;
    }



    /**
     * Submit a matchmaking request
     */
    async requestMatch(request: MatchmakingRequest): Promise<void> {
        try {
            console.log(`🚀 [MATCHMAKING SERVICE] Processing matchmaking request for player ${request.playerId}`);
            console.log(`🚀 [MATCHMAKING SERVICE] Request details:`, JSON.stringify(request, null, 2));

            // Store in database for tracking
            console.log(`🔍 [MATCHMAKING SERVICE] Step 1: Storing request in database...`);
            await this.storeMatchmakingRequest(request);
            console.log(`✅ [MATCHMAKING SERVICE] Step 1 completed: Database storage`);

            // Add to Redis queue for worker processing
            console.log(`🔍 [MATCHMAKING SERVICE] Step 2: Adding to Redis queue...`);
            await this.addToRedisQueue(request);
            console.log(`✅ [MATCHMAKING SERVICE] Step 2 completed: Redis queue`);

            // Publish to Pub/Sub for immediate processing
            console.log(`🔍 [MATCHMAKING SERVICE] Step 3: Publishing to Pub/Sub...`);
            const pubsubAttributes = {
                gameMode: request.gameMode,
                playerId: request.playerId,
                priority: this.calculatePriority(request).toString(),
                requestId: request.requestId
            };
            console.log(`🚀 [MATCHMAKING SERVICE] Publishing to topic: ${PUBSUB_TOPICS.MATCHMAKING_REQUESTS}`);
            console.log(`🚀 [MATCHMAKING SERVICE] Message data:`, JSON.stringify(request, null, 2));
            console.log(`🚀 [MATCHMAKING SERVICE] Message attributes:`, JSON.stringify(pubsubAttributes, null, 2));

            await publishMessage(
                PUBSUB_TOPICS.MATCHMAKING_REQUESTS,
                request,
                pubsubAttributes
            );
            console.log(`✅ [MATCHMAKING SERVICE] Step 3 completed: Pub/Sub message published successfully`);

            // Log the message for debugging
            console.log(`🔍 [MATCHMAKING SERVICE] Step 4: Logging Pub/Sub message...`);
            await this.logPubSubMessage(
                PUBSUB_TOPICS.MATCHMAKING_REQUESTS,
                request.playerId,
                'matchmaking_request',
                request
            );
            console.log(`✅ [MATCHMAKING SERVICE] Step 4 completed: Message logged`);

            console.log(`🎉 [MATCHMAKING SERVICE] All steps completed! Matchmaking request queued for player ${request.playerId}`);
        } catch (error) {
            console.error(`❌ Failed to process matchmaking request for player ${request.playerId}:`, error);
            throw error;
        }
    }

    /**
     * Cancel a matchmaking request
     */
    async cancelMatch(playerId: string, gameMode: string): Promise<void> {
        try {
            console.log(`🚫 Cancelling matchmaking for player ${playerId} in ${gameMode}`);

            // Remove from database queue
            await db
                .deleteFrom('matchmaking_queue')
                .where('user_id', '=', playerId)
                .where('game_mode', '=', gameMode)
                .execute();

            // Remove from Redis queue
            await this.removeFromRedisQueue(playerId, gameMode);

            // Publish cancellation to Pub/Sub
            const cancellationData = { playerId, gameMode, timestamp: Date.now() };
            await publishMessage(
                PUBSUB_TOPICS.MATCH_CANCELLED,
                cancellationData,
                { playerId, gameMode }
            );

            // Log the cancellation
            await this.logPubSubMessage(
                PUBSUB_TOPICS.MATCH_CANCELLED,
                playerId,
                'match_cancellation',
                cancellationData
            );

            console.log(`✅ Matchmaking cancelled for player ${playerId}`);
        } catch (error) {
            console.error(`❌ Failed to cancel matchmaking for player ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get estimated wait time for a game mode and rating
     */
    async getEstimatedWaitTime(gameMode: string, _rating: number): Promise<number> {
        console.log(`🔴 [MatchmakingService] Getting estimated wait time for ${gameMode}`);
        try {
            // Get current queue size from Redis
            const queueKey = this.getQueueKey(gameMode);
            console.log(`🔴 [MatchmakingService] Getting queue size from Redis for ${queueKey}`);
            const queueSize = await this.getRedis().zcard(queueKey);
            console.log(`🔴 [MatchmakingService] Queue size: ${queueSize}`);

            // Get recent analytics for better estimation
            console.log(`🔴 [MatchmakingService] Querying matchmaking_analytics table for ${gameMode}`);
            const analytics = await db
                .selectFrom('matchmaking_analytics')
                .select(['average_wait_time_seconds', 'peak_queue_size'])
                .where('game_mode', '=', gameMode)
                .where('date', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
                .orderBy('date', 'desc')
                .limit(7)
                .execute();
            console.log(`🔴 [MatchmakingService] Analytics query completed, found ${analytics.length} records`);

            if (analytics.length === 0) {
                // No historical data, use simple estimation
                console.log(`🔴 [MatchmakingService] No analytics data, using basic wait time calculation`);
                return this.calculateBasicWaitTime(queueSize);
            }

            // Calculate weighted average based on recent data
            const avgWaitTime = analytics.reduce((sum, record) => sum + record.average_wait_time_seconds, 0) / analytics.length;
            const avgPeakSize = analytics.reduce((sum, record) => sum + record.peak_queue_size, 0) / analytics.length;

            // Adjust based on current queue size vs historical peak
            const queueFactor = queueSize / Math.max(avgPeakSize, 1);
            const estimatedWait = Math.max(30, avgWaitTime * queueFactor); // Minimum 30 seconds

            console.log(`✅ [MatchmakingService] Estimated wait time calculated: ${Math.floor(estimatedWait)} seconds`);
            return Math.floor(estimatedWait);
        } catch (error) {
            console.error('❌ Failed to calculate estimated wait time:', error);
            return this.calculateBasicWaitTime(0);
        }
    }

    /**
     * Store matchmaking request in database
     */
    private async storeMatchmakingRequest(request: MatchmakingRequest): Promise<void> {
        console.log(`🔴 [MatchmakingService] Storing matchmaking request in database for player ${request.playerId}`);
        try {
            await db
                .insertInto('matchmaking_queue')
                .values({
                    user_id: request.playerId,
                    game_mode: request.gameMode,
                    rating: request.rating,
                    preferences: JSON.stringify(request.preferences),
                    request_id: request.requestId,
                    priority: this.calculatePriority(request),
                    created_at: new Date(request.timestamp),
                    expires_at: new Date(request.timestamp + (request.preferences.maxWaitTime || 600) * 1000)
                })
                .onConflict((oc) => oc
                    .column('user_id')
                    .doUpdateSet({
                        game_mode: request.gameMode,
                        rating: request.rating,
                        preferences: JSON.stringify(request.preferences),
                        request_id: request.requestId,
                        priority: this.calculatePriority(request),
                        created_at: new Date(request.timestamp),
                        expires_at: new Date(request.timestamp + (request.preferences.maxWaitTime || 600) * 1000),
                        retry_count: 0
                    })
                )
                .execute();
            console.log(`✅ [MatchmakingService] Successfully stored matchmaking request in database for player ${request.playerId}`);
        } catch (error) {
            console.error(`❌ [MatchmakingService] Failed to store matchmaking request in database for player ${request.playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get namespaced queue key
     */
    private getQueueKey(gameMode: string): string {
        return `${this.namespace}:matchmaking:${gameMode}`;
    }

    /**
     * Add request to Redis queue
     */
    private async addToRedisQueue(request: MatchmakingRequest): Promise<void> {
        const queueKey = this.getQueueKey(request.gameMode);

        console.log('🔴 [MatchmakingService] Adding to Redis queue:', queueKey);

        const queueEntry: MatchmakingQueueEntry = {
            playerId: request.playerId,
            gameMode: request.gameMode,
            rating: request.rating,
            timestamp: request.timestamp,
            preferences: request.preferences
        };

        console.log('🔴 [MatchmakingService] Queue entry:', queueEntry);

        try {
            console.log('🔴 [MatchmakingService] Calling redis.zadd...');
            const result = await this.getRedis().zadd(queueKey, request.timestamp, JSON.stringify(queueEntry));
            console.log('🔴 [MatchmakingService] Redis zadd result:', result);
        } catch (error) {
            console.error('❌ [MatchmakingService] Redis zadd failed:', error);
            throw error;
        }

        // Update queue state tracking
        try {
            console.log('🔴 [MatchmakingService] Updating Redis queue state...');
            await this.updateRedisQueueState(request.gameMode);
            console.log('🔴 [MatchmakingService] Redis queue state updated');
        } catch (error) {
            console.error('❌ [MatchmakingService] Redis queue state update failed:', error);
            throw error;
        }
    }

    /**
     * Remove player from Redis queue
     */
    private async removeFromRedisQueue(playerId: string, gameMode: string): Promise<void> {
        const queueKey = this.getQueueKey(gameMode);
        console.log('🔴 [MatchmakingService] Getting Redis queue entries for:', queueKey);

        const requests = await this.getRedis().zrange(queueKey, 0, -1);
        console.log('🔴 [MatchmakingService] Raw Redis zrange result:', requests);
        console.log('🔴 [MatchmakingService] Type of requests:', typeof requests);
        console.log('🔴 [MatchmakingService] Is array:', Array.isArray(requests));

        for (const requestItem of requests) {
            try {
                console.log('🔴 [MatchmakingService] Processing request item:', requestItem);
                console.log('🔴 [MatchmakingService] Type of request item:', typeof requestItem);

                // Handle different return types from Upstash Redis
                let requestStr: string;
                if (typeof requestItem === 'string') {
                    requestStr = requestItem;
                } else if (typeof requestItem === 'object' && requestItem !== null) {
                    // Upstash might return objects directly
                    requestStr = JSON.stringify(requestItem);
                } else {
                    console.log('🔴 [MatchmakingService] Unexpected request item type, converting to string');
                    requestStr = String(requestItem);
                }

                console.log('🔴 [MatchmakingService] Parsing request string:', requestStr);
                const request = JSON.parse(requestStr);
                console.log('🔴 [MatchmakingService] Parsed request:', request);

                if (request.playerId === playerId) {
                    console.log('🔴 [MatchmakingService] Found matching player, removing from queue');
                    await this.getRedis().zrem(queueKey, requestStr);
                    console.log('🔴 [MatchmakingService] Successfully removed from queue');
                    break;
                }
            } catch (error) {
                console.error('❌ Failed to parse Redis queue entry:', error);
                console.error('❌ Request item was:', requestItem);
                console.error('❌ Type was:', typeof requestItem);
            }
        }

        // Update queue state tracking
        await this.updateRedisQueueState(gameMode);
    }

    /**
     * Update Redis queue state tracking in database
     */
    private async updateRedisQueueState(gameMode: string): Promise<void> {
        try {
            const queueKey = this.getQueueKey(gameMode);
            const currentSize = await this.getRedis().zcard(queueKey);

            await db
                .insertInto('redis_queue_state')
                .values({
                    queue_name: queueKey,
                    game_mode: gameMode,
                    current_size: currentSize,
                    peak_size: currentSize,
                    last_processed_at: new Date()
                })
                .onConflict((oc) => oc
                    .columns(['queue_name', 'game_mode'])
                    .doUpdateSet({
                        current_size: currentSize,
                        peak_size: currentSize, // Simplified for now
                        last_processed_at: new Date()
                    })
                )
                .execute();
        } catch (error) {
            console.error('❌ Failed to update Redis queue state:', error);
        }
    }

    /**
     * Log Pub/Sub message for debugging and monitoring
     */
    private async logPubSubMessage(
        topicName: string,
        playerId: string,
        messageType: string,
        payload: any
    ): Promise<void> {
        try {
            await db
                .insertInto('pubsub_message_log')
                .values({
                    topic_name: topicName,
                    player_id: playerId,
                    message_type: messageType,
                    payload: JSON.stringify(payload),
                    status: 'sent'
                })
                .execute();
        } catch (error) {
            console.error('❌ Failed to log Pub/Sub message:', error);
        }
    }

    /**
     * Calculate priority based on wait time
     */
    private calculatePriority(request: MatchmakingRequest): number {
        const waitTime = Date.now() - request.timestamp;
        return Math.floor(waitTime / 10000); // Priority increases every 10 seconds
    }

    /**
     * Basic wait time calculation fallback
     */
    private calculateBasicWaitTime(queueSize: number): number {
        // Base wait time: 30 seconds + 15 seconds per person in queue
        const baseWait = 30 + (queueSize * 15);

        // Add randomness to make it feel more realistic
        const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2

        return Math.floor(baseWait * randomFactor);
    }

    /**
     * Cleanup expired requests from Redis
     */
    async cleanupExpiredRequests(): Promise<void> {
        try {
            const gameModesPattern = `${this.namespace}:matchmaking:*`;
            const queues = await this.getRedis().keys(gameModesPattern);

            const expireTime = Date.now() - (10 * 60 * 1000); // 10 minutes

            for (const queueKey of queues) {
                const removed = await this.getRedis().zremrangebyscore(queueKey, 0, expireTime);
                if (removed > 0) {
                    console.log(`🧹 Cleaned up ${removed} expired requests from ${queueKey}`);

                    // Update queue state after cleanup
                    const gameMode = queueKey.replace(`${this.namespace}:matchmaking:`, '');
                    await this.updateRedisQueueState(gameMode);
                }
            }
        } catch (error) {
            console.error('❌ Failed to cleanup expired requests:', error);
        }
    }

    /**
     * Get current queue statistics
     */
    async getQueueStats(gameMode?: string): Promise<any> {
        try {
            if (gameMode) {
                const queueKey = this.getQueueKey(gameMode);
                const size = await this.getRedis().zcard(queueKey);
                return {
                    [gameMode]: {
                        totalPlayers: size,
                        playersInQueue: size, // Add alias for compatibility
                        avgWaitTime: await this.getEstimatedWaitTime(gameMode, 1000),
                        lastUpdated: Date.now()
                    }
                };
            }

            // Get all queue sizes
            const queues = await this.getRedis().keys(`${this.namespace}:matchmaking:*`);
            const stats: Record<string, any> = {};

            for (const queueKey of queues) {
                const gameMode = queueKey.replace(`${this.namespace}:matchmaking:`, '');
                const size = await this.getRedis().zcard(queueKey);
                stats[gameMode] = {
                    totalPlayers: size,
                    playersInQueue: size, // Add alias for compatibility
                    avgWaitTime: await this.getEstimatedWaitTime(gameMode, 1000),
                    lastUpdated: Date.now()
                };
            }

            return stats;
        } catch (error) {
            console.error('❌ Failed to get queue stats:', error);
            return {};
        }
    }

    /**
     * Health check for all services
     */
    async healthCheck(): Promise<{ pubsub: boolean; redis: boolean; database: boolean }> {
        const health = {
            pubsub: false,
            redis: false,
            database: false
        };

        try {
            // Test Redis
            await this.getRedis().ping();
            health.redis = true;
        } catch (error) {
            console.error('❌ Redis health check failed:', error);
        }

        try {
            // Test Pub/Sub
            const topic = getPubSubClient().topic('matchmaking-requests');
            const [exists] = await topic.exists();
            health.pubsub = exists;
        } catch (error) {
            console.error('❌ Pub/Sub health check failed:', error);
        }

        try {
            // Test Database
            await db.selectFrom('users').select('id').limit(1).execute();
            health.database = true;
        } catch (error) {
            console.error('❌ Database health check failed:', error);
        }

        return health;
    }

    /**
     * Clear Redis queue for a specific game mode (for testing)
     */
    async clearRedisQueue(gameMode: string): Promise<void> {
        try {
            const queueKey = this.getQueueKey(gameMode);
            await this.getRedis().del(queueKey);
            console.log(`🧹 Cleared Redis queue: ${queueKey}`);
        } catch (error) {
            console.error(`❌ Error clearing Redis queue ${gameMode}:`, error);
            throw error;
        }
    }

    /**
     * Clear all matchmaking queues (for testing)
     */
    async clearAllQueues(): Promise<void> {
        try {
            const gameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p'];

            for (const gameMode of gameModes) {
                const queueKey = this.getQueueKey(gameMode);
                await this.getRedis().del(queueKey);
            }

            console.log('🧹 Cleared all matchmaking queues');
        } catch (error) {
            console.error('❌ Failed to clear queues:', error);
        }
    }

    /**
     * Clear entire namespace (for testing)
     */
    async clearNamespace(): Promise<void> {
        try {
            const pattern = `${this.namespace}:*`;
            const keys = await this.getRedis().keys(pattern);

            if (keys.length > 0) {
                await this.getRedis().del(...keys);
                console.log(`🧹 Cleared ${keys.length} keys from namespace: ${this.namespace}`);
            } else {
                console.log(`🧹 No keys found in namespace: ${this.namespace}`);
            }
        } catch (error) {
            console.error(`❌ Error clearing namespace ${this.namespace}:`, error);
            throw error;
        }
    }
}