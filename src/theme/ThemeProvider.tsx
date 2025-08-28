import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig, ThemeManager, themeManager, PREDEFINED_THEMES } from './themeSystem';

interface ThemeContextType {
  currentTheme: ThemeConfig;
  availableThemes: ThemeConfig[];
  setTheme: (themeId: string) => void;
  createCustomTheme: (name: string, baseThemeId: string, colorOverrides: any) => ThemeConfig;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  organismRenderMode: 'dom' | 'image';
  setOrganismRenderMode: (mode: 'dom' | 'image') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themeManager.getCurrentTheme());
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(themeManager.getAllThemes());
  const [organismRenderMode, setOrganismRenderModeState] = useState<'dom' | 'image'>(() => {
    return (localStorage.getItem('biomasters-tcg-organism-render-mode') as 'dom' | 'image') || 'dom';
  });

  useEffect(() => {
    // Apply theme on mount
    themeManager.applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = availableThemes.find(t => t.id === themeId);
    if (theme) {
      themeManager.applyTheme(theme);
      setCurrentTheme(theme);
    }
  };

  const createCustomTheme = (name: string, baseThemeId: string, colorOverrides: any): ThemeConfig => {
    const baseTheme = availableThemes.find(t => t.id === baseThemeId) || PREDEFINED_THEMES.forest;
    const customTheme = themeManager.createCustomTheme(name, baseTheme, colorOverrides);
    setAvailableThemes(themeManager.getAllThemes());
    return customTheme;
  };

  const toggleDarkMode = () => {
    const darkTheme = currentTheme.isDark ?
      PREDEFINED_THEMES.forest :
      PREDEFINED_THEMES.darkForest;
    setTheme(darkTheme.id);
  };

  const setOrganismRenderMode = (mode: 'dom' | 'image') => {
    setOrganismRenderModeState(mode);
    localStorage.setItem('biomasters-tcg-organism-render-mode', mode);
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    availableThemes,
    setTheme,
    createCustomTheme,
    isDarkMode: currentTheme.isDark,
    toggleDarkMode,
    organismRenderMode,
    setOrganismRenderMode
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
