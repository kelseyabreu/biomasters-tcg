// Core game types and interfaces for Species Combat TCG

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

export enum WinCondition {
  APEX_PREDATOR = 'Apex Predator',
  ECOSYSTEM_BALANCE = 'Ecosystem Balance',
  CONSERVATION_VICTORY = 'Conservation Victory',
  SPECIES_COLLECTION = 'Species Collection'
}

export enum GamePhase {
  SETUP = 'Setup',
  PLAYER_TURN = 'Player Turn',
  COMBAT = 'Combat',
  END_TURN = 'End Turn',
  GAME_OVER = 'Game Over'
}

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

export interface Card {
  id: string;
  speciesName: string;
  commonName: string;
  scientificName: string;
  trophicRole: TrophicRole;
  habitat: Habitat;
  power: number;
  health: number;
  maxHealth: number;
  speed: number;
  senses: number;
  energyCost: number;
  abilities: CardAbility[];
  conservationStatus: ConservationStatus;
  artwork: string;
  description: string;
  // Real biological data
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

export enum ConservationStatus {
  LEAST_CONCERN = 'Least Concern',
  NEAR_THREATENED = 'Near Threatened',
  VULNERABLE = 'Vulnerable',
  ENDANGERED = 'Endangered',
  CRITICALLY_ENDANGERED = 'Critically Endangered',
  EXTINCT_IN_WILD = 'Extinct in Wild',
  EXTINCT = 'Extinct',
  DATA_DEFICIENT = 'Data Deficient'
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

export const CONSERVATION_RARITY_DATA: Record<ConservationStatus, ConservationRarity> = {
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

export interface Deck {
  id: string;
  name: string;
  cards: Card[];
  isValid: boolean;
}

export interface Player {
  id: string;
  name: string;
  deck: Deck;
  hand: Card[];
  field: Card[];
  energy: number;
  maxEnergy: number;
  playedSpecies: Set<string>;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  currentPlayer: number;
  players: [Player, Player];
  environment: Habitat;
  turnCount: number;
  winConditions: WinConditionProgress[];
  combatLog: CombatEvent[];
}

export interface WinConditionProgress {
  condition: WinCondition;
  playerId: string;
  progress: number;
  target: number;
  achieved: boolean;
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
