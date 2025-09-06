/**
 * GameDataManager - JSON-Driven Game Data Service
 * 
 * This service loads and manages all game data from JSON files,
 * serving as the single source of truth for the game engine.
 * Aligns with offline-first, JSON-driven architecture.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CardId,
  KeywordId,
  TrophicCategoryId,
  ConservationStatus,
  TriggerId,
  EffectId,
  SelectorId,
  ActionId
} from '@biomasters/shared';

// Raw JSON interface (PascalCase from source files)
export interface RawCardData {
  CardID: CardId;
  TrophicLevel: number | null;
  TrophicCategory: TrophicCategoryId;
  Domain: number;
  Cost: any;
  Keywords: KeywordId[];
  Abilities?: number[];
  VictoryPoints?: number;
  ConservationStatus?: ConservationStatus;
  CommonName: string;
  ScientificName?: string;
  Taxonomy?: any;
  Mass_kg?: number;
  Lifespan_max_days?: number;
  Vision_range_m?: number;
  Smell_range_m?: number;
  Hearing_range_m?: number;
  Walk_speed_m_per_hr?: number;
  Run_speed_m_per_hr?: number;
  Swim_speed_m_per_hr?: number;
  Fly_speed_m_per_hr?: number;
  Offspring_count?: number;
  Gestation_days?: number;
}

// Application interface (camelCase for consistency)
export interface CardData {
  cardId: CardId;
  trophicLevel: number | null;
  trophicCategory: TrophicCategoryId;
  domain: number; // Required domain for habitat compatibility
  cost: any; // JSON cost structure
  keywords: KeywordId[];
  abilities: number[]; // Required - always initialized as empty array if not present
  victoryPoints?: number;
  conservationStatus?: ConservationStatus;
  commonName: string;  // Required for game logic
  scientificName?: string;
  taxonomy?: any;
  massKg?: number;
  lifespanMaxDays?: number;
  visionRangeM?: number;
  smellRangeM?: number;
  hearingRangeM?: number;
  walkSpeedMPerHr?: number;
  runSpeedMPerHr?: number;
  swimSpeedMPerHr?: number;
  flySpeedMPerHr?: number;
  offspringCount?: number;
  gestationDays?: number;
}

// Raw JSON interface (PascalCase from source files)
export interface RawAbilityData {
  AbilityID: number;
  TriggerID: TriggerId;
  Effects: EffectData[];
}

// Application interface (camelCase for consistency)
export interface AbilityData {
  abilityID: number;
  triggerID: TriggerId;
  effects: EffectData[];
}

export interface EffectData {
  EffectID: EffectId;
  SelectorID: SelectorId;
  ActionID: ActionId;
  FilterKeywords?: KeywordId[];
  FilterTrophicCategories?: TrophicCategoryId[];
  FilterTrophicLevels?: number[];
  Description?: string;
}

// Raw JSON interface (PascalCase from source files)
export interface RawLocalizationData {
  CardNames: Record<string, string>;
  CardAbilitiesText: Record<string, string>;
  Keywords: Record<string, string>;
  TrophicCategories: Record<string, string>;
}

// Application interface (camelCase for consistency)
export interface LocalizationData {
  cardNames: Record<string, string>;
  cardAbilitiesText: Record<string, string>;
  keywords: Record<string, string>;
  trophicCategories: Record<string, string>;
}

export interface TriggerData {
  id: TriggerId;
  trigger_name: string;
  trigger_type: string;
  description?: string;
}

export interface KeywordData {
  id: KeywordId;
  keyword_name: string;
  keyword_type: string;
  description?: string;
}

/**
 * Singleton service that loads and provides access to all game data
 */
export class GameDataManager {
  private static instance: GameDataManager;
  
  private cardDatabase: Map<CardId, CardData> = new Map();
  private abilityDatabase: Map<number, AbilityData> = new Map();
  private localizationData: LocalizationData | null = null;
  private triggerDatabase: Map<TriggerId, TriggerData> = new Map();
  private keywordDatabase: Map<KeywordId, KeywordData> = new Map();
  
  private isLoaded = false;

  private constructor() {}

  public static getInstance(): GameDataManager {
    if (!GameDataManager.instance) {
      GameDataManager.instance = new GameDataManager();
    }
    return GameDataManager.instance;
  }

  /**
   * Load all game data from JSON files
   * Should be called once at server startup
   */
  public async loadGameData(): Promise<void> {
    if (this.isLoaded) {
      console.log('🎮 Game data already loaded');
      return;
    }

    try {
      console.log('📚 Loading game data from JSON files...');

      // Load cards.json from root /public/data/ (single source of truth)
      const cardsPath = join(__dirname, '../../../public/data/cards.json');
      const rawCardsData: RawCardData[] = JSON.parse(readFileSync(cardsPath, 'utf8'));

      // Populate card database with camelCase mapping
      this.cardDatabase.clear();
      rawCardsData.forEach(rawCard => {
        const card: CardData = {
          cardId: rawCard.CardID,
          trophicLevel: rawCard.TrophicLevel,
          trophicCategory: rawCard.TrophicCategory,
          domain: rawCard.Domain,
          cost: rawCard.Cost,
          keywords: rawCard.Keywords,
          abilities: rawCard.Abilities || [], // Always initialize as empty array if not present
          ...(rawCard.VictoryPoints !== undefined && { victoryPoints: rawCard.VictoryPoints }),
          ...(rawCard.ConservationStatus !== undefined && { conservationStatus: rawCard.ConservationStatus }),
          commonName: rawCard.CommonName,
          ...(rawCard.ScientificName !== undefined && { scientificName: rawCard.ScientificName }),
          ...(rawCard.Taxonomy !== undefined && { taxonomy: rawCard.Taxonomy }),
          ...(rawCard.Mass_kg !== undefined && { massKg: rawCard.Mass_kg }),
          ...(rawCard.Lifespan_max_days !== undefined && { lifespanMaxDays: rawCard.Lifespan_max_days }),
          ...(rawCard.Vision_range_m !== undefined && { visionRangeM: rawCard.Vision_range_m }),
          ...(rawCard.Smell_range_m !== undefined && { smellRangeM: rawCard.Smell_range_m }),
          ...(rawCard.Hearing_range_m !== undefined && { hearingRangeM: rawCard.Hearing_range_m }),
          ...(rawCard.Walk_speed_m_per_hr !== undefined && { walkSpeedMPerHr: rawCard.Walk_speed_m_per_hr }),
          ...(rawCard.Run_speed_m_per_hr !== undefined && { runSpeedMPerHr: rawCard.Run_speed_m_per_hr }),
          ...(rawCard.Swim_speed_m_per_hr !== undefined && { swimSpeedMPerHr: rawCard.Swim_speed_m_per_hr }),
          ...(rawCard.Fly_speed_m_per_hr !== undefined && { flySpeedMPerHr: rawCard.Fly_speed_m_per_hr }),
          ...(rawCard.Offspring_count !== undefined && { offspringCount: rawCard.Offspring_count }),
          ...(rawCard.Gestation_days !== undefined && { gestationDays: rawCard.Gestation_days })
        };
        this.cardDatabase.set(card.cardId, card);
      });

      // Load abilities.json from root /public/data/
      const abilitiesPath = join(__dirname, '../../../public/data/abilities.json');
      const rawAbilitiesData: RawAbilityData[] = JSON.parse(readFileSync(abilitiesPath, 'utf8'));

      // Populate ability database with camelCase mapping
      this.abilityDatabase.clear();
      rawAbilitiesData.forEach(rawAbility => {
        const ability: AbilityData = {
          abilityID: rawAbility.AbilityID,
          triggerID: rawAbility.TriggerID,
          effects: rawAbility.Effects
        };
        this.abilityDatabase.set(ability.abilityID, ability);
      });

      // Load localization data (en.json) from root /public/data/
      const localizationPath = join(__dirname, '../../../public/data/en.json');
      const rawLocalizationData: RawLocalizationData = JSON.parse(readFileSync(localizationPath, 'utf8'));

      // Map to camelCase
      this.localizationData = {
        cardNames: rawLocalizationData.CardNames,
        cardAbilitiesText: rawLocalizationData.CardAbilitiesText,
        keywords: rawLocalizationData.Keywords,
        trophicCategories: rawLocalizationData.TrophicCategories
      };

      // Create keyword database from localization
      this.keywordDatabase.clear();
      if (this.localizationData?.keywords) {
        Object.entries(this.localizationData.keywords).forEach(([id, name]) => {
          this.keywordDatabase.set(Number(id) as KeywordId, {
            id: Number(id) as KeywordId,
            keyword_name: name as string,
            keyword_type: this.getKeywordType(Number(id) as KeywordId),
            description: `${name} keyword`
          });
        });
      }

      // Create trigger database (basic triggers for now)
      this.triggerDatabase.clear();
      this.triggerDatabase.set(1, { id: 1, trigger_name: 'ON_ACTIVATE', trigger_type: 'ON_ACTIVATE' });
      this.triggerDatabase.set(2, { id: 2, trigger_name: 'PERSISTENT_ATTACHED', trigger_type: 'PERSISTENT_ATTACHED' });
      this.triggerDatabase.set(3, { id: 3, trigger_name: 'ON_ENTER_PLAY', trigger_type: 'ON_ENTER_PLAY' });
      this.triggerDatabase.set(4, { id: 4, trigger_name: 'ON_LEAVE_PLAY', trigger_type: 'ON_LEAVE_PLAY' });
      this.triggerDatabase.set(5, { id: 5, trigger_name: 'START_OF_TURN', trigger_type: 'START_OF_TURN' });
      this.triggerDatabase.set(6, { id: 6, trigger_name: 'END_OF_TURN', trigger_type: 'END_OF_TURN' });

      this.isLoaded = true;
      
      console.log(`✅ Game data loaded successfully:`);
      console.log(`  📄 Cards: ${this.cardDatabase.size}`);
      console.log(`  ⚡ Abilities: ${this.abilityDatabase.size}`);
      console.log(`  🏷️ Keywords: ${this.keywordDatabase.size}`);
      console.log(`  🎯 Triggers: ${this.triggerDatabase.size}`);

    } catch (error) {
      console.error('❌ Failed to load game data:', error);
      throw new Error('Failed to load game data from JSON files');
    }
  }

  /**
   * Get all cards as a Map
   */
  public getCards(): Map<CardId, CardData> {
    this.ensureLoaded();
    return new Map(this.cardDatabase);
  }

  /**
   * Get a specific card by ID
   */
  public getCard(cardId: CardId): CardData | undefined {
    this.ensureLoaded();
    return this.cardDatabase.get(cardId);
  }

  /**
   * Get all abilities as a Map
   */
  public getAbilities(): Map<number, AbilityData> {
    this.ensureLoaded();
    return new Map(this.abilityDatabase);
  }

  /**
   * Get a specific ability by ID
   */
  public getAbility(abilityId: number): AbilityData | undefined {
    this.ensureLoaded();
    return this.abilityDatabase.get(abilityId);
  }

  /**
   * Get localization data
   */
  public getLocalization(): LocalizationData {
    this.ensureLoaded();
    if (!this.localizationData) {
      throw new Error('Localization data not loaded');
    }
    return this.localizationData;
  }

  /**
   * Get all keywords as a Map
   */
  public getKeywords(): Map<KeywordId, KeywordData> {
    this.ensureLoaded();
    return new Map(this.keywordDatabase);
  }

  /**
   * Get all triggers as a Map
   */
  public getTriggers(): Map<TriggerId, TriggerData> {
    this.ensureLoaded();
    return new Map(this.triggerDatabase);
  }

  /**
   * Check if data is loaded
   */
  public isDataLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get card name from localization
   */
  public getCardName(cardId: CardId): string {
    const localization = this.getLocalization();
    return localization.cardNames[cardId.toString()] || `Card ${cardId}`;
  }

  /**
   * Get ability text from localization
   */
  public getAbilityText(abilityId: number): string {
    const localization = this.getLocalization();
    return localization.cardAbilitiesText[abilityId.toString()] || `Ability ${abilityId}`;
  }

  /**
   * Get keyword name from localization
   */
  public getKeywordName(keywordId: KeywordId): string {
    const localization = this.getLocalization();
    return localization.keywords[keywordId.toString()] || `Keyword ${keywordId}`;
  }

  private ensureLoaded(): void {
    if (!this.isLoaded) {
      throw new Error('Game data not loaded. Call loadGameData() first.');
    }
  }

  private getKeywordType(keywordId: KeywordId): string {
    // Categorize keywords based on ID ranges (from our enum system)
    if (keywordId >= 1 && keywordId <= 6) return 'DOMAIN';
    if (keywordId >= 7 && keywordId <= 20) return 'HABITAT';
    if (keywordId >= 21 && keywordId <= 40) return 'TAXONOMY';
    if (keywordId >= 41 && keywordId <= 60) return 'BEHAVIOR';
    if (keywordId >= 61 && keywordId <= 80) return 'ABILITY';
    if (keywordId >= 81 && keywordId <= 87) return 'SIZE';
    return 'UNKNOWN';
  }
}

// Export singleton instance
export const gameDataManager = GameDataManager.getInstance();
