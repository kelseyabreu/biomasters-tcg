#!/usr/bin/env tsx

import Redis from 'ioredis';

async function testMemorystoreConnection() {
  console.log('🔴 Testing Memorystore Redis connection...');
  
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

  console.log('🔴 Config:', {
    host: config.host,
    port: config.port,
    password: config.password ? 'SET' : 'NOT SET',
    tls: !!config.tls,
  });

  const redis = new Redis(config);

  try {
    console.log('🔴 Attempting to connect...');
    await redis.connect();
    
    console.log('🔴 Testing PING...');
    const pong = await redis.ping();
    console.log('✅ PING result:', pong);
    
    console.log('🔴 Testing SET/GET...');
    await redis.set('test:connection', 'success');
    const value = await redis.get('test:connection');
    console.log('✅ SET/GET result:', value);
    
    console.log('🔴 Testing worker lease operations...');
    const leaseKey = 'worker:lease:test-game-123';
    const workerId = 'test-worker-456';
    
    // Test atomic lease acquisition
    const acquired = await redis.set(leaseKey, workerId, 'PX', 60000, 'NX');
    console.log('✅ Lease acquisition result:', acquired);
    
    // Test lease check
    const currentOwner = await redis.get(leaseKey);
    console.log('✅ Current lease owner:', currentOwner);
    
    // Test lease renewal
    if (currentOwner === workerId) {
      await redis.pexpire(leaseKey, 60000);
      console.log('✅ Lease renewed successfully');
    }
    
    // Clean up
    await redis.del(leaseKey);
    await redis.del('test:connection');
    
    console.log('✅ All tests passed! Memorystore Redis is working correctly.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// Run the test
testMemorystoreConnection().catch(console.error);
