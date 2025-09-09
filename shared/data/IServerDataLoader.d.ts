/**
 * Server Data Loader Interface
 *
 * Defines the contract for server-side data loading with environment-specific implementations
 */
import { CardData, AbilityData } from '../types';
import { SupportedLanguage } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';
export interface ServerDataConfig {
    dataPath?: string;
    source: 'filesystem' | 'database' | 'cdn' | 'redis';
    enableCaching: boolean;
    cacheConfig: {
        ttl: number;
        maxSize: number;
        refreshInterval?: number;
    };
    retryConfig: {
        maxRetries: number;
        retryDelay: number;
        backoffMultiplier: number;
    };
}
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
 * Server-side data loader interface
 */
export interface IServerDataLoader {
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
 * Factory function type for creating server data loaders
 */
export type ServerDataLoaderFactory = (config: ServerDataConfig) => IServerDataLoader;
//# sourceMappingURL=IServerDataLoader.d.ts.map