/**
 * Card Localization Hook
 * Provides memoized localization for card names, descriptions, and other text
 * Uses the LocalizationManager's built-in caching for optimal performance
 */

import { useCallback, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { UITextId, CardNameId } from '@shared/text-ids';

/**
 * Hook for card localization using LocalizationManager's built-in caching
 */
export function useCardLocalization() {
  const localization = useLocalization();

  /**
   * Get localized card name (cached by LocalizationManager)
   */
  const getCardName = useCallback((nameId: string): string => {
    return localization.getCardName(nameId as any);
  }, [localization]);

  /**
   * Get localized scientific name (cached by LocalizationManager)
   */
  const getScientificName = useCallback((scientificNameId: string): string => {
    return localization.getScientificName(scientificNameId as any);
  }, [localization]);

  /**
   * Get localized card description (cached by LocalizationManager)
   */
  const getCardDescription = useCallback((descriptionId: string): string => {
    return localization.getCardDescription(descriptionId as any);
  }, [localization]);

  /**
   * Get localized taxonomy (fallback implementation)
   */
  const getTaxonomy = useCallback((taxonomyId: string): string => {
    // Fallback implementation since LocalizationContext doesn't expose getTaxonomy
    return taxonomyId.replace(/^TAXONOMY_/, '').replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  /**
   * Get localized ability name (cached by LocalizationManager)
   */
  const getAbilityName = useCallback((abilityNameId: string): string => {
    return localization.getAbilityName(abilityNameId as any);
  }, [localization]);

  /**
   * Get localized UI text (cached by LocalizationManager)
   */
  const getUIText = useCallback((textId: UITextId): string => {
    return localization.getUIText(textId);
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
   * Preload localization for a list of cards (uses LocalizationManager's preload)
   */
  const preloadCardLocalizations = useCallback((cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>) => {
    localization.preloadLocalizations(cards);
  }, [localization]);

  /**
   * Get cache statistics from LocalizationManager
   */
  const getCacheStats = useCallback(() => {
    return localization.getCacheStats();
  }, [localization]);

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
