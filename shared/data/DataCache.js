"use strict";
/**
 * Centralized Data Cache - Shared Module
 * High-performance caching system for game data with memory management and persistence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.abilityCache = exports.cardCache = exports.globalCache = exports.AbilityDataCache = exports.CardDataCache = exports.DataCache = void 0;
/**
 * High-performance data cache with LRU eviction and persistence
 */
class DataCache {
    constructor(config = {}) {
        this.cache = new Map();
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalRequests: 0,
            hitRate: 0
        };
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
        // Set up periodic cleanup
        setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
    /**
     * Get data from cache
     */
    get(key) {
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
    set(key, data, customTtl) {
        const now = Date.now();
        const ttl = customTtl ?? this.config.ttl;
        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }
        const entry = {
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
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
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
    delete(key) {
        const result = this.cache.delete(key);
        if (result && this.config.enablePersistence) {
            this.saveToPersistence();
        }
        return result;
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.resetMetrics();
        if (this.config.enablePersistence) {
            this.clearPersistence();
        }
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Get cache metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
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
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Get cache entries sorted by access frequency
     */
    getEntriesByFrequency() {
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
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
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
     * Evict least recently used entry
     */
    evictLRU() {
        let oldestKey = null;
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
    updateMetrics(type) {
        if (!this.config.enableMetrics)
            return;
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
    saveToPersistence() {
        try {
            // Check if localStorage is available (browser environment)
            const storage = this.getStorage();
            if (!storage)
                return;
            const serializable = Array.from(this.cache.entries()).map(([key, entry]) => [
                key,
                {
                    ...entry,
                    // Only persist if not expired
                    ...(Date.now() <= entry.expiresAt ? {} : { skip: true })
                }
            ]).filter(([, entry]) => !entry.skip);
            storage.setItem(this.config.persistenceKey, JSON.stringify(serializable));
        }
        catch (error) {
            console.warn('Failed to persist cache:', error);
        }
    }
    /**
     * Load cache from localStorage
     */
    loadFromPersistence() {
        try {
            // Check if localStorage is available (browser environment)
            const storage = this.getStorage();
            if (!storage)
                return;
            const stored = storage.getItem(this.config.persistenceKey);
            if (!stored)
                return;
            const entries = JSON.parse(stored);
            const now = Date.now();
            for (const [key, entry] of entries) {
                // Only load non-expired entries
                if (now <= entry.expiresAt) {
                    this.cache.set(key, entry);
                }
            }
        }
        catch (error) {
            console.warn('Failed to load cache from persistence:', error);
            this.clearPersistence();
        }
    }
    /**
     * Clear persistence
     */
    clearPersistence() {
        try {
            // Check if localStorage is available (browser environment)
            const storage = this.getStorage();
            if (!storage)
                return;
            storage.removeItem(this.config.persistenceKey);
        }
        catch (error) {
            console.warn('Failed to clear cache persistence:', error);
        }
    }
    /**
     * Get localStorage if available (browser environment only)
     */
    getStorage() {
        try {
            // Check if we're in a browser environment
            if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
                return globalThis.localStorage;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
exports.DataCache = DataCache;
/**
 * Specialized cache for card data
 */
class CardDataCache extends DataCache {
    constructor(config = {}) {
        super({
            ...config,
            persistenceKey: config.persistenceKey ?? 'biomasters-card-cache'
        });
    }
    /**
     * Get card by CardId
     */
    getCard(cardId) {
        return this.get(`card-${cardId}`);
    }
    /**
     * Set card data
     */
    setCard(cardId, card) {
        this.set(`card-${cardId}`, card);
    }
    /**
     * Get multiple cards
     */
    getCards(cardIds) {
        return cardIds.map(id => this.getCard(id));
    }
    /**
     * Set multiple cards
     */
    setCards(cards) {
        cards.forEach(card => this.setCard(card.cardId, card));
    }
}
exports.CardDataCache = CardDataCache;
/**
 * Specialized cache for ability data
 */
class AbilityDataCache extends DataCache {
    constructor(config = {}) {
        super({
            ...config,
            persistenceKey: config.persistenceKey ?? 'biomasters-ability-cache'
        });
    }
    /**
     * Get ability by AbilityId
     */
    getAbility(abilityId) {
        return this.get(`ability-${abilityId}`);
    }
    /**
     * Set ability data
     */
    setAbility(abilityId, ability) {
        this.set(`ability-${abilityId}`, ability);
    }
}
exports.AbilityDataCache = AbilityDataCache;
// Export singleton instances
exports.globalCache = new DataCache();
exports.cardCache = new CardDataCache();
exports.abilityCache = new AbilityDataCache();
//# sourceMappingURL=DataCache.js.map