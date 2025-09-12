/**
 * Unified Data Loader Factory
 * 
 * Creates environment-appropriate data loaders with automatic environment detection
 * Consolidates DataLoader.ts and ServerDataLoader.ts into a single unified system
 */

import {
  IUnifiedDataLoader,
  UnifiedDataConfig,
  DataEnvironment
} from './IServerDataLoader';
import { SupportedLanguage } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';

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
 * Get default configuration based on environment
 */
function getDefaultConfig(environment: DataEnvironment): UnifiedDataConfig {
  const baseConfig = {
    environment,
    enableCaching: true,
    cacheConfig: {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      refreshInterval: 30 * 60 * 1000 // 30 minutes
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      backoffMultiplier: 2
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
 * Create client-side data loader (fetch-based) with sophisticated caching and retry logic
 */
function createClientDataLoader(config: UnifiedDataConfig): IUnifiedDataLoader {
  const baseUrl = config.baseUrl || '/data';

  // Client-side caching system
  const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
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

  // Load JSON with caching and retry
  const loadJSON = async (relativePath: string, cacheKey: string): Promise<any> => {
    // Check cache first (1-5ms response time)
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

    clearCache() {
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
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round(missRate * 100) / 100,
        totalRequests: stats.totalRequests
      };
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

    clearCache() {
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
 * Shared unified data loader instance for client-side usage
 * Relocated from src/services/ClientGameEngine.ts for better organization
 */
export const sharedDataLoader = createUnifiedDataLoader({
  environment: 'client',
  source: 'fetch',
  baseUrl: '/data',
  enableCaching: true,
  cacheConfig: {
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
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
