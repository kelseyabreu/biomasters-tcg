/**
 * Card Localization Hook
 * Provides memoized and cached localization for card names, descriptions, and other text
 * Optimizes performance by reducing redundant localization calls
 */

import { useMemo, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { UITextId, CardNameId } from '@shared/text-ids';

/**
 * Cached localization results to avoid repeated calls
 */
const localizationCache = new Map<string, string>();

/**
 * Cache timeout in milliseconds (5 minutes)
 */
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  value: string;
  timestamp: number;
}

/**
 * Enhanced cache with expiration
 */
const enhancedCache = new Map<string, CacheEntry>();

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of enhancedCache.entries()) {
    if (now - entry.timestamp > CACHE_TIMEOUT) {
      enhancedCache.delete(key);
    }
  }
}

/**
 * Get cached localization or compute and cache it
 */
function getCachedLocalization(key: string, computeFn: () => string): string {
  // Check enhanced cache first
  const cached = enhancedCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
    return cached.value;
  }

  // Compute new value
  try {
    const value = computeFn();
    enhancedCache.set(key, {
      value,
      timestamp: Date.now()
    });
    return value;
  } catch (error) {
    console.warn(`Failed to get localization for key ${key}:`, error);
    // Return fallback value
    return key.replace(/^CARD_/, '').replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Hook for card localization with caching and memoization
 */
export function useCardLocalization() {
  const localization = useLocalization();

  // Clear expired cache entries periodically
  useMemo(() => {
    clearExpiredCache();
  }, []);

  /**
   * Get localized card name with caching
   */
  const getCardName = useCallback((nameId: string): string => {
    const cacheKey = `name:${nameId}`;
    return getCachedLocalization(cacheKey, () => localization.getCardName(nameId as any));
  }, [localization]);

  /**
   * Get localized scientific name with caching
   */
  const getScientificName = useCallback((scientificNameId: string): string => {
    const cacheKey = `scientific:${scientificNameId}`;
    return getCachedLocalization(cacheKey, () => localization.getScientificName(scientificNameId as any));
  }, [localization]);

  /**
   * Get localized card description with caching
   */
  const getCardDescription = useCallback((descriptionId: string): string => {
    const cacheKey = `description:${descriptionId}`;
    // Note: LocalizationContext doesn't have getCardDescription, using fallback
    return getCachedLocalization(cacheKey, () => {
      // Fallback implementation
      return descriptionId.replace(/^CARD_/, '').replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase()) + ' Description';
    });
  }, []);

  /**
   * Get localized taxonomy with caching
   */
  const getTaxonomy = useCallback((taxonomyId: string): string => {
    const cacheKey = `taxonomy:${taxonomyId}`;
    // Note: LocalizationContext doesn't have getTaxonomy, using fallback
    return getCachedLocalization(cacheKey, () => {
      // Fallback implementation
      return taxonomyId.replace(/^TAXONOMY_/, '').replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
    });
  }, []);

  /**
   * Get localized ability name with caching
   */
  const getAbilityName = useCallback((abilityNameId: string): string => {
    const cacheKey = `ability:${abilityNameId}`;
    return getCachedLocalization(cacheKey, () => localization.getAbilityName(abilityNameId as any));
  }, [localization]);

  /**
   * Get localized UI text with caching
   */
  const getUIText = useCallback((textId: UITextId): string => {
    const cacheKey = `ui:${textId}`;
    return getCachedLocalization(cacheKey, () => localization.getUIText(textId));
  }, [localization]);

  /**
   * Batch get card names for multiple cards
   */
  const getBatchCardNames = useCallback((nameIds: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const nameId of nameIds) {
      result[nameId] = getCardName(nameId);
    }
    return result;
  }, [getCardName]);

  /**
   * Batch get scientific names for multiple cards
   */
  const getBatchScientificNames = useCallback((scientificNameIds: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const scientificNameId of scientificNameIds) {
      result[scientificNameId] = getScientificName(scientificNameId);
    }
    return result;
  }, [getScientificName]);

  /**
   * Get complete card localization data
   */
  const getCardLocalization = useCallback((card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }) => {
    return {
      name: getCardName(card.nameId),
      scientificName: getScientificName(card.scientificNameId),
      description: getCardDescription(card.descriptionId),
      taxonomy: getTaxonomy(card.taxonomyId)
    };
  }, [getCardName, getScientificName, getCardDescription, getTaxonomy]);

  /**
   * Preload localization for a list of cards
   */
  const preloadCardLocalizations = useCallback((cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>) => {
    // Preload all localizations in batch to warm the cache
    cards.forEach(card => {
      getCardName(card.nameId);
      getScientificName(card.scientificNameId);
      getCardDescription(card.descriptionId);
      getTaxonomy(card.taxonomyId);
    });
  }, [getCardName, getScientificName, getCardDescription, getTaxonomy]);

  /**
   * Clear the localization cache
   */
  const clearCache = useCallback(() => {
    enhancedCache.clear();
    localizationCache.clear();
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return {
      size: enhancedCache.size,
      entries: Array.from(enhancedCache.keys())
    };
  }, []);

  return {
    // Individual localization functions
    getCardName,
    getScientificName,
    getCardDescription,
    getTaxonomy,
    getAbilityName,
    getUIText,

    // Batch functions
    getBatchCardNames,
    getBatchScientificNames,
    getCardLocalization,

    // Utility functions
    preloadCardLocalizations,
    clearCache,
    getCacheStats,

    // Context information
    currentLanguage: localization.currentLanguage,
    isLoading: localization.isLoading
  };
}

/**
 * Hook for localization with automatic preloading for collections
 */
export function useCollectionLocalization(cards: Array<{
  nameId: string;
  scientificNameId: string;
  descriptionId: string;
  taxonomyId: string;
}>) {
  const localizationHook = useCardLocalization();

  // Preload localizations when cards change
  useMemo(() => {
    if (cards.length > 0) {
      localizationHook.preloadCardLocalizations(cards);
    }
  }, [cards, localizationHook]);

  return localizationHook;
}

/**
 * Simple hook for single card localization
 */
export function useSingleCardLocalization(card: {
  nameId: string;
  scientificNameId: string;
  descriptionId: string;
  taxonomyId: string;
}) {
  const { getCardLocalization } = useCardLocalization();

  return useMemo(() => {
    return getCardLocalization(card);
  }, [card, getCardLocalization]);
}

/**
 * Hook for UI text localization (replaces the old useUILocalization)
 */
export function useUILocalization() {
  const { getUIText, currentLanguage, isLoading } = useCardLocalization();

  return {
    getUIText,
    currentLanguage,
    isLoading,
    // Common UI text getters
    getButtonText: (textId: UITextId) => getUIText(textId),
    getMenuText: (textId: UITextId) => getUIText(textId),
    getErrorText: (textId: UITextId) => getUIText(textId)
  };
}

/**
 * Hook for card-specific localization (replaces the old simple useCardLocalization from context)
 */
export function useSimpleCardLocalization() {
  const { getCardName, currentLanguage, isLoading } = useCardLocalization();

  return {
    getCardName,
    currentLanguage,
    isLoading,
    // Helper for getting card display info
    getCardDisplayInfo: (nameId: CardNameId) => ({
      name: getCardName(nameId),
      language: currentLanguage,
      isLoading
    })
  };
}
