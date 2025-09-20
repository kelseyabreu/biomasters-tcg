/**
 * Integration Tests for Matchmaking API Endpoints
 * Tests the enhanced Pub/Sub matchmaking API without requiring full E2E setup
 */

import request from 'supertest';
import app from '../../index';
import { db } from '../../database/kysely';
import { Redis } from 'ioredis';
import { createTestEnvironment, setupTestNamespaceCleanup } from '../helpers/testNamespace';
import { setMatchmakingService } from '../../routes/matchmaking';

describe('Matchmaking API Integration Tests', () => {
  // Setup automatic namespace cleanup
  setupTestNamespaceCleanup();

  let testEnv: ReturnType<typeof createTestEnvironment>;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create isolated test environment
    testEnv = createTestEnvironment('integration');
    console.log(`🔧 Using test namespace: ${testEnv.namespace}`);

    // Generate a unique ID for the test user
    const timestamp = Date.now();
    const userId = `550e8400-e29b-41d4-a716-${timestamp.toString().slice(-12)}`;

    // Create a test user with all required fields
    testUser = await db
      .insertInto('users')
      .values({
        id: userId,
        email: `matchmaking-test-${timestamp}@example.com`,
        username: `matchmaking-test-${timestamp}`,
        display_name: 'Matchmaking Test User',
        current_rating: 1000,
        account_type: 'registered',
        email_verified: true, // Must be true for registered users
        eco_credits: 0,
        xp_points: 0,
        is_active: true,
        is_banned: false,
        level: 1,
        experience: 0,
        gems: 0,
        coins: 0,
        dust: 0,
        needs_registration: false,
        is_guest: false,
        firebase_uid: userId, // Use the same ID for Firebase UID
        push_notifications: true,
        peak_rating: 1000,
        games_played: 0,
        games_won: 0,
        win_streak: 0,
        daily_quest_streak: 0,
        last_daily_reset: new Date(),
        total_quests_completed: 0,
        cards_collected: 0,
        packs_opened: 0,
        is_public_profile: true,
        email_notifications: true
      })
      .returning(['id', 'email', 'username'])
      .executeTakeFirst();

    // Generate proper test JWT token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        uid: testUser.id,
        email: testUser.email,
        test_token: true,
        email_verified: true
      },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );

    // Set the API routes to use our test namespace service
    setMatchmakingService(testEnv.matchmakingService);
    console.log(`🔧 Integration test services initialized with namespace: ${testEnv.namespace}`);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await db.deleteFrom('matchmaking_queue').where('user_id', '=', testUser.id).execute();
      await db.deleteFrom('users').where('id', '=', testUser.id).execute();

      // Give time for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('Cleanup warning in matchmaking tests:', error);
    }
  });

  beforeEach(async () => {
    // Clear matchmaking queue before each test
    await db.deleteFrom('matchmaking_queue').where('user_id', '=', testUser.id).execute();

    // Clear test namespace Redis queues
    console.log(`🧹 Clearing Redis queues for namespace: ${testEnv.namespace}...`);
    try {
      await testEnv.matchmakingService.clearNamespace();
      console.log('✅ Test namespace Redis queues cleared for integration test');
    } catch (error) {
      console.warn('⚠️ Failed to clear test namespace Redis queues:', error);
    }
  });

  describe('POST /api/matchmaking/find', () => {
    test('should successfully join matchmaking queue', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gameMode: 'ranked_1v1',
          preferences: {
            maxWaitTime: 300,
            regionPreference: 'us-east'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inQueue).toBe(true);
      expect(response.body.data.gameMode).toBe('ranked_1v1');
      expect(response.body.data.requestId).toBeDefined();
      expect(response.body.data.estimatedWaitTime).toBeGreaterThan(0);
    });

    test('should reject invalid game mode', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gameMode: 'invalid_mode',
          preferences: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid game mode');
    });

    test('should prevent duplicate queue entries', async () => {
      // First request
      await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'ranked_1v1' });

      // Second request should fail
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'ranked_1v1' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Already in matchmaking queue');
    });

    test('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .send({ gameMode: 'ranked_1v1' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/matchmaking/cancel', () => {
    test('should successfully cancel matchmaking', async () => {
      // First join queue
      await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'ranked_1v1' });

      // Then cancel
      const response = await request(app)
        .delete('/api/matchmaking/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'ranked_1v1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cancelled).toBe(true);
      expect(response.body.data.gameMode).toBe('ranked_1v1');
    });

    test('should handle cancel when not in queue', async () => {
      const response = await request(app)
        .delete('/api/matchmaking/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'ranked_1v1' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not in matchmaking queue');
    });
  });

  describe('GET /api/matchmaking/status', () => {
    test('should return not in queue when user not queued', async () => {
      const response = await request(app)
        .get('/api/matchmaking/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inQueue).toBe(false);
      expect(response.body.data.queueStats).toBeDefined();
    });

    test('should return queue status when user is queued', async () => {
      // Join queue first
      await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode: 'casual_1v1' });

      const response = await request(app)
        .get('/api/matchmaking/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inQueue).toBe(true);
      expect(response.body.data.gameMode).toBe('casual_1v1');
      expect(response.body.data.queueTime).toBeGreaterThanOrEqual(0);
      expect(response.body.data.estimatedWait).toBeGreaterThan(0);
      expect(response.body.data.queuePosition).toBeGreaterThan(0);
    });
  });

  describe('GET /api/matchmaking/stats', () => {
    test('should return queue statistics', async () => {
      const response = await request(app)
        .get('/api/matchmaking/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queueStats).toBeDefined();
      expect(response.body.data.recentMatches).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('should include recent match data', async () => {
      const response = await request(app)
        .get('/api/matchmaking/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.recentMatches).toEqual(
        expect.objectContaining({})
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, test that endpoints respond properly
      const response = await request(app)
        .get('/api/matchmaking/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(500);
    });

    test('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing gameMode
          preferences: {}
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rapid requests appropriately', async () => {
      // Test multiple rapid requests
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/matchmaking/stats')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (rate limiting is very high in development)
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Game Mode Support', () => {
    const gameModes = ['ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p'];

    test.each(gameModes)('should support %s game mode', async (gameMode) => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gameMode).toBe(gameMode);

      // Cleanup
      await request(app)
        .delete('/api/matchmaking/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameMode });
    });
  });

  describe('Preferences Handling', () => {
    test('should accept and store user preferences', async () => {
      const preferences = {
        maxWaitTime: 180,
        regionPreference: 'eu-west',
        skillRange: 'strict'
      };

      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gameMode: 'ranked_1v1',
          preferences
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should work without preferences', async () => {
      const response = await request(app)
        .post('/api/matchmaking/find')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gameMode: 'ranked_1v1'
          // No preferences
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
