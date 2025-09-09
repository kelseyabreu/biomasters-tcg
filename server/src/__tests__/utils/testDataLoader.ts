/**
 * Test Data Loader - ServerDataLoader Based
 * Uses the unified ServerDataLoader for consistent data loading in tests
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { CardData, AbilityData } from '../../../../shared/types';
import {
  ILocalizationManager,
  ILocalizationDataLoader,
  LanguageData,
  LocalizationManager
} from '../../../../shared/localization-manager';
import { SupportedLanguage } from '../../../../shared/text-ids';
import { createDevelopmentDataLoader } from '../../../../shared/data/UnifiedDataLoader';

export interface TestGameData {
  cards: Map<number, CardData>;
  abilities: Map<number, AbilityData>;
  keywords: Map<number, string>;
  localizationManager: ILocalizationManager;
}

/**
 * Test-specific implementation of the data loader that uses Node's file system.
 * This allows the real LocalizationManager to work in the test environment.
 */
class TestJSONFileDataLoader implements ILocalizationDataLoader {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async loadLanguageData(languageCode: SupportedLanguage): Promise<LanguageData> {
    const langPath = join(this.basePath, languageCode);

    const [cards, abilities, ui, taxonomy] = await Promise.all([
      this.loadJSON(join(langPath, 'cards.json')),
      this.loadJSON(join(langPath, 'abilities.json')),
      this.loadJSON(join(langPath, 'ui.json')),
      this.loadJSON(join(langPath, 'taxonomy.json'))
    ]);

    return { cards, abilities, ui, taxonomy } as LanguageData;
  }

  async getAvailableLanguages(): Promise<SupportedLanguage[]> {
    return [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  }

  private async loadJSON<T>(path: string): Promise<T> {
    const fileContent = await fs.readFile(path, 'utf8');
    return JSON.parse(fileContent) as T;
  }
}

/**
 * Load game data using ServerDataLoader for testing
 */
export async function loadTestGameData(): Promise<TestGameData> {
  try {
    // Determine the correct path to the data files
    // From server/src/__tests__/utils/ we need to go up to the project root
    const projectRoot = join(__dirname, '../../../../');
    const dataPath = join(projectRoot, 'public/data');

    console.log(`📂 Loading test data from: ${dataPath}`);
    console.log(`📂 __dirname is: ${__dirname}`);
    console.log(`📂 projectRoot is: ${projectRoot}`);

    // Initialize unified data loader for testing
    const serverDataLoader = createDevelopmentDataLoader(dataPath);

    // Load cards using ServerDataLoader
    console.log(`📂 Loading cards using ServerDataLoader...`);
    const cardsResult = await serverDataLoader.loadCards();
    if (!cardsResult.success) {
      throw new Error(`Failed to load cards: ${cardsResult.error}`);
    }
    const cardsData = cardsResult.data!;
    console.log(`✅ Loaded ${cardsData.length} cards using ServerDataLoader`);

    // Load abilities using ServerDataLoader
    const abilitiesResult = await serverDataLoader.loadAbilities();
    if (!abilitiesResult.success) {
      throw new Error(`Failed to load abilities: ${abilitiesResult.error}`);
    }
    const abilitiesData = abilitiesResult.data!;
    console.log(`✅ Loaded ${abilitiesData.length} abilities using ServerDataLoader`);

    // Load keywords - fallback to direct file access since keywords might not be in ServerDataLoader yet
    const keywordsPath = join(dataPath, 'game-config/keywords.json');
    console.log(`📂 Loading keywords from: ${keywordsPath}`);
    const keywordsData = JSON.parse(await fs.readFile(keywordsPath, 'utf8'));
    console.log(`✅ Loaded ${keywordsData.length} keywords from file system`);
    console.log(`🔍 First few keywords:`, keywordsData.slice(0, 3));

    // Transform to Maps
    const cardsMap = new Map<number, CardData>();
    for (const card of cardsData) {
      cardsMap.set(card.cardId, card as CardData);
    }

    const abilitiesMap = new Map<number, AbilityData>();
    for (const ability of abilitiesData) {
      // Transform JSON field names to match AbilityData interface
      const transformedAbility: AbilityData = {
        id: (ability as any).abilityId || ability.id,
        nameId: ability.nameId,
        descriptionId: ability.descriptionId,
        triggerId: ability.triggerId,
        effects: ability.effects.map((effect: any) => ({
          type: String(effect.effectId || effect.type || 'unknown'),
          value: effect.value,
          selector: effect.selectorId ? String(effect.selectorId) : effect.selector,
          filter: {
            keywords: effect.filterKeywords,
            trophicCategories: effect.filterTrophicCategories,
            trophicLevels: effect.filterTrophicLevels,
            domains: effect.filterDomains
          },
          target: effect.target
        }))
      };
      abilitiesMap.set(transformedAbility.id, transformedAbility);
    }

    // Create keywords map
    const keywordsMap = new Map<number, string>();
    for (const keyword of keywordsData) {
      keywordsMap.set(keyword.id, keyword.name);
    }

    // Create the Node.js-compatible data loader we just made.
    const localizationPath = join(dataPath, 'localization');
    const testLocalizationDataLoader = new TestJSONFileDataLoader(localizationPath);

    // The real LocalizationManager now works perfectly because we've given it
    // a data loader that works in the Node.js test environment.
    const localizationManager = new LocalizationManager(testLocalizationDataLoader);
    await localizationManager.loadLanguage(SupportedLanguage.ENGLISH);

    console.log(`📊 Test data loaded: ${cardsMap.size} cards, ${abilitiesMap.size} abilities, ${keywordsMap.size} keywords`);

    return {
      cards: cardsMap,
      abilities: abilitiesMap,
      keywords: keywordsMap,
      localizationManager
    };
  } catch (error) {
    console.error('❌ Failed to load test game data:', error);
    throw error;
  }
}

/**
 * Create a minimal test game data set for basic tests
 */
export function createMinimalTestGameData(): TestGameData {
  // Create minimal test data
  const cardsMap = new Map<number, CardData>();
  const abilitiesMap = new Map<number, AbilityData>();
  const keywordsMap = new Map<number, string>();

  // Add a basic test card with all required properties
  cardsMap.set(1, {
    cardId: 1,
    nameId: 'CARD_OAK_TREE' as any,
    scientificNameId: 'SCIENTIFIC_OAK_TREE' as any,
    descriptionId: 'DESC_OAK_TREE' as any,
    taxonomyId: 'TAXONOMY_OAK_TREE' as any,
    trophicLevel: 1,
    trophicCategory: 1,
    domain: 1,
    cost: JSON.stringify({ Requires: [] }),
    keywords: [],
    abilities: [],
    victoryPoints: 1,
    conservation_status: 7,
    mass_kg: 1000,
    lifespan_max_days: 36500,
    vision_range_m: 0,
    smell_range_m: 0,
    hearing_range_m: 0,
    walk_speed_m_per_hr: 0,
    run_speed_m_per_hr: 0,
    swim_speed_m_per_hr: 0,
    fly_speed_m_per_hr: 0,
    offspring_count: 1000,
    gestation_days: 365,
    artwork_url: null,
    iucn_id: null,
    population_trend: null,
    // Add required taxonomy fields
    taxoDomain: 1 as any,
    taxoKingdom: 2 as any,
    taxoPhylum: 5 as any,
    taxoClass: 8 as any,
    taxoOrder: 12 as any,
    taxoFamily: 15 as any,
    taxoGenus: 18 as any,
    taxoSpecies: 20 as any
  });

  // Create a mock localization manager
  const mockLocalizationManager: ILocalizationManager = {
    currentLanguage: 'en',
    availableLanguages: ['en' as any],
    loadLanguage: async () => {},
    getCardName: () => 'Test Card',
    getScientificName: () => 'Test Scientific Name',
    getCardDescription: () => 'Test Description',
    getAbilityName: () => 'Test Ability',
    getAbilityDescription: () => 'Test Ability Description',
    getAbilityFlavorText: () => 'Test Flavor Text',
    getKeywordName: () => 'Test Keyword',
    getUIText: () => 'Test UI Text',
    getTaxonomy: () => ({
      kingdom: 'Test Kingdom',
      phylum: 'Test Phylum',
      class: 'Test Class',
      order: 'Test Order',
      family: 'Test Family',
      genus: 'Test Genus',
      species: 'Test Species',
      commonNames: ['Test Common Name']
    }),
    getFormattedScientificName: () => 'Test Genus species',
    hasText: () => true,
    getText: (textId: string) => `[${textId}]`,
    getTaxonomyName: (taxonomyDisplayId: string) => taxonomyDisplayId
  };

  return {
    cards: cardsMap,
    abilities: abilitiesMap,
    keywords: keywordsMap,
    localizationManager: mockLocalizationManager
  };
}
