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
import { nameIdToCardId } from '../utils/cardIdHelpers';
import { ILocalizationManager, LocalizationManager, JSONFileDataLoader } from '../localization-manager';
import { SupportedLanguage } from '../text-ids';
import { IUnifiedDataLoader, LoadResult as UnifiedLoadResult } from './IServerDataLoader';

/**
 * Data loading configuration
 */
interface DataLoaderConfig {
  baseUrl?: string;
  enableCaching?: boolean;
  cacheTimeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
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
 * Implements IGameDataLoader interface for backward compatibility
 */
export class DataLoader implements IGameDataLoader {
  private config: Required<DataLoaderConfig>;
  private cache = new Map<string, CacheEntry<any>>();
  private loadingPromises = new Map<string, Promise<any>>();

  constructor(config: DataLoaderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/data',
      enableCaching: config.enableCaching ?? true,
      cacheTimeout: config.cacheTimeout ?? 5 * 60 * 1000, // 5 minutes
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000, // 1 second
    };
  }

  /**
   * Load all card data from the centralized cards.json file
   */
  async loadAllCards(): Promise<LoadResult<CardData[]>> {
    const cacheKey = 'all-cards';
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<CardData[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      try {
        const data = await this.loadingPromises.get(cacheKey);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    // Start loading
    const loadPromise = this.fetchWithRetry(`${this.config.baseUrl}/game-config/cards.json`)
      .then(response => response.json())
      .then((data: unknown) => {
        const cardsArray = data as any[];
        // Transform data to match CardData interface
        const cards: CardData[] = cardsArray.map((card: any) => this.transformCardData(card));
        
        // Cache the result
        if (this.config.enableCaching) {
          this.setCache(cacheKey, cards);
        }
        
        return cards;
      })
      .finally(() => {
        this.loadingPromises.delete(cacheKey);
      });

    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const data = await loadPromise;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Load a specific card by CardId
   */
  async loadCard(cardId: CardId): Promise<LoadResult<CardData>> {
    const cacheKey = `card-${cardId}`;
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<CardData>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    // Try to get from all cards cache first
    const allCardsResult = await this.loadAllCards();
    if (allCardsResult.success && allCardsResult.data) {
      const card = allCardsResult.data.find(c => c.cardId === cardId);
      if (card) {
        // Cache individual card
        if (this.config.enableCaching) {
          this.setCache(cacheKey, card);
        }
        return { success: true, data: card };
      }
    }

    return { success: false, error: `Card with ID ${cardId} not found` };
  }

  /**
   * Load a card by nameId (string identifier)
   */
  async loadCardByNameId(nameId: string): Promise<LoadResult<CardData>> {
    const cardId = nameIdToCardId(nameId);
    if (!cardId) {
      return { success: false, error: `Invalid nameId: ${nameId}` };
    }
    return this.loadCard(cardId);
  }

  /**
   * Load multiple cards by CardIds
   */
  async loadCardsByIds(cardIds: CardId[]): Promise<LoadResult<CardData[]>> {
    const cacheKey = `cards-${cardIds.sort().join(',')}`;
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<CardData[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    // Load all cards and filter
    const allCardsResult = await this.loadAllCards();
    if (!allCardsResult.success || !allCardsResult.data) {
      return { success: false, error: allCardsResult.error || 'Failed to load cards' };
    }

    const cards = allCardsResult.data.filter(card => cardIds.includes(card.cardId));
    
    // Cache the result
    if (this.config.enableCaching) {
      this.setCache(cacheKey, cards);
    }

    return { success: true, data: cards };
  }

  /**
   * Load all ability data
   */
  async loadAllAbilities(): Promise<LoadResult<AbilityData[]>> {
    const cacheKey = 'all-abilities';
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<AbilityData[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/game-config/abilities.json`);
      const data = await response.json() as any[];

      // Transform data to match AbilityData interface
      const abilities: AbilityData[] = data.map((ability: any) => this.transformAbilityData(ability));
      
      // Cache the result
      if (this.config.enableCaching) {
        this.setCache(cacheKey, abilities);
      }
      
      return { success: true, data: abilities };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Load game configuration data
   */
  async loadGameConfig(): Promise<LoadResult<any>> {
    const cacheKey = 'game-config';
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/game-config/game-config.json`);
      const data = await response.json();
      
      // Cache the result
      if (this.config.enableCaching) {
        this.setCache(cacheKey, data);
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; cacheHits: number; cacheMisses: number; hitRate: number; missRate: number; totalRequests: number; } {
    return {
      size: this.cache.size,
      cacheHits: 0, // TODO: Implement hit tracking
      cacheMisses: 0, // TODO: Implement miss tracking
      hitRate: 0, // TODO: Implement hit rate tracking
      missRate: 0, // TODO: Implement miss rate tracking
      totalRequests: 0 // TODO: Implement request tracking
    };
  }

  /**
   * Private helper: Fetch with retry logic
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Private helper: Get data from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Private helper: Set data in cache
   */
  private setCache<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.config.cacheTimeout
    });
  }

  /**
   * Private helper: Transform raw card data to CardData interface
   */
  private transformCardData(rawCard: any): CardData {
    return {
      cardId: rawCard.cardId,
      nameId: rawCard.nameId,
      scientificNameId: rawCard.scientificNameId,
      descriptionId: rawCard.descriptionId,
      taxonomyId: rawCard.taxonomyId,
      trophicLevel: rawCard.trophicLevel,
      trophicCategory: rawCard.trophicCategory,
      domain: rawCard.domain || 0,
      cost: rawCard.cost,
      victoryPoints: rawCard.victoryPoints || 0,
      mass_kg: rawCard.mass_kg,
      lifespan_max_days: rawCard.lifespan_max_days,
      vision_range_m: rawCard.vision_range_m,
      smell_range_m: rawCard.smell_range_m,
      hearing_range_m: rawCard.hearing_range_m,
      walk_speed_m_per_hr: rawCard.walk_speed_m_per_hr,
      run_speed_m_per_hr: rawCard.run_speed_m_per_hr,
      swim_speed_m_per_hr: rawCard.swim_speed_m_per_hr,
      fly_speed_m_per_hr: rawCard.fly_speed_m_per_hr,
      offspring_count: rawCard.offspring_count,
      gestation_days: rawCard.gestation_days,
      keywords: rawCard.keywords || [],
      abilities: rawCard.abilities || [],
      artwork_url: rawCard.artwork_url,
      conservation_status: rawCard.conservationStatus || rawCard.conservation_status,
      iucn_id: rawCard.iucn_id,
      population_trend: rawCard.population_trend,
      // Add taxonomy fields
      taxoDomain: rawCard.taxoDomain || rawCard.taxo_domain || null,
      taxoKingdom: rawCard.taxoKingdom || rawCard.taxo_kingdom || null,
      taxoPhylum: rawCard.taxoPhylum || rawCard.taxo_phylum || null,
      taxoClass: rawCard.taxoClass || rawCard.taxo_class || null,
      taxoOrder: rawCard.taxoOrder || rawCard.taxo_order || null,
      taxoFamily: rawCard.taxoFamily || rawCard.taxo_family || null,
      taxoGenus: rawCard.taxoGenus || rawCard.taxo_genus || null,
      taxoSpecies: rawCard.taxoSpecies || rawCard.taxo_species || null
    };
  }

  /**
   * Private helper: Transform raw ability data to AbilityData interface
   */
  private transformAbilityData(rawAbility: any): AbilityData {
    return {
      id: rawAbility.id || rawAbility.abilityId,
      nameId: rawAbility.nameId,
      descriptionId: rawAbility.descriptionId,
      triggerId: rawAbility.triggerId,
      effects: rawAbility.effects || []
    };
  }

  // ============================================================================
  // GAME DATA LOADER INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Load all game data including cards, abilities, keywords, and localization
   * Implements IGameDataLoader interface
   */
  async loadGameData(languageCode: SupportedLanguage = SupportedLanguage.ENGLISH): Promise<GameDataSet> {
    // Load all data in parallel
    const [cards, abilities, keywords, localizationManager] = await Promise.all([
      this.loadCards(),
      this.loadAbilities(),
      this.loadKeywords(),
      this.createLocalizationManager()
    ]);

    // Load the specified language
    await localizationManager.loadLanguage(languageCode);

    return {
      cards,
      abilities,
      keywords,
      localizationManager
    };
  }

  /**
   * Load only card data as Map (IGameDataLoader interface)
   */
  async loadCards(): Promise<Map<number, CardData>> {
    const result = await this.loadAllCards();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load cards');
    }

    const cardsMap = new Map<number, CardData>();
    for (const card of result.data) {
      cardsMap.set(card.cardId, card);
    }
    return cardsMap;
  }

  /**
   * Load only ability data (IGameDataLoader interface)
   */
  async loadAbilities(): Promise<Map<number, AbilityData>> {
    const result = await this.loadAllAbilities();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load abilities');
    }

    const abilitiesMap = new Map<number, AbilityData>();
    for (const ability of result.data) {
      abilitiesMap.set(ability.id, ability);
    }
    return abilitiesMap;
  }

  /**
   * Load keyword database (from game-data-loader.ts)
   */
  async loadKeywords(): Promise<Map<number, string>> {
    const cacheKey = 'keywords';

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<Map<number, string>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/game-config/keywords.json`);
      const keywordsArray: Array<{ id: number; name: string }> = await response.json() as Array<{ id: number; name: string }>;

      const keywordsMap = new Map<number, string>();
      for (const keyword of keywordsArray) {
        keywordsMap.set(keyword.id, keyword.name);
      }

      // Cache the result
      if (this.config.enableCaching) {
        this.setCache(cacheKey, keywordsMap);
      }

      return keywordsMap;
    } catch (error) {
      throw new Error(`Failed to load keywords: ${error}`);
    }
  }

  /**
   * Create localization manager (from game-data-loader.ts)
   */
  async createLocalizationManager(): Promise<ILocalizationManager> {
    const dataLoader = new JSONFileDataLoader(this.config.baseUrl + '/localization');
    return new LocalizationManager(dataLoader);
  }
  // Note: The UnifiedDataLoaderAdapter below provides IUnifiedDataLoader interface implementation

  /**
   * Preload commonly used data
   */
  async preloadData(): Promise<void> {
    try {
      await Promise.all([
        this.loadCards(),
        this.loadAbilities(),
        this.loadKeywords(),
        this.createLocalizationManager()
      ]);
    } catch (error) {
      console.error('Failed to preload data:', error);
    }
  }

  /**
   * Health check for the data source
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test loading a small piece of data
      const cardsResult = await this.loadCards();
      return cardsResult.size > 0; // Check if we got any cards
    } catch (error) {
      return false;
    }
  }
}

/**
 * Unified Data Loader Adapter
 * Wraps the existing DataLoader to implement IUnifiedDataLoader interface
 */
export class UnifiedDataLoaderAdapter implements IUnifiedDataLoader {
  private dataLoader: DataLoader;

  constructor(config: DataLoaderConfig = {}) {
    this.dataLoader = new DataLoader(config);
  }

  async loadCards(): Promise<UnifiedLoadResult<CardData[]>> {
    return this.dataLoader.loadAllCards();
  }

  async loadAbilities(): Promise<UnifiedLoadResult<AbilityData[]>> {
    return this.dataLoader.loadAllAbilities();
  }

  async loadGameConfig(): Promise<UnifiedLoadResult<any>> {
    try {
      const response = await (this.dataLoader as any).fetchWithRetry(`${(this.dataLoader as any).config.baseUrl}/game-config/game-config.json`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async loadKeywords(): Promise<UnifiedLoadResult<Array<{ id: number; name: string }>>> {
    try {
      const keywords = await this.dataLoader.loadKeywords();
      // Convert Map to Array format expected by the interface
      const keywordArray = Array.from(keywords.entries()).map(([id, name]) => ({ id, name }));
      return { success: true, data: keywordArray };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async loadLocalizationData(languageCode: SupportedLanguage): Promise<UnifiedLoadResult<any>> {
    try {
      const localizationManager = await this.dataLoader.createLocalizationManager();
      await localizationManager.loadLanguage(languageCode);

      // Extract the loaded data
      const data = {
        cards: (localizationManager as any).cardNames || {},
        abilities: (localizationManager as any).abilityNames || {},
        ui: (localizationManager as any).uiTexts || {},
        taxonomy: (localizationManager as any).taxonomyTexts || {}
      };

      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getCardById(cardId: number): Promise<UnifiedLoadResult<CardData | null>> {
    const cardsResult = await this.loadCards();

    if (!cardsResult.success || !cardsResult.data) {
      return { success: false, error: cardsResult.error || 'Failed to load cards' };
    }

    const card = cardsResult.data.find(c => c.cardId === cardId) || null;
    return {
      success: true,
      data: card,
      fromCache: cardsResult.fromCache || false
    };
  }

  async getAbilityById(abilityId: number): Promise<UnifiedLoadResult<AbilityData | null>> {
    const abilitiesResult = await this.loadAbilities();

    if (!abilitiesResult.success || !abilitiesResult.data) {
      return { success: false, error: abilitiesResult.error || 'Failed to load abilities' };
    }

    const ability = abilitiesResult.data.find(a => a.id === abilityId) || null;
    return {
      success: true,
      data: ability,
      fromCache: abilitiesResult.fromCache || false
    };
  }

  async createLocalizationManager(): Promise<ILocalizationManager> {
    return this.dataLoader.createLocalizationManager();
  }

  clearCache(): void {
    this.dataLoader.clearCache();
  }

  getCacheStats(): { size: number; cacheHits: number; cacheMisses: number; hitRate: number; missRate: number; totalRequests: number; } {
    const basicStats = this.dataLoader.getCacheStats();
    return {
      size: basicStats.size,
      cacheHits: basicStats.cacheHits,
      cacheMisses: basicStats.cacheMisses,
      hitRate: basicStats.hitRate,
      missRate: basicStats.missRate,
      totalRequests: basicStats.totalRequests
    };
  }

  async preloadData(): Promise<void> {
    try {
      await Promise.all([
        this.loadCards(),
        this.loadAbilities(),
        this.loadGameConfig(),
        this.loadLocalizationData(SupportedLanguage.ENGLISH)
      ]);
    } catch (error) {
      console.error('Failed to preload data:', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const cardsResult = await this.loadCards();
      return cardsResult.success;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance for convenience
export const dataLoader = new DataLoader();

// Export factory function for custom configurations
export function createDataLoader(config: DataLoaderConfig): DataLoader {
  return new DataLoader(config);
}

// Export unified data loader factory
export function createUnifiedDataLoaderFromConfig(config: DataLoaderConfig): IUnifiedDataLoader {
  return new UnifiedDataLoaderAdapter(config);
}
