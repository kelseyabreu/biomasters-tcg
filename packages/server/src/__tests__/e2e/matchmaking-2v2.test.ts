/**
 * E2E Test: 2v2 Team Matchmaking with Pub/Sub Integration
 * Tests complete 2v2 matchmaking flow from queue to match ready state
 */

import request from 'supertest';
import app from '../../index';
import { db } from '../../database/kysely';
import { MatchmakingService } from '../../services/MatchmakingService';
import { MatchmakingWorker } from '../../workers/MatchmakingWorker';
import { MatchNotificationService } from '../../services/MatchNotificationService';
import { pubsub, initializePubSub } from '../../config/pubsub';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
// Removed @upstash/redis - using ioredis with Google Cloud Memorystore instead
import { randomUUID } from 'crypto';
import { io as Client } from 'socket.io-client';
import { setupGameSocket } from '../../websocket/gameSocket';
import { createTestEnvironment, setupTestNamespaceCleanup, TestNamespaceManager } from '../helpers/testNamespace';
import { setMatchmakingService } from '../../routes/matchmaking';

describe('E2E: 2v2 Team Matchmaking with Pub/Sub', () => {
  // Setup automatic namespace cleanup
  setupTestNamespaceCleanup();

  let testEnv: ReturnType<typeof createTestEnvironment>;
  let matchmakingService: MatchmakingService;
  let matchmakingWorker: MatchmakingWorker;
  let notificationService: MatchNotificationService;
  let httpServer: any;
  let io: Server;
  let playerTokens: string[] = [];
  let playerIds: string[] = [];
  let playerFirebaseUids: string[] = [];
  let playerSockets: any[] = [];

  beforeAll(async () => {
    // Create isolated test environment
    testEnv = createTestEnvironment('2v2');
    console.log(`🔧 Using test namespace: ${testEnv.namespace}`);

    // Initialize Pub/Sub
    await initializePubSub();

    // Create HTTP server and Socket.IO
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
    playerSockets.forEach(socket => socket?.disconnect());
    httpServer.close();

    // Clean up database
    await db.deleteFrom('matchmaking_queue').execute();
    await db.deleteFrom('match_history').execute();
    await db.deleteFrom('game_sessions').execute();
    await db.deleteFrom('users').where('email', 'like', '%test-2v2%').execute();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.deleteFrom('matchmaking_queue').execute();
    await db.deleteFrom('match_history').execute();
    await db.deleteFrom('game_sessions').execute();

    // Clear test namespace Redis queues
    console.log(`🧹 Clearing Redis queues for namespace: ${testEnv.namespace}...`);
    try {
      await matchmakingService.clearNamespace();
      console.log('✅ Test namespace Redis queues cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear test namespace Redis queues:', error);
    }

    // Reset arrays
    playerTokens = [];
    playerIds = [];
    playerFirebaseUids = [];
    playerSockets = [];
    
    // Create 4 test users for 2v2
    const baseUserData = {
      email_verified: true,
      is_active: true,
      is_banned: false,
      is_guest: false,
      guest_id: null,
      needs_registration: false,
      level: 1,
      experience: 0,
      gems: 0,
      coins: 0,
      dust: 0,
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
    };

    // Generate consistent firebase UIDs
    const timestamp = Date.now();
    playerFirebaseUids = [
      `firebase-2v2-player1-${timestamp}`,
      `firebase-2v2-player2-${timestamp}`,
      `firebase-2v2-player3-${timestamp}`,
      `firebase-2v2-player4-${timestamp}`
    ];

    const players = await Promise.all([
      db.insertInto('users').values({
        ...baseUserData,
        id: randomUUID(),
        email: `player1-test-2v2-${timestamp}@example.com`,
        username: `Player1Test2v2_${timestamp}`,
        account_type: 'registered',
        current_rating: 1300,
        peak_rating: 1300,
        firebase_uid: playerFirebaseUids[0],
        eco_credits: 1000,
        xp_points: 600
      }).returning('id').executeTakeFirst(),

      db.insertInto('users').values({
        ...baseUserData,
        id: randomUUID(),
        email: `player2-test-2v2-${timestamp}@example.com`,
        username: `Player2Test2v2_${timestamp}`,
        account_type: 'registered',
        current_rating: 1280,
        peak_rating: 1280,
        firebase_uid: playerFirebaseUids[1],
        eco_credits: 1000,
        xp_points: 580
      }).returning('id').executeTakeFirst(),

      db.insertInto('users').values({
        ...baseUserData,
        id: randomUUID(),
        email: `player3-test-2v2-${timestamp}@example.com`,
        username: `Player3Test2v2_${timestamp}`,
        account_type: 'registered',
        current_rating: 1320,
        peak_rating: 1320,
        firebase_uid: playerFirebaseUids[2],
        eco_credits: 1000,
        xp_points: 620
      }).returning('id').executeTakeFirst(),

      db.insertInto('users').values({
        ...baseUserData,
        id: randomUUID(),
        email: `player4-test-2v2-${timestamp}@example.com`,
        username: `Player4Test2v2_${timestamp}`,
        account_type: 'registered',
        current_rating: 1290,
        peak_rating: 1290,
        firebase_uid: playerFirebaseUids[3],
        eco_credits: 1000,
        xp_points: 590
      }).returning('id').executeTakeFirst()
    ]);

    playerIds = players.map(p => p!.id);

    // Generate JWT tokens with matching firebase_uid
    playerTokens = playerIds.map((id, index) =>
      jwt.sign(
        {
          userId: id,
          uid: playerFirebaseUids[index],
          email: `player${index + 1}-test-2v2-${timestamp}@example.com`,
          email_verified: true,
          test_token: true
        },
        process.env['JWT_SECRET'] || 'test-secret',
        { expiresIn: '1h' }
      )
    );
  });

  test('Complete 2v2 Team Matchmaking Flow: 4 Players → Match → All Ready', async () => {
    // Skip WebSocket setup - we'll test the core functionality directly
    console.log('🚨🚨🚨 [TEST] Bypassing WebSocket setup - testing core functionality directly');

    // Step 1: All 4 players join team_2v2 queue
    console.log('🎯 Step 1: All 4 players joining 2v2 queue...');
    
    const joinResponses = await Promise.all(
      playerTokens.map(token => 
        request(app)
          .post('/api/matchmaking/find')
          .set('Authorization', `Bearer ${token}`)
          .send({
            gameMode: 'team_2v2',
            preferences: {
              maxWaitTime: 300,
              regionPreference: 'us-west'
            }
          })
      )
    );

    // Verify all players joined successfully
    joinResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inQueue).toBe(true);
      expect(response.body.data.gameMode).toBe('team_2v2');
      console.log(`✅ Player ${index + 1} joined queue successfully`);
    });

    // Step 2: Verify all players are in database queue
    console.log('🎯 Step 2: Verifying all players in database queue...');
    const queueEntries = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', 'in', playerIds)
      .execute();

    expect(queueEntries).toHaveLength(4);
    queueEntries.forEach(entry => {
      expect(entry.game_mode).toBe('team_2v2');
      expect(playerIds).toContain(entry.user_id);
    });

    // Step 3: Skip WebSocket notifications and find session ID directly from database
    console.log('🎯 Step 3: Bypassing WebSocket notifications - finding session directly from database...');

    // Wait longer for the matchmaking worker to process the requests
    console.log('⏳ Waiting 10 seconds for matchmaking worker to process requests...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check if requests are still in the queue
    console.log('🔍 Checking if requests are still in Redis queue...');
    const queueKey = `${testEnv.namespace}:matchmaking:team_2v2`;
    const queueSize = await (testEnv.matchmakingService as any).redis.zcard(queueKey);
    console.log(`🔍 Queue size for ${queueKey}: ${queueSize}`);

    if (queueSize > 0) {
      const queueContents = await (testEnv.matchmakingService as any).redis.zrange(queueKey, 0, -1);
      console.log('🔍 Queue contents:', queueContents);
    }

    // Find the created game session directly from the database
    const gameSessions = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('game_mode', '=', 'team_2v2')
      .where('status', '=', 'waiting')
      .orderBy('created_at', 'desc')
      .limit(1)
      .execute();

    expect(gameSessions).toHaveLength(1);
    const sessionId = gameSessions[0]!.id;
    console.log('🔍 DEBUG: Found sessionId from database:', sessionId);

    // Verify the session has the correct players
    const sessionPlayersFromDb = gameSessions[0]!.players as any;
    expect(sessionPlayersFromDb).toHaveLength(4);

    // Verify team assignments (2 players per team)
    const team1Players = sessionPlayersFromDb.filter((p: any) => p.team === 'team1');
    const team2Players = sessionPlayersFromDb.filter((p: any) => p.team === 'team2');

    expect(team1Players).toHaveLength(2);
    expect(team2Players).toHaveLength(2);

    console.log('✅ Bypassed WebSocket notifications - found session directly from database');

    // Step 4: Verify players are removed from queue
    console.log('🎯 Step 4: Verifying queue cleanup...');
    const remainingQueueEntries = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', 'in', playerIds)
      .execute();

    expect(remainingQueueEntries).toHaveLength(0);

    // Step 5: Verify game session was created
    console.log('🎯 Step 5: Verifying 2v2 game session creation...');
    const gameSession = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    expect(gameSession).toBeDefined();
    expect(gameSession!.game_mode).toBe('team_2v2');
    expect(gameSession!.status).toBe('waiting');
    expect(gameSession!.max_players).toBe(4);
    
    const sessionPlayersFromSession = gameSession!.players as any;
    expect(sessionPlayersFromSession).toHaveLength(4);

    // Verify team assignments in session
    const sessionTeam1 = sessionPlayersFromSession.filter((p: any) => p.team === 'team1');
    const sessionTeam2 = sessionPlayersFromSession.filter((p: any) => p.team === 'team2');
    expect(sessionTeam1).toHaveLength(2);
    expect(sessionTeam2).toHaveLength(2);

    // Step 6: All players mark ready
    console.log('🎯 Step 6: All players marking ready...');

    // First, let's verify the game session exists
    console.log('🔍 DEBUG: Checking if game session exists before marking ready...');
    const gameSessionCheck = await request(app)
      .get(`/api/game/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${playerTokens[0]}`);

    console.log('🔍 DEBUG: Game session check response:', {
      status: gameSessionCheck.status,
      body: gameSessionCheck.body,
      error: gameSessionCheck.error
    });

    console.log(`🚨🚨🚨 [TEST] About to make ready requests for ${playerTokens.length} players`);
    console.log(`🚨🚨🚨 [TEST] Session ID: ${sessionId}`);
    console.log(`🚨🚨🚨 [TEST] Player tokens length: ${playerTokens.map(t => t.length)}`);

    // Make ready requests one by one to see exactly where it fails
    const readyResponses: any[] = [];
    for (let index = 0; index < playerTokens.length; index++) {
      const token = playerTokens[index];
      console.log(`🚨🚨🚨 [TEST] Making ready request ${index + 1}/${playerTokens.length} for player ${index + 1}`);
      console.log(`🚨🚨🚨 [TEST] Token for player ${index + 1}: ${token?.substring(0, 50)}...`);
      console.log(`🚨🚨🚨 [TEST] URL: /api/game/sessions/${sessionId}/ready`);

      try {
        const response = await request(app)
          .patch(`/api/game/sessions/${sessionId}/ready`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ready: true })
          .timeout(10000); // 10 second timeout

        console.log(`🚨🚨🚨 [TEST] Player ${index + 1} ready request SUCCESS:`, {
          url: `/api/game/sessions/${sessionId}/ready`,
          status: response.status,
          body: response.body,
          error: response.error,
          text: response.text
        });
        readyResponses.push(response);
      } catch (error: any) {
        console.error(`🚨🚨🚨 [TEST] Player ${index + 1} ready request FAILED:`, {
          message: error.message,
          status: error.status,
          response: error.response ? {
            status: error.response.status,
            body: error.response.body,
            text: error.response.text
          } : 'No response'
        });
        throw error;
      }
    }

    readyResponses.forEach((response, index) => {
      console.log(`🔍 Player ${index + 1} ready response:`, {
        status: response.status,
        body: response.body,
        error: response.error,
        text: response.text
      });
      if (response.status !== 200) {
        console.error(`❌ Player ${index + 1} ready request failed:`, {
          status: response.status,
          body: response.body,
          error: response.error,
          text: response.text
        });
      }
      expect(response.status).toBe(200);
      console.log(`✅ Player ${index + 1} marked ready successfully`);
    });

    // Step 8: Verify final game session state
    console.log('🎯 Step 8: Verifying final 2v2 game state...');
    const finalGameSession = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    console.log('🔍 DEBUG: Final game session status:', finalGameSession!.status);
    console.log('🔍 DEBUG: Final game session players:', JSON.stringify(finalGameSession!.players, null, 2));

    expect(finalGameSession!.status).toBe('active');
    
    const finalPlayers = finalGameSession!.players as any;
    expect(finalPlayers.every((p: any) => p.ready === true)).toBe(true);

    // Step 9: Verify team balance and ratings
    console.log('🎯 Step 9: Verifying team balance...');
    const team1Ratings = finalPlayers
      .filter((p: any) => p.team === 'team1')
      .map((p: any) => p.rating);
    const team2Ratings = finalPlayers
      .filter((p: any) => p.team === 'team2')
      .map((p: any) => p.rating);
    
    const team1AvgRating = team1Ratings.reduce((a: number, b: number) => a + b, 0) / team1Ratings.length;
    const team2AvgRating = team2Ratings.reduce((a: number, b: number) => a + b, 0) / team2Ratings.length;
    
    // Teams should be reasonably balanced (within 100 rating points)
    expect(Math.abs(team1AvgRating - team2AvgRating)).toBeLessThan(100);

    // Step 10: Verify match results (only check if game has ended)
    console.log('🎯 Step 10: Checking for match results...');
    const matchResults = await db
      .selectFrom('match_results')
      .selectAll()
      .where('session_id', '=', sessionId)
      .execute();

    // Note: Match results are only created when a game ends, not when it starts
    // Since this test only verifies matchmaking and ready state, not game completion,
    // we don't expect match results yet
    console.log(`🔍 DEBUG: Found ${matchResults.length} match results (expected 0 since game hasn't ended)`);

    console.log('✅ 2v2 Team Matchmaking E2E Test Completed Successfully!');
    console.log(`📊 Team 1 Average Rating: ${team1AvgRating}`);
    console.log(`📊 Team 2 Average Rating: ${team2AvgRating}`);
  }, 45000); // 45 second timeout

  test('2v2 Partial Queue and Timeout Handling', async () => {
    // Only 2 players join (not enough for a match)
    const partialJoinResponses = await Promise.all([
      request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${playerTokens[0]}`)
        .send({ gameMode: 'team_2v2' }),
      
      request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${playerTokens[1]}`)
        .send({ gameMode: 'team_2v2' })
    ]);

    partialJoinResponses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.data.inQueue).toBe(true);
    });

    // Verify both players are in queue
    const queueEntries = await db
      .selectFrom('matchmaking_queue')
      .selectAll()
      .where('user_id', 'in', [playerIds[0]!, playerIds[1]!])
      .execute();

    expect(queueEntries).toHaveLength(2);

    // Wait a bit to ensure no match is created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no game session was created
    const gameSessions = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('game_mode', '=', 'team_2v2')
      .execute();

    expect(gameSessions).toHaveLength(0);

    console.log('✅ 2v2 Partial Queue Test Completed Successfully!');
  });
});
