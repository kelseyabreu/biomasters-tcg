// Comprehensive Theme System for Species Combat TCG
// Supports dynamic color schemes, themes, and user customization

export interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  success: string;
  warning: string;
  danger: string;
  dark: string;
  medium: string;
  light: string;
}

export interface ThemeColors extends ColorPalette {
  // Extended colors for game elements
  producer: string;
  herbivore: string;
  carnivore: string;
  omnivore: string;
  detritivore: string;
  decomposer: string;
  scavenger: string;
  // Conservation status colors
  extinct: string;
  criticallyEndangered: string;
  endangered: string;
  vulnerable: string;
  nearThreatened: string;
  leastConcern: string;
  // UI element colors
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  accent: string;
  highlight: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  isDark: boolean;
  category: 'nature' | 'ocean' | 'forest' | 'desert' | 'arctic' | 'custom';
}

// Predefined theme configurations
export const PREDEFINED_THEMES: Record<string, ThemeConfig> = {
  // Nature Themes
  forest: {
    id: 'forest',
    name: 'Forest Ecosystem',
    description: 'Deep greens and earth tones inspired by temperate forests',
    isDark: false,
    category: 'forest',
    colors: {
      primary: '#2D5016',
      secondary: '#8FBC8F',
      tertiary: '#DEB887',
      success: '#228B22',
      warning: '#DAA520',
      danger: '#8B4513',
      dark: '#2F4F2F',
      medium: '#696969',
      light: '#F5F5DC',
      // Trophic roles
      producer: '#228B22',
      herbivore: '#DAA520',
      carnivore: '#8B4513',
      omnivore: '#CD853F',
      detritivore: '#A0522D',
      decomposer: '#2F4F2F',
      scavenger: '#696969',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#8FBC8F',
      textPrimary: '#1B3B1B',
      textSecondary: '#4A5A4A',
      backgroundPrimary: '#F8FFF8',
      backgroundSecondary: '#F0F8F0',
      accent: '#2D5016',
      highlight: '#ADFF2F'
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Blues and teals inspired by marine ecosystems',
    isDark: false,
    category: 'ocean',
    colors: {
      primary: '#006994',
      secondary: '#20B2AA',
      tertiary: '#87CEEB',
      success: '#00CED1',
      warning: '#FFD700',
      danger: '#DC143C',
      dark: '#191970',
      medium: '#708090',
      light: '#F0F8FF',
      // Trophic roles
      producer: '#00CED1',
      herbivore: '#20B2AA',
      carnivore: '#4682B4',
      omnivore: '#5F9EA0',
      detritivore: '#2F4F4F',
      decomposer: '#191970',
      scavenger: '#708090',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF6347',
      vulnerable: '#FFD700',
      nearThreatened: '#98FB98',
      leastConcern: '#00FA9A',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#87CEEB',
      textPrimary: '#0F1F4F',
      textSecondary: '#4A5A6A',
      backgroundPrimary: '#F0F8FF',
      backgroundSecondary: '#E6F3FF',
      accent: '#006994',
      highlight: '#00CED1'
    }
  },

  desert: {
    id: 'desert',
    name: 'Desert Sands',
    description: 'Warm earth tones inspired by arid ecosystems',
    isDark: false,
    category: 'desert',
    colors: {
      primary: '#8B4513',
      secondary: '#D2691E',
      tertiary: '#F4A460',
      success: '#9ACD32',
      warning: '#FF8C00',
      danger: '#B22222',
      dark: '#654321',
      medium: '#A0522D',
      light: '#FFF8DC',
      // Trophic roles
      producer: '#9ACD32',
      herbivore: '#D2691E',
      carnivore: '#8B4513',
      omnivore: '#CD853F',
      detritivore: '#A0522D',
      decomposer: '#654321',
      scavenger: '#BC8F8F',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#D2691E',
      textPrimary: '#3D2817',
      textSecondary: '#6B4423',
      backgroundPrimary: '#FFFBF7',
      backgroundSecondary: '#FFF5E6',
      accent: '#8B4513',
      highlight: '#FF8C00'
    }
  },

  arctic: {
    id: 'arctic',
    name: 'Arctic Tundra',
    description: 'Cool blues and whites inspired by polar ecosystems',
    isDark: false,
    category: 'arctic',
    colors: {
      primary: '#4682B4',
      secondary: '#B0C4DE',
      tertiary: '#E6E6FA',
      success: '#00FA9A',
      warning: '#FFD700',
      danger: '#DC143C',
      dark: '#2F4F4F',
      medium: '#708090',
      light: '#F8F8FF',
      // Trophic roles
      producer: '#00FA9A',
      herbivore: '#87CEEB',
      carnivore: '#4682B4',
      omnivore: '#6495ED',
      detritivore: '#778899',
      decomposer: '#2F4F4F',
      scavenger: '#708090',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF6347',
      vulnerable: '#FFD700',
      nearThreatened: '#98FB98',
      leastConcern: '#00FA9A',
      // UI elements
      cardBackground: '#F8F8FF',
      cardBorder: '#E6E6FA',
      textPrimary: '#2F4F4F',
      textSecondary: '#708090',
      backgroundPrimary: '#F0F8FF',
      backgroundSecondary: '#E0E6FF',
      accent: '#4682B4',
      highlight: '#87CEEB'
    }
  },

  darkForest: {
    id: 'darkForest',
    name: 'Dark Forest',
    description: 'Dark theme with deep forest colors',
    isDark: true,
    category: 'forest',
    colors: {
      primary: '#90EE90',
      secondary: '#228B22',
      tertiary: '#32CD32',
      success: '#00FF00',
      warning: '#FFD700',
      danger: '#FF6347',
      dark: '#0F0F0F',
      medium: '#404040',
      light: '#1A1A1A',
      // Trophic roles
      producer: '#00FF00',
      herbivore: '#ADFF2F',
      carnivore: '#FF6347',
      omnivore: '#FFA500',
      detritivore: '#D2691E',
      decomposer: '#8B4513',
      scavenger: '#696969',
      // Conservation status
      extinct: '#FF0000',
      criticallyEndangered: '#FF4500',
      endangered: '#FF8C00',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#00FF00',
      // UI elements
      cardBackground: '#1A1A1A',
      cardBorder: '#404040',
      textPrimary: '#E0E0E0',
      textSecondary: '#B0B0B0',
      backgroundPrimary: '#0F0F0F',
      backgroundSecondary: '#1A1A1A',
      accent: '#90EE90',
      highlight: '#32CD32'
    }
  },

  // New Theme 1: Sunset Savanna (Orange/Red/Yellow)
  savanna: {
    id: 'savanna',
    name: 'Sunset Savanna',
    description: 'Warm oranges and reds inspired by African grasslands at sunset',
    isDark: false,
    category: 'nature',
    colors: {
      primary: '#CC5500',
      secondary: '#FF7F50',
      tertiary: '#FFB347',
      success: '#32CD32',
      warning: '#FF8C00',
      danger: '#DC143C',
      dark: '#8B4513',
      medium: '#CD853F',
      light: '#FFF8DC',
      // Trophic roles
      producer: '#32CD32',
      herbivore: '#FF7F50',
      carnivore: '#CC5500',
      omnivore: '#D2691E',
      detritivore: '#CD853F',
      decomposer: '#8B4513',
      scavenger: '#A0522D',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#FF7F50',
      textPrimary: '#4A2C17',
      textSecondary: '#8B4513',
      backgroundPrimary: '#FFFAF7',
      backgroundSecondary: '#FFF5EE',
      accent: '#CC5500',
      highlight: '#FF8C00'
    }
  },

  // New Theme 2: Purple Twilight (Purple/Violet/Magenta)
  twilight: {
    id: 'twilight',
    name: 'Purple Twilight',
    description: 'Deep purples and violets inspired by twilight hours',
    isDark: false,
    category: 'nature',
    colors: {
      primary: '#663399',
      secondary: '#9966CC',
      tertiary: '#DDA0DD',
      success: '#32CD32',
      warning: '#FFD700',
      danger: '#DC143C',
      dark: '#4B0082',
      medium: '#8B7D8B',
      light: '#F8F0FF',
      // Trophic roles
      producer: '#32CD32',
      herbivore: '#9966CC',
      carnivore: '#663399',
      omnivore: '#8A2BE2',
      detritivore: '#9370DB',
      decomposer: '#4B0082',
      scavenger: '#8B7D8B',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#DDA0DD',
      textPrimary: '#2D1B3D',
      textSecondary: '#4B0082',
      backgroundPrimary: '#FEFAFF',
      backgroundSecondary: '#F5F0FF',
      accent: '#663399',
      highlight: '#9966CC'
    }
  },

  // New Theme 3: Coral Reef (Pink/Coral/Teal)
  coral: {
    id: 'coral',
    name: 'Coral Reef',
    description: 'Vibrant corals and tropical waters of reef ecosystems',
    isDark: false,
    category: 'ocean',
    colors: {
      primary: '#FF6B9D',
      secondary: '#FF8FA3',
      tertiary: '#FFB3BA',
      success: '#00CED1',
      warning: '#FFD700',
      danger: '#DC143C',
      dark: '#8B008B',
      medium: '#CD919E',
      light: '#FFF0F5',
      // Trophic roles
      producer: '#00CED1',
      herbivore: '#FF8FA3',
      carnivore: '#FF6B9D',
      omnivore: '#FF69B4',
      detritivore: '#CD919E',
      decomposer: '#8B008B',
      scavenger: '#BC8F8F',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#FFB3BA',
      textPrimary: '#4A1A2E',
      textSecondary: '#8B008B',
      backgroundPrimary: '#FFFAFC',
      backgroundSecondary: '#FFF0F5',
      accent: '#FF6B9D',
      highlight: '#FF8FA3'
    }
  },

  // New Theme 4: Volcanic (Red/Black/Orange)
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic Landscape',
    description: 'Fiery reds and blacks inspired by volcanic ecosystems',
    isDark: true,
    category: 'nature',
    colors: {
      primary: '#FF4500',
      secondary: '#FF6347',
      tertiary: '#FFA07A',
      success: '#32CD32',
      warning: '#FFD700',
      danger: '#DC143C',
      dark: '#2F1B14',
      medium: '#8B4513',
      light: '#FFE4E1',
      // Trophic roles
      producer: '#32CD32',
      herbivore: '#FF6347',
      carnivore: '#FF4500',
      omnivore: '#FF8C00',
      detritivore: '#CD853F',
      decomposer: '#8B0000',
      scavenger: '#A0522D',
      // Conservation status
      extinct: '#FF0000',
      criticallyEndangered: '#FF4500',
      endangered: '#FF8C00',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#00FF00',
      // UI elements
      cardBackground: '#1A0A0A',
      cardBorder: '#8B0000',
      textPrimary: '#FFE4E1',
      textSecondary: '#FFA07A',
      backgroundPrimary: '#0F0505',
      backgroundSecondary: '#1A0A0A',
      accent: '#FF4500',
      highlight: '#FF6347'
    }
  },

  // New Theme 5: Golden Autumn (Gold/Amber/Bronze)
  autumn: {
    id: 'autumn',
    name: 'Golden Autumn',
    description: 'Rich golds and ambers inspired by autumn foliage',
    isDark: false,
    category: 'forest',
    colors: {
      primary: '#B8860B',
      secondary: '#DAA520',
      tertiary: '#F0E68C',
      success: '#32CD32',
      warning: '#FF8C00',
      danger: '#DC143C',
      dark: '#8B4513',
      medium: '#CD853F',
      light: '#FFFACD',
      // Trophic roles
      producer: '#32CD32',
      herbivore: '#DAA520',
      carnivore: '#B8860B',
      omnivore: '#CD853F',
      detritivore: '#D2691E',
      decomposer: '#8B4513',
      scavenger: '#A0522D',
      // Conservation status
      extinct: '#000000',
      criticallyEndangered: '#8B0000',
      endangered: '#FF4500',
      vulnerable: '#FFD700',
      nearThreatened: '#ADFF2F',
      leastConcern: '#32CD32',
      // UI elements
      cardBackground: '#FFFFFF',
      cardBorder: '#DAA520',
      textPrimary: '#3D2F1F',
      textSecondary: '#8B4513',
      backgroundPrimary: '#FFFEF7',
      backgroundSecondary: '#FFFACD',
      accent: '#B8860B',
      highlight: '#DAA520'
    }
  }
};

/**
 * Theme Management System
 */
export class ThemeManager {
  private currentTheme: ThemeConfig;
  private customThemes: Map<string, ThemeConfig> = new Map();

  constructor() {
    // Load saved theme or default to forest
    const savedThemeId = localStorage.getItem('biomasters-tcg-theme') || 'forest';
    this.currentTheme = PREDEFINED_THEMES[savedThemeId] || PREDEFINED_THEMES.forest;
    this.applyTheme(this.currentTheme);
  }

  /**
   * Apply theme to CSS custom properties
   */
  applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement;
    
    // Apply Ionic color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}`, value);
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}-rgb`, this.hexToRgb(value));
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}-contrast`, this.getContrastColor(value));
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}-contrast-rgb`, this.hexToRgb(this.getContrastColor(value)));
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}-shade`, this.shadeColor(value, -20));
      root.style.setProperty(`--ion-color-${this.kebabCase(key)}-tint`, this.shadeColor(value, 20));
    });

    // Apply custom game variables
    root.style.setProperty('--tcg-card-background', theme.colors.cardBackground);
    root.style.setProperty('--tcg-card-border', theme.colors.cardBorder);
    root.style.setProperty('--tcg-text-primary', theme.colors.textPrimary);
    root.style.setProperty('--tcg-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--tcg-background-primary', theme.colors.backgroundPrimary);
    root.style.setProperty('--tcg-background-secondary', theme.colors.backgroundSecondary);
    root.style.setProperty('--tcg-accent', theme.colors.accent);
    root.style.setProperty('--tcg-highlight', theme.colors.highlight);

    // Set dark mode class
    document.body.classList.toggle('dark', theme.isDark);

    this.currentTheme = theme;
    localStorage.setItem('biomasters-tcg-theme', theme.id);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    return [
      ...Object.values(PREDEFINED_THEMES),
      ...Array.from(this.customThemes.values())
    ];
  }

  /**
   * Create custom theme
   */
  createCustomTheme(name: string, baseTheme: ThemeConfig, colorOverrides: Partial<ThemeColors>): ThemeConfig {
    const customTheme: ThemeConfig = {
      id: `custom-${Date.now()}`,
      name,
      description: `Custom theme based on ${baseTheme.name}`,
      isDark: baseTheme.isDark,
      category: 'custom',
      colors: { ...baseTheme.colors, ...colorOverrides }
    };

    this.customThemes.set(customTheme.id, customTheme);
    this.saveCustomThemes();
    return customTheme;
  }

  /**
   * Helper functions
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
  }

  private getContrastColor(hex: string): string {
    const rgb = this.hexToRgb(hex).split(', ').map(Number);
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    // Use a higher threshold for better contrast
    return brightness > 140 ? '#000000' : '#ffffff';
  }

  /**
   * Get high contrast text color for better readability
   */
  private getHighContrastText(backgroundColor: string): string {
    const rgb = this.hexToRgb(backgroundColor).split(', ').map(Number);
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    // For dark backgrounds, use light text; for light backgrounds, use dark text
    return brightness < 128 ? '#ffffff' : '#000000';
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private saveCustomThemes(): void {
    const customThemesArray = Array.from(this.customThemes.values());
    localStorage.setItem('biomasters-tcg-custom-themes', JSON.stringify(customThemesArray));
  }

  private loadCustomThemes(): void {
    const saved = localStorage.getItem('biomasters-tcg-custom-themes');
    if (saved) {
      const themes = JSON.parse(saved) as ThemeConfig[];
      themes.forEach(theme => this.customThemes.set(theme.id, theme));
    }
  }
}

// Global theme manager instance
export const themeManager = new ThemeManager();
