/**
 * BioMasters TCG - Game Data Loader
 * 
 * This module provides functionality to load game configuration and localization data
 * from the new separated file structure and create the necessary data structures
 * for the BioMastersEngine.
 */

import { CardData, AbilityData } from './game-engine/BioMastersEngine';
import { ILocalizationManager, LocalizationManager, JSONFileDataLoader } from './localization-manager';
import { SupportedLanguage } from './text-ids';

// ============================================================================
// GAME DATA LOADER INTERFACE
// ============================================================================

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

// ============================================================================
// JSON FILE GAME DATA LOADER
// ============================================================================

/**
 * Implementation that loads data from JSON files
 */
export class JSONFileGameDataLoader implements IGameDataLoader {
  constructor(
    private gameConfigPath: string = '/data/game-config',
    private localizationPath: string = '/data/localization'
  ) {}

  async loadGameData(languageCode: SupportedLanguage = SupportedLanguage.ENGLISH): Promise<GameDataSet> {
    // Load all data in parallel
    const [cards, abilities, keywords, localizationManager] = await Promise.all([
      this.loadCards(),
      this.loadAbilities(),
      this.loadKeywords(),
      this.createLocalizationManager()
    ]);

    // Load the specified language
    await localizationManager.loadLanguage(languageCode);

    return {
      cards,
      abilities,
      keywords,
      localizationManager
    };
  }

  async loadCards(): Promise<Map<number, CardData>> {
    const response = await fetch(`${this.gameConfigPath}/cards.json`);
    if (!response.ok) {
      throw new Error(`Failed to load cards: ${response.statusText}`);
    }

    const cardsArray: CardData[] = await response.json() as CardData[];
    const cardsMap = new Map<number, CardData>();

    for (const card of cardsArray) {
      cardsMap.set(card.cardId, card);
    }

    console.log(`📚 Loaded ${cardsMap.size} cards from game configuration`);
    return cardsMap;
  }

  async loadAbilities(): Promise<Map<number, AbilityData>> {
    const response = await fetch(`${this.gameConfigPath}/abilities.json`);
    if (!response.ok) {
      throw new Error(`Failed to load abilities: ${response.statusText}`);
    }

    const abilitiesArray: AbilityData[] = await response.json() as AbilityData[];
    const abilitiesMap = new Map<number, AbilityData>();

    for (const ability of abilitiesArray) {
      abilitiesMap.set(ability.abilityId, ability);
    }

    console.log(`⚡ Loaded ${abilitiesMap.size} abilities from game configuration`);
    return abilitiesMap;
  }

  async loadKeywords(): Promise<Map<number, string>> {
    // For now, we'll create a basic keyword mapping
    // This could be loaded from a separate keywords.json file in the future
    const keywords = new Map<number, string>();
    
    // Basic keyword mappings (these IDs should match your enums)
    keywords.set(1, 'TERRESTRIAL');
    keywords.set(2, 'AQUATIC');
    keywords.set(3, 'AMPHIBIOUS');
    keywords.set(4, 'FRESHWATER');
    keywords.set(5, 'MARINE');
    keywords.set(6, 'FOREST');
    keywords.set(7, 'RIVER');
    keywords.set(8, 'OCEAN');
    keywords.set(9, 'DESERT');
    keywords.set(10, 'GRASSLAND');
    keywords.set(11, 'WETLAND');
    keywords.set(12, 'MOUNTAIN');
    keywords.set(13, 'ARCTIC');
    keywords.set(14, 'TROPICAL');
    keywords.set(15, 'TEMPERATE');
    keywords.set(16, 'FISH');
    keywords.set(17, 'MAMMAL');
    keywords.set(18, 'BIRD');
    keywords.set(19, 'REPTILE');
    keywords.set(20, 'PLANT');
    keywords.set(21, 'FUNGI');
    keywords.set(22, 'BACTERIA');
    keywords.set(23, 'INSECT');
    keywords.set(24, 'CRUSTACEAN');
    keywords.set(25, 'MOLLUSK');
    keywords.set(26, 'ARTHROPOD');
    keywords.set(27, 'PACK_HUNTER');
    keywords.set(28, 'SOLITARY');
    keywords.set(29, 'SOCIAL');
    keywords.set(30, 'MIGRATORY');
    keywords.set(31, 'TERRITORIAL');
    keywords.set(32, 'NOCTURNAL');
    keywords.set(33, 'DIURNAL');
    keywords.set(34, 'VENOMOUS');
    keywords.set(35, 'POISONOUS');
    keywords.set(36, 'SCAVENGE');
    keywords.set(37, 'HYPERCARNIVORE');
    keywords.set(38, 'WATERSHED_PREDATOR');
    keywords.set(39, 'PARASITIC_DRAIN');
    keywords.set(40, 'RECYCLER');
    keywords.set(41, 'APEX_PREDATOR');
    keywords.set(42, 'MICROSCOPIC');
    keywords.set(43, 'TINY');
    keywords.set(44, 'SMALL');
    keywords.set(45, 'MEDIUM');
    keywords.set(46, 'LARGE');
    keywords.set(47, 'HUGE');
    keywords.set(48, 'GIGANTIC');

    console.log(`🏷️ Loaded ${keywords.size} keywords`);
    return keywords;
  }

  async createLocalizationManager(): Promise<ILocalizationManager> {
    const dataLoader = new JSONFileDataLoader(this.localizationPath);
    const localizationManager = new LocalizationManager(dataLoader);
    
    console.log(`🌍 Created localization manager`);
    return localizationManager;
  }
}

// ============================================================================
// LEGACY COMPATIBILITY LAYER
// ============================================================================

/**
 * Adds legacy properties to CardData for backwards compatibility
 */
export function addLegacyCardProperties(
  cardData: CardData,
  localizationManager: ILocalizationManager
): CardData {
  return {
    ...cardData,
    commonName: localizationManager.getCardName(cardData.nameId),
    scientificName: localizationManager.getScientificName(cardData.scientificNameId)
  };
}

/**
 * Adds legacy properties to AbilityData for backwards compatibility
 */
export function addLegacyAbilityProperties(
  abilityData: AbilityData,
  localizationManager: ILocalizationManager
): AbilityData {
  return {
    ...abilityData,
    name: localizationManager.getAbilityName(abilityData.nameId),
    description: localizationManager.getAbilityDescription(abilityData.descriptionId),
    abilityID: abilityData.abilityId, // Legacy property mapping
    triggerID: abilityData.triggerId // Legacy property mapping
  };
}

/**
 * Convenience function to create a fully configured BioMastersEngine
 */
export async function createBioMastersEngine(
  languageCode: SupportedLanguage = SupportedLanguage.ENGLISH,
  gameConfigPath?: string,
  localizationPath?: string
): Promise<any> {
  const { BioMastersEngine } = await import('./game-engine/BioMastersEngine');
  
  const dataLoader = new JSONFileGameDataLoader(gameConfigPath, localizationPath);
  const gameData = await dataLoader.loadGameData(languageCode);

  // Add legacy properties for backwards compatibility
  const cardsWithLegacy = new Map<number, CardData>();
  for (const [id, card] of gameData.cards) {
    cardsWithLegacy.set(id, addLegacyCardProperties(card, gameData.localizationManager));
  }

  const abilitiesWithLegacy = new Map<number, AbilityData>();
  for (const [id, ability] of gameData.abilities) {
    abilitiesWithLegacy.set(id, addLegacyAbilityProperties(ability, gameData.localizationManager));
  }

  return new BioMastersEngine(
    cardsWithLegacy,
    abilitiesWithLegacy,
    gameData.keywords,
    gameData.localizationManager
  );
}
