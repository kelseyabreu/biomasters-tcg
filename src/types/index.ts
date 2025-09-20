/**
 * Frontend-specific types for BioMasters TCG
 *
 * This file contains ONLY frontend-specific types and enums that don't exist in shared.
 * All shared types should be imported directly from @shared/types and @shared/enums
 */

// Import shared types and enums that are used across frontend, server, and workers
import {
  CardData,
  Player,
  GameState,
  Position,
  CardInstance,
  GameAction,
  ActionResult,
  CardModifier,
  GameSettings,
  GameMetadata,
  AbilityData,
  ConservationStatus,
  CardId,
  AbilityId,
  TrophicLevel,
  TurnPhase,
  GamePhase,
  Domain,
  KeywordId,
  TriggerId,
  EffectId,
  SelectorId,
  ActionId,
  TrophicCategoryId,
  GameActionType,
  PhyloGameState
} from '@kelseyabreu/shared';

// Re-export shared types for convenience
export type {
  CardData,
  Player,
  GameState,
  Position,
  CardInstance,
  GameAction,
  ActionResult,
  CardModifier,
  GameSettings,
  GameMetadata,
  AbilityData
} from '@kelseyabreu/shared';

export {
  ConservationStatus,
  CardId,
  AbilityId,
  TrophicLevel,
  TurnPhase,
  GamePhase,
  Domain,
  KeywordId,
  TriggerId,
  EffectId,
  SelectorId,
  ActionId,
  TrophicCategoryId
} from '@kelseyabreu/shared';

// ============================================================================
// FRONTEND-SPECIFIC ENUMS (not in shared)
// ============================================================================

export enum TrophicRole {
  PRODUCER = 'Producer',
  HERBIVORE = 'Herbivore',
  CARNIVORE = 'Carnivore',
  OMNIVORE = 'Omnivore',
  DETRITIVORE = 'Detritivore',
  DECOMPOSER = 'Decomposer',
  SCAVENGER = 'Scavenger',
  FILTER_FEEDER = 'Filter Feeder',
  MIXOTROPH = 'Mixotroph'
}

export enum Habitat {
  TUNDRA = 'Tundra',
  TEMPERATE = 'Temperate',
  TROPICAL = 'Tropical'
}

// Phylo-specific enums for domino-style gameplay
export enum PhyloTerrain {
  FOREST = 'Forest',
  GRASSLAND = 'Grassland',
  OCEAN = 'Ocean',
  FRESHWATER = 'Freshwater',
  MOUNTAIN = 'Mountain',
  DESERT = 'Desert',
  URBAN = 'Urban'
}

export enum PhyloClimate {
  COLD = 'Cold',
  COOL = 'Cool',
  WARM = 'Warm',
  HOT = 'Hot'
}

export enum PhyloDietType {
  PRODUCER = 'Producer',
  HERBIVORE = 'Herbivore',
  CARNIVORE = 'Carnivore',
  OMNIVORE = 'Omnivore'
}

export enum PhyloKeyword {
  INVASIVE = 'INVASIVE',
  PARASITIC = 'PARASITIC',
  POLLINATOR = 'POLLINATOR'
}

export enum WinConditionType {
  APEX_PREDATOR = 'Apex Predator',
  ECOSYSTEM_BALANCE = 'Ecosystem Balance',
  CONSERVATION_VICTORY = 'Conservation Victory',
  SPECIES_COLLECTION = 'Species Collection'
}

// ============================================================================
// FRONTEND-SPECIFIC INTERFACES
// ============================================================================

/**
 * Frontend Card interface that extends shared CardData with UI-specific properties
 */
export interface Card extends Omit<CardData, 'abilities'> {
  // Frontend-specific properties for UI display
  id: string; // Unique instance ID for game logic (generated from cardId)
  artwork: string; // Path to card artwork
  description: string; // Localized description

  // Backward compatibility properties (mapped from shared CardData)
  conservationStatus: ConservationStatus; // Maps to conservation_status
  trophicRole: TrophicRole; // Maps to trophic_level
  habitat: Habitat; // Maps to domain/keywords
  power: number; // Calculated from biological data
  health: number; // Calculated from biological data
  maxHealth: number; // Same as health
  speed: number; // Maps to movement speeds
  senses: number; // Maps to sensory capabilities
  energyCost: number; // Maps to cost requirements
  abilities: CardAbility[]; // Transformed from AbilityId[]

  // Real biological data (already exists in CardData)
  realData?: {
    mass_kg: number;
    // Movement speeds
    walk_Speed_m_per_hr?: number;
    run_Speed_m_per_hr?: number;
    swim_Speed_m_per_hr?: number;
    burrow_Speed_m_per_hr?: number;
    fly_Speed_m_per_hr?: number;
    // Sensory capabilities
    vision_range_m?: number;
    hearing_range_m?: number;
    smell_range_m?: number;
    taste_range_m?: number;
    touch_range_m?: number;
    heat_range_m?: number;
    // Environmental tolerances
    temperatureMinimum_C?: number;
    temperatureMaximum_C?: number;
    temperatureOptimalMin_C?: number;
    temperatureOptimalMax_C?: number;
    moistureOptimal_pct?: number;
    moistureTolerance_pct?: number;
    moistureLethal_pct?: number;
    // Lifespan
    lifespan_Max_Days?: number;
    habitat?: string;
  };

  // Phylo domino-style game attributes
  phyloAttributes?: {
    terrains: string[];
    climates: string[];
    foodchainLevel: number;
    scale: number;
    dietType: string;
    movementCapability: {
      moveValue: number;
      canFly: boolean;
      canSwim: boolean;
      canBurrow: boolean;
    };
    specialKeywords: string[];
    pointValue: number;
    conservationStatus: string;
    compatibilityNotes: string;
  };
}

export interface CardAbility {
  id: string;
  name: string;
  description: string;
  trigger: AbilityTrigger;
  effect: AbilityEffect;
}

export interface AbilityTrigger {
  type: 'combat' | 'play' | 'environmental' | 'conditional';
  condition?: string;
  value?: number;
}

export interface AbilityEffect {
  type: 'stat_modifier' | 'damage' | 'heal' | 'energy' | 'special';
  target: 'self' | 'opponent' | 'all_friendly' | 'all_enemy';
  value: number;
  duration?: number;
}

// IUCN Red List rarity system for booster packs
export interface ConservationRarity {
  status: ConservationStatus;
  percentage: number;
  packRarity: number; // Cards per 1000 packs
  description: string;
  borderColor: string;
  glowEffect: string;
}



// Phylo domino-style game interfaces
export interface PhyloCardPosition {
  x: number;
  y: number;
  cardId: string;
  playerId: string;
}

export interface PhyloGameBoard {
  positions: Map<string, PhyloCardPosition>; // key: "x,y"
  connections: Map<string, string[]>; // key: cardId, value: array of connected cardIds
  homeCards: PhyloCardPosition[];
}

export interface PhyloCompatibility {
  environmental: boolean; // terrain + climate match
  foodchain: boolean; // foodchain level compatibility
  scale: boolean; // scale requirements for carnivores
}

export interface PhyloPlacementValidation {
  isValid: boolean;
  compatibility: PhyloCompatibility;
  adjacentCards: string[];
  errorMessage?: string;
}

export interface CombatEvent {
  id: string;
  timestamp: number;
  attacker: Card;
  defender: Card;
  roll: number;
  modifiers: CombatModifier[];
  success: boolean;
  damage: number;
  description: string;
}

export interface CombatModifier {
  type: 'trophic_advantage' | 'speed_advantage' | 'senses_advantage' | 'habitat_match' | 'ability';
  value: number;
  description: string;
}

export interface CombatResult {
  success: boolean;
  roll: number;
  finalChance: number;
  modifiers: CombatModifier[];
  damage: number;
  defenderDestroyed: boolean;
}

// Legacy SpeciesData interface for backward compatibility
export interface SpeciesData {
  archetypeName: string;
  identity: {
    speciesName: string;
    commonName: string;
    scientificName: string;
    taxonomy: {
      kingdom: string;
      phylum: string;
      class: string;
      order: string;
      family: string;
      genus: string;
      species: string;
    };
  };
  body: {
    mass_kg: number;
    waterRatio: number;
    carbonRatio: number;
    nitrogenRatio: number;
    phosphorusRatio: number;
    otherMineralsRatio: number;
  };
  movement?: {
    walk_Speed_m_per_hr?: number;
    run_Speed_m_per_hr?: number;
    swim_Speed_m_per_hr?: number;
    fastSwim_Speed_m_per_hr?: number;
    fly_Speed_m_per_hr?: number;
    burrow_Speed_m_per_hr?: number;
    speedModifier?: number;
  };
  phyloAttributes?: {
    terrains: string[];
    climates: string[];
    foodchainLevel: number;
    scale: number;
    dietType: string;
    movementCapability: {
      moveValue: number;
      canFly: boolean;
      canSwim: boolean;
      canBurrow: boolean;
    };
    specialKeywords: string[];
    pointValue: number;
    conservationStatus: string;
    compatibilityNotes: string;
  };
  perception?: {
    vision_range_m?: number;
    smell_range_m?: number;
    taste_range_m?: number;
    hearing_range_m?: number;
    touch_range_m?: number;
    heat_range_m?: number;
  };
  environmentalResponse: {
    temperatureMinimum_C: number;
    temperatureMaximum_C: number;
    temperatureOptimalMin_C: number;
    temperatureOptimalMax_C: number;
    moistureOptimal_pct: number;
    moistureTolerance_pct: number;
    moistureLethal_pct: number;
    lightOptimal_PAR?: number;
    lightSaturation_PAR?: number;
    lightCompensation_PAR?: number;
    pHOptimal: number;
    pHTolerance: number;
  };
  acquisition?: {
    capabilities: Array<{
      method: string;
      preference_weight: number;
      rateDataClass: string;
      rateData: any;
    }>;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform shared CardData to frontend Card view model
 * This makes the data flow predictable and easier to debug
 */
export function transformCardDataToCard(cardData: CardData): Card {
  // Handle both camelCase (from JSON) and snake_case (from DataLoader) formats
  const rawData = cardData as any; // Type assertion to access both formats
  const conservationStatus = rawData.conservationStatus || cardData.conservation_status || ConservationStatus.NOT_EVALUATED;



  return {
    ...cardData, // Include all shared CardData properties
    id: `card_${cardData.cardId}`, // Generate instance ID from cardId
    artwork: `/images/cards/${cardData.nameId.toLowerCase()}.jpg`,
    description: '', // Should be localized

    // Map shared properties to backward compatibility properties
    conservationStatus: conservationStatus,
    trophicRole: mapTrophicLevelToRole(cardData.trophicLevel),
    habitat: mapDomainToHabitat(cardData.taxoDomain),
    power: calculatePowerFromBiologicalData(cardData),
    health: calculateHealthFromBiologicalData(cardData),
    maxHealth: calculateHealthFromBiologicalData(cardData),
    speed: cardData.walk_speed_m_per_hr || 10,
    senses: cardData.vision_range_m || 50,
    energyCost: 1, // Default - should be calculated from cost requirements
    abilities: [], // Should be populated from abilities data
  };
}

// ============================================================================
// MAPPING FUNCTIONS: Shared Types ↔ Frontend Types
// ============================================================================

/**
 * Maps frontend action types to shared GameActionType enum
 */
export function mapActionType(frontendActionType: string): GameActionType {
  switch (frontendActionType) {
    case 'place_card':
      return GameActionType.PLAY_CARD;
    case 'move_card':
      return GameActionType.MOVE_CARD;
    case 'challenge':
      return GameActionType.CHALLENGE;
    case 'pass_turn':
      return GameActionType.PASS_TURN;
    case 'drop_and_draw':
      return GameActionType.DROP_AND_DRAW_THREE;
    case 'PLACE_CARD':
      return GameActionType.PLAY_CARD;
    case 'MOVE_CARD':
      return GameActionType.MOVE_CARD;
    case 'ACTIVATE_ABILITY':
      return GameActionType.ACTIVATE_ABILITY;
    case 'END_TURN':
      return GameActionType.PASS_TURN;
    case 'CHALLENGE':
      return GameActionType.CHALLENGE;
    case 'PASS':
      return GameActionType.PASS_TURN;
    default:
      return GameActionType.PASS_TURN; // Default fallback
  }
}

/**
 * Maps shared TrophicLevel enum to frontend TrophicRole enum
 */
function mapTrophicLevelToRole(trophicLevel: TrophicLevel | number | null): TrophicRole {
  if (trophicLevel === null || trophicLevel === undefined) {
    return TrophicRole.PRODUCER;
  }

  switch (trophicLevel) {
    case TrophicLevel.DETRITIVORE:      // -2
    case -2:
      return TrophicRole.DETRITIVORE;
    case TrophicLevel.SAPROTROPH:       // -1
    case -1:
      return TrophicRole.DECOMPOSER;
    case TrophicLevel.DETRITUS_TILE:    // 0
    case 0:
      return TrophicRole.DECOMPOSER;
    case TrophicLevel.PRODUCER:         // 1
    case 1:
      return TrophicRole.PRODUCER;
    case TrophicLevel.PRIMARY_CONSUMER: // 2
    case 2:
      return TrophicRole.HERBIVORE;
    case TrophicLevel.SECONDARY_CONSUMER: // 3
    case 3:
      return TrophicRole.CARNIVORE;
    case TrophicLevel.APEX_PREDATOR:    // 4
    case 4:
      return TrophicRole.CARNIVORE;
    default:
      return TrophicRole.PRODUCER;
  }
}

/**
 * Maps shared Domain enum to frontend Habitat enum
 */
function mapDomainToHabitat(domain: Domain | number | null): Habitat {
  if (domain === null || domain === undefined) {
    return Habitat.TEMPERATE;
  }

  switch (domain) {
    case Domain.TERRESTRIAL:
    case 1:
      return Habitat.TEMPERATE;
    case Domain.FRESHWATER:
    case 2:
      return Habitat.TEMPERATE; // Could be more specific
    case Domain.MARINE:
    case 3:
      return Habitat.TROPICAL; // Ocean environments
    case Domain.AMPHIBIOUS_FRESHWATER:
    case 4:
      return Habitat.TEMPERATE;
    case Domain.AMPHIBIOUS_MARINE:
    case 5:
      return Habitat.TROPICAL;
    case Domain.EURYHALINE:
    case 6:
      return Habitat.TEMPERATE;
    default:
      return Habitat.TEMPERATE;
  }
}

function calculatePowerFromBiologicalData(cardData: CardData): number {
  // Calculate power based on mass and other biological factors
  const basePower = Math.log10((cardData.mass_kg || 1) + 1) * 20;
  return Math.max(1, Math.round(basePower));
}

function calculateHealthFromBiologicalData(cardData: CardData): number {
  // Calculate health based on mass and lifespan
  const baseHealth = Math.log10((cardData.mass_kg || 1) + 1) * 30;
  const lifespanBonus = (cardData.lifespan_max_days || 365) / 365 * 10;
  return Math.max(10, Math.round(baseHealth + lifespanBonus));
}

/**
 * Create a Card with default values for missing properties
 * Useful for frontend code that needs to create cards quickly
 */
export function createCardWithDefaults(partial: Partial<Card> & { cardId: number; nameId: string }): Card {
  return {
    // Required CardData properties with defaults
    cardId: partial.cardId,
    nameId: partial.nameId,
    scientificNameId: partial.scientificNameId || `SCIENTIFIC_${partial.nameId}`,
    descriptionId: partial.descriptionId || `DESC_${partial.nameId}`,
    taxonomyId: partial.taxonomyId || `TAXONOMY_${partial.nameId}`,
    taxoDomain: partial.taxoDomain || 1,
    taxoKingdom: partial.taxoKingdom || 1,
    taxoPhylum: partial.taxoPhylum || 1,
    taxoClass: partial.taxoClass || 1,
    taxoOrder: partial.taxoOrder || 1,
    taxoFamily: partial.taxoFamily || 1,
    taxoGenus: partial.taxoGenus || 1,
    taxoSpecies: partial.taxoSpecies || 1,
    trophicLevel: partial.trophicLevel || 1,
    trophicCategory: partial.trophicCategory || null,
    cost: partial.cost || null,
    victoryPoints: partial.victoryPoints || 1,
    mass_kg: partial.mass_kg || null,
    lifespan_max_days: partial.lifespan_max_days || null,
    vision_range_m: partial.vision_range_m || null,
    smell_range_m: partial.smell_range_m || null,
    hearing_range_m: partial.hearing_range_m || null,
    walk_speed_m_per_hr: partial.walk_speed_m_per_hr || null,
    run_speed_m_per_hr: partial.run_speed_m_per_hr || null,
    swim_speed_m_per_hr: partial.swim_speed_m_per_hr || null,
    fly_speed_m_per_hr: partial.fly_speed_m_per_hr || null,
    offspring_count: partial.offspring_count || null,
    gestation_days: partial.gestation_days || null,
    domain: partial.domain || 0,
    keywords: partial.keywords || [],
    abilities: partial.abilities || [],
    artwork_url: partial.artwork_url || null,
    conservation_status: partial.conservation_status || ConservationStatus.NOT_EVALUATED,
    iucn_id: partial.iucn_id || null,
    population_trend: partial.population_trend || null,

    // Frontend-specific properties
    id: partial.id || `card_${partial.cardId}`,
    artwork: partial.artwork || `/images/cards/${partial.nameId.toLowerCase()}.jpg`,
    description: partial.description || '',
    conservationStatus: partial.conservationStatus || ConservationStatus.NOT_EVALUATED,
    trophicRole: partial.trophicRole || TrophicRole.PRODUCER,
    habitat: partial.habitat || Habitat.TEMPERATE,
    power: partial.power || 1,
    health: partial.health || 10,
    maxHealth: partial.maxHealth || 10,
    speed: partial.speed || 10,
    senses: partial.senses || 50,
    energyCost: partial.energyCost || 1,

    // Optional properties
    realData: partial.realData,
    phyloAttributes: partial.phyloAttributes,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONSERVATION_RARITY_DATA: Record<ConservationStatus, ConservationRarity> = {
  [ConservationStatus.NOT_EVALUATED]: {
    status: ConservationStatus.NOT_EVALUATED,
    percentage: 15.0,
    packRarity: 150, // Common
    description: 'Conservation status not yet assessed',
    borderColor: '#9e9e9e',
    glowEffect: 'rgba(158, 158, 158, 0.3)'
  },
  [ConservationStatus.EXTINCT]: {
    status: ConservationStatus.EXTINCT,
    percentage: 0.54,
    packRarity: 5, // 5 in 1000 packs (ultra rare)
    description: 'No known individuals remaining',
    borderColor: '#000000',
    glowEffect: 'shadow-black'
  },
  [ConservationStatus.EXTINCT_IN_WILD]: {
    status: ConservationStatus.EXTINCT_IN_WILD,
    percentage: 0.054,
    packRarity: 1, // 1 in 1000 packs (legendary)
    description: 'Known only to survive in captivity',
    borderColor: '#4A0E4E',
    glowEffect: 'shadow-purple'
  },
  [ConservationStatus.CRITICALLY_ENDANGERED]: {
    status: ConservationStatus.CRITICALLY_ENDANGERED,
    percentage: 5.95,
    packRarity: 59, // 59 in 1000 packs (epic)
    description: 'Extremely high risk of extinction',
    borderColor: '#8B0000',
    glowEffect: 'shadow-red'
  },
  [ConservationStatus.ENDANGERED]: {
    status: ConservationStatus.ENDANGERED,
    percentage: 10.92,
    packRarity: 109, // 109 in 1000 packs (rare)
    description: 'Very high risk of extinction',
    borderColor: '#FF4500',
    glowEffect: 'shadow-orange'
  },
  [ConservationStatus.VULNERABLE]: {
    status: ConservationStatus.VULNERABLE,
    percentage: 13.19,
    packRarity: 132, // 132 in 1000 packs (uncommon)
    description: 'High risk of extinction',
    borderColor: '#FFD700',
    glowEffect: 'shadow-yellow'
  },
  [ConservationStatus.NEAR_THREATENED]: {
    status: ConservationStatus.NEAR_THREATENED,
    percentage: 5.73,
    packRarity: 57, // 57 in 1000 packs (uncommon)
    description: 'Close to qualifying for threatened status',
    borderColor: '#32CD32',
    glowEffect: 'shadow-green'
  },
  [ConservationStatus.LEAST_CONCERN]: {
    status: ConservationStatus.LEAST_CONCERN,
    percentage: 50.51,
    packRarity: 505, // 505 in 1000 packs (common)
    description: 'Widespread and abundant',
    borderColor: '#228B22',
    glowEffect: 'shadow-light-green'
  },
  [ConservationStatus.DATA_DEFICIENT]: {
    status: ConservationStatus.DATA_DEFICIENT,
    percentage: 12.97,
    packRarity: 130, // 130 in 1000 packs (uncommon)
    description: 'Inadequate information for assessment',
    borderColor: '#708090',
    glowEffect: 'shadow-gray'
  }
};

// ============================================================================
// MISSING TYPES FOR GAME LOGIC
// ============================================================================

export interface TurnAction {
  type: 'PLACE_CARD' | 'MOVE_CARD' | 'ACTIVATE_ABILITY' | 'END_TURN' | 'CHALLENGE' | 'PASS';
  playerId: string;
  cardId?: string;
  targetPosition?: Position;
  sourcePosition?: Position;
  abilityId?: string;
  targetCardId?: string;
  data?: any;
  challengeData?: {
    targetCardId: string;
    targetPlayerId: string;
    claimType: any; // ScientificChallenge['claimType']
    evidence: string;
  };
}

export interface TurnResult {
  success: boolean;
  action: GameAction;
  newGameState: PhyloGameState;
  nextPlayer?: string;
  gameEnded?: boolean;
  winCondition?: any;
  errorMessage?: string;
}

export interface WinCondition {
  id: string;
  type: 'ECOSYSTEM_BALANCE' | 'SPECIES_DIVERSITY' | 'CONSERVATION_GOAL' | 'SCIENTIFIC_ACCURACY';
  name: string;
  description: string;
  targetValue: number;
  currentValue?: number;
  isComplete?: boolean;
}

export interface WinConditionProgress {
  condition: WinConditionType;
  playerId: string;
  progress: number; // Current progress value
  target: number; // Target value to achieve
  achieved: boolean; // Whether the condition is met
  isComplete?: boolean; // Alias for achieved
  description?: string; // Optional description
}