import { Redis } from '@upstash/redis';

let redisClient: Redis;

/**
 * Redis configuration - Upstash Redis REST API
 */
function getRedisConfig() {
  // Check if we have Upstash credentials
  const upstashUrl = process.env['UPSTASH_REDIS_REST_URL'];
  const upstashToken = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (upstashUrl && upstashToken) {
    return {
      url: upstashUrl,
      token: upstashToken,
    };
  }

  // Fallback to standard Redis URL for local development
  return {
    url: process.env['REDIS_URL'] || `redis://${process.env['REDIS_HOST'] || 'localhost'}:${process.env['REDIS_PORT'] || 6379}`,
    token: process.env['REDIS_PASSWORD'] || undefined,
  };
}

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  try {
    const redisConfig = getRedisConfig();

    // Create Upstash Redis client
    redisClient = new Redis(redisConfig);

    // Test the connection
    await redisClient.ping();

  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    // Don't throw error in test environment - make Redis optional
    if (process.env['NODE_ENV'] !== 'test') {
      throw error;
    }
  }
}

/**
 * Get Redis client
 */
export function getRedisClient(): Redis {
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
    try {
      if (expirationSeconds) {
        await this.client().setex(key, expirationSeconds, value);
      } else {
        await this.client().set(key, value);
      }
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return;
      }
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client().get(key);
      return value as T;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return null;
      }
      console.error('❌ Failed to get cached value:', error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client().del(key);
      return result > 0;
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client().exists(key);
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
      const result = await this.client().expire(key, seconds);
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
      return await this.client().ttl(key);
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
      return await this.client().incrby(key, amount);
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
      return await this.client().decrby(key, amount);
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
      const values = await this.client().mget(...keys);
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
      await this.client().mset(keyValuePairs);
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
      // Upstash del method takes individual keys, not an array
      let deletedCount = 0;
      for (const key of keys) {
        const result = await this.client().del(key);
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
    try {
      if (members.length === 1) {
        return await this.client().sadd(key, members[0]);
      } else {
        return await this.client().sadd(key, members[0], ...members.slice(1));
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
      return await this.client().srem(key, ...members);
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
      const result = await this.client().sismember(key, member);
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
      return await this.client().smembers(key);
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
      return await this.client().scard(key);
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
  try {
    if (!redisClient) return false;
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  // Upstash Redis doesn't need explicit connection closing
}

export { redisClient };
