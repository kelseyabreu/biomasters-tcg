import { Redis } from 'ioredis';

let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Redis configuration - Google Cloud Memorystore using IORedis
 */
function getRedisConfig() {
  console.log('🔴 [Redis] getRedisConfig called');
  console.log('🔴 [Redis] NODE_ENV:', process.env['NODE_ENV']);

  // Use Google Cloud Memorystore configuration
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

  // Special handling for test environment with tunnel
  if (process.env['NODE_ENV'] === 'test' && config.host === 'localhost') {
    console.log('🔴 [Redis] Test environment detected with localhost - adjusting settings for tunnel');
    config.connectTimeout = 10000;
    config.commandTimeout = 5000;
    config.maxRetriesPerRequest = 1;
    config.retryDelayOnFailover = 50;
  }

  // Google Cloud Memorystore with transit encryption requires TLS
  console.log('🔴 [Redis] TLS setting:', process.env['REDIS_TLS']);
  if (process.env['REDIS_TLS'] === 'true') {
    // Enable TLS for both development and production when REDIS_TLS=true
    config.tls = { rejectUnauthorized: false };
    console.log('🔴 [Redis] TLS enabled for secure connection');
  } else {
    console.log('🔴 [Redis] TLS disabled');
  }

  // For test environment with localhost tunnel, disable TLS if not explicitly set
  if (process.env['NODE_ENV'] === 'test' && config.host === 'localhost' && process.env['REDIS_TLS'] !== 'true') {
    delete config.tls;
    console.log('🔴 [Redis] Test environment with localhost - TLS disabled for tunnel');
  }

  console.log('🔴 [Redis] Config:', JSON.stringify({
    host: config.host,
    port: config.port,
    password: config.password ? 'SET' : 'NOT SET',
    tls: config.tls ? 'ENABLED' : 'DISABLED'
  }));

  return config;
}

/**
 * Initialize Redis connection with retry logic and detailed logging
 */
export async function initializeRedis(): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  console.log('🔴 [Redis] ===== STARTING REDIS INITIALIZATION =====');
  console.log('🔴 [Redis] Environment variables:');
  console.log('🔴 [Redis] - REDIS_HOST:', process.env['REDIS_HOST']);
  console.log('🔴 [Redis] - REDIS_PORT:', process.env['REDIS_PORT']);
  console.log('🔴 [Redis] - REDIS_PASSWORD:', process.env['REDIS_PASSWORD'] ? 'SET' : 'NOT SET');
  console.log('🔴 [Redis] - REDIS_TLS:', process.env['REDIS_TLS']);
  console.log('🔴 [Redis] - NODE_ENV:', process.env['NODE_ENV']);

  // Add more detailed environment logging
  console.log('🔴 [Redis] All Redis-related env vars:');
  Object.keys(process.env).filter(key => key.includes('REDIS')).forEach(key => {
    console.log(`🔴 [Redis] - ${key}:`, key.includes('PASSWORD') ? 'SET' : process.env[key]);
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔴 [Redis] ===== ATTEMPT ${attempt}/${maxRetries} =====`);

      const redisConfig = getRedisConfig();
      console.log('🔴 [Redis] Creating Redis client with config:', JSON.stringify(redisConfig, null, 2));

      redisClient = new Redis(redisConfig as any);

      // Set up error handlers before testing connection
      redisClient.on('error', (error) => {
        console.error('🔴 [Redis] Connection error event:', error);
        redisAvailable = false;
      });

      redisClient.on('connect', () => {
        console.log('🔴 [Redis] ✅ Connected event fired');
      });

      redisClient.on('ready', () => {
        console.log('🔴 [Redis] ✅ Ready event fired');
        redisAvailable = true;
      });

      redisClient.on('close', () => {
        console.log('🔴 [Redis] ❌ Connection closed event');
        redisAvailable = false;
      });

      redisClient.on('reconnecting', () => {
        console.log('🔴 [Redis] 🔄 Reconnecting event');
      });

      // Test the connection with timeout
      console.log('🔴 [Redis] Testing connection with PING...');
      const pingStart = Date.now();

      const pingPromise = redisClient.ping();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PING timeout after 10 seconds')), 10000)
      );

      const pingResult = await Promise.race([pingPromise, timeoutPromise]);
      const pingDuration = Date.now() - pingStart;

      console.log(`🔴 [Redis] PING result: ${pingResult} (took ${pingDuration}ms)`);

      if (pingResult === 'PONG') {
        redisAvailable = true;
        console.log('✅ [Redis] CONNECTION SUCCESSFUL!');
        console.log(`🔴 [Redis] Final status - redisAvailable: ${redisAvailable}`);
        console.log(`🔴 [Redis] Initialization completed at ${new Date().toISOString()}`);

        // Test a basic operation
        try {
          await redisClient.set('test-key', 'test-value', 'EX', 10);
          const testValue = await redisClient.get('test-key');
          console.log(`🔴 [Redis] Test operation successful: ${testValue}`);
        } catch (testError) {
          console.error('🔴 [Redis] Test operation failed:', testError);
        }

        return;
      } else {
        throw new Error(`Unexpected ping response: ${pingResult}`);
      }

    } catch (error) {
      console.error(`🔴 [Redis] ❌ ATTEMPT ${attempt}/${maxRetries} FAILED:`, error);
      console.error('🔴 [Redis] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (redisClient) {
        console.log('🔴 [Redis] Disconnecting failed client...');
        redisClient.disconnect();
        redisClient = null;
      }

      redisAvailable = false;

      if (attempt < maxRetries) {
        console.log(`🔴 [Redis] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error('❌ [Redis] ===== FAILED TO CONNECT AFTER ALL ATTEMPTS =====');
  console.warn('⚠️ [Redis] Redis-dependent features will use memory fallback');
  console.log(`🔴 [Redis] Final status - redisAvailable: ${redisAvailable}`);
  redisAvailable = false;
}

/**
 * Get Redis client (returns null if Redis is not available)
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is available by testing the actual connection
 */
export function isRedisAvailable(): boolean {
  console.log(`🔴 [Redis] isRedisAvailable() called - redisAvailable flag: ${redisAvailable}, redisClient: ${redisClient ? 'EXISTS' : 'NULL'}`);

  // If no client exists, definitely not available
  if (!redisClient) {
    console.log(`🔴 [Redis] No client exists, returning false`);
    return false;
  }

  // Test the actual connection status instead of relying on event-based flags
  // Redis client has a 'status' property that shows the actual connection state
  const status = redisClient.status;
  console.log(`🔴 [Redis] Client status: ${status}`);

  // Redis status can be: 'wait', 'connecting', 'connect', 'ready', 'close', 'reconnecting', 'end'
  const isConnected = status === 'ready' || status === 'connect';
  console.log(`🔴 [Redis] isRedisAvailable() result: ${isConnected} (based on status: ${status})`);

  return isConnected;
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

  static exists(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  static clear(): void {
    this.cache.clear();
  }
}

/**
 * Cache utilities with Redis and memory fallback
 */
export class CacheManager {
  private static getClient() {
    return getRedisClient();
  }

  /**
   * Set a value in cache with optional expiration
   */
  static async set(key: string, value: any, expirationSeconds?: number): Promise<void> {
    const client = this.getClient();

    if (!client || !isRedisAvailable()) {
      // Use memory cache fallback
      MemoryCache.set(key, value, expirationSeconds);
      return;
    }

    try {
      if (expirationSeconds) {
        await client.setex(key, expirationSeconds, value);
      } else {
        await client.set(key, value);
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

    if (!client || !isRedisAvailable()) {
      // Use memory cache fallback
      return MemoryCache.get<T>(key);
    }

    try {
      const value = await client.get(key);
      return value as T;
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

    if (!client || !isRedisAvailable()) {
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
      if (!redisClient || !redisAvailable) {
        return false;
      }
      const result = await redisClient.exists(key);
      return result > 0;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!redisClient || !redisAvailable) {
        return false;
      }
      const result = await redisClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get time to live for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return -1;
      }
      return await redisClient.ttl(key);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return -1;
      }
      throw error;
    }
  }

  /**
   * Increment a numeric value
   */
  static async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      return await redisClient.incrby(key, amount);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Decrement a numeric value
   */
  static async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      return await redisClient.decrby(key, amount);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   */
  static async getMultiple<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    try {
      if (!redisClient || !redisAvailable) {
        return keys.map(() => null);
      }
      const values = await redisClient.mget(...keys);
      return values.map((value: any) => {
        if (!value) return null;
        return value as T;
      });
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return keys.map(() => null);
      }
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  static async setMultiple(keyValuePairs: Record<string, any>): Promise<void> {
    try {
      if (!redisClient || !redisAvailable) {
        return;
      }
      await redisClient.mset(keyValuePairs);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return;
      }
      throw error;
    }
  }

  /**
   * Delete multiple keys
   */
  static async deleteMultiple(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      // Upstash del method takes individual keys, not an array
      let deletedCount = 0;
      for (const key of keys) {
        const result = await redisClient.del(key);
        deletedCount += result;
      }
      return deletedCount;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  static async getKeys(pattern: string): Promise<string[]> {
    if (!redisClient || !redisAvailable) {
      return [];
    }
    return await redisClient.keys(pattern);
  }

  /**
   * Clear all keys matching a pattern
   */
  static async clearPattern(pattern: string): Promise<number> {
    const keys = await this.getKeys(pattern);
    if (keys.length === 0) return 0;
    return await this.deleteMultiple(keys);
  }

  /**
   * Add item to a set
   */
  static async addToSet(key: string, ...members: string[]): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      if (members.length === 1 && members[0] !== undefined) {
        return await redisClient.sadd(key, members[0]);
      } else if (members.length > 1 && members[0] !== undefined) {
        const validMembers = members.filter(m => m !== undefined) as string[];
        return await redisClient.sadd(key, ...validMembers);
      } else {
        return 0;
      }
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Remove item from a set
   */
  static async removeFromSet(key: string, ...members: string[]): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      return await redisClient.srem(key, ...members);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Check if item is in set
   */
  static async isInSet(key: string, member: string): Promise<boolean> {
    try {
      if (!redisClient || !redisAvailable) {
        return false;
      }
      const result = await redisClient.sismember(key, member);
      return result === 1;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all members of a set
   */
  static async getSetMembers(key: string): Promise<string[]> {
    try {
      if (!redisClient || !redisAvailable) {
        return [];
      }
      return await redisClient.smembers(key);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get set size
   */
  static async getSetSize(key: string): Promise<number> {
    try {
      if (!redisClient || !redisAvailable) {
        return 0;
      }
      return await redisClient.scard(key);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return 0;
      }
      throw error;
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
    await CacheManager.set(key, data, expirationSeconds || this.DEFAULT_EXPIRATION);
  }

  /**
   * Get session data
   */
  static async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = this.SESSION_PREFIX + sessionId;
    return await CacheManager.get<T>(key);
  }

  /**
   * Update session data
   */
  static async updateSession(sessionId: string, data: any): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;
    const ttl = await CacheManager.ttl(key);
    await CacheManager.set(key, data, ttl > 0 ? ttl : this.DEFAULT_EXPIRATION);
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = this.SESSION_PREFIX + sessionId;
    return await CacheManager.delete(key);
  }

  /**
   * Extend session expiration
   */
  static async extendSession(sessionId: string, expirationSeconds?: number): Promise<boolean> {
    const key = this.SESSION_PREFIX + sessionId;
    return await CacheManager.expire(key, expirationSeconds || this.DEFAULT_EXPIRATION);
  }
}

/**
 * Check if Redis connection is healthy
 */
export async function checkRedisHealth(): Promise<boolean> {
  console.log('🔴 [Redis] checkRedisHealth() called');
  console.log(`🔴 [Redis] redisClient exists: ${redisClient ? 'YES' : 'NO'}`);
  console.log(`🔴 [Redis] redisAvailable: ${redisAvailable}`);

  try {
    if (!redisClient) {
      console.log('🔴 [Redis] Health check failed - no client');
      return false;
    }

    console.log('🔴 [Redis] Sending PING for health check...');
    const result = await redisClient.ping();
    console.log(`🔴 [Redis] Health check PING result: ${result}`);

    const healthy = result === 'PONG';
    console.log(`🔴 [Redis] Health check result: ${healthy}`);
    return healthy;
  } catch (error) {
    console.error('❌ [Redis] Health check failed with error:', error);
    return false;
  }
}



/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    console.log('🔴 [Redis] Closing connection...');
    redisClient.disconnect();
    redisClient = null;
    redisAvailable = false;
  }
}

export { redisClient };
