#!/usr/bin/env node

/**
 * Test API endpoints manually
 * This script tests the matchmaking API endpoints directly
 */

// Load environment variables
require('dotenv').config();

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

// Create test JWT token
function createTestToken(userId) {
    return jwt.sign(
        {
            uid: userId,
            email: `test-${userId}@example.com`,
            test_token: true,
            email_verified: true
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
}

async function testApiEndpoints() {
    console.log('🌐 Testing API endpoints...\n');

    const baseUrl = 'http://localhost:3000/api';
    let server;

    try {
        // Start the server
        console.log('🚀 Starting server...');
        const { default: app } = require('../dist/server/src/index');
        server = app.listen(3000, () => {
            console.log('✅ Server started on port 3000\n');
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Health check
        console.log('📝 Test 1: Health check');
        try {
            const healthResponse = await axios.get(`${baseUrl}/health`);
            console.log(`   Status: ${healthResponse.status}`);
            console.log(`   ✅ Health check passed\n`);
        } catch (error) {
            console.log(`   ❌ Health check failed: ${error.message}\n`);
        }

        // Test 2: Matchmaking request
        console.log('📝 Test 2: Matchmaking request');
        const userId = randomUUID();
        const token = createTestToken(userId);

        try {
            const matchResponse = await axios.post(
                `${baseUrl}/matchmaking/find`,
                {
                    gameMode: 'ranked_1v1',
                    preferences: { maxWaitTime: 600 }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`   Status: ${matchResponse.status}`);
            console.log(`   Response:`, matchResponse.data);
            console.log(`   ✅ Matchmaking request successful\n`);

            // Test 3: Cancel matchmaking
            console.log('📝 Test 3: Cancel matchmaking');
            const cancelResponse = await axios.delete(
                `${baseUrl}/matchmaking/cancel`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        gameMode: 'ranked_1v1'
                    }
                }
            );

            console.log(`   Status: ${cancelResponse.status}`);
            console.log(`   Response:`, cancelResponse.data);
            console.log(`   ✅ Cancel matchmaking successful\n`);

        } catch (error) {
            console.log(`   ❌ Matchmaking test failed:`, error.response?.data || error.message);
        }

        // Test 4: Multiple players
        console.log('📝 Test 4: Multiple players matchmaking');
        const players = [];
        
        for (let i = 0; i < 2; i++) {
            const playerId = randomUUID();
            const playerToken = createTestToken(playerId);
            players.push({ id: playerId, token: playerToken });

            try {
                const response = await axios.post(
                    `${baseUrl}/matchmaking/find`,
                    {
                        gameMode: 'ranked_1v1',
                        preferences: { maxWaitTime: 600 }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${playerToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log(`   Player ${i + 1} (${playerId}): Status ${response.status}`);
                
            } catch (error) {
                console.log(`   Player ${i + 1} failed:`, error.response?.data || error.message);
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('   ✅ Multiple player test completed\n');

        console.log('🎉 All API endpoint tests completed!');

    } catch (error) {
        console.error('❌ API endpoint test failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        if (server) {
            console.log('\n🧹 Stopping server...');
            server.close();
            console.log('✅ Server stopped');
        }
    }
}

// Run the test
testApiEndpoints().catch(console.error);
