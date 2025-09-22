/**
 * BioMasters TCG - Localization Manager
 *
 * This module provides a centralized interface for accessing localized text content.
 * It loads language-specific JSON files and provides type-safe text lookup methods.
 */

import {
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  AbilityDescriptionId,
  KeywordNameId,
  UITextId,
  TaxonomyId,
  TaxonomyDisplayId,
  SupportedLanguage
} from './text-ids';

// Helper function to safely access localStorage
const getLocalStorage = (): any | null => {
  try {
    return typeof globalThis !== 'undefined' && (globalThis as any).localStorage ? (globalThis as any).localStorage : null;
  } catch {
    return null;
  }
};

// ============================================================================
// LOCALIZATION DATA INTERFACES
// ============================================================================

/**
 * Interface for card localization data
 */
export interface CardLocalizationData {
  names: Record<CardNameId, string>;
  scientificNames: Record<ScientificNameId, string>;
  descriptions: Record<CardDescriptionId, string>;
}

/**
 * Interface for ability localization data
 */
export interface AbilityLocalizationData {
  names: Record<AbilityNameId, string>;
  descriptions: Record<AbilityDescriptionId, string>;
  flavorText?: Record<AbilityNameId, string>;
}

/**
 * Interface for UI localization data
 */
export interface UILocalizationData {
  // Core UI categories (match actual localization file structure)
  general: Record<string, string>;
  tabs: Record<string, string>;
  home: Record<string, string>;
  settings: Record<string, string>;
  deckBuilder: Record<string, string>;

  // Game-specific categories
  gameActions: Record<string, string>;
  gamePhases: Record<string, string>;
  gameStates: Record<string, string>;

  // Error and messaging categories
  errorMessages: Record<string, string>;

  // Game terms and states
  gameTerms: Record<string, string>;

  // Content categories
  keywords: Record<KeywordNameId, string>;
  trophicCategories: Record<string, string>;

  // Authentication and user management
  authentication: Record<string, string>;
  authMessages: Record<string, string>;
  guestRegistration: Record<string, string>;

  // Game modes and features
  battle: Record<string, string>;
  endGame: Record<string, string>;
  collection: Record<string, string>;
  connectivity: Record<string, string>;

  // Page-specific categories
  packOpening: Record<string, string>;
  settingsPage: Record<string, string>;
  collectionPage: Record<string, string>;
  commonMessages: Record<string, string>;
  onlineMultiplayer: Record<string, string>;
}

/**
 * Interface for taxonomy localization data
 */
export interface TaxonomyLocalizationData {
  // Legacy taxonomy data (keep for backward compatibility)
  taxonomy: Record<TaxonomyId, {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    commonNames: string[];
  }>;

  // New taxonomy display data (for enum-based system)
  domains: Record<string, string>;
  kingdoms: Record<string, string>;
  phylums: Record<string, string>;
  classes: Record<string, string>;
  orders: Record<string, string>;
  families: Record<string, string>;
  genera: Record<string, string>;
  species: Record<string, string>;
}

/**
 * Complete localization data for a language
 */
export interface LanguageData {
  cards: CardLocalizationData;
  abilities: AbilityLocalizationData;
  ui: UILocalizationData;
  taxonomy: TaxonomyLocalizationData;
}

// ============================================================================
// LOCALIZATION MANAGER INTERFACE
// ============================================================================

/**
 * Interface for the localization manager
 */
export interface ILocalizationManager {
  /**
   * Current language code (e.g., 'en', 'es', 'fr')
   */
  readonly currentLanguage: string;

  /**
   * Available language codes
   */
  readonly availableLanguages: SupportedLanguage[];

  /**
   * Load localization data for a specific language
   */
  loadLanguage(languageCode: SupportedLanguage): Promise<void>;

  /**
   * Get localized card name
   */
  getCardName(nameId: CardNameId): string;

  /**
   * Get localized scientific name
   */
  getScientificName(scientificNameId: ScientificNameId): string;

  /**
   * Get localized card description
   */
  getCardDescription(descriptionId: CardDescriptionId): string;

  /**
   * Get localized ability name
   */
  getAbilityName(nameId: AbilityNameId): string;

  /**
   * Get localized ability description
   */
  getAbilityDescription(descriptionId: AbilityDescriptionId): string;

  /**
   * Get localized ability flavor text
   */
  getAbilityFlavorText(nameId: AbilityNameId): string;

  /**
   * Get localized keyword name
   */
  getKeywordName(keywordId: KeywordNameId): string;

  /**
   * Get localized UI text
   */
  getUIText(textId: UITextId): string;

  /**
   * Get taxonomy information for a species
   */
  getTaxonomy(taxonomyId: TaxonomyId): {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    commonNames: string[];
  } | null;

  /**
   * Get formatted scientific name (genus + species)
   */
  getFormattedScientificName(taxonomyId: TaxonomyId): string;

  /**
   * Get taxonomy display name (for new enum-based system)
   */
  getTaxonomyName(taxonomyDisplayId: TaxonomyDisplayId): string;

  /**
   * Check if a text ID exists in the current language
   */
  hasText(textId: string): boolean;

  /**
   * Get raw text by ID (fallback method)
   */
  getText(textId: string): string;

  /**
   * Batch operations for better performance
   */
  getBatchCardNames?(nameIds: string[]): Record<string, string>;
  getBatchScientificNames?(scientificNameIds: string[]): Record<string, string>;
  getBatchCardDescriptions?(descriptionIds: string[]): Record<string, string>;

  /**
   * Get complete card localization
   */
  getCardLocalization?(card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId?: string;
  }): {
    name: string;
    scientificName: string;
    description: string;
    taxonomy: string;
  };

  /**
   * Preload localizations for better performance
   */
  preloadLocalizations?(cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>): void;

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats?(): { hits: number; misses: number; size: number; hitRate: number };
}

// ============================================================================
// LOCALIZATION MANAGER IMPLEMENTATION
// ============================================================================

/**
 * Cache entry with metadata for localization
 */
interface LocalizationCacheEntry {
  value: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration for localization
 */
interface LocalizationCacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enablePersistence: boolean;
  storageKey: string;
}

/**
 * Default implementation of the localization manager with integrated caching
 */
export class LocalizationManager implements ILocalizationManager {
  private _currentLanguage: SupportedLanguage = SupportedLanguage.ENGLISH;
  private _availableLanguages: SupportedLanguage[] = [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  private _languageData: LanguageData | null = null;

  // Integrated caching system
  private cache = new Map<string, LocalizationCacheEntry>();
  private cacheConfig: LocalizationCacheConfig = {
    maxSize: 1000,
    ttl: 30 * 60 * 1000, // 30 minutes
    enablePersistence: true,
    storageKey: 'biomasters-localization-cache'
  };
  private cacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  constructor(private dataLoader: ILocalizationDataLoader, cacheConfig?: Partial<LocalizationCacheConfig>) {
    if (cacheConfig) {
      this.cacheConfig = { ...this.cacheConfig, ...cacheConfig };
    }

    // Load from localStorage if available and in browser environment
    if (this.cacheConfig.enablePersistence && getLocalStorage()) {
      this.loadCacheFromStorage();
    }

    // Set up periodic cleanup (only in browser environment)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupExpiredCache(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  get currentLanguage(): SupportedLanguage {
    return this._currentLanguage;
  }

  get availableLanguages(): SupportedLanguage[] {
    return [...this._availableLanguages];
  }

  async loadLanguage(languageCode: SupportedLanguage): Promise<void> {
    if (!this._availableLanguages.includes(languageCode)) {
      throw new Error(`Language '${languageCode}' is not available`);
    }

    this._languageData = await this.dataLoader.loadLanguageData(languageCode);
    this._currentLanguage = languageCode;

    // Clear cache when language changes
    this.clearCache();
  }

  getCardName(nameId: CardNameId): string {
    return this.getCachedLocalization(`name:${nameId}`, () =>
      this._languageData?.cards.names[nameId] ?? `[${nameId}]`
    );
  }

  getScientificName(scientificNameId: ScientificNameId): string {
    return this.getCachedLocalization(`scientific:${scientificNameId}`, () =>
      this._languageData?.cards.scientificNames[scientificNameId] ?? `[${scientificNameId}]`
    );
  }

  getCardDescription(descriptionId: CardDescriptionId): string {
    return this.getCachedLocalization(`description:${descriptionId}`, () =>
      this._languageData?.cards.descriptions[descriptionId] ?? `[${descriptionId}]`
    );
  }

  getAbilityName(nameId: AbilityNameId): string {
    return this.getCachedLocalization(`ability:${nameId}`, () =>
      this._languageData?.abilities.names[nameId] ?? `[${nameId}]`
    );
  }

  getAbilityDescription(descriptionId: AbilityDescriptionId): string {
    return this.getCachedLocalization(`abilityDesc:${descriptionId}`, () =>
      this._languageData?.abilities.descriptions[descriptionId] ?? `[${descriptionId}]`
    );
  }

  getAbilityFlavorText(nameId: AbilityNameId): string {
    return this._languageData?.abilities.flavorText?.[nameId] ?? '';
  }

  getKeywordName(keywordId: KeywordNameId): string {
    return this._languageData?.ui.keywords[keywordId] ?? `[${keywordId}]`;
  }

  getUIText(textId: UITextId): string {
    // Search through all UI text categories that actually exist in localization files
    const ui = this._languageData?.ui;
    if (!ui) return `[${textId}]`;

    return ui.general[textId] ??
           ui.tabs[textId] ??
           ui.home[textId] ??
           ui.settings[textId] ??
           ui.deckBuilder[textId] ??
           ui.gameActions[textId] ??
           ui.gamePhases[textId] ??
           ui.gameStates[textId] ??
           ui.errorMessages[textId] ??
           ui.gameTerms[textId] ??
           ui.trophicCategories[textId] ??
           ui.authentication[textId] ??
           ui.authMessages[textId] ??
           ui.guestRegistration[textId] ??
           ui.battle[textId] ??
           ui.endGame[textId] ??
           ui.collection[textId] ??
           ui.connectivity[textId] ??
           ui.packOpening[textId] ??
           ui.settingsPage[textId] ??
           ui.collectionPage[textId] ??
           ui.commonMessages[textId] ??
           ui.onlineMultiplayer[textId] ??
           `[${textId}]`;
  }

  getTaxonomy(taxonomyId: TaxonomyId) {
    return this._languageData?.taxonomy.taxonomy[taxonomyId] ?? null;
  }

  getFormattedScientificName(taxonomyId: TaxonomyId): string {
    const taxonomy = this.getTaxonomy(taxonomyId);
    if (!taxonomy) return `[${taxonomyId}]`;

    return `${taxonomy.genus} ${taxonomy.species}`;
  }

  getTaxonomyName(taxonomyDisplayId: TaxonomyDisplayId): string {
    const taxonomy = this._languageData?.taxonomy;
    if (!taxonomy) return `[${taxonomyDisplayId}]`;

    // Search through all taxonomy categories
    return taxonomy.domains[taxonomyDisplayId] ??
           taxonomy.kingdoms[taxonomyDisplayId] ??
           taxonomy.phylums[taxonomyDisplayId] ??
           taxonomy.classes[taxonomyDisplayId] ??
           taxonomy.orders[taxonomyDisplayId] ??
           taxonomy.families[taxonomyDisplayId] ??
           taxonomy.genera[taxonomyDisplayId] ??
           taxonomy.species[taxonomyDisplayId] ??
           `[${taxonomyDisplayId}]`;
  }

  hasText(textId: string): boolean {
    return this.getText(textId) !== `[${textId}]`;
  }

  getText(textId: string): string {
    // This is a fallback method that searches all text categories
    const data = this._languageData;
    if (!data) return `[${textId}]`;

    // Optimized search: check each category directly instead of creating a merged object
    // This avoids the overhead of object spreading and is much faster

    // Check cards first (most common)
    if (data.cards.names[textId as keyof typeof data.cards.names]) {
      return data.cards.names[textId as keyof typeof data.cards.names];
    }
    if (data.cards.scientificNames[textId as keyof typeof data.cards.scientificNames]) {
      return data.cards.scientificNames[textId as keyof typeof data.cards.scientificNames];
    }
    if (data.cards.descriptions[textId as keyof typeof data.cards.descriptions]) {
      return data.cards.descriptions[textId as keyof typeof data.cards.descriptions];
    }

    // Check abilities
    if (data.abilities.names[textId as keyof typeof data.abilities.names]) {
      return data.abilities.names[textId as keyof typeof data.abilities.names];
    }
    if (data.abilities.descriptions[textId as keyof typeof data.abilities.descriptions]) {
      return data.abilities.descriptions[textId as keyof typeof data.abilities.descriptions];
    }
    if (data.abilities.flavorText && data.abilities.flavorText[textId as keyof typeof data.abilities.flavorText]) {
      return data.abilities.flavorText[textId as keyof typeof data.abilities.flavorText];
    }

    // Check UI text
    if (data.ui.gameActions[textId as keyof typeof data.ui.gameActions]) {
      return data.ui.gameActions[textId as keyof typeof data.ui.gameActions]!;
    }
    if (data.ui.gamePhases[textId as keyof typeof data.ui.gamePhases]) {
      return data.ui.gamePhases[textId as keyof typeof data.ui.gamePhases]!;
    }
    if (data.ui.gameStates[textId as keyof typeof data.ui.gameStates]) {
      return data.ui.gameStates[textId as keyof typeof data.ui.gameStates]!;
    }
    if (data.ui.errorMessages[textId as keyof typeof data.ui.errorMessages]) {
      return data.ui.errorMessages[textId as keyof typeof data.ui.errorMessages]!;
    }
    if (data.ui.gameTerms[textId as keyof typeof data.ui.gameTerms]) {
      return data.ui.gameTerms[textId as keyof typeof data.ui.gameTerms]!;
    }
    if (data.ui.keywords[textId as keyof typeof data.ui.keywords]) {
      return data.ui.keywords[textId as keyof typeof data.ui.keywords]!;
    }
    if (data.ui.trophicCategories[textId as keyof typeof data.ui.trophicCategories]) {
      return data.ui.trophicCategories[textId as keyof typeof data.ui.trophicCategories]!;
    }

    return `[${textId}]`;
  }

  // ============================================================================
  // INTEGRATED CACHING SYSTEM
  // ============================================================================

  /**
   * Get cached localization or compute and cache it
   */
  private getCachedLocalization(key: string, computeFn: () => string): string {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isCacheEntryValid(cached)) {
      // Update access metadata
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.cacheStats.hits++;
      this.updateCacheHitRate();
      return cached.value;
    }

    // Cache miss - compute new value
    this.cacheStats.misses++;
    this.updateCacheHitRate();

    let value: string;
    try {
      value = computeFn();
    } catch (error) {
      console.warn(`Failed to get localization for key ${key}:`, error);
      // Fallback to formatted key
      value = this.formatFallbackValue(key);
    }

    // Store in cache
    this.setCacheEntry(key, value);
    return value;
  }

  /**
   * Set value in cache
   */
  private setCacheEntry(key: string, value: string): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictLRUEntry();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });

    this.cacheStats.size = this.cache.size;

    // Persist if enabled
    if (this.cacheConfig.enablePersistence) {
      this.saveCacheToStorage();
    }
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isCacheEntryValid(entry: LocalizationCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.cacheConfig.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRUEntry(): void {
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
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheConfig.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.cacheStats.size = this.cache.size;

    if (keysToDelete.length > 0 && this.cacheConfig.enablePersistence) {
      this.saveCacheToStorage();
    }
  }

  /**
   * Update hit rate statistic
   */
  private updateCacheHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  /**
   * Format fallback value from key
   */
  private formatFallbackValue(key: string): string {
    const textId = key.includes(':') ? (key.split(':')[1] || key) : key;
    return textId
      .replace(/^(CARD_|ABILITY_|TAXONOMY_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    const storage = getLocalStorage();
    if (!storage) return;

    try {
      const serializable = Array.from(this.cache.entries())
        .filter(([, entry]) => this.isCacheEntryValid(entry))
        .map(([key, entry]) => [key, {
          value: entry.value,
          timestamp: entry.timestamp,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed
        }]);

      storage.setItem(this.cacheConfig.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save localization cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    const storage = getLocalStorage();
    if (!storage) return;

    try {
      const stored = storage.getItem(this.cacheConfig.storageKey);
      if (!stored) return;

      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        for (const [key, entry] of entries) {
          if (this.isCacheEntryValid(entry)) {
            this.cache.set(key, entry);
          }
        }
      }

      this.cacheStats.size = this.cache.size;
    } catch (error) {
      console.warn('Failed to load localization cache:', error);
      this.clearCacheStorage();
    }
  }

  /**
   * Clear localStorage
   */
  private clearCacheStorage(): void {
    const storage = getLocalStorage();
    if (!storage) return;

    try {
      storage.removeItem(this.cacheConfig.storageKey);
    } catch (error) {
      console.warn('Failed to clear localization cache storage:', error);
    }
  }

  /**
   * Clear all cache data
   */
  private clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
    this.clearCacheStorage();
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    return { ...this.cacheStats };
  }

  /**
   * Batch get multiple localizations
   */
  getBatchCardNames(nameIds: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const nameId of nameIds) {
      result[nameId] = this.getCardName(nameId as CardNameId);
    }
    return result;
  }

  /**
   * Batch get multiple scientific names
   */
  getBatchScientificNames(scientificNameIds: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const scientificNameId of scientificNameIds) {
      result[scientificNameId] = this.getScientificName(scientificNameId as ScientificNameId);
    }
    return result;
  }

  /**
   * Batch get multiple descriptions
   */
  getBatchCardDescriptions(descriptionIds: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const descriptionId of descriptionIds) {
      result[descriptionId] = this.getCardDescription(descriptionId as CardDescriptionId);
    }
    return result;
  }

  /**
   * Get complete card localization
   */
  getCardLocalization(card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId?: string;
  }): {
    name: string;
    scientificName: string;
    description: string;
    taxonomy: string;
  } {
    return {
      name: this.getCardName(card.nameId as CardNameId),
      scientificName: this.getScientificName(card.scientificNameId as ScientificNameId),
      description: this.getCardDescription(card.descriptionId as CardDescriptionId),
      taxonomy: card.taxonomyId ? this.formatFallbackValue(`taxonomy:${card.taxonomyId}`) : ''
    };
  }

  /**
   * Preload localizations for better performance
   */
  preloadLocalizations(cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>): void {
    cards.forEach(card => {
      this.getCardName(card.nameId as CardNameId);
      this.getScientificName(card.scientificNameId as ScientificNameId);
      this.getCardDescription(card.descriptionId as CardDescriptionId);
      // Note: getTaxonomy is not cached yet, but could be added if needed
    });
  }


}

// ============================================================================
// DATA LOADER INTERFACE
// ============================================================================

/**
 * Interface for loading localization data from various sources
 */
export interface ILocalizationDataLoader {
  /**
   * Load complete language data for a specific language
   */
  loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData>;

  /**
   * Get list of available languages
   */
  getAvailableLanguages(): Promise<SupportedLanguage[]>;
}

/**
 * JSON file-based data loader implementation
 */
export class JSONFileDataLoader implements ILocalizationDataLoader {
  constructor(private basePath: string = '/data/localization') {}

  async loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData> {
    const [cards, abilities, ui, taxonomy] = await Promise.all([
      this.loadJSON<CardLocalizationData>(`${this.basePath}/${languageCode}/cards.json`),
      this.loadJSON<AbilityLocalizationData>(`${this.basePath}/${languageCode}/abilities.json`),
      this.loadJSON<UILocalizationData>(`${this.basePath}/${languageCode}/ui.json`),
      this.loadJSON<TaxonomyLocalizationData>(`${this.basePath}/${languageCode}/taxonomy.json`)
    ]);

    return { cards, abilities, ui, taxonomy };
  }

  async getAvailableLanguages(): Promise<SupportedLanguage[]> {
    // Return all supported languages
    return [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  }

  private async loadJSON<T>(path: string): Promise<T> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }
}

// ============================================================================
// CONVENIENCE EXPORTS AND FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a LocalizationManager with custom cache configuration
 */
export function createLocalizationManager(
  dataLoader: ILocalizationDataLoader,
  cacheConfig?: Partial<LocalizationCacheConfig>
): LocalizationManager {
  return new LocalizationManager(dataLoader, cacheConfig);
}

/**
 * Create a default LocalizationManager with JSON file data loader
 */
export function createDefaultLocalizationManager(
  baseUrl: string = '/data/localization',
  cacheConfig?: Partial<LocalizationCacheConfig>
): LocalizationManager {
  const dataLoader = new JSONFileDataLoader(baseUrl);
  return new LocalizationManager(dataLoader, cacheConfig);
}