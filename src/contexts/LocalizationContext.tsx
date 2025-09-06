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
} from '@shared/localization-manager';
import { 
  SupportedLanguage, 
  CardNameId, 
  AbilityNameId, 
  UITextId,
  LANGUAGE_CONFIG 
} from '@shared/text-ids';

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
  getAbilityName: (nameId: AbilityNameId) => string;
  getUIText: (textId: UITextId) => string;
  
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

  const getAbilityName = (nameId: AbilityNameId): string => {
    if (!isInitialized) return `[${nameId}]`;
    return localizationManager.getAbilityName(nameId);
  };

  const getUIText = (textId: UITextId): string => {
    if (!isInitialized) return `[${textId}]`;
    return localizationManager.getUIText(textId);
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
    getAbilityName,
    getUIText,
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

/**
 * Hook for card-specific localization
 */
export const useCardLocalization = () => {
  const { getCardName, currentLanguage, isLoading } = useLocalization();
  
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
};

/**
 * Hook for UI text localization
 */
export const useUILocalization = () => {
  const { getUIText, currentLanguage, isLoading } = useLocalization();
  
  return {
    getUIText,
    currentLanguage,
    isLoading,
    // Common UI text getters
    getButtonText: (textId: UITextId) => getUIText(textId),
    getMenuText: (textId: UITextId) => getUIText(textId),
    getErrorText: (textId: UITextId) => getUIText(textId)
  };
};

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
