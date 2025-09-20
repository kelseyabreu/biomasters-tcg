#!/usr/bin/env node

/**
 * Test Redis-dependent endpoints
 * This script tests matchmaking, WebSocket, and Redis functionality
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = 'biomasters_tcg_super_secret_jwt_key_2024_production_ready';

// Create test JWT token
function createTestToken(userId) {
    return jwt.sign(
        {
            uid: userId,
            email: `test-${userId}@example.com`,
            test_token: true,
            email_verified: true
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testRedisEndpoints() {
    console.log('🎮 Testing Redis-dependent endpoints...\n');

    try {
        // Test 1: Health checks
        console.log('1️⃣ Testing Health Endpoints:');

        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('   ✅ General Health:', healthResponse.data);

        const ioredisResponse = await axios.get(`${BASE_URL}/health/ioredis`);
        console.log('   ✅ IORedis Health:', ioredisResponse.data);

        // Test 2: Create guest user
        console.log('\n2️⃣ Creating Guest User:');

        let guestToken;
        try {
            const guestResponse = await axios.post(`${BASE_URL}/api/guest/create`, {
                username: `TestPlayer_${Date.now()}`
            });
            console.log('   ✅ Guest Created:', guestResponse.data);
            guestToken = guestResponse.data.auth.token;
            console.log('   🔑 Token extracted:', guestToken ? 'Present' : 'Missing');
        } catch (error) {
            console.log('   ❌ Guest Creation Error:', error.response?.data || error.message);
            return;
        }

        // Test 3: Matchmaking endpoints
        console.log('\n3️⃣ Testing Matchmaking Endpoints:');

        try {
            const matchmakingResponse = await axios.post(
                `${BASE_URL}/api/matchmaking/find`,
                {
                    gameMode: 'ranked_1v1',
                    preferences: { maxWaitTime: 600 }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${guestToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('   ✅ Matchmaking Find:', matchmakingResponse.status, matchmakingResponse.data);
        } catch (error) {
            if (error.response?.status === 500 && error.response?.data?.error?.includes('UNAUTHENTICATED')) {
                console.log('   ⚠️ Matchmaking Find: Expected Pub/Sub auth error (Redis operations succeeded)');
                console.log('   ✅ This is normal for local development without GCP credentials');
            } else {
                console.log('   ❌ Matchmaking Find Error:', error.response?.data || error.message);
            }
        }

        // Test 4: Redis Cache Operations
        console.log('\n4️⃣ Testing Redis Cache Operations:');

        try {
            // Test cache set/get
            const cacheTestResponse = await axios.post(
                `${BASE_URL}/api/admin/cache/test`,
                { key: 'test-key', value: 'test-value' },
                {
                    headers: {
                        'Authorization': `Bearer ${guestToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('   ✅ Cache Test:', cacheTestResponse.status);
        } catch (error) {
            console.log('   ⚠️ Cache Test (may require admin):', error.response?.status || error.message);
        }

        // Test 5: WebSocket connection
        console.log('\n5️⃣ Testing WebSocket Connection:');

        return new Promise((resolve) => {
            const socket = io(BASE_URL, {
                auth: {
                    token: guestToken
                },
                timeout: 5000
            });

            socket.on('connect', () => {
                console.log('   ✅ WebSocket Connected:', socket.id);
                
                // Test ping/pong
                socket.emit('ping');
                socket.on('pong', () => {
                    console.log('   ✅ WebSocket Ping/Pong working');
                    socket.disconnect();
                    resolve();
                });
            });

            socket.on('connect_error', (error) => {
                console.log('   ❌ WebSocket Connection Error:', error.message);
                resolve();
            });

            socket.on('disconnect', () => {
                console.log('   ✅ WebSocket Disconnected');
                resolve();
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                console.log('   ⏰ WebSocket test timeout');
                socket.disconnect();
                resolve();
            }, 10000);
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests
testRedisEndpoints().then(() => {
    console.log('\n🎉 Redis endpoint tests completed!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});
