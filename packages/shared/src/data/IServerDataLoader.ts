/**
 * Unified Data Loader Interface
 *
 * Defines the contract for data loading across all environments (client, server, mobile)
 * with environment-specific implementations through adapters
 */

import { CardData, AbilityData, LoadResult } from '../types';
import { CardId, AbilityId } from '../enums';
import { SupportedLanguage } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';

/**
 * Environment types for data loading
 */
export type DataEnvironment = 'client' | 'server' | 'mobile' | 'test';

/**
 * Data source types
 */
export type DataSource = 'filesystem' | 'database' | 'cdn' | 'redis' | 'fetch' | 'memory';

/**
 * Unified data loader configuration with advanced features
 */
export interface UnifiedDataConfig {
  // Environment detection (auto-detected if not specified)
  environment?: DataEnvironment;

  // Data source configuration
  source?: DataSource;
  baseUrl?: string; // For fetch-based loading (client)
  dataPath?: string; // For filesystem-based loading (server)

  // Advanced caching configuration
  enableCaching: boolean;
  cacheConfig: {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of cached items
    maxMemorySize?: number; // Maximum memory usage in bytes
    refreshInterval?: number; // Auto-refresh interval in milliseconds
    enablePersistence?: boolean; // Enable storage persistence
    enableMetrics?: boolean; // Enable cache hit/miss metrics
    cleanupInterval?: number; // Cleanup interval in milliseconds
  };

  // Retry configuration
  retryConfig: {
    maxRetries: number;
    retryDelay: number; // Base delay in milliseconds
    backoffMultiplier: number;
  };

  // Background update configuration
  backgroundUpdates?: {
    enabled: boolean;
    checkInterval?: number; // Check interval in milliseconds
    cacheExpiry?: number; // Cache expiry time in milliseconds
  };

  // Storage adapter for persistence (will be injected)
  storageAdapter?: any;
}

/**
 * Legacy server config for backward compatibility
 * @deprecated Use UnifiedDataConfig instead
 */
export interface ServerDataConfig extends UnifiedDataConfig {}

// LoadResult is imported from types.ts and used directly

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Unified data loader interface - works across all environments
 */
export interface IUnifiedDataLoader {
  /**
   * Load all cards from the configured data source
   */
  loadCards(): Promise<LoadResult<CardData[]>>;

  /**
   * Load all abilities from the configured data source
   */
  loadAbilities(): Promise<LoadResult<AbilityData[]>>;

  /**
   * Load game configuration data
   */
  loadGameConfig(): Promise<LoadResult<any>>;

  /**
   * Load keywords data
   */
  loadKeywords(): Promise<LoadResult<Array<{ id: number; name: string }>>>;

  /**
   * Load localization data for a specific language
   */
  loadLocalizationData(languageCode: SupportedLanguage): Promise<LoadResult<any>>;

  /**
   * Get a specific card by ID
   */
  getCardById(cardId: number): Promise<LoadResult<CardData | null>>;

  /**
   * Get a specific ability by ID
   */
  getAbilityById(abilityId: number): Promise<LoadResult<AbilityData | null>>;

  /**
   * Create a localization manager instance
   */
  createLocalizationManager(): Promise<ILocalizationManager>;

  /**
   * Clear all cached data
   */
  clearCache(): Promise<void>;

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    missRate: number;
    totalRequests: number;
    memoryUsage?: number;
    evictions?: number;
  };

  /**
   * Preload commonly used data
   */
  preloadData(): Promise<void>;

  /**
   * Health check for the data source
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get a specific card from cache
   */
  getCard?(cardId: CardId): CardData | null;

  /**
   * Set a specific card in cache
   */
  setCard?(cardId: CardId, card: CardData): void;

  /**
   * Get multiple cards from cache
   */
  getCards?(cardIds: CardId[]): (CardData | null)[];

  /**
   * Set multiple cards in cache
   */
  setCards?(cards: CardData[]): void;

  /**
   * Get a specific ability from cache
   */
  getAbility?(abilityId: AbilityId): AbilityData | null;

  /**
   * Set a specific ability in cache
   */
  setAbility?(abilityId: AbilityId, ability: AbilityData): void;

  /**
   * Check for background updates
   */
  checkForUpdates?(): Promise<any>;

  /**
   * Cleanup resources
   */
  destroy?(): void;
}

/**
 * Legacy server data loader interface for backward compatibility
 * @deprecated Use IUnifiedDataLoader instead
 */
export interface IServerDataLoader extends IUnifiedDataLoader {}

/**
 * Factory function type for creating unified data loaders
 */
export type UnifiedDataLoaderFactory = (config: UnifiedDataConfig) => IUnifiedDataLoader;

/**
 * Legacy factory function type for backward compatibility
 * @deprecated Use UnifiedDataLoaderFactory instead
 */
export type ServerDataLoaderFactory = (config: ServerDataConfig) => IServerDataLoader;
