/**
 * E2E Test: 1v1 Matchmaking with Pub/Sub Integration
 * Tests complete 1v1 matchmaking flow from queue to match ready state
 */

import request from 'supertest';
import app from '../../index';
import { db } from '../../database/kysely';
import { MatchmakingService } from '../../services/MatchmakingService';
import { MatchmakingWorker } from '../../workers/MatchmakingWorker';
import { MatchNotificationService } from '../../services/MatchNotificationService';
import { initializePubSub } from '../../config/pubsub';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
// Removed @upstash/redis - using ioredis with Google Cloud Memorystore instead
import { randomUUID } from 'crypto';
import { io as Client } from 'socket.io-client';
import { setupGameSocket } from '../../websocket/gameSocket';
import { createTestEnvironment, setupTestNamespaceCleanup, TestNamespaceManager } from '../helpers/testNamespace';
import { setMatchmakingService } from '../../routes/matchmaking';

describe('E2E: 1v1 Matchmaking with Pub/Sub', () => {
  // Setup automatic namespace cleanup
  setupTestNamespaceCleanup();
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let matchmakingService: MatchmakingService;
  let matchmakingWorker: MatchmakingWorker;
  let notificationService: MatchNotificationService;
  let httpServer: any;
  let io: Server;
  let player1Token: string;
  let player2Token: string;
  let player1Id: string;
  let player2Id: string;
  let player1FirebaseUid: string;
  let player2FirebaseUid: string;
  let player1Socket: any;
  let player2Socket: any;

  beforeAll(async () => {
    // Create isolated test environment
    testEnv = createTestEnvironment('1v1');
    console.log(`🔧 Using test namespace: ${testEnv.namespace}`);

    // Initialize Pub/Sub
    await initializePubSub();

    // Create HTTP server and Socket.IO with authentication
    httpServer = createServer();
    io = setupGameSocket(httpServer);

    // Initialize services with test namespace
    matchmakingService = testEnv.matchmakingService;
    matchmakingWorker = testEnv.matchmakingWorker;
    notificationService = TestNamespaceManager.createMatchNotificationService(io, testEnv.namespace);

    // Set the API routes to use our test namespace service
    setMatchmakingService(matchmakingService);

    console.log(`🔧 Test services initialized with namespace: ${testEnv.namespace}`);

    // Start services
    await matchmakingWorker.start();
    await notificationService.start();

    httpServer.listen(0); // Random port
  });

  afterEach(async () => {
    // Clean up test namespace instead of global flush
    try {
      await testEnv.cleanup();
      console.log(`✅ Test namespace ${testEnv.namespace} cleaned up - ensuring test isolation`);
    } catch (error) {
      console.warn('⚠️ Could not cleanup test namespace:', error);
    }
  });

  afterAll(async () => {
    // Stop services
    await matchmakingWorker.stop();
    await notificationService.stop();

    // Close connections
    if (player1Socket) player1Socket.disconnect();
    if (player2Socket) player2Socket.disconnect();
    httpServer.close();

    // Clean up database
    await db.deleteFrom('matchmaking_queue').execute();
    await db.deleteFrom('match_results').execute();
    await db.deleteFrom('game_sessions').execute();
    await db.deleteFrom('users').where('email', 'like', '%test-1v1%').execute();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.deleteFrom('matchmaking_queue').execute();
    await db.deleteFrom('match_results').execute();
    await db.deleteFrom('game_sessions').execute();

    // Clear test namespace Redis queues
    console.log(`🧹 Clearing Redis queues for namespace: ${testEnv.namespace}...`);
    try {
      await matchmakingService.clearNamespace();
      console.log('✅ Test namespace Redis queues cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear test namespace Redis queues:', error);
    }
    
    // Create test users
    player1FirebaseUid = `firebase-1v1-player1-${Date.now()}`;
    player2FirebaseUid = `firebase-1v1-player2-${Date.now()}`;

    const player1 = await db
      .insertInto('users')
      .values({
        id: randomUUID(),
        email: `player1-test-1v1-${Date.now()}@example.com`,
        username: `Player1Test1v1_${Date.now()}`,
        email_verified: true,
        account_type: 'registered',
        current_rating: 1200,
        eco_credits: 1000,
        xp_points: 500,
        is_active: true,
        is_banned: false,
        is_guest: false,
        firebase_uid: player1FirebaseUid,
        guest_id: null,
        needs_registration: false,
        level: 1,
        experience: 0,
        gems: 0,
        coins: 0,
        dust: 0,
        peak_rating: 1200,
        games_played: 0,
        games_won: 0,
        win_streak: 0,
        daily_quest_streak: 0,
        last_daily_reset: new Date(),
        total_quests_completed: 0,
        cards_collected: 0,
        packs_opened: 0,
        is_public_profile: true,
        email_notifications: true,
        push_notifications: true
      })
      .returning('id')
      .executeTakeFirst();

    const player2 = await db
      .insertInto('users')
      .values({
        id: randomUUID(),
        email: `player2-test-1v1-${Date.now()}@example.com`,
        username: `Player2Test1v1_${Date.now()}`,
        email_verified: true,
        account_type: 'registered',
        current_rating: 1180,
        eco_credits: 1000,
        xp_points: 450,
        is_active: true,
        is_banned: false,
        is_guest: false,
        firebase_uid: player2FirebaseUid,
        guest_id: null,
        needs_registration: false,
        level: 1,
        experience: 0,
        gems: 0,
        coins: 0,
        dust: 0,
        peak_rating: 1180,
        games_played: 0,
        games_won: 0,
        win_streak: 0,
        daily_quest_streak: 0,
        last_daily_reset: new Date(),
        total_quests_completed: 0,
        cards_collected: 0,
        packs_opened: 0,
        is_public_profile: true,
        email_notifications: true,
        push_notifications: true
      })
      .returning('id')
      .executeTakeFirst();

    player1Id = player1!.id;
    player2Id = player2!.id;

    console.log('🔴 [Test] Created users with IDs:', { player1Id, player2Id });

    // Verify users exist in database immediately after creation
    const verifyUsers = await db
      .selectFrom('users')
      .select(['id', 'username', 'firebase_uid'])
      .where('id', 'in', [player1Id, player2Id])
      .execute();

    console.log('🔴 [Test] Verified users in database:', verifyUsers);

    // Small delay to ensure database operations are fully committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate JWT tokens
    player1Token = jwt.sign(
      {
        userId: player1Id,
        uid: player1FirebaseUid,
        email: `player1-test-1v1-${Date.now()}@example.com`,
        email_verified: true,
        test_token: true
      },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );

    player2Token = jwt.sign(
      {
        userId: player2Id,
        uid: player2FirebaseUid,
        email: `player2-test-1v1-${Date.now()}@example.com`,
        email_verified: true,
        test_token: true
      },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  test('Debug Player 1 Response', async () => {
    console.log('🔍 Testing Player 1 response structure...');

    try {
      console.log('🔍 About to make request to /api/matchmaking/find...');
      const player1Response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({
          gameMode: 'ranked_1v1',
          preferences: {
            maxWaitTime: 300,
            regionPreference: 'us-east'
          }
        })
        .timeout(5000); // 5 second timeout

      console.log('🔍 Request completed! Response received.');
      console.log('🔍 Player 1 response status:', player1Response.status);
      console.log('🔍 Player 1 response body:', JSON.stringify(player1Response.body, null, 2));

      // Check if we got an error response
      if (player1Response.status !== 200) {
        console.log('❌ Got error response! Status:', player1Response.status);
        console.log('❌ Error details:', player1Response.body);
      } else {
        console.log('✅ Got successful response!');
      }

      // Verify we got a proper response
      expect(player1Response.status).toBeDefined();
      expect(player1Response.body).toBeDefined();

      console.log('✅ Debug test completed - Status was:', player1Response.status);
    } catch (error) {
      console.log('❌ Error in debug test:', error);
      console.log('❌ Error type:', typeof error);
      console.log('❌ Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, 15000); // 15 second test timeout

  test('Complete 1v1 Matchmaking Flow: Queue → Match → Ready State', async () => {
    const matchFoundPromises: Promise<any>[] = [];
    console.log('🚀 Starting Complete 1v1 Matchmaking Flow test...');
    
    // Set up WebSocket connections
    const serverAddress = httpServer.address();
    const port = typeof serverAddress === 'object' && serverAddress ? serverAddress.port : null;
    console.log(`🔌 Setting up WebSocket connections...`);
    console.log(`🔍 Server address:`, serverAddress);
    console.log(`🔍 Port: ${port}`);
    console.log(`🔍 Server listening: ${httpServer.listening}`);
    console.log(`🔍 Player 1 token: ${player1Token.substring(0, 50)}...`);
    console.log(`🔍 Player 2 token: ${player2Token.substring(0, 50)}...`);
    console.log(`🔍 Player 1 ID: ${player1Id}`);
    console.log(`🔍 Player 2 ID: ${player2Id}`);

    if (!port) {
      throw new Error('Server port not available');
    }

    const socketUrl = `http://localhost:${port}`;
    console.log(`🔌 Creating socket connections to: ${socketUrl}`);
    console.log(`🔌 Player 1 token: ${player1Token.substring(0, 50)}...`);
    console.log(`🔌 Player 2 token: ${player2Token.substring(0, 50)}...`);

    console.log(`🔌 Creating Player 1 socket with auth token...`);
    player1Socket = Client(socketUrl, {
      auth: { token: player1Token },
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true
    });

    console.log(`🔌 Creating Player 2 socket with auth token...`);
    player2Socket = Client(socketUrl, {
      auth: { token: player2Token },
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true
    });

    console.log(`🔌 Player 1 socket created, connecting: ${player1Socket.connecting}`);
    console.log(`🔌 Player 2 socket created, connecting: ${player2Socket.connecting}`);

    // Add comprehensive error and event handlers
    player1Socket.on('connect_error', (error: any) => {
      console.error('🔴 Player 1 socket connection error:', error.message, error.description, error.context, error.type);
    });

    player1Socket.on('disconnect', (reason: string) => {
      console.log('🔴 Player 1 socket disconnected:', reason);
    });

    player1Socket.on('error', (error: any) => {
      console.error('🔴 Player 1 socket error:', error);
    });

    player2Socket.on('connect_error', (error: any) => {
      console.error('🔴 Player 2 socket connection error:', error.message, error.description, error.context, error.type);
    });

    player2Socket.on('disconnect', (reason: string) => {
      console.log('🔴 Player 2 socket disconnected:', reason);
    });

    player2Socket.on('error', (error: any) => {
      console.error('🔴 Player 2 socket error:', error);
    });

    // Wait for socket connections
    await new Promise<void>((resolve, reject) => {
      let connected = 0;
      const timeout = setTimeout(() => {
        console.error('🔴 Socket connection timeout - only', connected, 'of 2 connected');
        reject(new Error('Socket connection timeout'));
      }, 5000);

      const checkConnected = (socketName: string) => {
        connected++;
        console.log(`🔌 ${socketName} connected (${connected}/2)`);
        if (connected === 2) {
          clearTimeout(timeout);
          console.log('✅ Both sockets connected successfully');
          resolve();
        }
      };

      player1Socket.on('connect', () => {
        console.log('🔌 Player 1 socket connected');
        console.log('🔌 Player 1 socket ID:', player1Socket.id);
        console.log('🔌 Player 1 socket auth:', player1Socket.auth);
        checkConnected('Player 1');
      });

      player2Socket.on('connect', () => {
        console.log('🔌 Player 2 socket connected');
        console.log('🔌 Player 2 socket ID:', player2Socket.id);
        console.log('🔌 Player 2 socket auth:', player2Socket.auth);
        checkConnected('Player 2');
      });
    });

    console.log('✅ Both WebSocket connections established');

    // Set up match found listeners with timeout and debugging
    console.log('🎧 Setting up match_found event listeners...');

    matchFoundPromises.push(
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Player 1 match_found timeout after 10 seconds'));
        }, 10000);

        player1Socket.on('match_found', (data: any) => {
          console.log('🎉 Player 1 received match_found event:', data);
          clearTimeout(timeout);
          resolve(data);
        });
      })
    );

    matchFoundPromises.push(
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Player 2 match_found timeout after 10 seconds'));
        }, 10000);

        player2Socket.on('match_found', (data: any) => {
          console.log('🎉 Player 2 received match_found event:', data);
          clearTimeout(timeout);
          resolve(data);
        });
      })
    );

    // Step 1: Player 1 joins ranked 1v1 queue
    console.log('🎯 Step 1: Player 1 joining queue...');
    const player1Response = await request(app)
      .post('/api/matchmaking/find')
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        gameMode: 'ranked_1v1',
        preferences: {
          maxWaitTime: 300,
          regionPreference: 'us-east'
        }
      });

    console.log('🔍 Player 1 response status:', player1Response.status);
    console.log('🔍 Player 1 response body:', JSON.stringify(player1Response.body, null, 2));
    expect(player1Response.status).toBe(200);
    expect(player1Response.body.success).toBe(true);
    expect(player1Response.body.data.inQueue).toBe(true);
    expect(player1Response.body.data.gameMode).toBe('ranked_1v1');
    expect(player1Response.body.data.requestId).toBeDefined();

    // Verify player 1 is in database queue
    console.log('🔍 Checking player 1 in database queue...');
    const player1QueueEntry = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', '=', player1Id)
      .executeTakeFirst();

    console.log('🔍 Player 1 queue entry:', player1QueueEntry);
    expect(player1QueueEntry).toBeDefined();
    expect(player1QueueEntry!.game_mode).toBe('ranked_1v1');
    expect(player1QueueEntry!.rating).toBe(1200);

    // Step 2: Check queue status for player 1
    console.log('🎯 Step 2: Checking player 1 queue status...');
    const statusResponse = await request(app)
      .get('/api/matchmaking/status')
      .set('Authorization', `Bearer ${player1Token}`);

    console.log('🔍 Player 1 status response:', statusResponse.body);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.inQueue).toBe(true);
    expect(statusResponse.body.data.gameMode).toBe('ranked_1v1');
    expect(statusResponse.body.data.queuePosition).toBe(1);

    // Small delay to ensure player 1 is fully processed
    console.log('⏱️ Waiting 2 seconds before player 2 joins...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ 2-second wait completed');

    // Step 3: Player 2 joins the same queue (should trigger match)
    console.log('🎯 Step 3: Player 2 joining queue (should trigger match)...');
    console.log('🔍 About to make Player 2 request...');

    const player2Response = await request(app)
      .post('/api/matchmaking/find')
      .set('Authorization', `Bearer ${player2Token}`)
      .send({
        gameMode: 'ranked_1v1',
        preferences: {
          maxWaitTime: 300,
          regionPreference: 'us-east'
        }
      });

    console.log('🔍 Player 2 request completed');
    console.log('🔍 Player 2 response status:', player2Response.status);
    console.log('🔍 Player 2 response:', player2Response.body);
    console.log('🔍 Now waiting for match_found events from both players...');
    expect(player2Response.status).toBe(200);
    expect(player2Response.body.success).toBe(true);

    // Step 4: Wait for match to be found and notifications sent
    console.log('🎯 Step 4: Waiting for match notifications...');
    console.log('⏳ Waiting up to 10 seconds for both players to receive match_found events...');

    let matchNotifications;
    try {
      matchNotifications = await Promise.all(matchFoundPromises);
      console.log('✅ All match notifications received!');
    } catch (error) {
      console.error('❌ Error waiting for match notifications:', error);

      // Check current queue state for debugging
      const queueState = await db
        .selectFrom('matchmaking_queue')
        .selectAll()
        .execute();
      console.log('🔍 Current queue state:', queueState);

      throw error;
    }

    expect(matchNotifications).toHaveLength(2);
    
    const [player1Notification, player2Notification] = matchNotifications;
    
    // Verify match notifications
    expect(player1Notification.sessionId).toBeDefined();
    expect(player1Notification.gameMode).toBe('ranked_1v1');
    expect(player1Notification.opponent).toBeDefined();
    expect(player1Notification.opponent.playerId).toBe(player2Id);
    
    expect(player2Notification.sessionId).toBe(player1Notification.sessionId);
    expect(player2Notification.opponent.playerId).toBe(player1Id);

    // Step 5: Verify players are removed from queue
    console.log('🎯 Step 5: Verifying queue cleanup...');

    // Wait a bit for async cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const remainingQueueEntries = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', 'in', [player1Id, player2Id])
      .execute();

    console.log('🔍 Remaining queue entries:', remainingQueueEntries);
    expect(remainingQueueEntries).toHaveLength(0);

    // Step 6: Verify game session was created
    console.log('🎯 Step 6: Verifying game session creation...');
    const gameSession = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', player1Notification.sessionId)
      .executeTakeFirst();

    expect(gameSession).toBeDefined();
    expect(gameSession!.game_mode).toBe('ranked_1v1');
    expect(gameSession!.status).toBe('waiting');
    expect(gameSession!.max_players).toBe(2);
    
    const sessionPlayers = Array.isArray(gameSession!.players) ? gameSession!.players : JSON.parse(gameSession!.players as unknown as string);
    expect(sessionPlayers).toHaveLength(2);
    expect(sessionPlayers.map((p: any) => p.playerId).sort()).toEqual([player1Id, player2Id].sort());

    // Step 7: Verify match history was recorded
    console.log('🎯 Step 7: Verifying match history...');
    const matchResults = await db
      .selectFrom('match_results')
      .selectAll()
      .where('session_id', '=', player1Notification.sessionId)
      .execute();

    expect(matchResults).toHaveLength(2); // One result per player
    expect(matchResults[0]?.game_mode).toBe('ranked_1v1');
    expect(matchResults[1]?.game_mode).toBe('ranked_1v1');

    // Verify both players are represented
    const playerIds = matchResults.map(r => r.player_user_id).sort();
    expect(playerIds).toEqual([player1Id, player2Id].sort());

    // Step 8: Simulate players marking ready
    console.log('🎯 Step 8: Simulating ready state changes...');
    
    // Player 1 marks ready
    const player1ReadyResponse = await request(app)
      .patch(`/api/game/sessions/${player1Notification.sessionId}/ready`)
      .set('Authorization', `Bearer ${player1Token}`)
      .send({ ready: true });

    expect(player1ReadyResponse.status).toBe(200);

    // Player 2 marks ready
    const player2ReadyResponse = await request(app)
      .patch(`/api/game/sessions/${player1Notification.sessionId}/ready`)
      .set('Authorization', `Bearer ${player2Token}`)
      .send({ ready: true });

    expect(player2ReadyResponse.status).toBe(200);

    // Step 9: Verify final game session state
    console.log('🎯 Step 9: Verifying final game state...');
    const finalGameSession = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', player1Notification.sessionId)
      .executeTakeFirst();

    expect(finalGameSession!.status).toBe('active');
    
    const finalPlayers = Array.isArray(finalGameSession!.players) ? finalGameSession!.players : JSON.parse(finalGameSession!.players as unknown as string);
    expect(finalPlayers.every((p: any) => p.ready === true)).toBe(true);

    console.log('✅ 1v1 Matchmaking E2E Test Completed Successfully!');
  }, 45000); // 45 second timeout

  test('1v1 Matchmaking Cancellation Flow', async () => {
    // Player 1 joins queue
    const joinResponse = await request(app)
      .post('/api/matchmaking/find')
      .set('Authorization', `Bearer ${player1Token}`)
      .send({ gameMode: 'casual_1v1' });

    expect(joinResponse.status).toBe(200);

    // Verify in queue
    const statusResponse = await request(app)
      .get('/api/matchmaking/status')
      .set('Authorization', `Bearer ${player1Token}`);

    expect(statusResponse.body.data.inQueue).toBe(true);

    // Cancel matchmaking
    const cancelResponse = await request(app)
      .delete('/api/matchmaking/cancel')
      .set('Authorization', `Bearer ${player1Token}`)
      .send({ gameMode: 'casual_1v1' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.cancelled).toBe(true);

    // Verify removed from queue
    const finalStatusResponse = await request(app)
      .get('/api/matchmaking/status')
      .set('Authorization', `Bearer ${player1Token}`);

    expect(finalStatusResponse.body.data.inQueue).toBe(false);

    console.log('✅ 1v1 Cancellation Test Completed Successfully!');
  });
});
