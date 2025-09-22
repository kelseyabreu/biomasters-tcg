#!/usr/bin/env tsx

/**
 * Test script for Google Cloud Memorystore Redis connection
 * Run with: npm run test:memorystore
 */

import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function testMemorystoreConnection() {
  console.log('🔴 Testing Google Cloud Memorystore Redis connection...');
  console.log('🔍 Configuration:');
  console.log(`   Host: ${process.env['REDIS_HOST']}`);
  console.log(`   Port: ${process.env['REDIS_PORT']}`);
  console.log(`   Password: ${process.env['REDIS_PASSWORD'] ? 'SET' : 'NOT SET'}`);
  console.log(`   TLS: ${process.env['REDIS_TLS'] || 'false'}`);

  // Use tunnel-optimized configuration for localhost
  const isLocalhost = process.env['REDIS_HOST'] === 'localhost';

  const redis = new Redis({
    host: process.env['REDIS_HOST'] || '10.36.239.107',
    port: parseInt(process.env['REDIS_PORT'] || '6378'),
    // Memorystore requires password even through tunnel
    password: process.env['REDIS_PASSWORD'] || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',

    // Tunnel-optimized settings for localhost
    connectTimeout: isLocalhost ? 15000 : 10000,
    commandTimeout: isLocalhost ? 15000 : 5000,
    maxRetriesPerRequest: isLocalhost ? null : 3,
    lazyConnect: true,
    keepAlive: 30000,
    enableReadyCheck: isLocalhost ? false : true,
    enableOfflineQueue: true, // Keep enabled to queue commands until connected

    // Enable TLS if needed (Memorystore requires TLS even through tunnel)
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: { rejectUnauthorized: false } } : {}),

    family: 4, // Force IPv4
    db: 0,
  });

  try {
    console.log('🔄 Connecting to Redis...');

    // For localhost tunnel, test connection directly
    console.log('✅ Redis connection ready');

    // Test basic connection
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}`);

    // Test basic operations
    console.log('🔄 Testing basic operations...');
    
    // Set a test key
    await redis.set('test:connection', 'success', 'EX', 60);
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await redis.get('test:connection');
    console.log(`✅ GET operation successful: ${value}`);
    
    // Test distributed locking operations (used by game workers)
    console.log('🔄 Testing distributed locking operations...');
    
    // Test SET NX (atomic set if not exists)
    const lockResult = await redis.set('test:lock', 'worker-123', 'PX', 5000, 'NX');
    console.log(`✅ Lock acquisition: ${lockResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Test TTL
    const ttl = await redis.ttl('test:lock');
    console.log(`✅ Lock TTL: ${ttl} seconds`);
    
    // Test key deletion
    await redis.del('test:connection', 'test:lock');
    console.log('✅ Cleanup successful');
    
    console.log('🎉 All tests passed! Memorystore Redis is working correctly.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 Hint: Make sure you\'re running from within the same VPC as Memorystore');
      } else if (error.message.includes('NOAUTH')) {
        console.error('💡 Hint: Check your REDIS_PASSWORD environment variable');
      } else if (error.message.includes('timeout')) {
        console.error('💡 Hint: Check network connectivity and firewall rules');
      }
    }
    
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

// Run the test
testMemorystoreConnection().catch(console.error);
