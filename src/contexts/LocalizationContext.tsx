/**
 * Localization Context for React Components
 * 
 * Provides localization functionality throughout the React component tree
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  ILocalizationManager, 
  LocalizationManager, 
  JSONFileDataLoader 
} from '@kelseyabreu/shared';
import {
  SupportedLanguage,
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  UITextId,
  LANGUAGE_CONFIG
} from '@kelseyabreu/shared';

interface LocalizationContextType {
  // Current state
  currentLanguage: SupportedLanguage;
  isLoading: boolean;
  error: string | null;

  // Language management
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  availableLanguages: SupportedLanguage[];

  // Text retrieval methods
  getCardName: (nameId: CardNameId) => string;
  getScientificName: (nameId: ScientificNameId) => string;
  getCardDescription: (descriptionId: CardDescriptionId) => string;
  getAbilityName: (nameId: AbilityNameId) => string;
  getUIText: (textId: UITextId) => string;

  // Batch operations
  getBatchCardNames: (nameIds: string[]) => Record<string, string>;
  getBatchScientificNames: (scientificNameIds: string[]) => Record<string, string>;
  getBatchCardDescriptions: (descriptionIds: string[]) => Record<string, string>;

  // Complete card localization
  getCardLocalization: (card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId?: string;
  }) => {
    name: string;
    scientificName: string;
    description: string;
    taxonomy?: string;
  };

  // Performance optimization
  preloadLocalizations: (cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>) => void;

  // Cache management
  getCacheStats: () => { hits: number; misses: number; size: number; hitRate: number };

  // Utility methods
  getLanguageInfo: (language: SupportedLanguage) => typeof LANGUAGE_CONFIG[SupportedLanguage];
  isLanguageSupported: (language: string) => language is SupportedLanguage;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
  basePath?: string;
}

/**
 * Localization Provider Component
 */
export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({
  children,
  initialLanguage = SupportedLanguage.ENGLISH,
  basePath = '/data/localization'
}) => {
  const [localizationManager] = useState<ILocalizationManager>(() => 
    new LocalizationManager(new JSONFileDataLoader(basePath))
  );
  
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize localization manager
  useEffect(() => {
    const initializeLocalization = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('biomasters-language') as SupportedLanguage;
        const languageToLoad = savedLanguage && Object.values(SupportedLanguage).includes(savedLanguage) 
          ? savedLanguage 
          : initialLanguage;
        
        await localizationManager.loadLanguage(languageToLoad);
        setCurrentLanguage(languageToLoad);
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize localization');
        console.error('Localization initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLocalization();
  }, [localizationManager, initialLanguage]);

  const changeLanguage = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === currentLanguage || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await localizationManager.loadLanguage(newLanguage);
      setCurrentLanguage(newLanguage);
      
      // Save language preference
      localStorage.setItem('biomasters-language', newLanguage);
      
      // Dispatch custom event for other parts of the app
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: newLanguage } 
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change language');
      console.error('Language change failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCardName = (nameId: CardNameId): string => {
    if (!isInitialized) return `[${nameId}]`;
    return localizationManager.getCardName(nameId);
  };

  const getScientificName = (nameId: ScientificNameId): string => {
    if (!isInitialized) return `[${nameId}]`;
    return localizationManager.getScientificName(nameId);
  };

  const getCardDescription = (descriptionId: CardDescriptionId): string => {
    if (!isInitialized) return `[${descriptionId}]`;
    return localizationManager.getCardDescription(descriptionId);
  };

  const getAbilityName = (nameId: AbilityNameId): string => {
    if (!isInitialized) return `[${nameId}]`;
    return localizationManager.getAbilityName(nameId);
  };

  const getUIText = (textId: UITextId): string => {
    if (!isInitialized) return `[${textId}]`;
    return localizationManager.getUIText(textId);
  };

  // Batch operations
  const getBatchCardNames = (nameIds: string[]): Record<string, string> => {
    if (!isInitialized) return {};
    return (localizationManager as any).getBatchCardNames?.(nameIds) || {};
  };

  const getBatchScientificNames = (scientificNameIds: string[]): Record<string, string> => {
    if (!isInitialized) return {};
    return (localizationManager as any).getBatchScientificNames?.(scientificNameIds) || {};
  };

  const getBatchCardDescriptions = (descriptionIds: string[]): Record<string, string> => {
    if (!isInitialized) return {};
    return (localizationManager as any).getBatchCardDescriptions?.(descriptionIds) || {};
  };

  // Complete card localization
  const getCardLocalization = (card: {
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId?: string;
  }) => {
    if (!isInitialized) {
      return {
        name: `[${card.nameId}]`,
        scientificName: `[${card.scientificNameId}]`,
        description: `[${card.descriptionId}]`,
        taxonomy: card.taxonomyId ? `[${card.taxonomyId}]` : undefined
      };
    }
    return (localizationManager as any).getCardLocalization?.(card) || {
      name: getCardName(card.nameId as CardNameId),
      scientificName: getScientificName(card.scientificNameId as ScientificNameId),
      description: getCardDescription(card.descriptionId as CardDescriptionId),
      taxonomy: card.taxonomyId ? `[${card.taxonomyId}]` : undefined
    };
  };

  // Performance optimization
  const preloadLocalizations = (cards: Array<{
    nameId: string;
    scientificNameId: string;
    descriptionId: string;
    taxonomyId: string;
  }>) => {
    if (!isInitialized) return;
    (localizationManager as any).preloadLocalizations?.(cards);
  };

  // Cache management
  const getCacheStats = () => {
    if (!isInitialized) return { hits: 0, misses: 0, size: 0, hitRate: 0 };
    return (localizationManager as any).getCacheStats?.() || { hits: 0, misses: 0, size: 0, hitRate: 0 };
  };

  const getLanguageInfo = (language: SupportedLanguage) => {
    return LANGUAGE_CONFIG[language];
  };

  const isLanguageSupported = (language: string): language is SupportedLanguage => {
    return Object.values(SupportedLanguage).includes(language as SupportedLanguage);
  };

  const contextValue: LocalizationContextType = {
    currentLanguage,
    isLoading,
    error,
    changeLanguage,
    availableLanguages: Object.values(SupportedLanguage),
    getCardName,
    getScientificName,
    getCardDescription,
    getAbilityName,
    getUIText,
    getBatchCardNames,
    getBatchScientificNames,
    getBatchCardDescriptions,
    getCardLocalization,
    preloadLocalizations,
    getCacheStats,
    getLanguageInfo,
    isLanguageSupported
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

/**
 * Hook to use localization context
 */
export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

// Note: useCardLocalization and useUILocalization hooks have been moved to
// src/hooks/useCardLocalization.ts for better organization and enhanced functionality

/**
 * Higher-Order Component for class components
 */
export const withLocalization = <P extends object>(
  Component: React.ComponentType<P & { localization: LocalizationContextType }>
) => {
  return (props: P) => {
    const localization = useLocalization();
    return <Component {...props} localization={localization} />;
  };
};

export default LocalizationProvider;
