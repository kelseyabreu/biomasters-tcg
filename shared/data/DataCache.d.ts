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
    maxSize?: number;
    ttl?: number;
    enablePersistence?: boolean;
    persistenceKey?: string;
    enableMetrics?: boolean;
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
export declare class DataCache {
    private config;
    private cache;
    private metrics;
    constructor(config?: CacheConfig);
    /**
     * Get data from cache
     */
    get<T>(key: string): T | null;
    /**
     * Set data in cache
     */
    set<T>(key: string, data: T, customTtl?: number): void;
    /**
     * Check if key exists in cache (without updating access metadata)
     */
    has(key: string): boolean;
    /**
     * Delete specific entry
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Get cache metrics
     */
    getMetrics(): CacheMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Get all cache keys
     */
    keys(): string[];
    /**
     * Get cache entries sorted by access frequency
     */
    getEntriesByFrequency(): Array<{
        key: string;
        accessCount: number;
        lastAccessed: number;
    }>;
    /**
     * Cleanup expired entries
     */
    cleanup(): void;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Update cache metrics
     */
    private updateMetrics;
    /**
     * Save cache to localStorage
     */
    private saveToPersistence;
    /**
     * Load cache from localStorage
     */
    private loadFromPersistence;
    /**
     * Clear persistence
     */
    private clearPersistence;
    /**
     * Get localStorage if available (browser environment only)
     */
    private getStorage;
}
/**
 * Specialized cache for card data
 */
export declare class CardDataCache extends DataCache {
    constructor(config?: CacheConfig);
    /**
     * Get card by CardId
     */
    getCard(cardId: CardId): CardData | null;
    /**
     * Set card data
     */
    setCard(cardId: CardId, card: CardData): void;
    /**
     * Get multiple cards
     */
    getCards(cardIds: CardId[]): (CardData | null)[];
    /**
     * Set multiple cards
     */
    setCards(cards: CardData[]): void;
}
/**
 * Specialized cache for ability data
 */
export declare class AbilityDataCache extends DataCache {
    constructor(config?: CacheConfig);
    /**
     * Get ability by AbilityId
     */
    getAbility(abilityId: AbilityId): AbilityData | null;
    /**
     * Set ability data
     */
    setAbility(abilityId: AbilityId, ability: AbilityData): void;
}
export declare const globalCache: DataCache;
export declare const cardCache: CardDataCache;
export declare const abilityCache: AbilityDataCache;
export {};
//# sourceMappingURL=DataCache.d.ts.map