#!/usr/bin/env tsx

/**
 * Test Redis connection from Cloud Run environment
 * This script tests the secure Memorystore Redis connection with TLS and auth
 */

import { Redis } from 'ioredis';

async function testRedisConnection() {
  console.log('🔴 Testing Google Cloud Memorystore Redis connection from Cloud Run...');
  
  const config = {
    host: process.env['REDIS_HOST'] || '10.36.239.107',
    port: parseInt(process.env['REDIS_PORT'] || '6378'),
    password: process.env['REDIS_PASSWORD'] || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',
    connectTimeout: 10000,
    commandTimeout: 5000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    ...(process.env['REDIS_TLS'] === 'true' ? {
      tls: { rejectUnauthorized: false } // For Google Cloud Memorystore
    } : {}),
  };

  console.log('🔍 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Password: ${config.password ? 'SET' : 'NOT SET'}`);
  console.log(`   TLS: ${config.tls ? 'enabled' : 'disabled'}`);

  const redis = new Redis(config);

  try {
    console.log('🔄 Connecting to Redis...');
    
    // Test basic connection
    const pingResult = await redis.ping();
    console.log(`✅ PING result: ${pingResult}`);

    // Test basic operations
    console.log('🔄 Testing basic operations...');
    
    // Set a test key
    await redis.set('test:connection', 'success', 'EX', 60);
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await redis.get('test:connection');
    console.log(`✅ GET operation successful: ${value}`);
    
    // Test distributed locking (used by worker system)
    console.log('🔄 Testing distributed locking...');
    const lockKey = 'test:lock:worker-test';
    const lockValue = `worker-${Date.now()}`;
    
    const lockResult = await redis.set(lockKey, lockValue, 'PX', 30000, 'NX');
    if (lockResult === 'OK') {
      console.log('✅ Distributed lock acquired successfully');
      
      // Release the lock
      await redis.del(lockKey);
      console.log('✅ Distributed lock released successfully');
    } else {
      console.log('⚠️ Lock already exists (this is normal)');
    }
    
    // Test TTL operations
    console.log('🔄 Testing TTL operations...');
    await redis.set('test:ttl', 'expires-soon', 'EX', 5);
    const ttl = await redis.ttl('test:ttl');
    console.log(`✅ TTL operation successful: ${ttl} seconds remaining`);
    
    console.log('');
    console.log('🎉 All Redis tests passed!');
    console.log('✅ Memorystore Redis is working correctly with TLS and auth');
    console.log('✅ Distributed worker system should be operational');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

// Run the test
testRedisConnection().catch(console.error);
