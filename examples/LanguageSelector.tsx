/**
 * BioMasters TCG - Language Selector Component
 * 
 * This React component demonstrates how to implement language selection
 * functionality using the new localization system.
 */

import React, { useState, useEffect } from 'react';
import { ILocalizationManager } from '../shared/localization-manager';

interface LanguageSelectorProps {
  localizationManager: ILocalizationManager;
  onLanguageChange?: (languageCode: string) => void;
  className?: string;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Language Selector Component
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  localizationManager,
  onLanguageChange,
  className = ''
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Language configuration
  const languageOptions: Record<string, LanguageOption> = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸'
    },
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸'
    }
  };

  // Load available languages on component mount
  useEffect(() => {
    const loadAvailableLanguages = async () => {
      try {
        const languages = await localizationManager.getAvailableLanguages();
        setAvailableLanguages(languages);
        setCurrentLanguage(localizationManager.getCurrentLanguage());
      } catch (err) {
        setError('Failed to load available languages');
        console.error('Error loading languages:', err);
      }
    };

    loadAvailableLanguages();
  }, [localizationManager]);

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;

    setIsLoading(true);
    setError(null);

    try {
      await localizationManager.loadLanguage(languageCode);
      setCurrentLanguage(languageCode);
      
      // Notify parent component of language change
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }

      // Store user preference in localStorage
      localStorage.setItem('biomasters-language', languageCode);
      
    } catch (err) {
      setError(`Failed to load language: ${languageCode}`);
      console.error('Error changing language:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get localized text for UI elements
  const getLocalizedText = (key: string): string => {
    try {
      return localizationManager.getUIText(key as any);
    } catch {
      return key; // Fallback to key if translation not found
    }
  };

  return (
    <div className={`language-selector ${className}`}>
      <label htmlFor="language-select" className="language-selector__label">
        🌍 {getLocalizedText('UI_LANGUAGE')}
      </label>
      
      <select
        id="language-select"
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={isLoading}
        className="language-selector__select"
      >
        {availableLanguages.map((langCode) => {
          const option = languageOptions[langCode];
          if (!option) return null;
          
          return (
            <option key={langCode} value={langCode}>
              {option.flag} {option.nativeName}
            </option>
          );
        })}
      </select>

      {isLoading && (
        <div className="language-selector__loading">
          ⏳ Loading...
        </div>
      )}

      {error && (
        <div className="language-selector__error">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

/**
 * Hook for using localization in functional components
 */
export const useLocalization = (localizationManager: ILocalizationManager) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(
    localizationManager.getCurrentLanguage()
  );

  const changeLanguage = async (languageCode: string) => {
    try {
      await localizationManager.loadLanguage(languageCode);
      setCurrentLanguage(languageCode);
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  };

  const t = (key: string): string => {
    try {
      return localizationManager.getUIText(key as any);
    } catch {
      return key;
    }
  };

  return {
    currentLanguage,
    changeLanguage,
    t, // Translation function
    localizationManager
  };
};

/**
 * Higher-Order Component for adding localization to any component
 */
export const withLocalization = <P extends object>(
  Component: React.ComponentType<P & { localizationManager: ILocalizationManager }>
) => {
  return (props: P & { localizationManager: ILocalizationManager }) => {
    const localization = useLocalization(props.localizationManager);
    
    return (
      <Component
        {...props}
        localizationManager={props.localizationManager}
        currentLanguage={localization.currentLanguage}
        t={localization.t}
      />
    );
  };
};

/**
 * Example usage component showing how to use the localization system
 */
export const LocalizedGameUI: React.FC<{ localizationManager: ILocalizationManager }> = ({
  localizationManager
}) => {
  const { t, changeLanguage, currentLanguage } = useLocalization(localizationManager);

  return (
    <div className="game-ui">
      <header className="game-header">
        <h1>🧬 BioMasters TCG</h1>
        <LanguageSelector
          localizationManager={localizationManager}
          onLanguageChange={changeLanguage}
          className="header__language-selector"
        />
      </header>

      <div className="game-controls">
        <button className="btn btn--primary">
          {t('UI_PLAY_CARD')}
        </button>
        <button className="btn btn--secondary">
          {t('UI_END_TURN')}
        </button>
        <button className="btn btn--danger">
          {t('UI_ATTACK')}
        </button>
      </div>

      <div className="game-status">
        <div className="status-item">
          <span className="status-label">{t('UI_ENERGY')}:</span>
          <span className="status-value">5</span>
        </div>
        <div className="status-item">
          <span className="status-label">{t('UI_CARDS_IN_HAND')}:</span>
          <span className="status-value">7</span>
        </div>
        <div className="status-item">
          <span className="status-label">{t('UI_VICTORY_POINTS')}:</span>
          <span className="status-value">12</span>
        </div>
      </div>

      <div className="game-phases">
        <div className="phase-indicator">
          {t('UI_ACTION_PHASE')}
        </div>
        <div className="turn-indicator">
          {t('UI_YOUR_TURN')}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
