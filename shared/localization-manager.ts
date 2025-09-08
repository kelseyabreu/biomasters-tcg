/**
 * BioMasters TCG - Localization Manager
 *
 * This module provides a centralized interface for accessing localized text content.
 * It loads language-specific JSON files and provides type-safe text lookup methods.
 */

import {
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  AbilityDescriptionId,
  KeywordNameId,
  UITextId,
  TaxonomyId,
  SupportedLanguage
} from './text-ids';

// ============================================================================
// LOCALIZATION DATA INTERFACES
// ============================================================================

/**
 * Interface for card localization data
 */
export interface CardLocalizationData {
  names: Record<CardNameId, string>;
  scientificNames: Record<ScientificNameId, string>;
  descriptions: Record<CardDescriptionId, string>;
}

/**
 * Interface for ability localization data
 */
export interface AbilityLocalizationData {
  names: Record<AbilityNameId, string>;
  descriptions: Record<AbilityDescriptionId, string>;
  flavorText?: Record<AbilityNameId, string>;
}

/**
 * Interface for UI localization data
 */
export interface UILocalizationData {
  gameActions: Record<string, string>;
  gamePhases: Record<string, string>;
  gameStates: Record<string, string>;
  errorMessages: Record<string, string>;
  gameTerms: Record<string, string>;
  keywords: Record<KeywordNameId, string>;
  trophicCategories: Record<string, string>;
}

/**
 * Interface for taxonomy localization data
 */
export interface TaxonomyLocalizationData {
  taxonomy: Record<TaxonomyId, {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    commonNames: string[];
  }>;
}

/**
 * Complete localization data for a language
 */
export interface LanguageData {
  cards: CardLocalizationData;
  abilities: AbilityLocalizationData;
  ui: UILocalizationData;
  taxonomy: TaxonomyLocalizationData;
}

// ============================================================================
// LOCALIZATION MANAGER INTERFACE
// ============================================================================

/**
 * Interface for the localization manager
 */
export interface ILocalizationManager {
  /**
   * Current language code (e.g., 'en', 'es', 'fr')
   */
  readonly currentLanguage: string;

  /**
   * Available language codes
   */
  readonly availableLanguages: SupportedLanguage[];

  /**
   * Load localization data for a specific language
   */
  loadLanguage(languageCode: SupportedLanguage): Promise<void>;

  /**
   * Get localized card name
   */
  getCardName(nameId: CardNameId): string;

  /**
   * Get localized scientific name
   */
  getScientificName(scientificNameId: ScientificNameId): string;

  /**
   * Get localized card description
   */
  getCardDescription(descriptionId: CardDescriptionId): string;

  /**
   * Get localized ability name
   */
  getAbilityName(nameId: AbilityNameId): string;

  /**
   * Get localized ability description
   */
  getAbilityDescription(descriptionId: AbilityDescriptionId): string;

  /**
   * Get localized ability flavor text
   */
  getAbilityFlavorText(nameId: AbilityNameId): string;

  /**
   * Get localized keyword name
   */
  getKeywordName(keywordId: KeywordNameId): string;

  /**
   * Get localized UI text
   */
  getUIText(textId: UITextId): string;

  /**
   * Get taxonomy information for a species
   */
  getTaxonomy(taxonomyId: TaxonomyId): {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    commonNames: string[];
  } | null;

  /**
   * Get formatted scientific name (genus + species)
   */
  getFormattedScientificName(taxonomyId: TaxonomyId): string;

  /**
   * Check if a text ID exists in the current language
   */
  hasText(textId: string): boolean;

  /**
   * Get raw text by ID (fallback method)
   */
  getText(textId: string): string;
}

// ============================================================================
// LOCALIZATION MANAGER IMPLEMENTATION
// ============================================================================

/**
 * Default implementation of the localization manager
 */
export class LocalizationManager implements ILocalizationManager {
  private _currentLanguage: SupportedLanguage = SupportedLanguage.ENGLISH;
  private _availableLanguages: SupportedLanguage[] = [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  private _languageData: LanguageData | null = null;

  constructor(private dataLoader: ILocalizationDataLoader) {}

  get currentLanguage(): SupportedLanguage {
    return this._currentLanguage;
  }

  get availableLanguages(): SupportedLanguage[] {
    return [...this._availableLanguages];
  }

  async loadLanguage(languageCode: SupportedLanguage): Promise<void> {
    if (!this._availableLanguages.includes(languageCode)) {
      throw new Error(`Language '${languageCode}' is not available`);
    }

    this._languageData = await this.dataLoader.loadLanguageData(languageCode);
    this._currentLanguage = languageCode;
  }

  getCardName(nameId: CardNameId): string {
    return this._languageData?.cards.names[nameId] ?? `[${nameId}]`;
  }

  getScientificName(scientificNameId: ScientificNameId): string {
    return this._languageData?.cards.scientificNames[scientificNameId] ?? `[${scientificNameId}]`;
  }

  getCardDescription(descriptionId: CardDescriptionId): string {
    return this._languageData?.cards.descriptions[descriptionId] ?? `[${descriptionId}]`;
  }

  getAbilityName(nameId: AbilityNameId): string {
    return this._languageData?.abilities.names[nameId] ?? `[${nameId}]`;
  }

  getAbilityDescription(descriptionId: AbilityDescriptionId): string {
    return this._languageData?.abilities.descriptions[descriptionId] ?? `[${descriptionId}]`;
  }

  getAbilityFlavorText(nameId: AbilityNameId): string {
    return this._languageData?.abilities.flavorText?.[nameId] ?? '';
  }

  getKeywordName(keywordId: KeywordNameId): string {
    return this._languageData?.ui.keywords[keywordId] ?? `[${keywordId}]`;
  }

  getUIText(textId: UITextId): string {
    // Search through all UI text categories
    const ui = this._languageData?.ui;
    if (!ui) return `[${textId}]`;

    return ui.gameActions[textId] ??
           ui.gamePhases[textId] ??
           ui.gameStates[textId] ??
           ui.errorMessages[textId] ??
           ui.gameTerms[textId] ??
           ui.trophicCategories[textId] ??
           `[${textId}]`;
  }

  getTaxonomy(taxonomyId: TaxonomyId) {
    return this._languageData?.taxonomy.taxonomy[taxonomyId] ?? null;
  }

  getFormattedScientificName(taxonomyId: TaxonomyId): string {
    const taxonomy = this.getTaxonomy(taxonomyId);
    if (!taxonomy) return `[${taxonomyId}]`;

    return `${taxonomy.genus} ${taxonomy.species}`;
  }

  hasText(textId: string): boolean {
    return this.getText(textId) !== `[${textId}]`;
  }

  getText(textId: string): string {
    // This is a fallback method that searches all text categories
    const data = this._languageData;
    if (!data) return `[${textId}]`;

    // Optimized search: check each category directly instead of creating a merged object
    // This avoids the overhead of object spreading and is much faster

    // Check cards first (most common)
    if (data.cards.names[textId as keyof typeof data.cards.names]) {
      return data.cards.names[textId as keyof typeof data.cards.names];
    }
    if (data.cards.scientificNames[textId as keyof typeof data.cards.scientificNames]) {
      return data.cards.scientificNames[textId as keyof typeof data.cards.scientificNames];
    }
    if (data.cards.descriptions[textId as keyof typeof data.cards.descriptions]) {
      return data.cards.descriptions[textId as keyof typeof data.cards.descriptions];
    }

    // Check abilities
    if (data.abilities.names[textId as keyof typeof data.abilities.names]) {
      return data.abilities.names[textId as keyof typeof data.abilities.names];
    }
    if (data.abilities.descriptions[textId as keyof typeof data.abilities.descriptions]) {
      return data.abilities.descriptions[textId as keyof typeof data.abilities.descriptions];
    }
    if (data.abilities.flavorText && data.abilities.flavorText[textId as keyof typeof data.abilities.flavorText]) {
      return data.abilities.flavorText[textId as keyof typeof data.abilities.flavorText];
    }

    // Check UI text
    if (data.ui.gameActions[textId as keyof typeof data.ui.gameActions]) {
      return data.ui.gameActions[textId as keyof typeof data.ui.gameActions]!;
    }
    if (data.ui.gamePhases[textId as keyof typeof data.ui.gamePhases]) {
      return data.ui.gamePhases[textId as keyof typeof data.ui.gamePhases]!;
    }
    if (data.ui.gameStates[textId as keyof typeof data.ui.gameStates]) {
      return data.ui.gameStates[textId as keyof typeof data.ui.gameStates]!;
    }
    if (data.ui.errorMessages[textId as keyof typeof data.ui.errorMessages]) {
      return data.ui.errorMessages[textId as keyof typeof data.ui.errorMessages]!;
    }
    if (data.ui.gameTerms[textId as keyof typeof data.ui.gameTerms]) {
      return data.ui.gameTerms[textId as keyof typeof data.ui.gameTerms]!;
    }
    if (data.ui.keywords[textId as keyof typeof data.ui.keywords]) {
      return data.ui.keywords[textId as keyof typeof data.ui.keywords]!;
    }
    if (data.ui.trophicCategories[textId as keyof typeof data.ui.trophicCategories]) {
      return data.ui.trophicCategories[textId as keyof typeof data.ui.trophicCategories]!;
    }

    return `[${textId}]`;
  }
}

// ============================================================================
// DATA LOADER INTERFACE
// ============================================================================

/**
 * Interface for loading localization data from various sources
 */
export interface ILocalizationDataLoader {
  /**
   * Load complete language data for a specific language
   */
  loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData>;

  /**
   * Get list of available languages
   */
  getAvailableLanguages(): Promise<SupportedLanguage[]>;
}

/**
 * JSON file-based data loader implementation
 */
export class JSONFileDataLoader implements ILocalizationDataLoader {
  constructor(private basePath: string = '/data/localization') {}

  async loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData> {
    const [cards, abilities, ui, taxonomy] = await Promise.all([
      this.loadJSON<CardLocalizationData>(`${this.basePath}/${languageCode}/cards.json`),
      this.loadJSON<AbilityLocalizationData>(`${this.basePath}/${languageCode}/abilities.json`),
      this.loadJSON<UILocalizationData>(`${this.basePath}/${languageCode}/ui.json`),
      this.loadJSON<TaxonomyLocalizationData>(`${this.basePath}/${languageCode}/taxonomy.json`)
    ]);

    return { cards, abilities, ui, taxonomy };
  }

  async getAvailableLanguages(): Promise<SupportedLanguage[]> {
    // Return all supported languages
    return [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  }

  private async loadJSON<T>(path: string): Promise<T> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }
}