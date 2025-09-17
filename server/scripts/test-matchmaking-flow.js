#!/usr/bin/env node

/**
 * Test the complete matchmaking flow manually
 * This script simulates the matchmaking process step by step
 */

// Load environment variables
require('dotenv').config();

const { MatchmakingService } = require('../dist/server/src/services/MatchmakingService');
const { MatchmakingWorker } = require('../dist/server/src/workers/MatchmakingWorker');
const { initializePubSub } = require('../dist/server/src/config/pubsub');
const { randomUUID } = require('crypto');

async function testMatchmakingFlow() {
    console.log('🚀 Testing complete matchmaking flow...\n');

    const testNamespace = `test_manual_${Date.now()}`;
    console.log(`🔧 Using test namespace: ${testNamespace}\n`);

    // Initialize services
    const matchmakingService = new MatchmakingService(testNamespace);
    const matchmakingWorker = new MatchmakingWorker(testNamespace);

    try {
        // Initialize Pub/Sub
        console.log('📡 Initializing Pub/Sub...');
        await initializePubSub();
        console.log('✅ Pub/Sub initialized\n');

        // Start the worker
        console.log('🔄 Starting MatchmakingWorker...');
        await matchmakingWorker.start();
        console.log('✅ MatchmakingWorker started\n');

        // Test 1: Single player (should not match)
        console.log('📝 Test 1: Single player (should not match)');
        const player1Id = randomUUID();
        
        console.log(`   Adding player ${player1Id} to queue...`);
        await matchmakingService.requestMatch({
            playerId: player1Id,
            gameMode: 'ranked_1v1',
            rating: 1000,
            preferences: { maxWaitTime: 600 },
            requestId: randomUUID(),
            timestamp: Date.now()
        });

        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check queue status
        const queueSize1 = await matchmakingService.getQueueSize('ranked_1v1');
        console.log(`   Queue size after 1 player: ${queueSize1}`);
        console.log(`   ✅ Single player stays in queue: ${queueSize1 === 1}\n`);

        // Test 2: Add second player (should match)
        console.log('📝 Test 2: Add second player (should create match)');
        const player2Id = randomUUID();
        
        console.log(`   Adding player ${player2Id} to queue...`);
        await matchmakingService.requestMatch({
            playerId: player2Id,
            gameMode: 'ranked_1v1',
            rating: 1050,
            preferences: { maxWaitTime: 600 },
            requestId: randomUUID(),
            timestamp: Date.now()
        });

        // Wait for match processing
        console.log('   Waiting for match processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check final queue status
        const queueSize2 = await matchmakingService.getQueueSize('ranked_1v1');
        console.log(`   Queue size after 2 players: ${queueSize2}`);
        console.log(`   ✅ Players matched and removed from queue: ${queueSize2 === 0}\n`);

        // Test 3: Multi-player game (2v2)
        console.log('📝 Test 3: Multi-player game (2v2 - needs 4 players)');
        const players2v2 = [];
        
        for (let i = 0; i < 4; i++) {
            const playerId = randomUUID();
            players2v2.push(playerId);
            
            console.log(`   Adding player ${i + 1}/4: ${playerId}`);
            await matchmakingService.requestMatch({
                playerId: playerId,
                gameMode: 'team_2v2',
                rating: 1000 + (i * 50),
                preferences: { maxWaitTime: 600 },
                requestId: randomUUID(),
                timestamp: Date.now()
            });
            
            // Small delay between players
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for match processing
        console.log('   Waiting for 2v2 match processing...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Check 2v2 queue status
        const queueSize2v2 = await matchmakingService.getQueueSize('team_2v2');
        console.log(`   2v2 queue size after 4 players: ${queueSize2v2}`);
        console.log(`   ✅ 2v2 players matched: ${queueSize2v2 === 0}\n`);

        console.log('🎉 All matchmaking flow tests completed!');

    } catch (error) {
        console.error('❌ Matchmaking flow test failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        try {
            await matchmakingWorker.stop();
            await matchmakingService.clearNamespace();
            console.log('✅ Cleanup completed');
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup warning:', cleanupError);
        }
    }
}

// Run the test
testMatchmakingFlow().catch(console.error);
