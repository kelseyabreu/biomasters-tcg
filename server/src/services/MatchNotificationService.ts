/**
 * Match Notification Service with Enhanced Pub/Sub Integration
 * Handles real-time notifications for match events via WebSocket
 */

import { Server } from 'socket.io';
import { Message, Subscription } from '@google-cloud/pubsub';
import { db } from '../database/kysely';
import { getSubscription, PUBSUB_SUBSCRIPTIONS } from '../config/pubsub';
import { MatchFound, MatchNotification } from '../../../shared/types';

export class MatchNotificationService {
    private io: Server;
    private isRunning = false;
    private namespace: string;
    private subscriptions: Subscription[] = [];

    constructor(io: Server, namespace: string = 'prod') {
        this.io = io;
        this.namespace = namespace;
        console.log(`🔔 [MatchNotificationService] Initializing with namespace: ${namespace}`);
    }

    /**
     * Start the notification service
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ MatchNotificationService is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting MatchNotificationService...');

        try {
            // Subscribe to match found notifications
            await this.subscribeToMatchNotifications();

            // Subscribe to match cancellations
            await this.subscribeToMatchCancellations();

            console.log('✅ MatchNotificationService started successfully');
        } catch (error) {
            console.error('❌ Failed to start MatchNotificationService:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the notification service
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping MatchNotificationService...');
        this.isRunning = false;

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

        console.log('✅ MatchNotificationService stopped');
    }

    /**
     * Subscribe to match found notifications
     */
    private async subscribeToMatchNotifications(): Promise<void> {
        const subscription = getSubscription(PUBSUB_SUBSCRIPTIONS.MATCH_NOTIFICATIONS);
        this.subscriptions.push(subscription);

        subscription.on('message', this.handleMatchFoundNotification.bind(this));
        subscription.on('error', (error) => {
            console.error('❌ Match notification subscription error:', error);
        });

        console.log(`📬 [${this.namespace}] Subscribed to ${PUBSUB_SUBSCRIPTIONS.MATCH_NOTIFICATIONS}`);
    }

    /**
     * Subscribe to match cancellation notifications
     */
    private async subscribeToMatchCancellations(): Promise<void> {
        const subscription = getSubscription(PUBSUB_SUBSCRIPTIONS.MATCH_CANCELLATIONS);
        this.subscriptions.push(subscription);

        subscription.on('message', this.handleMatchCancellationNotification.bind(this));
        subscription.on('error', (error) => {
            console.error('❌ Match cancellation subscription error:', error);
        });

        console.log(`📬 [${this.namespace}] Subscribed to ${PUBSUB_SUBSCRIPTIONS.MATCH_CANCELLATIONS}`);
    }

    /**
     * Handle match found notification
     */
    private async handleMatchFoundNotification(message: Message): Promise<void> {
        try {
            console.log(`🚀 [MATCH NOTIFICATION SERVICE] ===== HANDLING MATCH FOUND NOTIFICATION =====`);
            console.log(`🚀 [MATCH NOTIFICATION SERVICE] Raw message data:`, message.data.toString());
            console.log(`🚀 [MATCH NOTIFICATION SERVICE] Message attributes:`, JSON.stringify(message.attributes, null, 2));

            const match: MatchFound = JSON.parse(message.data.toString());
            const targetPlayerId = message.attributes?.['playerId'];

            console.log(`📢 [MATCH NOTIFICATION SERVICE] Processing match found notification for ${targetPlayerId} in session ${match.sessionId}`);
            console.log(`📢 [MATCH NOTIFICATION SERVICE] Match details:`, JSON.stringify(match, null, 2));

            if (!targetPlayerId) {
                console.error('❌ [MATCH NOTIFICATION SERVICE] No target player ID in message attributes');
                message.nack();
                return;
            }

            // Validate UUID format
            if (!this.isValidUUID(targetPlayerId)) {
                console.error(`❌ [MATCH NOTIFICATION SERVICE] Invalid UUID format for playerId: ${targetPlayerId}`);
                message.ack(); // Acknowledge to prevent reprocessing
                return;
            }

            // Get user details for better notification
            await db
                .selectFrom('users')
                .select(['username', 'display_name'])
                .where('id', '=', targetPlayerId)
                .executeTakeFirst();

            // Find opponent(s) for this player
            const opponents = match.players.filter(p => p.playerId !== targetPlayerId);

            // Get opponent details
            const opponentDetails = await Promise.all(
                opponents.map(async (opponent) => {
                    const opponentUser = await db
                        .selectFrom('users')
                        .select(['username', 'display_name'])
                        .where('id', '=', opponent.playerId)
                        .executeTakeFirst();

                    return {
                        playerId: opponent.playerId,
                        rating: opponent.rating,
                        name: opponentUser?.display_name || opponentUser?.username || 'Unknown Player'
                    };
                })
            );

            // Get game session to determine team assignments
            const gameSession = await db
                .selectFrom('game_sessions')
                .selectAll()
                .where('id', '=', match.sessionId)
                .executeTakeFirst();

            let teamAssignment: string | undefined;
            let teammates: any[] = [];
            let enemies: any[] = [];

            if (gameSession && gameSession.players) {
                const sessionPlayers = Array.isArray(gameSession.players) ? gameSession.players : JSON.parse(gameSession.players as unknown as string);
                const currentPlayer = sessionPlayers.find((p: any) => p.playerId === targetPlayerId);

                if (currentPlayer && match.gameMode === 'team_2v2') {
                    teamAssignment = currentPlayer.team;
                    teammates = sessionPlayers.filter((p: any) => p.team === currentPlayer.team && p.playerId !== targetPlayerId);
                    enemies = sessionPlayers.filter((p: any) => p.team !== currentPlayer.team);
                }
            }

            // Create notification payload based on game mode
            const notification: MatchNotification = {
                sessionId: match.sessionId,
                gameMode: match.gameMode,
                estimatedStartTime: match.estimatedStartTime
            };

            // Add mode-specific data
            if (match.gameMode === 'ranked_1v1' || match.gameMode === 'casual_1v1') {
                if (opponentDetails[0]) {
                    notification.opponent = opponentDetails[0];
                }
            } else if (match.gameMode === 'team_2v2') {
                if (teamAssignment) {
                    notification.teamAssignment = teamAssignment;
                }
                notification.teammates = teammates;
                notification.enemies = enemies;
            } else if (match.gameMode === 'ffa_4p') {
                notification.opponents = opponentDetails;
            }

            // Send notification via WebSocket
            const userRoom = `user:${targetPlayerId}`;
            console.log(`📤 [MatchNotification] ===== SENDING MATCH_FOUND NOTIFICATION =====`);
            console.log(`📤 [MatchNotification] Target user: ${targetPlayerId}`);
            console.log(`📤 [MatchNotification] Target room: ${userRoom}`);
            console.log(`📤 [MatchNotification] Notification:`, JSON.stringify(notification, null, 2));

            // Check room membership before sending
            const roomSockets = this.io.sockets.adapter.rooms.get(userRoom);
            console.log(`📤 [MatchNotification] Sockets in room ${userRoom}:`, roomSockets ? Array.from(roomSockets) : 'none');

            this.io.to(userRoom).emit('match_found', notification);
            console.log(`📤 [MatchNotification] Emitted match_found event to room ${userRoom}`);

            // Also send to any connected sockets for this user
            const userSockets = await this.io.in(userRoom).fetchSockets();
            console.log(`📤 [MatchNotification] Fetched ${userSockets.length} socket(s) for user ${targetPlayerId}`);

            if (userSockets.length > 0) {
                userSockets.forEach((socket, index) => {
                    console.log(`📤 [MatchNotification] Socket ${index + 1}: ID=${socket.id}, rooms=${Array.from(socket.rooms)}`);
                });
            } else {
                console.log(`⚠️ [MatchNotification] No sockets found for user ${targetPlayerId} in room ${userRoom}`);

                // Debug: List all rooms and their sockets
                console.log(`🔍 [MatchNotification] All rooms in adapter:`);
                for (const [roomName, socketIds] of this.io.sockets.adapter.rooms.entries()) {
                    console.log(`🔍 [MatchNotification] Room ${roomName}: ${Array.from(socketIds)}`);
                }
            }

            // Log successful notification
            await this.logNotification(targetPlayerId, 'match_found', notification, 'sent');

            message.ack();
        } catch (error) {
            console.error('❌ Error processing match found notification:', error);
            message.nack();
        }
    }

    /**
     * Handle match cancellation notification
     */
    private async handleMatchCancellationNotification(message: Message): Promise<void> {
        try {
            const cancellation = JSON.parse(message.data.toString());
            console.log(`📢 Processing match cancellation notification for ${cancellation.playerId}`);

            // Notify the player that their matchmaking was cancelled
            this.io.to(`user:${cancellation.playerId}`).emit('matchmaking_cancelled', {
                gameMode: cancellation.gameMode,
                reason: 'cancelled_by_user',
                timestamp: cancellation.timestamp
            });

            // Log the notification
            await this.logNotification(cancellation.playerId, 'matchmaking_cancelled', cancellation, 'sent');

            message.ack();
        } catch (error) {
            console.error('❌ Error processing match cancellation notification:', error);
            message.nack();
        }
    }

    /**
     * Send matchmaking status update to a player
     */
    async sendMatchmakingUpdate(playerId: string, status: string, data: any): Promise<void> {
        try {
            this.io.to(`user:${playerId}`).emit('matchmaking_update', {
                status,
                data,
                timestamp: Date.now()
            });

            await this.logNotification(playerId, 'matchmaking_update', { status, data }, 'sent');
        } catch (error) {
            console.error(`❌ Failed to send matchmaking update to ${playerId}:`, error);
        }
    }

    /**
     * Send queue position update to a player
     */
    async sendQueuePositionUpdate(playerId: string, position: number, estimatedWait: number): Promise<void> {
        try {
            this.io.to(`user:${playerId}`).emit('queue_position_update', {
                position,
                estimatedWait,
                timestamp: Date.now()
            });

            await this.logNotification(playerId, 'queue_position_update', { position, estimatedWait }, 'sent');
        } catch (error) {
            console.error(`❌ Failed to send queue position update to ${playerId}:`, error);
        }
    }

    /**
     * Log notification for debugging and analytics
     */
    private async logNotification(
        playerId: string,
        notificationType: string,
        payload: any,
        status: 'sent' | 'failed'
    ): Promise<void> {
        try {
            // Only log if playerId is a valid UUID
            if (!this.isValidUUID(playerId)) {
                console.log(`⚠️ Skipping notification log - invalid UUID format: playerId=${playerId}`);
                return;
            }

            await db
                .insertInto('pubsub_message_log')
                .values({
                    topic_name: 'websocket_notification',
                    player_id: playerId,
                    message_type: notificationType,
                    payload: JSON.stringify(payload),
                    status
                })
                .execute();
        } catch (error) {
            console.error('❌ Failed to log notification:', error);
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
     * Get notification statistics
     */
    async getStats(): Promise<any> {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const stats = await db
                .selectFrom('pubsub_message_log')
                .select([
                    'message_type',
                    db.fn.count('id').as('count')
                ])
                .where('topic_name', '=', 'websocket_notification')
                .where('created_at', '>=', oneHourAgo)
                .groupBy('message_type')
                .execute();

            return {
                isRunning: this.isRunning,
                lastHourStats: stats.reduce((acc, stat) => {
                    acc[stat.message_type] = Number(stat.count);
                    return acc;
                }, {} as Record<string, number>),
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ Failed to get notification stats:', error);
            return {
                isRunning: this.isRunning,
                error: (error as Error).message,
                timestamp: new Date()
            };
        }
    }
}