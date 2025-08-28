import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

/**
 * Redis configuration - lazy loaded to ensure environment variables are available
 */
function getRedisConfig() {
  return {
    url: process.env['REDIS_URL'] || `redis://${process.env['REDIS_HOST'] || 'localhost'}:${process.env['REDIS_PORT'] || 6379}`,
    ...(process.env['REDIS_PASSWORD'] && { password: process.env['REDIS_PASSWORD'] }),
    database: parseInt(process.env['REDIS_DB'] || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Add TLS support for Upstash
    socket: {
      tls: process.env['REDIS_HOST']?.includes('upstash.io') ? true : false,
      rejectUnauthorized: false
    }
  };
}

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  try {
    const redisConfig = getRedisConfig();

    // Debug: Log the configuration being used
    console.log('🔍 Redis config:', {
      url: redisConfig.url,
      password: redisConfig.password ? '***' : 'none',
      database: redisConfig.database,
      socket: redisConfig.socket
    });

    // Create Redis client
    redisClient = createClient(redisConfig);

    // Set up error handling
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔴 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected and ready');
    });

    redisClient.on('end', () => {
      console.log('🔴 Redis connection ended');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test the connection
    await redisClient.ping();
    console.log('✅ Redis connection test successful');

  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Cache utilities
 */
export class CacheManager {
  private static client = () => getRedisClient();

  /**
   * Set a value in cache with optional expiration
   */
  static async set(key: string, value: any, expirationSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    
    if (expirationSeconds) {
      await this.client().setEx(key, expirationSeconds, serializedValue);
    } else {
      await this.client().set(key, serializedValue);
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client().get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Failed to parse cached value:', error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  static async delete(key: string): Promise<boolean> {
    const result = await this.client().del(key);
    return result > 0;
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    const result = await this.client().exists(key);
    return result > 0;
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client().expire(key, seconds);
    return result;
  }

  /**
   * Get time to live for a key
   */
  static async ttl(key: string): Promise<number> {
    return await this.client().ttl(key);
  }

  /**
   * Increment a numeric value
   */
  static async increment(key: string, amount: number = 1): Promise<number> {
    return await this.client().incrBy(key, amount);
  }

  /**
   * Decrement a numeric value
   */
  static async decrement(key: string, amount: number = 1): Promise<number> {
    return await this.client().decrBy(key, amount);
  }

  /**
   * Get multiple keys at once
   */
  static async getMultiple<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    
    const values = await this.client().mGet(keys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('❌ Failed to parse cached value:', error);
        return null;
      }
    });
  }

  /**
   * Set multiple key-value pairs
   */
  static async setMultiple(keyValuePairs: Record<string, any>): Promise<void> {
    const serializedPairs: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      serializedPairs[key] = JSON.stringify(value);
    }
    
    await this.client().mSet(serializedPairs);
  }

  /**
   * Delete multiple keys
   */
  static async deleteMultiple(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client().del(keys);
  }

  /**
   * Get all keys matching a pattern
   */
  static async getKeys(pattern: string): Promise<string[]> {
    return await this.client().keys(pattern);
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
    return await this.client().sAdd(key, members);
  }

  /**
   * Remove item from a set
   */
  static async removeFromSet(key: string, ...members: string[]): Promise<number> {
    return await this.client().sRem(key, members);
  }

  /**
   * Check if item is in set
   */
  static async isInSet(key: string, member: string): Promise<boolean> {
    return await this.client().sIsMember(key, member);
  }

  /**
   * Get all members of a set
   */
  static async getSetMembers(key: string): Promise<string[]> {
    return await this.client().sMembers(key);
  }

  /**
   * Get set size
   */
  static async getSetSize(key: string): Promise<number> {
    return await this.client().sCard(key);
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
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  }
}

export { redisClient };
