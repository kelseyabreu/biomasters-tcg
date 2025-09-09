/**
 * Unified Data Loader Interface
 *
 * Defines the contract for data loading across all environments (client, server, mobile)
 * with environment-specific implementations through adapters
 */

import { CardData, AbilityData } from '../types';
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
 * Unified data loader configuration
 */
export interface UnifiedDataConfig {
  // Environment detection (auto-detected if not specified)
  environment?: DataEnvironment;

  // Data source configuration
  source?: DataSource;
  baseUrl?: string; // For fetch-based loading (client)
  dataPath?: string; // For filesystem-based loading (server)

  // Caching configuration
  enableCaching: boolean;
  cacheConfig: {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of cached items
    refreshInterval?: number; // Auto-refresh interval in milliseconds
  };

  // Retry configuration
  retryConfig: {
    maxRetries: number;
    retryDelay: number; // Base delay in milliseconds
    backoffMultiplier: number;
  };
}

/**
 * Legacy server config for backward compatibility
 * @deprecated Use UnifiedDataConfig instead
 */
export interface ServerDataConfig extends UnifiedDataConfig {}

export interface LoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  timestamp?: number;
}

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
  clearCache(): void;

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
  };

  /**
   * Preload commonly used data
   */
  preloadData(): Promise<void>;

  /**
   * Health check for the data source
   */
  healthCheck(): Promise<boolean>;
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
