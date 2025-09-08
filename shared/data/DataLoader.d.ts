/**
 * Centralized Data Loader - Shared Module
 * Single source of truth for all data loading operations across frontend, server, and shared modules
 * Provides caching, error handling, and consistent data transformation
 *
 * Consolidates functionality from:
 * - shared/game-data-loader.ts (localization, keywords)
 * - server/src/services/GameDataManager.ts (server-specific loading)
 */
import { CardData, AbilityData } from '../types';
import { CardId } from '../enums';
import { ILocalizationManager } from '../localization-manager';
import { SupportedLanguage } from '../text-ids';
/**
 * Data loading configuration
 */
interface DataLoaderConfig {
    baseUrl?: string;
    enableCaching?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
/**
 * Data loading result
 */
interface LoadResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    fromCache?: boolean;
}
/**
 * Complete game data set (from game-data-loader.ts)
 */
export interface GameDataSet {
    cards: Map<number, CardData>;
    abilities: Map<number, AbilityData>;
    keywords: Map<number, string>;
    localizationManager: ILocalizationManager;
}
/**
 * Interface for loading complete game data (from game-data-loader.ts)
 */
export interface IGameDataLoader {
    /**
     * Load all game data including cards, abilities, keywords, and localization
     */
    loadGameData(languageCode?: string): Promise<GameDataSet>;
    /**
     * Load only card data
     */
    loadCards(): Promise<Map<number, CardData>>;
    /**
     * Load only ability data
     */
    loadAbilities(): Promise<Map<number, AbilityData>>;
    /**
     * Load keyword database
     */
    loadKeywords(): Promise<Map<number, string>>;
    /**
     * Create localization manager
     */
    createLocalizationManager(): Promise<ILocalizationManager>;
}
/**
 * Centralized data loader class
 * Implements IGameDataLoader interface and consolidates all data loading functionality
 */
export declare class DataLoader implements IGameDataLoader {
    private config;
    private cache;
    private loadingPromises;
    constructor(config?: DataLoaderConfig);
    /**
     * Load all card data from the centralized cards.json file
     */
    loadAllCards(): Promise<LoadResult<CardData[]>>;
    /**
     * Load a specific card by CardId
     */
    loadCard(cardId: CardId): Promise<LoadResult<CardData>>;
    /**
     * Load a card by nameId (string identifier)
     */
    loadCardByNameId(nameId: string): Promise<LoadResult<CardData>>;
    /**
     * Load multiple cards by CardIds
     */
    loadCardsByIds(cardIds: CardId[]): Promise<LoadResult<CardData[]>>;
    /**
     * Load all ability data
     */
    loadAllAbilities(): Promise<LoadResult<AbilityData[]>>;
    /**
     * Load game configuration data
     */
    loadGameConfig(): Promise<LoadResult<any>>;
    /**
     * Clear all cached data
     */
    clearCache(): void;
    /**
     * Clear specific cache entry
     */
    clearCacheEntry(key: string): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        entries: string[];
    };
    /**
     * Private helper: Fetch with retry logic
     */
    private fetchWithRetry;
    /**
     * Private helper: Get data from cache
     */
    private getFromCache;
    /**
     * Private helper: Set data in cache
     */
    private setCache;
    /**
     * Private helper: Transform raw card data to CardData interface
     */
    private transformCardData;
    /**
     * Private helper: Transform raw ability data to AbilityData interface
     */
    private transformAbilityData;
    /**
     * Load all game data including cards, abilities, keywords, and localization
     * Implements IGameDataLoader interface
     */
    loadGameData(languageCode?: SupportedLanguage): Promise<GameDataSet>;
    /**
     * Load only card data as Map (IGameDataLoader interface)
     */
    loadCards(): Promise<Map<number, CardData>>;
    /**
     * Load only ability data (IGameDataLoader interface)
     */
    loadAbilities(): Promise<Map<number, AbilityData>>;
    /**
     * Load keyword database (from game-data-loader.ts)
     */
    loadKeywords(): Promise<Map<number, string>>;
    /**
     * Create localization manager (from game-data-loader.ts)
     */
    createLocalizationManager(): Promise<ILocalizationManager>;
}
export declare const dataLoader: DataLoader;
export declare function createDataLoader(config: DataLoaderConfig): DataLoader;
export {};
//# sourceMappingURL=DataLoader.d.ts.map