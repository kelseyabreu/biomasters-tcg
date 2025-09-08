/**
 * Card Localization Cache Utility
 * High-performance caching system for card localization data
 * Provides persistent storage and intelligent cache management
 */

// Note: This utility should be used with the localization context
// We'll use any type for localization parameter since the interface is not exported

/**
 * Cache configuration
 */
interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enablePersistence: boolean;
  storageKey: string;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  value: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * High-performance localization cache
 */
class CardLocalizationCache {
  private config: CacheConfig;
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      ttl: config.ttl ?? 30 * 60 * 1000, // 30 minutes
      enablePersistence: config.enablePersistence ?? true,
      storageKey: config.storageKey ?? 'biomasters-localization-cache'
    };

    // Load from localStorage if available
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get localized text with caching
   */
  get(key: string, type: 'name' | 'scientific' | 'description' | 'taxonomy' | 'ability', localization?: any): string {
    const cacheKey = `${type}:${key}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValid(cached)) {
      // Update access metadata
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.stats.hits++;
      this.updateHitRate();
      return cached.value;
    }

    // Cache miss - get from localization service
    this.stats.misses++;
    this.updateHitRate();

    let value: string;
    try {
      if (!localization) {
        throw new Error('Localization context not provided');
      }

      switch (type) {
        case 'name':
          value = localization.getCardName(key);
          break;
        case 'scientific':
          value = localization.getScientificName(key);
          break;
        case 'description':
          // Fallback for description since context doesn't have this method
          value = this.formatFallback(key) + ' Description';
          break;
        case 'taxonomy':
          // Fallback for taxonomy since context doesn't have this method
          value = this.formatFallback(key);
          break;
        case 'ability':
          value = localization.getAbilityName(key);
          break;
        default:
          throw new Error(`Unknown localization type: ${type}`);
      }
    } catch (error) {
      console.warn(`Failed to get localization for ${cacheKey}:`, error);
      // Fallback to formatted key
      value = this.formatFallback(key);
    }

    // Store in cache
    this.set(cacheKey, value);
    return value;
  }

  /**
   * Set value in cache
   */
  private set(key: string, value: string): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });

    this.stats.size = this.cache.size;

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Batch get multiple localizations
   */
  getBatch(keys: string[], type: 'name' | 'scientific' | 'description' | 'taxonomy' | 'ability'): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.get(key, type);
    }
    return result;
  }

  /**
   * Preload localizations for better performance
   */
  preload(cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>): void {
    cards.forEach(card => {
      this.get(card.nameId, 'name');
      this.get(card.scientificNameId, 'scientific');
      this.get(card.descriptionId, 'description');
      this.get(card.taxonomyId, 'taxonomy');
    });
  }

  /**
   * Get complete card localization
   */
  getCardLocalization(card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }) {
    return {
      name: this.get(card.nameId, 'name'),
      scientificName: this.get(card.scientificNameId, 'scientific'),
      description: this.get(card.descriptionId, 'description'),
      taxonomy: this.get(card.taxonomyId, 'taxonomy')
    };
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.config.ttl;
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
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.size = this.cache.size;

    if (keysToDelete.length > 0 && this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Format fallback value from key
   */
  private formatFallback(key: string): string {
    return key
      .replace(/^(CARD_|ABILITY_|TAXONOMY_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const serializable = Array.from(this.cache.entries())
        .filter(([, entry]) => this.isValid(entry))
        .map(([key, entry]) => [key, {
          value: entry.value,
          timestamp: entry.timestamp,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed
        }]);

      localStorage.setItem(this.config.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save localization cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const entries = JSON.parse(stored);
      for (const [key, entry] of entries) {
        if (this.isValid(entry)) {
          this.cache.set(key, entry);
        }
      }

      this.stats.size = this.cache.size;
    } catch (error) {
      console.warn('Failed to load localization cache:', error);
      this.clearStorage();
    }
  }

  /**
   * Clear localStorage
   */
  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      console.warn('Failed to clear localization cache storage:', error);
    }
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
    this.clearStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const cardLocalizationCache = new CardLocalizationCache();

// Export factory function for custom configurations
export function createCardLocalizationCache(config: Partial<CacheConfig>): CardLocalizationCache {
  return new CardLocalizationCache(config);
}

// Export convenience functions
export function getCardName(nameId: string): string {
  return cardLocalizationCache.get(nameId, 'name');
}

export function getScientificName(scientificNameId: string): string {
  return cardLocalizationCache.get(scientificNameId, 'scientific');
}

export function getCardDescription(descriptionId: string): string {
  return cardLocalizationCache.get(descriptionId, 'description');
}

export function getTaxonomy(taxonomyId: string): string {
  return cardLocalizationCache.get(taxonomyId, 'taxonomy');
}

export function getAbilityName(abilityNameId: string): string {
  return cardLocalizationCache.get(abilityNameId, 'ability');
}
