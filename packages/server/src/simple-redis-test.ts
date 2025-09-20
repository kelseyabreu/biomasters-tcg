import { checkIORedisHealth } from './config/ioredis';

async function testRedis() {
  console.log('🔴 Testing IORedis connection to Memorystore...');
  
  try {
    const result = await checkIORedisHealth();
    console.log('✅ IORedis health check result:', result);
    
    if (result) {
      console.log('🎉 SUCCESS: IORedis connected to Memorystore successfully!');
      console.log('🎯 Distributed worker system is now operational!');
      process.exit(0);
    } else {
      console.log('❌ FAILED: IORedis health check failed');
      console.log('Redis connection is not working');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FAILED: IORedis test threw an error:', error);
    process.exit(1);
  }
}

testRedis();
