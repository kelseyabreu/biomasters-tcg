/**
 * End-to-End Integration Tests: User Types Standardization
 * Tests the complete user lifecycle with unified types across database, API, and frontend
 * 
 * Coverage:
 * - Database migration validation
 * - API endpoint integration with new types
 * - Authentication flows (Firebase + Guest)
 * - Profile management with display_name
 * - Cross-platform compatibility
 * - Error handling and edge cases
 */

import request from 'supertest';
import app from '../../index';
import { db, databaseAvailable } from '../setup';
import { DatabaseUser, AuthenticatedUser, PublicUser } from '../../../../shared/types';
import { UserType, SyncStatus } from '../../../../shared/enums';
import { adaptDatabaseUserToUnified } from '../../database/types';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Test helper for creating Firebase-like tokens for real authentication testing
function createTestFirebaseToken(uid: string, email: string): string {
  // Create a test token that includes a special test marker
  return jwt.sign(
    {
      uid,
      email,
      email_verified: true,
      iss: 'https://securetoken.google.com/biomasters-tcg',
      aud: 'biomasters-tcg',
      auth_time: Math.floor(Date.now() / 1000),
      user_id: uid,
      sub: uid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      firebase: {
        identities: { email: [email] },
        sign_in_provider: 'password'
      },
      // Special marker for test tokens
      test_token: true
    },
    process.env['JWT_SECRET'] || 'test-secret'
  );
}

describe('🔄 User Types Standardization - End-to-End Integration', () => {
  // Check database availability before each test
  beforeEach(() => {
    if (!databaseAvailable) {
      throw new Error('Database connection not available for testing');
    }
  });

  let testUserId: string;
  let testFirebaseToken: string;
  let testGuestId: string;
  let testUsername: string;

  beforeAll(async () => {
    // Create test data
    testUserId = randomUUID();
    const testEmail = `test-${Date.now()}@example.com`;
    testFirebaseToken = createTestFirebaseToken(testUserId, testEmail);
    testGuestId = 'guest-' + Date.now();
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    try {
      await db
        .deleteFrom('users')
        .where('id', 'in', [testUserId, testGuestId])
        .execute();
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  });

  describe('🗄️ Database Schema Validation', () => {
    test('should have all unified user fields in database', async () => {
      // Test that the migration added all required fields
      const result = await db
        .selectFrom('users')
        .select([
          'id', 'username', 'display_name', 'account_type', 'is_guest',
          'firebase_uid', 'email', 'eco_credits', 'xp_points',
          'bio', 'location', 'avatar_url', 'level', 'experience',
          'created_at', 'updated_at', 'last_login_at'
        ])
        .limit(1)
        .execute();

      // Should not throw - all fields exist
      expect(true).toBe(true);
    });

    test('should support display_name as nullable field', async () => {
      // Insert user with null display_name
      const testUser = {
        id: randomUUID(),
        username: 'test_user_null_display',
        display_name: null,
        account_type: 'registered', // Database uses account_type
        is_guest: false,
        firebase_uid: 'firebase-' + testUserId,
        email: 'test@example.com',
        email_verified: true,
        eco_credits: 0,
        xp_points: 0,
        is_active: true,
        is_banned: false,
        ban_reason: null,
        guest_id: null,
        guest_secret_hash: null,
        needs_registration: false,
        avatar_url: null,
        level: 1,
        experience: 0,
        title: null,
        gems: 0,
        coins: 0,
        dust: 0,
        games_played: 0,
        games_won: 0,
        cards_collected: 0,
        packs_opened: 0,
        bio: null,
        location: null,
        favorite_species: null,
        is_public_profile: false,
        email_notifications: true,
        push_notifications: true,
        preferences: null,
        last_reward_claimed_at: null,
        last_login_at: null,
        // Online multiplayer fields
        current_rating: 1000,
        peak_rating: 1000,
        win_streak: 0,
        
        // Quest system fields
        daily_quest_streak: 0,
        last_daily_reset: new Date(),
        total_quests_completed: 0,
      };

      await db.insertInto('users').values(testUser).execute();

      const retrieved = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', testUser.id)
        .executeTakeFirst();

      expect(retrieved).toBeDefined();
      expect(retrieved!.display_name).toBeNull();
      expect(retrieved!.username).toBe('test_user_null_display');

      // Clean up
      await db.deleteFrom('users').where('id', '=', testUser.id).execute();
    });
  });

  describe('🔧 Type Adapter Validation', () => {
    test('should convert database user to unified types correctly', async () => {
      // Create a test database user
      const dbUser = {
        id: randomUUID(),
        username: 'adapter_test_user_' + Date.now(),
        display_name: 'Adapter Test User',
        account_type: 'premium', // Database uses account_type
        is_guest: false,
        firebase_uid: 'firebase-adapter-test-' + Date.now(),
        email: 'adapter_' + Date.now() + '@example.com',
        email_verified: true,
        eco_credits: 100,
        xp_points: 250,
        is_active: true,
        is_banned: false,
        ban_reason: null,
        guest_id: null,
        guest_secret_hash: null,
        needs_registration: false,
        avatar_url: 'https://example.com/avatar.jpg',
        level: 5,
        experience: 1250,
        title: 'Eco Warrior',
        gems: 50,
        coins: 1000,
        dust: 25,
        games_played: 10,
        games_won: 7,
        cards_collected: 150,
        packs_opened: 20,
        bio: 'Test bio for adapter',
        location: 'Test Location',
        favorite_species: 'Oak Tree',
        is_public_profile: true,
        email_notifications: false,
        push_notifications: true,
        preferences: '{"theme": "dark"}',
        last_reward_claimed_at: new Date('2024-01-01'),
        last_login_at: new Date('2024-01-03'),

        // Online multiplayer fields
        current_rating: 1000,
        peak_rating: 1000,
        win_streak: 0,

        // Quest system fields
        daily_quest_streak: 0,
        last_daily_reset: new Date(),
        total_quests_completed: 0
      };

      await db.insertInto('users').values(dbUser).execute();

      // Retrieve and convert
      const retrieved = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', dbUser.id)
        .executeTakeFirst();

      expect(retrieved).toBeDefined();

      const unified = adaptDatabaseUserToUnified(retrieved!);

      // Verify unified type structure
      expect(unified.id).toBe(dbUser.id);
      expect(unified.username).toBe(dbUser.username);
      expect(unified.display_name).toBe(dbUser.display_name);
      expect(unified.user_type).toBe('premium'); // Adapter maps account_type directly
      expect(unified.is_guest).toBe(false);
      expect(unified.firebase_uid).toBe(dbUser.firebase_uid);
      expect(unified.email).toBe(dbUser.email);
      expect(unified.eco_credits).toBe(100);
      expect(unified.xp_points).toBe(250);

      // Clean up
      await db.deleteFrom('users').where('id', '=', dbUser.id).execute();
    });
  });

  describe('🔐 Authentication API Integration', () => {
    test('should handle Firebase user registration with unified types', async () => {
      const registrationData = {
        username: 'test_user_' + Date.now()
      };

      // Use real Firebase token for authentication
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${testFirebaseToken}`)
        .send(registrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(registrationData.username);
      expect(response.body.data.user.user_type).toBe('REGISTERED');
      expect(response.body.data.user.is_guest).toBe(false);

      // Store for cleanup and duplicate testing
      testUserId = response.body.data.user.id;
      testUsername = response.body.data.user.username;
    });

    test('should handle guest user creation with unified types', async () => {
      const guestData = {
        deviceId: 'device-' + Date.now(),
        username: 'test_guest_' + Date.now()
      };

      const response = await request(app)
        .post('/api/guest/create')
        .send(guestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.user_type).toBe('GUEST');
      expect(response.body.data.user.is_guest).toBe(true);
      expect(response.body.data.user.guestId).toBeDefined();
      expect(response.body.auth.token).toBeDefined();

      // Store guest ID for cleanup
      testGuestId = response.body.data.user.guestId;
    });
  });

  describe('👤 Profile Management API', () => {
    test('should update user profile with display_name', async () => {
      // Create a unique Firebase token for this test
      const uniqueUid = randomUUID();
      const uniqueEmail = `profile-test-${Date.now()}@example.com`;
      const uniqueFirebaseToken = createTestFirebaseToken(uniqueUid, uniqueEmail);
      const registrationData = {
        username: 'profile_update_test_' + Date.now()
      };

      const regResponse = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${uniqueFirebaseToken}`)
        .send(registrationData);

      if (regResponse.status !== 201) {
        throw new Error(`Registration failed with status ${regResponse.status}: ${JSON.stringify(regResponse.body)}`);
      }

      const freshUserId = regResponse.body.data.user.id;
      const freshUsername = regResponse.body.data.user.username;

      const profileUpdate = {
        displayName: 'Updated Display Name',
        bio: 'Updated bio text',
        location: 'Updated Location',
        isPublicProfile: true,
        emailNotifications: false,
        pushNotifications: true
      };

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${uniqueFirebaseToken}`)
        .send(profileUpdate);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.display_name).toBe(profileUpdate.displayName);
      expect(response.body.data.user.bio).toBe(profileUpdate.bio);
      expect(response.body.data.user.location).toBe(profileUpdate.location);
      expect(response.body.data.user.username).toBe(freshUsername);
    });

    test('should get user profile with unified types', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testFirebaseToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      
      const user = response.body.data.user;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('display_name');
      expect(user).toHaveProperty('user_type');
      expect(user).toHaveProperty('is_guest');
      expect(user).toHaveProperty('created_at');
    });
  });

  describe('🌐 Cross-Platform Compatibility', () => {
    test('should handle offline/online sync status', async () => {
      // Test that the unified types support sync status for offline mode
      const mockAuthenticatedUser: AuthenticatedUser = {
        id: 'test-sync-user',
        username: 'sync_test_user',
        display_name: 'Sync Test User',
        user_type: UserType.REGISTERED,
        is_guest: false,
        created_at: new Date(),
        firebase_uid: 'firebase-sync-test',
        email: 'sync@example.com',
        last_login: new Date(),
        isOnline: false,
        syncStatus: SyncStatus.PENDING,
        lastSyncTime: new Date()
      };

      // Verify the type structure supports all required fields
      expect(mockAuthenticatedUser.syncStatus).toBe(SyncStatus.PENDING);
      expect(mockAuthenticatedUser.isOnline).toBe(false);
      expect(mockAuthenticatedUser.lastSyncTime).toBeInstanceOf(Date);
    });

    test('should support guest-to-registered conversion', async () => {
      // First create a guest user to convert
      const guestData = {
        deviceId: 'device-convert-' + Date.now(),
        username: 'guest_to_convert_' + Date.now()
      };

      const guestResponse = await request(app)
        .post('/api/guest/create')
        .send(guestData)
        .expect(201);

      const guestToken = guestResponse.body.auth.token;
      const guestUserId = guestResponse.body.data.user.id;

      // Create Firebase token for conversion
      const conversionFirebaseUid = 'firebase-converted-' + Date.now();
      const conversionEmail = 'converted@example.com';
      const conversionFirebaseToken = createTestFirebaseToken(conversionFirebaseUid, conversionEmail);

      const conversionData = {
        firebaseToken: conversionFirebaseToken
      };

      const response = await request(app)
        .post('/api/guest/convert')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(conversionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.user_type).toBe('REGISTERED');
      expect(response.body.data.user.is_guest).toBe(false);
      expect(response.body.data.user.email).toBe(conversionEmail);

      // Clean up converted user
      await db.deleteFrom('users').where('id', '=', guestUserId).execute();
    });
  });

  describe('❌ Error Handling & Edge Cases', () => {
    test('should handle invalid display_name validation', async () => {
      // Create a unique Firebase token for this test
      const uniqueUid = randomUUID();
      const uniqueEmail = `validation-test-${Date.now()}@example.com`;
      const uniqueFirebaseToken = createTestFirebaseToken(uniqueUid, uniqueEmail);

      const registrationData = {
        username: 'validation_test_user_' + Date.now()
      };

      const regResponse = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${uniqueFirebaseToken}`)
        .send(registrationData)
        .expect(201);

      const freshUserId = regResponse.body.data.user.id;
      const freshUsername = regResponse.body.data.user.username;

      const invalidUpdate = {
        displayName: 'A'.repeat(100) // Too long
      };

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${uniqueFirebaseToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_DISPLAY_NAME');
    });

    test('should handle missing user gracefully', async () => {
      // Use a valid UUID format that doesn't exist in database
      const nonexistentUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/users/${nonexistentUserId}/profile`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    test('should handle database constraint violations', async () => {
      // Create Firebase token for duplicate user test
      const duplicateFirebaseUid = 'firebase-duplicate-' + Date.now();
      const duplicateEmail = 'duplicate@example.com';
      const duplicateFirebaseToken = createTestFirebaseToken(duplicateFirebaseUid, duplicateEmail);

      // Try to create user with duplicate username
      const duplicateUser = {
        username: testUsername // Use existing username from first test
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${duplicateFirebaseToken}`)
        .send(duplicateUser)
        .expect(409); // Database constraint returns 409 Conflict

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('USERNAME');
    });
  });

  describe('🎯 Performance & Load Testing', () => {
    test('should handle concurrent user operations', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${testFirebaseToken}`)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should maintain performance with unified types', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testFirebaseToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 500ms
      expect(responseTime).toBeLessThan(500);
    });
  });
});
