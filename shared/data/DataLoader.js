"use strict";
/**
 * Centralized Data Loader - Shared Module
 * Single source of truth for all data loading operations across frontend, server, and shared modules
 * Provides caching, error handling, and consistent data transformation
 *
 * Consolidates functionality from:
 * - shared/game-data-loader.ts (localization, keywords)
 * - server/src/services/GameDataManager.ts (server-specific loading)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataLoader = exports.DataLoader = void 0;
exports.createDataLoader = createDataLoader;
const cardIdHelpers_1 = require("../utils/cardIdHelpers");
const localization_manager_1 = require("../localization-manager");
const text_ids_1 = require("../text-ids");
/**
 * Centralized data loader class
 * Implements IGameDataLoader interface and consolidates all data loading functionality
 */
class DataLoader {
    constructor(config = {}) {
        this.cache = new Map();
        this.loadingPromises = new Map();
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
    async loadAllCards() {
        const cacheKey = 'all-cards';
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, fromCache: true };
            }
        }
        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            try {
                const data = await this.loadingPromises.get(cacheKey);
                return { success: true, data };
            }
            catch (error) {
                return { success: false, error: String(error) };
            }
        }
        // Start loading
        const loadPromise = this.fetchWithRetry(`${this.config.baseUrl}/game-config/cards.json`)
            .then(response => response.json())
            .then((data) => {
            const cardsArray = data;
            // Transform data to match CardData interface
            const cards = cardsArray.map((card) => this.transformCardData(card));
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
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Load a specific card by CardId
     */
    async loadCard(cardId) {
        const cacheKey = `card-${cardId}`;
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, fromCache: true };
            }
        }
        // Try to get from all cards cache first
        const allCardsResult = await this.loadAllCards();
        if (allCardsResult.success && allCardsResult.data) {
            const card = allCardsResult.data.find(c => c.id === cardId);
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
    async loadCardByNameId(nameId) {
        const cardId = (0, cardIdHelpers_1.nameIdToCardId)(nameId);
        if (!cardId) {
            return { success: false, error: `Invalid nameId: ${nameId}` };
        }
        return this.loadCard(cardId);
    }
    /**
     * Load multiple cards by CardIds
     */
    async loadCardsByIds(cardIds) {
        const cacheKey = `cards-${cardIds.sort().join(',')}`;
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, fromCache: true };
            }
        }
        // Load all cards and filter
        const allCardsResult = await this.loadAllCards();
        if (!allCardsResult.success || !allCardsResult.data) {
            return { success: false, error: allCardsResult.error || 'Failed to load cards' };
        }
        const cards = allCardsResult.data.filter(card => cardIds.includes(card.id));
        // Cache the result
        if (this.config.enableCaching) {
            this.setCache(cacheKey, cards);
        }
        return { success: true, data: cards };
    }
    /**
     * Load all ability data
     */
    async loadAllAbilities() {
        const cacheKey = 'all-abilities';
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, fromCache: true };
            }
        }
        try {
            const response = await this.fetchWithRetry(`${this.config.baseUrl}/game-config/abilities.json`);
            const data = await response.json();
            // Transform data to match AbilityData interface
            const abilities = data.map((ability) => this.transformAbilityData(ability));
            // Cache the result
            if (this.config.enableCaching) {
                this.setCache(cacheKey, abilities);
            }
            return { success: true, data: abilities };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Load game configuration data
     */
    async loadGameConfig() {
        const cacheKey = 'game-config';
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
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
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Clear specific cache entry
     */
    clearCacheEntry(key) {
        this.cache.delete(key);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
    /**
     * Private helper: Fetch with retry logic
     */
    async fetchWithRetry(url) {
        let lastError;
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
                }
            }
        }
        throw lastError;
    }
    /**
     * Private helper: Get data from cache
     */
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Private helper: Set data in cache
     */
    setCache(key, data) {
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
    transformCardData(rawCard) {
        return {
            id: rawCard.id || rawCard.cardId,
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
            population_trend: rawCard.population_trend
        };
    }
    /**
     * Private helper: Transform raw ability data to AbilityData interface
     */
    transformAbilityData(rawAbility) {
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
    async loadGameData(languageCode = text_ids_1.SupportedLanguage.ENGLISH) {
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
    async loadCards() {
        const result = await this.loadAllCards();
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to load cards');
        }
        const cardsMap = new Map();
        for (const card of result.data) {
            cardsMap.set(card.id, card);
        }
        return cardsMap;
    }
    /**
     * Load only ability data (IGameDataLoader interface)
     */
    async loadAbilities() {
        const result = await this.loadAllAbilities();
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to load abilities');
        }
        const abilitiesMap = new Map();
        for (const ability of result.data) {
            abilitiesMap.set(ability.id, ability);
        }
        return abilitiesMap;
    }
    /**
     * Load keyword database (from game-data-loader.ts)
     */
    async loadKeywords() {
        const cacheKey = 'keywords';
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const response = await this.fetchWithRetry(`${this.config.baseUrl}/game-config/keywords.json`);
            const keywordsArray = await response.json();
            const keywordsMap = new Map();
            for (const keyword of keywordsArray) {
                keywordsMap.set(keyword.id, keyword.name);
            }
            // Cache the result
            if (this.config.enableCaching) {
                this.setCache(cacheKey, keywordsMap);
            }
            return keywordsMap;
        }
        catch (error) {
            throw new Error(`Failed to load keywords: ${error}`);
        }
    }
    /**
     * Create localization manager (from game-data-loader.ts)
     */
    async createLocalizationManager() {
        const dataLoader = new localization_manager_1.JSONFileDataLoader(this.config.baseUrl + '/localization');
        return new localization_manager_1.LocalizationManager(dataLoader);
    }
}
exports.DataLoader = DataLoader;
// Export singleton instance for convenience
exports.dataLoader = new DataLoader();
// Export factory function for custom configurations
function createDataLoader(config) {
    return new DataLoader(config);
}
//# sourceMappingURL=DataLoader.js.map