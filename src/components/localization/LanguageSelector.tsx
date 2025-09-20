/**
 * Language Selector Component
 * 
 * Provides a UI for selecting the game language with proper enum support
 */

import React, { useState, useEffect } from 'react';
import {
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonButton,
  IonPopover,
  IonContent,
  IonList,
  IonHeader,
  IonToolbar,
  IonTitle
} from '@ionic/react';
import { languageOutline, checkmark } from 'ionicons/icons';
import { SupportedLanguage, LANGUAGE_CONFIG, LanguageInfo } from '@kelseyabreu/shared';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  disabled?: boolean;
  showLabel?: boolean;
  compact?: boolean;
}

/**
 * Language Selector Component
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  disabled = false,
  showLabel = true,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(currentLanguage);

  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
    onLanguageChange(language);
    setIsOpen(false);
  };

  const availableLanguages = Object.values(SupportedLanguage);
  const currentLanguageInfo = LANGUAGE_CONFIG[currentLanguage];

  if (compact) {
    return (
      <IonButton
        fill="clear"
        size="small"
        disabled={disabled}
        id="language-trigger"
        className="language-selector-compact"
      >
        <span className="language-flag">{currentLanguageInfo.flag}</span>
        <span className="language-code">{currentLanguageInfo.code.toUpperCase()}</span>
        <IonIcon icon={languageOutline} slot="end" />
        
        <IonPopover
          trigger="language-trigger"
          isOpen={isOpen}
          onDidDismiss={() => setIsOpen(false)}
          showBackdrop={true}
        >
          <IonContent>
            <IonHeader>
              <IonToolbar>
                <IonTitle size="small">Select Language</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonList>
              {availableLanguages.map((language) => {
                const languageInfo = LANGUAGE_CONFIG[language];
                const isSelected = language === selectedLanguage;
                
                return (
                  <IonItem
                    key={language}
                    button
                    onClick={() => handleLanguageSelect(language)}
                    className={isSelected ? 'selected' : ''}
                  >
                    <span className="language-flag" slot="start">
                      {languageInfo.flag}
                    </span>
                    <IonLabel>
                      <h3>{languageInfo.nativeName}</h3>
                      <p>{languageInfo.name}</p>
                    </IonLabel>
                    {isSelected && (
                      <IonIcon icon={checkmark} slot="end" color="primary" />
                    )}
                  </IonItem>
                );
              })}
            </IonList>
          </IonContent>
        </IonPopover>
      </IonButton>
    );
  }

  return (
    <IonItem>
      {showLabel && (
        <IonLabel position="stacked">
          <IonIcon icon={languageOutline} /> Language
        </IonLabel>
      )}
      <IonSelect
        value={selectedLanguage}
        onIonChange={(e) => handleLanguageSelect(e.detail.value as SupportedLanguage)}
        disabled={disabled}
        interface="popover"
        placeholder="Select Language"
      >
        {availableLanguages.map((language) => {
          const languageInfo = LANGUAGE_CONFIG[language];
          return (
            <IonSelectOption key={language} value={language}>
              {languageInfo.flag} {languageInfo.nativeName} ({languageInfo.name})
            </IonSelectOption>
          );
        })}
      </IonSelect>
    </IonItem>
  );
};

/**
 * Hook for managing language state
 */
export const useLanguageSelector = (initialLanguage: SupportedLanguage = SupportedLanguage.ENGLISH) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeLanguage = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === currentLanguage) return;

    setIsLoading(true);
    setError(null);

    try {
      // Store language preference
      localStorage.setItem('biomasters-language', newLanguage);
      
      // Update state
      setCurrentLanguage(newLanguage);
      
      // Trigger language change event for other components
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

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('biomasters-language') as SupportedLanguage;
    if (savedLanguage && Object.values(SupportedLanguage).includes(savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
    error,
    availableLanguages: Object.values(SupportedLanguage),
    getLanguageInfo: (language: SupportedLanguage) => LANGUAGE_CONFIG[language]
  };
};

/**
 * Language Display Component - Shows current language info
 */
export const LanguageDisplay: React.FC<{ language: SupportedLanguage; showCode?: boolean }> = ({ 
  language, 
  showCode = false 
}) => {
  const languageInfo = LANGUAGE_CONFIG[language];
  
  return (
    <span className="language-display">
      <span className="language-flag">{languageInfo.flag}</span>
      <span className="language-name">{languageInfo.nativeName}</span>
      {showCode && <span className="language-code">({languageInfo.code})</span>}
    </span>
  );
};

export default LanguageSelector;
