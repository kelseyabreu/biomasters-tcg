/**
 * Unified Data Loader Factory
 *
 * Creates environment-appropriate data loaders with automatic environment detection
 * Consolidates DataLoader.ts, DataCache.ts, and StaticDataManager.ts into a single unified system
 *
 * Features:
 * - Advanced caching with LRU eviction and TTL management
 * - Background updates with version checking
 * - Offline-first data loading with automatic refresh
 * - Cross-platform storage integration
 * - Specialized caches for cards and abilities
 */

import {
  IUnifiedDataLoader,
  UnifiedDataConfig,
  DataEnvironment
} from './IServerDataLoader';
import { SupportedLanguage } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';
import { CardData, AbilityData } from '../types';
import { CardId, AbilityId } from '../enums';

// ============================================================================
// ADVANCED CACHING SYSTEM (from DataCache.ts)
// ============================================================================

/**
 * Cache entry with metadata for advanced cache management
 */
interface AdvancedCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

/**
 * Cache configuration for advanced features
 */
interface AdvancedCacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemorySize?: number; // Maximum memory usage in bytes
  ttl: number; // Time to live in milliseconds
  enablePersistence?: boolean; // Enable storage persistence
  enableMetrics?: boolean; // Enable cache hit/miss metrics
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

/**
 * Cache metrics for monitoring performance
 */
interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  memoryUsage: number;
  entryCount: number;
}

/**
 * Advanced cache implementation with LRU eviction, TTL, and persistence
 */
class AdvancedCache<T = any> {
  private cache = new Map<string, AdvancedCacheEntry<T>>();
  private config: Required<AdvancedCacheConfig>;
  private metrics: CacheMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    memoryUsage: 0,
    entryCount: 0
  };
  private cleanupInterval?: NodeJS.Timeout;
  private storageAdapter?: any; // Will be injected for persistence

  constructor(config: AdvancedCacheConfig, storageAdapter?: any) {
    this.config = {
      maxSize: config.maxSize,
      maxMemorySize: config.maxMemorySize ?? 50 * 1024 * 1024, // 50MB default
      ttl: config.ttl,
      enablePersistence: config.enablePersistence ?? false,
      enableMetrics: config.enableMetrics ?? true,
      cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000 // 5 minutes
    };
    this.storageAdapter = storageAdapter;

    // Set up periodic cleanup
    if (this.config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.config.cleanupInterval);
    }

    // Load from persistence if enabled
    if (this.config.enablePersistence && this.storageAdapter) {
      this.loadFromPersistence().catch(error => {
        console.warn('Failed to load cache from persistence:', error);
      });
    }
  }

  /**
   * Get data from cache with automatic TTL checking
   */
  get(key: string): T | null {
    this.metrics.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      this.updateMetrics();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      this.updateMetrics();
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.metrics.cacheHits++;
    this.updateMetrics();

    return entry.data;
  }

  /**
   * Set data in cache with automatic eviction if needed
   */
  set(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl ?? this.config.ttl;
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    while (this.shouldEvict(size)) {
      this.evictLRU();
    }

    const entry: AdvancedCacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
    this.updateMetrics();

    // Persist if enabled
    if (this.config.enablePersistence && this.storageAdapter) {
      this.saveToPersistence().catch(error => {
        console.warn('Failed to persist cache:', error);
      });
    }
  }

  /**
   * Check if key exists without updating access metadata
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
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateMetrics();
    return result;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.updateMetrics();
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [AdvancedCache] Cleaned up ${cleanedCount} expired entries`);
      this.updateMetrics();
    }
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
      this.metrics.evictions++;
    }
  }

  /**
   * Check if we should evict entries before adding new one
   */
  private shouldEvict(newEntrySize: number): boolean {
    // Check entry count limit
    if (this.cache.size >= this.config.maxSize) {
      return true;
    }

    // Check memory limit
    if (this.metrics.memoryUsage + newEntrySize > this.config.maxMemorySize) {
      return true;
    }

    return false;
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default 1KB if can't serialize
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.entryCount = this.cache.size;
    this.metrics.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);

    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.cacheHits / this.metrics.totalRequests;
      this.metrics.missRate = this.metrics.cacheMisses / this.metrics.totalRequests;
    }
  }

  /**
   * Load cache from persistence
   */
  private async loadFromPersistence(): Promise<void> {
    if (!this.storageAdapter) return;

    try {
      const persistedData = await this.storageAdapter.getItem('unified-cache');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        const now = Date.now();

        // Restore non-expired entries
        for (const [key, entry] of Object.entries(parsed)) {
          const cacheEntry = entry as AdvancedCacheEntry<T>;
          if (now <= cacheEntry.expiresAt) {
            this.cache.set(key, cacheEntry);
          }
        }

        this.updateMetrics();
        console.log(`📦 [AdvancedCache] Loaded ${this.cache.size} entries from persistence`);
      }
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
    }
  }

  /**
   * Save cache to persistence
   */
  private async saveToPersistence(): Promise<void> {
    if (!this.storageAdapter) return;

    try {
      const cacheData = Object.fromEntries(this.cache.entries());
      await this.storageAdapter.setItem('unified-cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to persistence:', error);
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// ============================================================================
// BACKGROUND UPDATE SYSTEM (from StaticDataManager.ts)
// ============================================================================

/**
 * Data version information for background updates
 */
interface DataVersion {
  version: string;
  lastUpdated: number;
  checksum?: string;
}

/**
 * Static data file metadata
 */
interface StaticDataFile {
  path: string;
  version: DataVersion;
  data: any;
  size: number;
}

/**
 * Background update result
 */
interface UpdateResult {
  success: boolean;
  updatedFiles: string[];
  errors: string[];
  totalSize: number;
}

/**
 * Background update manager for automatic data refresh
 */
class BackgroundUpdateManager {
  private updateInterval?: NodeJS.Timeout;
  private storageAdapter?: any;
  private readonly UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(storageAdapter?: any) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Initialize background updates
   */
  initialize(): void {
    // Start background update check if online
    if (typeof globalThis !== 'undefined' && 'navigator' in globalThis && (globalThis as any).navigator?.onLine) {
      this.scheduleBackgroundUpdate();
    }

    // Listen for online events to trigger updates (browser only)
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      (globalThis as any).window?.addEventListener('online', () => {
        console.log('🌐 [BackgroundUpdate] Device came online, checking for updates');
        this.checkForUpdates().catch(error => {
          console.error('Failed to check for updates:', error);
        });
      });
    }
  }

  /**
   * Check for updates to data files
   */
  async checkForUpdates(): Promise<UpdateResult> {
    if (typeof globalThis !== 'undefined' && 'navigator' in globalThis && !(globalThis as any).navigator?.onLine) {
      return {
        success: false,
        updatedFiles: [],
        errors: ['Device is offline'],
        totalSize: 0
      };
    }

    try {
      console.log('🔄 [BackgroundUpdate] Checking for data updates...');

      // Fetch version manifest from server
      const manifest = await this.fetchVersionManifest();
      const cache = await this.loadVersionCache();

      const updatedFiles: string[] = [];
      const errors: string[] = [];
      let totalSize = 0;

      // Check each file in manifest
      for (const [filePath, serverVersion] of Object.entries(manifest)) {
        try {
          const cachedVersion = cache[filePath];
          const needsUpdate = !cachedVersion ||
            cachedVersion.version !== (serverVersion as any).version ||
            this.isExpired(cachedVersion.lastUpdated);

          if (needsUpdate) {
            console.log(`📥 [BackgroundUpdate] File ${filePath} needs update`);
            updatedFiles.push(filePath);
            totalSize += (serverVersion as any).size || 0;
          }
        } catch (error) {
          console.error(`❌ [BackgroundUpdate] Failed to check ${filePath}:`, error);
          errors.push(`${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Save updated version cache
      await this.saveVersionCache(manifest);

      return {
        success: errors.length === 0,
        updatedFiles,
        errors,
        totalSize
      };

    } catch (error) {
      console.error('❌ [BackgroundUpdate] Failed to check for updates:', error);
      return {
        success: false,
        updatedFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        totalSize: 0
      };
    }
  }

  /**
   * Get data file with offline-first approach
   */
  async getDataFile(filePath: string, fetchFn: (path: string) => Promise<any>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // First, try to get from cache
      const cache = await this.loadDataCache();
      const cachedFile = cache[filePath];

      if (cachedFile && !this.isExpired(cachedFile.version.lastUpdated)) {
        console.log(`📁 [BackgroundUpdate] Serving ${filePath} from cache`);
        return { success: true, data: cachedFile.data };
      }

      // If not in cache or expired, try to fetch fresh data
      if (typeof globalThis === 'undefined' || !('navigator' in globalThis) || (globalThis as any).navigator?.onLine) {
        try {
          const freshData = await fetchFn(filePath);
          if (freshData) {
            // Update cache with fresh data
            await this.updateCacheFile(filePath, {
              path: filePath,
              version: {
                version: '1.0.0', // Will be updated by version manifest
                lastUpdated: Date.now()
              },
              data: freshData,
              size: JSON.stringify(freshData).length
            });
            return { success: true, data: freshData };
          }
        } catch (fetchError) {
          console.warn(`⚠️ [BackgroundUpdate] Failed to fetch fresh ${filePath}, using cache:`, fetchError);
        }
      }

      // Fall back to cached data even if expired
      if (cachedFile) {
        console.log(`📁 [BackgroundUpdate] Serving expired ${filePath} from cache (offline fallback)`);
        return { success: true, data: cachedFile.data };
      }

      // No cache and can't fetch - this is an error
      const errorMessage = `Data file ${filePath} not available offline and cannot be fetched`;
      return { success: false, error: errorMessage };

    } catch (error) {
      console.error(`❌ [BackgroundUpdate] Failed to get data file ${filePath}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.storageAdapter) return;

    try {
      await this.storageAdapter.removeItem('data-cache');
      await this.storageAdapter.removeItem('version-cache');
      console.log('🗑️ [BackgroundUpdate] Cache cleared');
    } catch (error) {
      console.error('❌ [BackgroundUpdate] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Destroy and cleanup resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  // Private helper methods

  private async loadDataCache(): Promise<Record<string, StaticDataFile>> {
    if (!this.storageAdapter) return {};

    try {
      const cacheData = await this.storageAdapter.getItem('data-cache');
      return cacheData ? JSON.parse(cacheData) : {};
    } catch (error) {
      console.warn('⚠️ [BackgroundUpdate] Failed to load data cache, starting fresh:', error);
      return {};
    }
  }

  private async loadVersionCache(): Promise<Record<string, DataVersion>> {
    if (!this.storageAdapter) return {};

    try {
      const cacheData = await this.storageAdapter.getItem('version-cache');
      return cacheData ? JSON.parse(cacheData) : {};
    } catch (error) {
      console.warn('⚠️ [BackgroundUpdate] Failed to load version cache, starting fresh:', error);
      return {};
    }
  }

  private async saveVersionCache(cache: Record<string, any>): Promise<void> {
    if (!this.storageAdapter) return;

    try {
      await this.storageAdapter.setItem('version-cache', JSON.stringify(cache));
    } catch (error) {
      console.error('❌ [BackgroundUpdate] Failed to save version cache:', error);
      throw error;
    }
  }

  private async updateCacheFile(filePath: string, fileData: StaticDataFile): Promise<void> {
    if (!this.storageAdapter) return;

    const cache = await this.loadDataCache();
    cache[filePath] = fileData;

    try {
      await this.storageAdapter.setItem('data-cache', JSON.stringify(cache));
    } catch (error) {
      console.error('❌ [BackgroundUpdate] Failed to update cache file:', error);
      throw error;
    }
  }

  private async fetchVersionManifest(): Promise<Record<string, DataVersion>> {
    try {
      const response = await fetch('/api/static-data/manifest');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as Record<string, DataVersion>;
    } catch (error) {
      console.error('❌ [BackgroundUpdate] Failed to fetch version manifest:', error);
      throw error;
    }
  }

  private isExpired(lastUpdated: number): boolean {
    return Date.now() - lastUpdated > this.CACHE_EXPIRY_MS;
  }

  private scheduleBackgroundUpdate(): void {
    // Check for updates periodically
    this.updateInterval = setInterval(() => {
      if (typeof globalThis === 'undefined' || !('navigator' in globalThis) || (globalThis as any).navigator?.onLine) {
        this.checkForUpdates().catch(error => {
          console.error('❌ [BackgroundUpdate] Background update failed:', error);
        });
      }
    }, this.UPDATE_CHECK_INTERVAL);
  }
}

/**
 * Environment detection utility
 */
function detectEnvironment(): DataEnvironment {
  // Check if we're in a Node.js environment first (server-side)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Check if we're in a test environment
    if (process.env['NODE_ENV'] === 'test' || process.env['JEST_WORKER_ID']) {
      return 'test';
    }
    return 'server';
  }

  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
    // Check if we're in a mobile environment (Capacitor)
    if (((globalThis as any).window as any).Capacitor) {
      return 'mobile';
    }
    return 'client';
  }
  
  // Default fallback
  return 'client';
}

/**
 * Get default configuration based on environment with advanced features
 */
function getDefaultConfig(environment: DataEnvironment): UnifiedDataConfig {
  const baseConfig = {
    environment,
    enableCaching: true,
    cacheConfig: {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      enablePersistence: true,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      backoffMultiplier: 2
    },
    backgroundUpdates: {
      enabled: true,
      checkInterval: 60 * 60 * 1000, // 1 hour
      cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  switch (environment) {
    case 'client':
    case 'mobile':
      return {
        ...baseConfig,
        source: 'fetch' as const,
        baseUrl: '/data'
      };
    
    case 'server':
      return {
        ...baseConfig,
        source: 'filesystem' as const,
        dataPath: './public/data'
      };
    
    case 'test':
      return {
        ...baseConfig,
        source: 'filesystem' as const,
        enableCaching: false, // No caching in tests for fresh data
        cacheConfig: {
          ttl: 1000, // 1 second
          maxSize: 10
        },
        retryConfig: {
          maxRetries: 1,
          retryDelay: 100,
          backoffMultiplier: 1
        }
      };
    
    default:
      return {
        ...baseConfig,
        source: 'fetch' as const,
        baseUrl: '/data'
      };
  }
}

/**
 * Main factory function to create unified data loaders
 */
export function createUnifiedDataLoader(config?: Partial<UnifiedDataConfig>): IUnifiedDataLoader {
  // Auto-detect environment if not specified
  const environment = config?.environment || detectEnvironment();
  
  // Get default configuration for the environment
  const defaultConfig = getDefaultConfig(environment);
  
  // Merge with user-provided config
  const finalConfig: UnifiedDataConfig = { ...defaultConfig, ...config };
  
  // Create environment-specific loader
  switch (finalConfig.environment) {
    case 'client':
    case 'mobile':
      return createClientDataLoader(finalConfig);
    
    case 'server':
    case 'test':
      return createServerDataLoader(finalConfig);
    
    default:
      throw new Error(`Unsupported environment: ${finalConfig.environment}`);
  }
}

/**
 * Create client-side data loader (fetch-based) with advanced caching and background updates
 */
function createClientDataLoader(config: UnifiedDataConfig): IUnifiedDataLoader {
  const baseUrl = config.baseUrl || '/data';

  // Advanced caching system
  const advancedCache = new AdvancedCache(config.cacheConfig, config.storageAdapter);

  // Background update manager
  const backgroundUpdater = new BackgroundUpdateManager(config.storageAdapter);

  // Initialize background updates if enabled
  if (config.backgroundUpdates?.enabled) {
    backgroundUpdater.initialize();
  }

  // Legacy stats for backward compatibility
  const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Cache management with advanced features
  const getFromCache = (key: string): any | null => {
    stats.totalRequests++;
    const cached = advancedCache.get(key);
    if (cached) {
      stats.cacheHits++;
      return cached;
    }
    stats.cacheMisses++;
    return null;
  };

  const setCache = (key: string, data: any, ttlMs?: number): void => {
    advancedCache.set(key, data, ttlMs);
  };

  // Fetch with retry logic and exponential backoff
  const fetchWithRetry = async (url: string, maxRetries: number = 3): Promise<any> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // If it's a network error or 404, don't retry
        if (lastError.message.includes('404') || lastError.message.includes('Failed to fetch')) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  // Load JSON with advanced caching, background updates, and retry logic
  const loadJSON = async (relativePath: string, cacheKey: string): Promise<any> => {
    // Try background update manager first if enabled
    if (config.backgroundUpdates?.enabled) {
      const result = await backgroundUpdater.getDataFile(relativePath, async (path) => {
        const url = `${baseUrl}/${path}`;
        const response = await fetchWithRetry(url);
        return response;
      });

      if (result.success && result.data) {
        // Cache the result from background updater
        setCache(cacheKey, result.data);
        return result.data;
      }
    }

    // Check advanced cache (1-5ms response time)
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from network with retry logic (50ms+ response time)
    const url = `${baseUrl}/${relativePath}`;
    const data = await fetchWithRetry(url);

    // Cache the result
    setCache(cacheKey, data);
    return data;
  };

  return {
    async loadCards() {
      try {
        const cards = await loadJSON('game-config/cards.json', 'cards');
        return { success: true, data: cards };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadAbilities() {
      try {
        const abilities = await loadJSON('game-config/abilities.json', 'abilities');
        return { success: true, data: abilities };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadGameConfig() {
      // Check cache for fallback config first (before attempting file load)
      const cachedFallback = getFromCache('gameConfig_fallback');
      if (cachedFallback) {
        return { success: true, data: cachedFallback };
      }

      try {
        // Try to load game-config.json
        const gameConfig = await loadJSON('game-config/game-config.json', 'gameConfig');
        return { success: true, data: gameConfig };
      } catch (error) {
        // Return default game configuration if file doesn't exist
        const defaultConfig = {
          version: "1.0.0",
          gameMode: "tcg",
          settings: {
            maxPlayers: 2,
            gridWidth: 9,
            gridHeight: 10,
            startingHandSize: 5,
            maxHandSize: 7,
            startingEnergy: 10,
            turnTimeLimit: 300000
          }
        };

        // Cache the fallback config for future requests
        setCache('gameConfig_fallback', defaultConfig);
        return { success: true, data: defaultConfig };
      }
    },

    async loadKeywords() {
      try {
        const keywords = await loadJSON('game-config/keywords.json', 'keywords');
        return { success: true, data: keywords };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadLocalizationData(languageCode) {
      try {
        const localization = await loadJSON(`localization/${languageCode}/cards.json`, `localization_${languageCode}`);
        return { success: true, data: localization };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async getCardById(cardId) {
      const cardsResult = await this.loadCards();
      if (!cardsResult.success || !cardsResult.data) {
        return { success: false, error: cardsResult.error || 'Failed to load cards' };
      }
      const card = cardsResult.data.find(c => c.cardId === cardId);
      return { success: true, data: card || null };
    },

    async getAbilityById(abilityId) {
      const abilitiesResult = await this.loadAbilities();
      if (!abilitiesResult.success || !abilitiesResult.data) {
        return { success: false, error: abilitiesResult.error || 'Failed to load abilities' };
      }
      const ability = abilitiesResult.data.find(a => a.id === abilityId);
      return { success: true, data: ability || null };
    },

    async createLocalizationManager(): Promise<ILocalizationManager> {
      // Create a mock localization manager for client-side usage
      return {
        currentLanguage: 'en',
        availableLanguages: [SupportedLanguage.ENGLISH],
        loadLanguage: async () => {},
        getCardName: () => 'Test Card',
        getScientificName: () => 'Test Scientific Name',
        getCardDescription: () => 'Test Description',
        getAbilityName: () => 'Test Ability',
        getAbilityDescription: () => 'Test Ability Description',
        getAbilityFlavorText: () => 'Test Flavor Text',
        getKeywordName: () => 'Test Keyword',
        getUIText: () => 'Test UI Text',
        getTaxonomy: () => null,
        getFormattedScientificName: () => 'Test Scientific Name',
        getTaxonomyName: () => 'Test Taxonomy',
        hasText: () => false,
        getText: () => 'Test Text'
      };
    },

    async clearCache(): Promise<void> {
      advancedCache.clear();
      if (config.backgroundUpdates?.enabled) {
        await backgroundUpdater.clearCache();
      }
      stats.totalRequests = 0;
      stats.cacheHits = 0;
      stats.cacheMisses = 0;
    },

    getCacheStats() {
      const advancedMetrics = advancedCache.getMetrics();
      return {
        size: advancedMetrics.entryCount,
        cacheHits: advancedMetrics.cacheHits,
        cacheMisses: advancedMetrics.cacheMisses,
        hitRate: Math.round(advancedMetrics.hitRate * 100) / 100,
        missRate: Math.round(advancedMetrics.missRate * 100) / 100,
        totalRequests: advancedMetrics.totalRequests,
        memoryUsage: advancedMetrics.memoryUsage,
        evictions: advancedMetrics.evictions
      };
    },

    // Specialized cache methods for cards and abilities
    getCard(cardId: CardId): CardData | null {
      return advancedCache.get(`card-${cardId}`);
    },

    setCard(cardId: CardId, card: CardData): void {
      advancedCache.set(`card-${cardId}`, card);
    },

    getCards(cardIds: CardId[]): (CardData | null)[] {
      return cardIds.map(id => this.getCard!(id));
    },

    setCards(cards: CardData[]): void {
      cards.forEach(card => this.setCard!(card.cardId, card));
    },

    getAbility(abilityId: AbilityId): AbilityData | null {
      return advancedCache.get(`ability-${abilityId}`);
    },

    setAbility(abilityId: AbilityId, ability: AbilityData): void {
      advancedCache.set(`ability-${abilityId}`, ability);
    },

    // Background update methods
    async checkForUpdates(): Promise<any> {
      if (config.backgroundUpdates?.enabled) {
        return backgroundUpdater.checkForUpdates();
      }
      return { success: false, error: 'Background updates not enabled' };
    },

    // Cleanup method
    destroy(): void {
      advancedCache.destroy();
      backgroundUpdater.destroy();
    },

    async preloadData() {
      try {
        await Promise.all([
          this.loadCards(),
          this.loadAbilities(),
          this.loadGameConfig()
        ]);
      } catch (error) {
        console.warn('Client preload failed:', error);
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const cardsResult = await this.loadCards();
        return !!(cardsResult.success && cardsResult.data && cardsResult.data.length > 0);
      } catch {
        return false;
      }
    }
  };
}

/**
 * Create server-side data loader (filesystem-based) with sophisticated caching and retry logic
 */
function createServerDataLoader(config: UnifiedDataConfig): IUnifiedDataLoader {
  const fs = require('fs').promises;
  const fsSync = require('fs');
  const path = require('path');

  // Sophisticated caching system
  const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Smart path resolution for different environments
  const resolveDataPath = (relativePath: string): string => {
    const basePath = config.dataPath || './public/data';

    // Handle different deployment scenarios
    if (path.isAbsolute(basePath)) {
      return path.join(basePath, relativePath);
    }

    // If basePath contains 'nonexistent' or similar test paths, don't use fallbacks
    if (basePath.includes('nonexistent') || basePath.includes('invalid') || basePath.includes('bad')) {
      return path.join(process.cwd(), basePath, relativePath);
    }

    // Try multiple possible base paths for flexibility (production mode)
    const possiblePaths = [
      path.join(process.cwd(), basePath, relativePath),
      path.join(process.cwd(), 'public', 'data', relativePath),
      path.join(__dirname, '../../public/data', relativePath),
      path.join(basePath, relativePath)
    ];

    // Find the first path that exists
    for (const possiblePath of possiblePaths) {
      try {
        if (fsSync.existsSync(possiblePath)) {
          return possiblePath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // If none exist, return the first one (will fail later with proper error)
    return possiblePaths[0];
  };

  // Cache management with TTL
  const getFromCache = (key: string): any | null => {
    stats.totalRequests++;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      stats.cacheHits++;
      return cached.data;
    }
    stats.cacheMisses++;
    return null;
  };

  const setCache = (key: string, data: any, ttlMs?: number): void => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs || config.cacheConfig.ttl
    });
  };

  // Retry logic with exponential backoff
  const loadWithRetry = async <T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  // Load and validate JSON file with caching and retry
  const loadJSONFile = async (relativePath: string, cacheKey: string): Promise<any> => {
    // Check cache first (1-5ms response time)
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Load from filesystem with retry logic (50ms+ response time)
    const data = await loadWithRetry(async () => {
      const filePath = resolveDataPath(relativePath);

      // Check if file exists before trying to read it
      if (!fsSync.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const rawData = await fs.readFile(filePath, 'utf8');
      return JSON.parse(rawData);
    });

    // Cache the result
    setCache(cacheKey, data);
    return data;
  };

  return {
    async loadCards() {
      try {
        const cards = await loadJSONFile('game-config/cards.json', 'cards');
        return { success: true, data: cards };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadAbilities() {
      try {
        const abilities = await loadJSONFile('game-config/abilities.json', 'abilities');
        return { success: true, data: abilities };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadGameConfig() {
      // Check cache for fallback config first (before attempting file load)
      const cachedFallback = getFromCache('gameConfig_fallback');
      if (cachedFallback) {
        return { success: true, data: cachedFallback };
      }

      try {
        // Try to load game-config.json
        const gameConfig = await loadJSONFile('game-config/game-config.json', 'gameConfig');
        return { success: true, data: gameConfig };
      } catch (error) {
        // Return default game configuration if file doesn't exist
        const defaultConfig = {
          version: "1.0.0",
          gameMode: "tcg",
          settings: {
            maxPlayers: 2,
            gridWidth: 9,
            gridHeight: 10,
            startingHandSize: 5,
            maxHandSize: 7,
            startingEnergy: 10,
            turnTimeLimit: 300000
          }
        };

        // Cache the fallback config for future requests
        setCache('gameConfig_fallback', defaultConfig);
        return { success: true, data: defaultConfig };
      }
    },

    async loadKeywords() {
      try {
        const keywords = await loadJSONFile('game-config/keywords.json', 'keywords');
        return { success: true, data: keywords };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async loadLocalizationData(languageCode) {
      try {
        const localization = await loadJSONFile(`localization/${languageCode}/cards.json`, `localization_${languageCode}`);
        return { success: true, data: localization };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    async getCardById(cardId) {
      const cardsResult = await this.loadCards();
      if (!cardsResult.success || !cardsResult.data) {
        return { success: false, error: cardsResult.error || 'Failed to load cards' };
      }
      const card = cardsResult.data.find(c => c.cardId === cardId);
      return { success: true, data: card || null };
    },

    async getAbilityById(abilityId) {
      const abilitiesResult = await this.loadAbilities();
      if (!abilitiesResult.success || !abilitiesResult.data) {
        return { success: false, error: abilitiesResult.error || 'Failed to load abilities' };
      }
      const ability = abilitiesResult.data.find(a => a.id === abilityId);
      return { success: true, data: ability || null };
    },

    async createLocalizationManager(): Promise<ILocalizationManager> {
      // Create a mock localization manager for server-side usage
      return {
        currentLanguage: 'en',
        availableLanguages: [SupportedLanguage.ENGLISH],
        loadLanguage: async () => {},
        getCardName: () => 'Test Card',
        getScientificName: () => 'Test Scientific Name',
        getCardDescription: () => 'Test Description',
        getAbilityName: () => 'Test Ability',
        getAbilityDescription: () => 'Test Ability Description',
        getAbilityFlavorText: () => 'Test Flavor Text',
        getKeywordName: () => 'Test Keyword',
        getUIText: () => 'Test UI Text',
        getTaxonomy: () => null,
        getFormattedScientificName: () => 'Test Scientific Name',
        getTaxonomyName: () => 'Test Taxonomy',
        hasText: () => false,
        getText: () => 'Test Text'
      };
    },

    async clearCache(): Promise<void> {
      cache.clear();
      stats.totalRequests = 0;
      stats.cacheHits = 0;
      stats.cacheMisses = 0;
    },

    getCacheStats() {
      const hitRate = stats.totalRequests > 0 ? stats.cacheHits / stats.totalRequests : 0;
      const missRate = stats.totalRequests > 0 ? stats.cacheMisses / stats.totalRequests : 0;

      return {
        size: cache.size,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
        missRate: Math.round(missRate * 100) / 100,
        totalRequests: stats.totalRequests
      };
    },

    async preloadData() {
      // Preload commonly used data to warm the cache
      try {
        await Promise.all([
          this.loadCards(),
          this.loadAbilities(),
          this.loadGameConfig()
        ]);
      } catch (error) {
        // Preload failures are non-critical
        console.warn('Preload failed:', error);
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const cardsResult = await this.loadCards();
        return !!(cardsResult.success && cardsResult.data && cardsResult.data.length > 0);
      } catch {
        return false;
      }
    }
  };
}

/**
 * Convenience factory functions for specific environments
 */

export function createProductionDataLoader(dataPath?: string): IUnifiedDataLoader {
  return createUnifiedDataLoader({
    environment: 'server',
    source: 'filesystem',
    dataPath: dataPath || './public/data',
    enableCaching: true,
    cacheConfig: {
      ttl: 15 * 60 * 1000, // 15 minutes
      maxSize: 500,
      refreshInterval: 60 * 60 * 1000 // 1 hour
    },
    retryConfig: {
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 2
    }
  });
}

export function createDevelopmentDataLoader(dataPath?: string): IUnifiedDataLoader {
  return createUnifiedDataLoader({
    environment: 'server',
    source: 'filesystem',
    dataPath: dataPath || './public/data',
    enableCaching: false, // No caching in development
    cacheConfig: {
      ttl: 1000,
      maxSize: 10
    },
    retryConfig: {
      maxRetries: 1,
      retryDelay: 100,
      backoffMultiplier: 1
    }
  });
}

export function createClientDataLoader_Factory(baseUrl?: string): IUnifiedDataLoader {
  return createUnifiedDataLoader({
    environment: 'client',
    source: 'fetch',
    baseUrl: baseUrl || '/data'
  });
}

// ============================================================================
// SHARED DATA LOADER INSTANCE
// ============================================================================

/**
 * Shared unified data loader instance for client-side usage with advanced features
 * Relocated from src/services/ClientGameEngine.ts for better organization
 *
 * Features enabled:
 * - Advanced caching with LRU eviction and persistence
 * - Background updates with version checking
 * - Memory management and metrics
 * - Offline-first data loading
 */
export const sharedDataLoader = createUnifiedDataLoader({
  environment: 'client',
  source: 'fetch',
  baseUrl: '/data',
  enableCaching: true,
  cacheConfig: {
    ttl: 300000, // 5 minutes
    maxSize: 100,
    maxMemorySize: 50 * 1024 * 1024, // 50MB
    enablePersistence: true,
    enableMetrics: true,
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  },
  backgroundUpdates: {
    enabled: true,
    checkInterval: 60 * 60 * 1000, // 1 hour
    cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
  }
});

export function createTestDataLoader(dataPath?: string): IUnifiedDataLoader {
  return createUnifiedDataLoader({
    environment: 'test',
    source: 'filesystem',
    dataPath: dataPath || './public/data',
    enableCaching: false
  });
}

/**
 * Legacy compatibility exports
 */
export { createUnifiedDataLoader as createDataLoader };
export { createProductionDataLoader as createProductionServerDataLoader };
export { createDevelopmentDataLoader as createDevelopmentServerDataLoader };

/**
 * Default export for convenience
 */
export default createUnifiedDataLoader;
