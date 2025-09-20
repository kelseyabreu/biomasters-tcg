#!/usr/bin/env tsx

/**
 * Test script for Google Cloud Memorystore Redis connection
 * Run with: npm run test:memorystore
 */

import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.memorystore' });

async function testMemorystoreConnection() {
  console.log('🔴 Testing Google Cloud Memorystore Redis connection...');
  console.log('🔍 Configuration:');
  console.log(`   Host: ${process.env['REDIS_HOST']}`);
  console.log(`   Port: ${process.env['REDIS_PORT']}`);
  console.log(`   Password: ${process.env['REDIS_PASSWORD'] ? 'SET' : 'NOT SET'}`);
  console.log(`   TLS: ${process.env['REDIS_TLS'] || 'false'}`);

  const redis = new Redis({
    host: process.env['REDIS_HOST'] || '10.36.239.107',
    port: parseInt(process.env['REDIS_PORT'] || '6378'),
    password: process.env['REDIS_PASSWORD'] || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',

    // Memorystore-optimized settings
    connectTimeout: 10000,
    commandTimeout: 5000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,

    // Enable TLS if needed
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: { rejectUnauthorized: false } } : {}),

    family: 4, // Force IPv4
    db: 0,
  });

  try {
    console.log('🔄 Connecting to Redis...');
    
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
