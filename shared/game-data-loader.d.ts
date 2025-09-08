/**
 * BioMasters TCG - Game Data Loader
 *
 * This module provides functionality to load game configuration and localization data
 * from the new separated file structure and create the necessary data structures
 * for the BioMastersEngine.
 */
import { CardData, AbilityData } from './game-engine/BioMastersEngine';
import { ILocalizationManager } from './localization-manager';
import { SupportedLanguage } from './text-ids';
/**
 * Interface for loading complete game data
 */
export interface IGameDataLoader {
    /**
     * Load all game data including cards, abilities, keywords, and localization
     */
    loadGameData(languageCode?: string): Promise<GameDataSet>;
    /**
     * Load only card data
     */
    loadCards(): Promise<Map<number, CardData>>;
    /**
     * Load only ability data
     */
    loadAbilities(): Promise<Map<number, AbilityData>>;
    /**
     * Load keyword database
     */
    loadKeywords(): Promise<Map<number, string>>;
    /**
     * Create localization manager
     */
    createLocalizationManager(): Promise<ILocalizationManager>;
}
/**
 * Complete game data set
 */
export interface GameDataSet {
    cards: Map<number, CardData>;
    abilities: Map<number, AbilityData>;
    keywords: Map<number, string>;
    localizationManager: ILocalizationManager;
}
/**
 * Implementation that loads data from JSON files
 */
export declare class JSONFileGameDataLoader implements IGameDataLoader {
    private gameConfigPath;
    private localizationPath;
    constructor(gameConfigPath?: string, localizationPath?: string);
    loadGameData(languageCode?: SupportedLanguage): Promise<GameDataSet>;
    loadCards(): Promise<Map<number, CardData>>;
    loadAbilities(): Promise<Map<number, AbilityData>>;
    loadKeywords(): Promise<Map<number, string>>;
    createLocalizationManager(): Promise<ILocalizationManager>;
}
/**
 * Adds legacy properties to CardData for backwards compatibility
 */
export declare function addLegacyCardProperties(cardData: CardData): CardData;
/**
 * Adds legacy properties to AbilityData for backwards compatibility
 */
export declare function addLegacyAbilityProperties(abilityData: AbilityData): AbilityData;
/**
 * Convenience function to create a fully configured BioMastersEngine
 */
export declare function createBioMastersEngine(languageCode?: SupportedLanguage, gameConfigPath?: string, localizationPath?: string): Promise<any>;
//# sourceMappingURL=game-data-loader.d.ts.map