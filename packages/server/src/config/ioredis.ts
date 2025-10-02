import { Redis } from 'ioredis';

let ioredisClient: Redis | null = null;
let ioredisAvailable = false;
let ioredisInitialized = false;

/**
 * Unified Redis configuration using IORedis
 * This provides all Redis operations: caching, rate limiting, distributed locking, matchmaking, etc.
 */
function getRedisConfig() {
  console.log('🔴 [Redis] getRedisConfig called');
  console.log('🔴 [Redis] NODE_ENV:', process.env['NODE_ENV']);
  console.log('🔴 [Redis] REDIS_URL:', process.env['REDIS_URL'] ? 'SET' : 'NOT SET');

  // Use the exact same configuration as our working test script
  const config: any = {
    host: process.env['REDIS_HOST'] || '10.36.239.107',
    port: parseInt(process.env['REDIS_PORT'] || '6378'),
    password: process.env['REDIS_PASSWORD'] || '657fc2af-f410-4b45-9b8a-2a54fe7e60d5',

    // Memorystore-optimized settings for Cloud Run
    connectTimeout: 30000,
    commandTimeout: 15000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    retryDelayOnFailover: 100,

    // Connection pool settings
    family: 4, // Force IPv4
    db: 0,
  };

  // Google Cloud Memorystore with transit encryption requires TLS
  console.log('🔴 [IORedis] TLS setting:', process.env['REDIS_TLS']);
  if (process.env['REDIS_TLS'] === 'true') {
    // Enable TLS for both development and production when REDIS_TLS=true
    config.tls = { rejectUnauthorized: false };
    console.log('🔴 [IORedis] TLS enabled for secure connection');
  } else {
    console.log('🔴 [IORedis] TLS disabled');
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
      const redisConfig = getRedisConfig();
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

/**
 * In-memory cache fallback for when Redis is unavailable
 */
class MemoryCache {
  private static cache = new Map<string, { value: any; expires?: number }>();

  static set(key: string, value: any, expirationSeconds?: number): void {
    const expires = expirationSeconds ? Date.now() + (expirationSeconds * 1000) : undefined;
    if (expires) {
      this.cache.set(key, { value, expires });
    } else {
      this.cache.set(key, { value });
    }
  }

  static get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static size(): number {
    return this.cache.size;
  }
}

/**
 * Cache utilities with Redis and memory fallback
 */
export class CacheManager {
  private static getClient() {
    return getIORedisClient();
  }

  /**
   * Set a value in cache with optional expiration
   */
  static async set(key: string, value: any, expirationSeconds?: number): Promise<void> {
    const client = this.getClient();

    if (!client || !isIORedisAvailable()) {
      // Use memory cache fallback
      MemoryCache.set(key, value, expirationSeconds);
      return;
    }

    try {
      // Serialize value to JSON string for Redis storage
      const serializedValue = JSON.stringify(value);
      if (expirationSeconds) {
        await client.setex(key, expirationSeconds, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
    } catch (error) {
      console.warn('Redis cache set failed, using memory fallback:', error);
      MemoryCache.set(key, value, expirationSeconds);
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const client = this.getClient();

    if (!client || !isIORedisAvailable()) {
      // Use memory cache fallback
      return MemoryCache.get<T>(key);
    }

    try {
      const value = await client.get(key);
      if (value === null) return null;

      // Parse JSON string back to object
      try {
        return JSON.parse(value) as T;
      } catch (parseError) {
        console.warn('Failed to parse cached value, returning null:', parseError);
        return null;
      }
    } catch (error) {
      console.warn('Redis cache get failed, using memory fallback:', error);
      return MemoryCache.get<T>(key);
    }
  }

  /**
   * Delete a key from cache
   */
  static async delete(key: string): Promise<boolean> {
    const client = this.getClient();

    if (!client || !isIORedisAvailable()) {
      // Use memory cache fallback
      return MemoryCache.delete(key);
    }

    try {
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.warn('Redis cache delete failed, using memory fallback:', error);
      return MemoryCache.delete(key);
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client || !isIORedisAvailable()) {
        return false;
      }
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  static async mset(keyValuePairs: Record<string, any>): Promise<void> {
    const client = this.getClient();

    if (!client || !isIORedisAvailable()) {
      // Use memory cache fallback
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        MemoryCache.set(key, value);
      });
      return;
    }

    try {
      const pairs: string[] = [];
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pairs.push(key, value);
      });
      await client.mset(...pairs);
    } catch (error) {
      console.warn('Redis mset failed, using memory fallback:', error);
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        MemoryCache.set(key, value);
      });
    }
  }

  /**
   * Get multiple values by keys
   */
  static async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const client = this.getClient();

    if (!client || !isIORedisAvailable()) {
      // Use memory cache fallback
      return keys.map(key => MemoryCache.get<T>(key));
    }

    try {
      const values = await client.mget(...keys);
      return values as (T | null)[];
    } catch (error) {
      console.warn('Redis mget failed, using memory fallback:', error);
      return keys.map(key => MemoryCache.get<T>(key));
    }
  }
}

/**
 * Session management utilities
 */
export class SessionManager {
  private static SESSION_PREFIX = 'session:';
  private static DEFAULT_EXPIRATION = 7 * 24 * 60 * 60; // 7 days

  /**
   * Create a new session
   */
  static async createSession(sessionId: string, data: any, expirationSeconds?: number): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;
    const expiration = expirationSeconds || this.DEFAULT_EXPIRATION;
    await CacheManager.set(key, JSON.stringify(data), expiration);
  }

  /**
   * Get session data
   */
  static async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await CacheManager.get<string>(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Failed to parse session data:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  static async updateSession(sessionId: string, data: any, expirationSeconds?: number): Promise<void> {
    await this.createSession(sessionId, data, expirationSeconds);
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = this.SESSION_PREFIX + sessionId;
    return await CacheManager.delete(key);
  }

  /**
   * Check if session exists
   */
  static async sessionExists(sessionId: string): Promise<boolean> {
    const key = this.SESSION_PREFIX + sessionId;
    return await CacheManager.exists(key);
  }
}

// Export the client for direct access
export { ioredisClient };

// Export aliases for backward compatibility
export const getRedisClient = getIORedisClient;
export const isRedisAvailable = isIORedisAvailable;
export const checkRedisHealth = checkIORedisHealth;
export const closeRedis = closeIORedis;
export const initializeRedis = initializeIORedis;
