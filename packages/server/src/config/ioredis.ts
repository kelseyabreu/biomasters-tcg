import { Redis } from 'ioredis';

let ioredisClient: Redis | null = null;
let ioredisAvailable = false;
let ioredisInitialized = false;

/**
 * IORedis configuration for game worker system
 * This provides the advanced Redis operations needed for distributed locking
 */
function getIORedisConfig() {
  console.log('🔴 [IORedis] getIORedisConfig called');
  console.log('🔴 [IORedis] NODE_ENV:', process.env['NODE_ENV']);
  console.log('🔴 [IORedis] REDIS_URL:', process.env['REDIS_URL'] ? 'SET' : 'NOT SET');

  // Use the exact same configuration as our working test script
  const config: any = {
    host: process.env['REDIS_HOST'] || '10.36.239.107',
    port: parseInt(process.env['REDIS_PORT'] || '6378'),
    password: process.env['REDIS_PASSWORD'] || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',

    // Memorystore-optimized settings (increased timeouts for Cloud Run)
    connectTimeout: 30000,
    commandTimeout: 15000,
    maxRetriesPerRequest: 5,
    lazyConnect: true,
    keepAlive: 30000,

    // Connection pool settings
    family: 4, // Force IPv4
    db: 0,
  };

  // Enable TLS if transit encryption is enabled (Google Cloud Memorystore)
  if (process.env['REDIS_TLS'] === 'true') {
    config.tls = { rejectUnauthorized: false };
  }

  console.log('🔴 [IORedis] Final config object:', JSON.stringify(config, null, 2));

  // For production with Redis URL, parse it (but only if we don't have explicit Redis config)
  const redisUrl = process.env['REDIS_URL'];
  const hasExplicitRedisConfig = process.env['REDIS_HOST'] && process.env['REDIS_PORT'];
  if (redisUrl && process.env['NODE_ENV'] === 'production' && !hasExplicitRedisConfig) {
    console.log('🔴 [IORedis] Returning REDIS_URL instead of config object');
    return redisUrl;
  }

  console.log('🔴 [IORedis] Returning config object');
  return config;
}

/**
 * Initialize IORedis connection for game worker system
 */
export async function initializeIORedis(): Promise<void> {
  // Prevent multiple initializations
  if (ioredisInitialized && ioredisClient && ioredisAvailable) {
    console.log('🔴 [IORedis] Already initialized and available, skipping...');
    return;
  }

  if (ioredisClient) {
    console.log('🔴 [IORedis] Client already exists, skipping initialization...');
    return;
  }

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  console.log('🔴 [IORedis] Starting IORedis initialization for game workers...');
  console.log('🔴 [IORedis] Environment variables check:');
  console.log('🔴 [IORedis] REDIS_URL:', process.env['REDIS_URL'] ? 'SET' : 'NOT SET');
  console.log('🔴 [IORedis] REDIS_HOST:', process.env['REDIS_HOST'] || 'localhost');
  console.log('🔴 [IORedis] REDIS_PORT:', process.env['REDIS_PORT'] || '6379');
  console.log('🔴 [IORedis] REDIS_PASSWORD:', process.env['REDIS_PASSWORD'] ? 'SET' : 'NOT SET');
  console.log('🔴 [IORedis] REDIS_TLS:', process.env['REDIS_TLS'] || 'false');
  console.log('🔴 [IORedis] NODE_ENV:', process.env['NODE_ENV']);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const redisConfig = getIORedisConfig();
      console.log(`🔴 [IORedis] Attempt ${attempt}/${maxRetries} - Connecting to Redis...`);
      console.log('🔴 [IORedis] Environment variables:', {
        REDIS_HOST: process.env['REDIS_HOST'],
        REDIS_PORT: process.env['REDIS_PORT'],
        REDIS_PASSWORD: process.env['REDIS_PASSWORD'] ? 'SET' : 'NOT SET',
        REDIS_TLS: process.env['REDIS_TLS']
      });
      console.log('🔴 [IORedis] Config:', JSON.stringify({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password ? 'SET' : 'NOT SET',
        passwordValue: redisConfig.password,
        tls: redisConfig.tls ? 'ENABLED' : 'DISABLED',
        tlsValue: redisConfig.tls,
        connectTimeout: redisConfig.connectTimeout,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest
      }));

      ioredisClient = new Redis(redisConfig as any);

      // Set up error handlers before testing connection
      ioredisClient.on('error', (error) => {
        console.error('🔴 [IORedis] Connection error:', error);
        // Don't immediately disable - let the health check handle it
        console.log('🔴 [IORedis] Error occurred, but keeping client available for retry');
      });

      ioredisClient.on('connect', () => {
        console.log('🔴 [IORedis] Connected event');
      });

      ioredisClient.on('ready', () => {
        console.log('🔴 [IORedis] Ready event - connection is ready');
        // Set available when ready
        ioredisAvailable = true;
      });

      ioredisClient.on('close', () => {
        console.log('🔴 [IORedis] Connection closed event');
        // Don't immediately disable - Redis will auto-reconnect
        console.log('🔴 [IORedis] Connection closed, but keeping client for auto-reconnect');
      });

      ioredisClient.on('end', () => {
        console.log('🔴 [IORedis] Connection ended event');
        console.log('🔴 [IORedis] ⚠️ WARNING: END event fired - this will set client to NULL');
        console.log('🔴 [IORedis] Stack trace:', new Error().stack);
        // Only disable if this is a permanent disconnection
        console.log('🔴 [IORedis] Connection ended permanently');
        ioredisAvailable = false;
        ioredisClient = null;
        console.log('🔴 [IORedis] ❌ Client set to NULL due to END event');
      });

      // Wait for connection to be fully ready
      console.log('🔴 [IORedis] Waiting for connection to be fully ready...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      // Test the connection
      console.log('🔴 [IORedis] Testing connection with PING...');
      console.log('🔴 [IORedis] Client state before ping - exists:', !!ioredisClient, 'status:', ioredisClient?.status);

      try {
        const pingResult = await ioredisClient.ping();
        console.log('🔴 [IORedis] PING successful, result:', pingResult);

        if (pingResult === 'PONG') {
          ioredisAvailable = true;
          ioredisInitialized = true;
          console.log('✅ [IORedis] Connected successfully');
          console.log('🔴 [IORedis] Client set and initialized');
          console.log('🔴 [IORedis] Final state - Client:', !!ioredisClient, 'Available:', ioredisAvailable, 'Initialized:', ioredisInitialized);
          console.log(`🔴 [IORedis] Initialization completed at ${new Date().toISOString()}`);
          return;
        } else {
          throw new Error(`Unexpected ping response: ${pingResult}`);
        }
      } catch (pingError) {
        console.error('🔴 [IORedis] PING command failed:', pingError);
        throw pingError;
      }

    } catch (error) {
      console.error(`🔴 [IORedis] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (ioredisClient) {
        ioredisClient.disconnect();
        ioredisClient = null;
      }

      if (attempt < maxRetries) {
        console.log(`🔴 [IORedis] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.warn('⚠️ [IORedis] Failed to connect after all attempts');
  console.warn('⚠️ [IORedis] Game worker system will be disabled');
  ioredisAvailable = false;
}

/**
 * Get IORedis client (returns null if Redis is not available)
 */
export function getIORedisClient(): Redis | null {
  const timestamp = new Date().toISOString();
  console.log(`🔴 [IORedis] getIORedisClient() called at ${timestamp}`);
  console.log('🔴 [IORedis] Client exists:', !!ioredisClient);
  console.log('🔴 [IORedis] Available flag:', ioredisAvailable);
  console.log('🔴 [IORedis] Initialized flag:', ioredisInitialized);

  if (!ioredisClient) {
    console.log('🔴 [IORedis] ❌ Client is NULL - investigating...');
    console.log('🔴 [IORedis] Stack trace of caller:', new Error().stack);
  }

  return ioredisClient;
}

/**
 * Check if IORedis is available
 */
export function isIORedisAvailable(): boolean {
  // More robust check - if client exists and is in a good state, consider it available
  if (!ioredisClient) {
    console.log('🔴 [IORedis] isIORedisAvailable() - No client exists');
    return false;
  }

  // Check client status
  const status = ioredisClient.status;
  console.log('🔴 [IORedis] isIORedisAvailable() - Client status:', status);
  console.log('🔴 [IORedis] isIORedisAvailable() - Available flag:', ioredisAvailable);
  console.log('🔴 [IORedis] isIORedisAvailable() - Initialized flag:', ioredisInitialized);

  // Consider available if client exists and is in ready or connecting state
  const isClientReady = status === 'ready' || status === 'connecting' || status === 'connect';
  const result = isClientReady && ioredisInitialized;

  console.log('🔴 [IORedis] isIORedisAvailable() - Final result:', result);
  return result;
}

/**
 * Check if IORedis connection is healthy
 */
export async function checkIORedisHealth(): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔴 [IORedis] Health check called at ${timestamp}`);
    console.log('🔴 [IORedis] Client exists:', !!ioredisClient);
    console.log('🔴 [IORedis] Initialized:', ioredisInitialized);
    console.log('🔴 [IORedis] Available:', ioredisAvailable);

    if (!ioredisClient) {
      console.log('🔴 [IORedis] Health check failed: no client');
      return false;
    }

    if (!ioredisInitialized) {
      console.log('🔴 [IORedis] Health check failed: not initialized');
      return false;
    }

    console.log('🔴 [IORedis] Sending PING command...');
    const result = await ioredisClient.ping();
    console.log('🔴 [IORedis] PING result:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('🔴 [IORedis] Health check failed:', error);
    return false;
  }
}

/**
 * Close IORedis connection
 */
export async function closeIORedis(): Promise<void> {
  if (ioredisClient) {
    console.log('🔴 [IORedis] Closing connection...');
    ioredisClient.disconnect();
    ioredisClient = null;
    ioredisAvailable = false;
  }
}

// Export the client for direct access
export { ioredisClient };
