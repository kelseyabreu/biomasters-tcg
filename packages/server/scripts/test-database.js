#!/usr/bin/env node

/**
 * Test database connectivity and operations
 * This script tests basic database operations
 */

// Load environment variables
require('dotenv').config();

const { db } = require('../dist/database/kysely');
const { randomUUID } = require('crypto');

async function testDatabase() {
    console.log('🗄️ Testing database connectivity and operations...\n');

    try {
        // Test 1: Basic connectivity
        console.log('📝 Test 1: Database connectivity');
        const result = await db.selectFrom('users').select('id').limit(1).execute();
        console.log(`   ✅ Database connection successful\n`);

        // Test 2: Create test user
        console.log('📝 Test 2: Create test user');
        const testUserId = randomUUID();
        const testEmail = `test-${Date.now()}@example.com`;

        await db.insertInto('users')
            .values({
                id: testUserId,
                firebase_uid: `test-firebase-${Date.now()}`,
                email: testEmail,
                username: `test-user-${Date.now()}`,
                current_rating: 1000,
                created_at: new Date(),
                updated_at: new Date()
            })
            .execute();

        console.log(`   ✅ Test user created: ${testUserId}\n`);

        // Test 3: Create game session
        console.log('📝 Test 3: Create game session');
        const sessionId = randomUUID();
        
        await db.insertInto('game_sessions')
            .values({
                id: sessionId,
                host_user_id: testUserId,
                game_mode: 'ranked_1v1',
                status: 'waiting',
                players: JSON.stringify([
                    {
                        user_id: testUserId,
                        ready: false,
                        rating: 1000
                    }
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .execute();

        console.log(`   ✅ Game session created: ${sessionId}\n`);

        // Test 4: Update game session
        console.log('📝 Test 4: Update game session status');
        await db.updateTable('game_sessions')
            .set({
                status: 'active',
                updated_at: new Date()
            })
            .where('id', '=', sessionId)
            .execute();

        const updatedSession = await db.selectFrom('game_sessions')
            .selectAll()
            .where('id', '=', sessionId)
            .executeTakeFirst();

        console.log(`   Session status: ${updatedSession?.status}`);
        console.log(`   ✅ Game session updated successfully\n`);

        // Test 5: Create match result
        console.log('📝 Test 5: Create match result');
        const resultId = randomUUID();

        await db.insertInto('match_results')
            .values({
                id: resultId,
                session_id: sessionId,
                player_user_id: testUserId,
                game_mode: 'ranked_1v1',
                result: 'win',
                rating_before: 1000,
                rating_after: 1025,
                rating_change: 25,
                duration_seconds: 300,
                ended_at: new Date()
            })
            .execute();

        console.log(`   ✅ Match result created: ${resultId}\n`);

        // Test 6: Query match history
        console.log('📝 Test 6: Query match history');
        const matchHistory = await db.selectFrom('match_results')
            .selectAll()
            .where('session_id', '=', sessionId)
            .execute();

        console.log(`   Found ${matchHistory.length} match result(s)`);
        console.log(`   ✅ Match history query successful\n`);

        // Test 7: Cleanup
        console.log('📝 Test 7: Cleanup test data');
        await db.deleteFrom('match_results').where('id', '=', resultId).execute();
        await db.deleteFrom('game_sessions').where('id', '=', sessionId).execute();
        await db.deleteFrom('users').where('id', '=', testUserId).execute();

        console.log(`   ✅ Test data cleaned up\n`);

        console.log('🎉 All database tests passed!');

    } catch (error) {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    }
}

// Run the test
testDatabase().catch(console.error);
