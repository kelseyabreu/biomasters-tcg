/**
 * BioMasters TCG - Localization Manager
 *
 * This module provides a centralized interface for accessing localized text content.
 * It loads language-specific JSON files and provides type-safe text lookup methods.
 */
import { CardNameId, ScientificNameId, CardDescriptionId, AbilityNameId, AbilityDescriptionId, KeywordNameId, UITextId, TaxonomyId, TaxonomyDisplayId, SupportedLanguage } from './text-ids';
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
    domains: Record<string, string>;
    kingdoms: Record<string, string>;
    phylums: Record<string, string>;
    classes: Record<string, string>;
    orders: Record<string, string>;
    families: Record<string, string>;
    genera: Record<string, string>;
    species: Record<string, string>;
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
     * Get taxonomy display name (for new enum-based system)
     */
    getTaxonomyName(taxonomyDisplayId: TaxonomyDisplayId): string;
    /**
     * Check if a text ID exists in the current language
     */
    hasText(textId: string): boolean;
    /**
     * Get raw text by ID (fallback method)
     */
    getText(textId: string): string;
}
/**
 * Default implementation of the localization manager
 */
export declare class LocalizationManager implements ILocalizationManager {
    private dataLoader;
    private _currentLanguage;
    private _availableLanguages;
    private _languageData;
    constructor(dataLoader: ILocalizationDataLoader);
    get currentLanguage(): SupportedLanguage;
    get availableLanguages(): SupportedLanguage[];
    loadLanguage(languageCode: SupportedLanguage): Promise<void>;
    getCardName(nameId: CardNameId): string;
    getScientificName(scientificNameId: ScientificNameId): string;
    getCardDescription(descriptionId: CardDescriptionId): string;
    getAbilityName(nameId: AbilityNameId): string;
    getAbilityDescription(descriptionId: AbilityDescriptionId): string;
    getAbilityFlavorText(nameId: AbilityNameId): string;
    getKeywordName(keywordId: KeywordNameId): string;
    getUIText(textId: UITextId): string;
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
    getFormattedScientificName(taxonomyId: TaxonomyId): string;
    getTaxonomyName(taxonomyDisplayId: TaxonomyDisplayId): string;
    hasText(textId: string): boolean;
    getText(textId: string): string;
}
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
export declare class JSONFileDataLoader implements ILocalizationDataLoader {
    private basePath;
    constructor(basePath?: string);
    loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData>;
    getAvailableLanguages(): Promise<SupportedLanguage[]>;
    private loadJSON;
}
//# sourceMappingURL=localization-manager.d.ts.map