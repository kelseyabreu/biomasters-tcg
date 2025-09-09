/**
 * Server Data Loader Implementation
 *
 * Production-ready data loader for server environments with caching, error handling, and retry logic
 */
import { CardData, AbilityData } from '../types';
import { SupportedLanguage } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';
import { IServerDataLoader, ServerDataConfig, LoadResult } from './IServerDataLoader';
export declare class ServerDataLoader implements IServerDataLoader {
    private config;
    private cache;
    private stats;
    private dataPath;
    constructor(config: ServerDataConfig);
    /**
     * Smart path resolution for different environments
     */
    private resolveDataPath;
    /**
     * Generic cache management
     */
    private getFromCache;
    private setCache;
    /**
     * Load data with retry logic and error handling
     */
    private loadWithRetry;
    /**
     * Load and validate JSON file
     */
    private loadJSONFile;
    /**
     * Load cards from data source
     */
    loadCards(): Promise<LoadResult<CardData[]>>;
    /**
     * Load abilities from data source
     */
    loadAbilities(): Promise<LoadResult<AbilityData[]>>;
    /**
     * Load game configuration
     */
    loadGameConfig(): Promise<LoadResult<any>>;
    /**
     * Load localization data
     */
    loadLocalizationData(languageCode: SupportedLanguage): Promise<LoadResult<any>>;
    /**
     * Get specific card by ID
     */
    getCardById(cardId: number): Promise<LoadResult<CardData | null>>;
    /**
     * Get specific ability by ID
     */
    getAbilityById(abilityId: number): Promise<LoadResult<AbilityData | null>>;
    /**
     * Create localization manager
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
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
/**
 * Factory function to create server data loader with default configuration
 */
export declare function createServerDataLoader(config?: Partial<ServerDataConfig>): IServerDataLoader;
/**
 * Create server data loader with production-optimized settings
 */
export declare function createProductionServerDataLoader(dataPath?: string): IServerDataLoader;
/**
 * Create server data loader with development settings (no caching, fast retries)
 */
export declare function createDevelopmentServerDataLoader(dataPath?: string): IServerDataLoader;
//# sourceMappingURL=ServerDataLoader.d.ts.map