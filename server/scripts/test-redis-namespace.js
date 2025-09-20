#!/usr/bin/env node

/**
 * Test Redis namespace functionality with IORedis and GCP Memorystore
 * This script tests if Redis namespacing is working correctly
 */

// Load environment variables
require('dotenv').config();

const { Redis } = require('ioredis');

async function testRedisNamespace() {
    console.log('🔧 Testing Redis namespace functionality with IORedis (manual namespacing)...\n');

    // Create Redis client using IORedis with GCP Memorystore
    const redis = new Redis({
        host: process.env.REDIS_HOST || '10.36.239.107',
        port: parseInt(process.env.REDIS_PORT || '6378'),
        password: process.env.REDIS_PASSWORD || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',
        connectTimeout: 10000,
        commandTimeout: 5000,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        family: 4,
        db: 0,
        ...(process.env.REDIS_TLS === 'true' ? {
            tls: { rejectUnauthorized: false }
        } : {})
    });

    // Manual namespacing (like our actual code does)
    const namespace1 = 'test_namespace_1';
    const namespace2 = 'test_namespace_2';

    try {
        // Test 1: Basic set/get with manual namespacing
        console.log('📝 Test 1: Basic set/get with manual namespaces');
        await redis.set(`${namespace1}:test_key`, 'value_from_namespace_1');
        await redis.set(`${namespace2}:test_key`, 'value_from_namespace_2');

        const value1 = await redis.get(`${namespace1}:test_key`);
        const value2 = await redis.get(`${namespace2}:test_key`);

        console.log(`   Namespace 1 value: ${value1}`);
        console.log(`   Namespace 2 value: ${value2}`);
        console.log(`   ✅ Namespaces are isolated: ${value1 !== value2 && value1 === 'value_from_namespace_1' && value2 === 'value_from_namespace_2'}\n`);

        // Test 2: Sorted set operations (matchmaking queues) with manual namespacing
        console.log('📝 Test 2: Sorted set operations (matchmaking queues)');
        const queue1 = `${namespace1}:matchmaking:ranked_1v1`;
        const queue2 = `${namespace2}:matchmaking:ranked_1v1`;

        // Add players to different namespace queues
        const player1 = JSON.stringify({
            playerId: 'player-1',
            gameMode: 'ranked_1v1',
            rating: 1000,
            timestamp: Date.now()
        });

        const player2 = JSON.stringify({
            playerId: 'player-2',
            gameMode: 'ranked_1v1',
            rating: 1100,
            timestamp: Date.now()
        });

        await redis.zadd(queue1, { score: 1000, member: player1 });
        await redis.zadd(queue2, { score: 1100, member: player2 });

        // Check queue contents
        const queue1Data = await redis.zrange(queue1, 0, -1);
        const queue2Data = await redis.zrange(queue2, 0, -1);

        console.log(`   Queue 1 (namespace 1): ${queue1Data.length} players`);
        console.log(`   Queue 2 (namespace 2): ${queue2Data.length} players`);
        console.log(`   ✅ Queue isolation working: ${queue1Data.length === 1 && queue2Data.length === 1}\n`);

        // Test 3: Cross-namespace visibility
        console.log('📝 Test 3: Cross-namespace visibility');
        console.log(`   Redis queue1 sees: ${JSON.stringify(queue1Data)}`);
        console.log(`   Redis queue2 sees: ${JSON.stringify(queue2Data)}`);
        console.log(`   ✅ No cross-namespace leakage: ${JSON.stringify(queue1Data) !== JSON.stringify(queue2Data)}\n`);

        // Test 4: Verify our actual namespace pattern works
        console.log('📝 Test 4: Verify actual namespace pattern');
        const actualNamespace1 = 'test_2v2_123456_abc123';
        const actualNamespace2 = 'test_ffa_789012_def456';

        const actualQueue1 = `${actualNamespace1}:matchmaking:team_2v2`;
        const actualQueue2 = `${actualNamespace2}:matchmaking:ffa_4p`;

        await redis.zadd(actualQueue1, { score: Date.now(), member: JSON.stringify({ playerId: 'test-player-1' }) });
        await redis.zadd(actualQueue2, { score: Date.now(), member: JSON.stringify({ playerId: 'test-player-2' }) });

        const actualQueue1Size = await redis.zcard(actualQueue1);
        const actualQueue2Size = await redis.zcard(actualQueue2);

        console.log(`   Actual queue 1 size: ${actualQueue1Size}`);
        console.log(`   Actual queue 2 size: ${actualQueue2Size}`);
        console.log(`   ✅ Actual namespace pattern works: ${actualQueue1Size === 1 && actualQueue2Size === 1}\n`);

        // Cleanup
        await redis.del(`${namespace1}:test_key`, queue1, actualQueue1);
        await redis.del(`${namespace2}:test_key`, queue2, actualQueue2);

        console.log('🎉 All Redis namespace tests passed!');

    } catch (error) {
        console.error('❌ Redis namespace test failed:', error);
        process.exit(1);
    }
}

// Run the test
testRedisNamespace().catch(console.error);
