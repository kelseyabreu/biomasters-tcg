/**
 * Database Migration Validation Tests
 * REAL integration tests that validate the User Types Standardization migration
 * Tests actual database schema and data integrity without mocks
 */

import { db, databaseAvailable } from '../setup';
import { adaptDatabaseUserToUnified } from '../../database/types';
import { UserType } from '../../../../shared/enums';
import type { DatabaseUser } from '../../../../shared/types';
import { randomUUID } from 'crypto';

describe('🗄️ Database Migration Validation - User Types Standardization', () => {
  // Check database availability before each test
  beforeEach(() => {
    if (!databaseAvailable) {
      throw new Error('Database connection not available for testing');
    }
  });

  describe('📋 Schema Validation', () => {
    test('should have all unified user fields in database schema', async () => {
      // Test that we can query all the unified user fields
      const result = await db
        .selectFrom('users')
        .select([
          'id', 'firebase_uid', 'email', 'username', 'display_name',
          'eco_credits', 'xp_points', 'bio', 'location', 'is_guest',
          'account_type', 'email_verified', 'is_active', 'is_banned',
          'ban_reason', 'guest_id', 'guest_secret_hash', 'needs_registration',
          'avatar_url', 'level', 'experience', 'title', 'gems', 'coins', 'dust',
          'games_played', 'games_won', 'cards_collected', 'packs_opened',
          'favorite_species', 'is_public_profile', 'email_notifications',
          'push_notifications', 'preferences', 'last_reward_claimed_at',
          'created_at', 'updated_at', 'last_login_at'
        ])
        .limit(1)
        .execute();

      // Should not throw - all fields exist
      expect(Array.isArray(result)).toBe(true);
    });

    test('should validate unified user types work correctly', async () => {
      // Test the type adapter function with mock data
      const mockDatabaseUser = {
        id: 'test-user-1',
        firebase_uid: 'firebase-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test Display Name',
        eco_credits: 100,
        xp_points: 50,
        bio: 'Test bio',
        location: 'Test location',
        is_guest: false,
        account_type: 'registered' as any,
        created_at: new Date(),
        updated_at: new Date(),
        email_verified: true,
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
        favorite_species: null,
        is_public_profile: false,
        email_notifications: true,
        push_notifications: true,
        preferences: null,
        last_reward_claimed_at: null,
        last_login_at: null
      };

      // Test the adapter function
      const unifiedUser = adaptDatabaseUserToUnified(mockDatabaseUser);

      expect(unifiedUser.id).toBe('test-user-1');
      expect(unifiedUser.username).toBe('testuser');
      expect(unifiedUser.display_name).toBe('Test Display Name');
      expect(unifiedUser.user_type).toBe('registered');
      expect(unifiedUser.is_guest).toBe(false);
      expect(unifiedUser.eco_credits).toBe(100);
      expect(unifiedUser.xp_points).toBe(50);
    });

    test('should handle guest user type conversion', async () => {
      const mockGuestUser = {
        id: 'guest-user-1',
        firebase_uid: null,
        email: 'guest@example.com',
        username: 'Guest-ABC123',
        display_name: null,
        eco_credits: 0,
        xp_points: 0,
        bio: null,
        location: null,
        is_guest: true,
        account_type: 'guest' as any,
        created_at: new Date(),
        updated_at: new Date(),
        email_verified: false,
        is_active: true,
        is_banned: false,
        ban_reason: null,
        guest_id: 'guest-123',
        guest_secret_hash: 'hash-123',
        needs_registration: true,
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
        favorite_species: null,
        is_public_profile: false,
        email_notifications: true,
        push_notifications: true,
        preferences: null,
        last_reward_claimed_at: null,
        last_login_at: null
      };

      const unifiedUser = adaptDatabaseUserToUnified(mockGuestUser);

      expect(unifiedUser.user_type).toBe('guest');
      expect(unifiedUser.is_guest).toBe(true);
      expect(unifiedUser.display_name).toBeNull();
      expect(unifiedUser.username).toBe('Guest-ABC123');
    });

    test('should support display_name as nullable field in real database', async () => {
      const testUserId = randomUUID();

      const testUser = {
        id: testUserId,
        firebase_uid: 'firebase-nullable-test',
        email: 'nullable@example.com',
        username: 'nullableuser',
        display_name: null, // Test null value
        eco_credits: 100,
        xp_points: 50,
        bio: null,
        location: null,
        is_guest: false,
        account_type: 'registered' as any,
        email_verified: true,
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
        coins: 100,
        dust: 0,
        games_played: 0,
        games_won: 0,
        cards_collected: 0,
        packs_opened: 0,
        favorite_species: null,
        is_public_profile: false,
        email_notifications: true,
        push_notifications: true,
        preferences: null,
        last_reward_claimed_at: null,
        last_login_at: null
      };

      await db.insertInto('users').values(testUser).execute();

      const retrieved = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', testUserId)
        .executeTakeFirst();

      expect(retrieved).toBeDefined();
      expect(retrieved!.display_name).toBeNull();
      expect(retrieved!.username).toBe('nullableuser');

      // Test unified type conversion
      const unified = adaptDatabaseUserToUnified(retrieved!);
      expect(unified.display_name).toBeNull();
      expect(unified.user_type).toBe('registered');

      // Clean up
      await db.deleteFrom('users').where('id', '=', testUserId).execute();
    });

    test('should support display_name with string values and all unified fields', async () => {
      const testUserId = randomUUID();

      // Create a complete user object with all fields populated
      const testUser = {
        id: testUserId,
        username: 'test_string_display_' + Date.now(),
        display_name: 'Test Display Name',
        account_type: 'premium',
        is_guest: false,
        firebase_uid: 'firebase-' + testUserId,
        email: 'string-display@example.com',
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
        bio: 'Test bio content for migration validation',
        location: 'Test Location City',
        favorite_species: 'Oak Tree',
        is_public_profile: true,
        email_notifications: false,
        push_notifications: true,
        preferences: '{"theme": "dark", "language": "en"}',
        last_reward_claimed_at: new Date('2024-01-01'),
        last_login_at: new Date('2024-01-03')
      };

      // Insert user with all fields populated
      await db.insertInto('users').values(testUser).execute();

      // Retrieve and verify all fields
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', testUserId)
        .executeTakeFirst();

      expect(user).toBeDefined();

      // Verify core unified user fields
      expect(user!.display_name).toBe('Test Display Name');
      expect(user!.username).toBe(testUser.username);
      expect(user!.account_type).toBe('premium');
      expect(user!.is_guest).toBe(false);

      // Verify new migration 012 fields
      expect(user!.eco_credits).toBe(100);
      expect(user!.xp_points).toBe(250);
      expect(user!.bio).toBe('Test bio content for migration validation');
      expect(user!.location).toBe('Test Location City');
      expect(user!.favorite_species).toBe('Oak Tree');
      expect(user!.is_public_profile).toBe(true);
      expect(user!.email_notifications).toBe(false);
      expect(user!.push_notifications).toBe(true);

      // Verify game statistics fields
      expect(user!.level).toBe(5);
      expect(user!.experience).toBe(1250);
      expect(user!.gems).toBe(50);
      expect(user!.coins).toBe(1000);
      expect(user!.dust).toBe(25);
      expect(user!.games_played).toBe(10);
      expect(user!.games_won).toBe(7);
      expect(user!.cards_collected).toBe(150);
      expect(user!.packs_opened).toBe(20);

      // Verify timestamp fields
      expect(user!.last_reward_claimed_at).toEqual(new Date('2024-01-01'));
      expect(user!.last_login_at).toEqual(new Date('2024-01-03'));
      expect(user!.created_at).toBeInstanceOf(Date);
      expect(user!.updated_at).toBeInstanceOf(Date);

      // Clean up
      await db.deleteFrom('users').where('id', '=', testUserId).execute();
    });
  });

  describe('🔧 Data Type Validation', () => {
    test('should handle all account_type enum values', async () => {
      const timestamp = Date.now();
      const testUsers = [
        {
          id: randomUUID(),
          username: 'test_guest_user_' + timestamp,
          account_type: 'guest',
          is_guest: true
        },
        {
          id: randomUUID(),
          username: 'test_registered_user_' + timestamp,
          account_type: 'registered',
          is_guest: false
        },
        {
          id: randomUUID(),
          username: 'test_premium_user_' + timestamp,
          account_type: 'premium',
          is_guest: false
        }
      ];

      // Insert all user types with complete data
      for (const testUser of testUsers) {
        const completeUser = {
          ...testUser,
          display_name: `Display ${testUser.username}`,
          firebase_uid: testUser.is_guest ? null : `firebase-${testUser.id}`,
          email: `${testUser.username}@example.com`,
          email_verified: !testUser.is_guest,
          eco_credits: 0,
          xp_points: 0,
          is_active: true,
          is_banned: false,
          ban_reason: null,
          guest_id: testUser.is_guest ? testUser.id : null,
          guest_secret_hash: testUser.is_guest ? 'hash-' + testUser.id : null,
          needs_registration: testUser.is_guest,
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
          last_login_at: null
        };

        await db.insertInto('users').values(completeUser).execute();
      }

      // Verify all were inserted correctly
      for (const testUser of testUsers) {
        const user = await db
          .selectFrom('users')
          .selectAll()
          .where('id', '=', testUser.id)
          .executeTakeFirst();

        expect(user).toBeDefined();
        expect(user!.account_type).toBe(testUser.account_type);
        expect(user!.is_guest).toBe(testUser.is_guest);
        expect(user!.username).toBe(testUser.username);
        expect(user!.display_name).toBe(`Display ${testUser.username}`);

        // Verify migration 012 fields are present and have correct defaults
        expect(user!.eco_credits).toBe(0);
        expect(user!.xp_points).toBe(0);
        expect(user!.is_public_profile).toBe(false);
        expect(user!.email_notifications).toBe(true);
        expect(user!.push_notifications).toBe(true);
      }

      // Clean up
      const userIds = testUsers.map(u => u.id);
      await db.deleteFrom('users').where('id', 'in', userIds).execute();
    });

    test('should handle numeric fields correctly with constraints', async () => {
      const testUserId = randomUUID();

      const numericTestUser = {
        id: testUserId,
        username: 'test_numeric_fields_' + Date.now(),
        display_name: 'Numeric Test User',
        account_type: 'premium',
        is_guest: false,
        firebase_uid: 'firebase-' + testUserId,
        email: 'numeric_' + Date.now() + '@example.com',
        email_verified: true,
        eco_credits: 999999, // Test large values
        xp_points: 888888,
        is_active: true,
        is_banned: false,
        ban_reason: null,
        guest_id: null,
        guest_secret_hash: null,
        needs_registration: false,
        avatar_url: null,
        level: 100,
        experience: 999999,
        title: 'Max Level',
        gems: 9999,
        coins: 999999,
        dust: 5000,
        games_played: 1000,
        games_won: 750,
        cards_collected: 2500,
        packs_opened: 500,
        bio: 'Testing numeric field constraints and limits',
        location: 'Numeric Test City',
        favorite_species: 'Giant Sequoia',
        is_public_profile: true,
        email_notifications: true,
        push_notifications: true,
        preferences: '{"maxLevel": true, "achievements": ["collector", "winner"]}',
        last_reward_claimed_at: new Date('2024-01-01'),
        last_login_at: new Date('2024-01-02')
      };

      await db.insertInto('users').values(numericTestUser).execute();

      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', testUserId)
        .executeTakeFirst();

      expect(user).toBeDefined();

      // Verify large numeric values are stored correctly
      expect(user!.eco_credits).toBe(999999);
      expect(user!.xp_points).toBe(888888);
      expect(user!.level).toBe(100);
      expect(user!.experience).toBe(999999);
      expect(user!.gems).toBe(9999);
      expect(user!.coins).toBe(999999);
      expect(user!.dust).toBe(5000);

      // Verify game statistics
      expect(user!.games_played).toBe(1000);
      expect(user!.games_won).toBe(750);
      expect(user!.cards_collected).toBe(2500);
      expect(user!.packs_opened).toBe(500);

      // Verify text fields with special content
      expect(user!.bio).toBe('Testing numeric field constraints and limits');
      // Compare JSON object directly since PostgreSQL returns parsed JSON
      expect(user!.preferences).toEqual({"maxLevel": true, "achievements": ["collector", "winner"]});

      // Clean up
      await db.deleteFrom('users').where('id', '=', testUserId).execute();
    });
  });

  describe('🔍 Migration Completeness', () => {
    test('should have migration recorded in migrations table', async () => {
      const migration = await db
        .selectFrom('migrations')
        .selectAll()
        .where('name', '=', '012_add_unified_user_fields')
        .executeTakeFirst();

      expect(migration).toBeDefined();
      expect(migration!.name).toBe('012_add_unified_user_fields');
      expect(migration!.executed_at).toBeInstanceOf(Date);
    });

    test('should maintain existing user data integrity', async () => {
      // Check if there are any existing users and verify they have the new fields
      const existingUsers = await db
        .selectFrom('users')
        .select(['id', 'username', 'display_name', 'eco_credits', 'xp_points'])
        .limit(5)
        .execute();

      // If there are existing users, they should have the new fields
      existingUsers.forEach((user: any) => {
        expect(user.id).toBeDefined();
        expect(user.username).toBeDefined();
        // display_name can be null, but the field should exist
        expect(user).toHaveProperty('display_name');
        expect(user).toHaveProperty('eco_credits');
        expect(user).toHaveProperty('xp_points');
      });
    });

    test('should support all required constraints', async () => {
      const testUserId = randomUUID();
      
      // Test unique username constraint
      const uniqueUsername = 'unique_test_user_' + Date.now();
      const firstUser = {
        id: testUserId,
        username: uniqueUsername,
        display_name: 'Unique Test',
        account_type: 'registered',
        is_guest: false,
        firebase_uid: 'firebase-' + testUserId,
        email: 'unique_' + Date.now() + '@example.com',
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
        last_login_at: null
      };

      await db.insertInto('users').values(firstUser).execute();

      // Try to insert duplicate username - should fail
      const duplicateUser = {
        ...firstUser,
        id: randomUUID(),
        username: uniqueUsername, // Same username - should fail
        email: 'duplicate@example.com',
        firebase_uid: 'firebase-duplicate'
      };

      await expect(
        db.insertInto('users').values(duplicateUser).execute()
      ).rejects.toThrow();

      // Clean up
      await db.deleteFrom('users').where('id', '=', testUserId).execute();
    });
  });
});
