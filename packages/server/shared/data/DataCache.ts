/**
 * Centralized Data Cache - Shared Module
 * High-performance caching system for game data with memory management and persistence
 */

import { CardData, AbilityData } from '../types';
import { CardId, AbilityId } from '../enums';

/**
 * Cache configuration options
 */
interface CacheConfig {
  maxSize?: number; // Maximum number of entries
  ttl?: number; // Time to live in milliseconds
  enablePersistence?: boolean; // Enable localStorage persistence
  persistenceKey?: string; // Key for localStorage
  enableMetrics?: boolean; // Enable cache hit/miss metrics
}

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache metrics
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * High-performance data cache with LRU eviction and persistence
 */
export class DataCache {
  private config: Required<CacheConfig>;
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      ttl: config.ttl ?? 30 * 60 * 1000, // 30 minutes
      enablePersistence: config.enablePersistence ?? false,
      persistenceKey: config.persistenceKey ?? 'biomasters-data-cache',
      enableMetrics: config.enableMetrics ?? true
    };

    // Load from persistence if enabled
    if (this.config.enablePersistence) {
      this.loadFromPersistence();
    }

    // Set up periodic cleanup only if not in test environment
    if (process.env['NODE_ENV'] !== 'test') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    this.updateMetrics('request');

    const entry = this.cache.get(key);
    if (!entry) {
      this.updateMetrics('miss');
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateMetrics('miss');
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.updateMetrics('hit');
    return entry.data;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl ?? this.config.ttl;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.saveToPersistence();
    }
  }

  /**
   * Check if key exists in cache (without updating access metadata)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific entry
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    
    if (result && this.config.enablePersistence) {
      this.saveToPersistence();
    }

    return result;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetMetrics();
    
    if (this.config.enablePersistence) {
      this.clearPersistence();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries sorted by access frequency
   */
  getEntriesByFrequency(): Array<{ key: string; accessCount: number; lastAccessed: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed
      }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0 && this.config.enablePersistence) {
      this.saveToPersistence();
    }
  }

  /**
   * Destroy the cache and clear all intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined as any;
    }
    this.cache.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.updateMetrics('eviction');
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(type: 'hit' | 'miss' | 'request' | 'eviction'): void {
    if (!this.config.enableMetrics) return;

    switch (type) {
      case 'hit':
        this.metrics.hits++;
        break;
      case 'miss':
        this.metrics.misses++;
        break;
      case 'request':
        this.metrics.totalRequests++;
        break;
      case 'eviction':
        this.metrics.evictions++;
        break;
    }

    // Update hit rate
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToPersistence(): void {
    try {
      // Check if localStorage is available (browser environment)
      const storage = this.getStorage();
      if (!storage) return;

      const serializable = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        {
          ...entry,
          // Only persist if not expired
          ...(Date.now() <= entry.expiresAt ? {} : { skip: true })
        }
      ]).filter(([, entry]: any) => !entry.skip);

      storage.setItem(this.config.persistenceKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromPersistence(): void {
    try {
      // Check if localStorage is available (browser environment)
      const storage = this.getStorage();
      if (!storage) return;

      const stored = storage.getItem(this.config.persistenceKey);
      if (!stored) return;

      const entries = JSON.parse(stored);
      const now = Date.now();

      for (const [key, entry] of entries) {
        // Only load non-expired entries
        if (now <= entry.expiresAt) {
          this.cache.set(key, entry);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
      this.clearPersistence();
    }
  }

  /**
   * Clear persistence
   */
  private clearPersistence(): void {
    try {
      // Check if localStorage is available (browser environment)
      const storage = this.getStorage();
      if (!storage) return;

      storage.removeItem(this.config.persistenceKey);
    } catch (error) {
      console.warn('Failed to clear cache persistence:', error);
    }
  }

  /**
   * Get localStorage if available (browser environment only)
   */
  private getStorage(): any | null {
    try {
      // Check if we're in a browser environment
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        return (globalThis as any).localStorage;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Specialized cache for card data
 */
export class CardDataCache extends DataCache {
  constructor(config: CacheConfig = {}) {
    super({
      ...config,
      persistenceKey: config.persistenceKey ?? 'biomasters-card-cache'
    });
  }

  /**
   * Get card by CardId
   */
  getCard(cardId: CardId): CardData | null {
    return this.get<CardData>(`card-${cardId}`);
  }

  /**
   * Set card data
   */
  setCard(cardId: CardId, card: CardData): void {
    this.set(`card-${cardId}`, card);
  }

  /**
   * Get multiple cards
   */
  getCards(cardIds: CardId[]): (CardData | null)[] {
    return cardIds.map(id => this.getCard(id));
  }

  /**
   * Set multiple cards
   */
  setCards(cards: CardData[]): void {
    cards.forEach(card => this.setCard(card.cardId, card));
  }
}

/**
 * Specialized cache for ability data
 */
export class AbilityDataCache extends DataCache {
  constructor(config: CacheConfig = {}) {
    super({
      ...config,
      persistenceKey: config.persistenceKey ?? 'biomasters-ability-cache'
    });
  }

  /**
   * Get ability by AbilityId
   */
  getAbility(abilityId: AbilityId): AbilityData | null {
    return this.get<AbilityData>(`ability-${abilityId}`);
  }

  /**
   * Set ability data
   */
  setAbility(abilityId: AbilityId, ability: AbilityData): void {
    this.set(`ability-${abilityId}`, ability);
  }
}

// Export singleton instances
export const globalCache = new DataCache();
export const cardCache = new CardDataCache();
export const abilityCache = new AbilityDataCache();
