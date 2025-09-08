/**
 * BioMasters TCG - Shared Enums
 * 
 * This file contains all the enums used throughout the BioMasters TCG system.
 * These enums ensure type safety and consistency between server and client.
 * All IDs are integers as specified in the BioMasters rules.
 */

// ============================================================================
// CORE GAME ENUMS
// ============================================================================

/**
 * Trophic Categories - The fundamental feeding types in ecosystems
 * Based on BioMasterEngine.txt and database schema
 */
export enum TrophicCategoryId {
  PHOTOAUTOTROPH = 1,    // Plants, algae - produce energy from sunlight
  CHEMOAUTOTROPH = 2,    // Bacteria - produce energy from chemicals
  HERBIVORE = 3,         // Primary consumers - eat plants
  OMNIVORE = 4,          // Eat both plants and animals
  CARNIVORE = 5,         // Secondary/tertiary consumers - eat animals
  SAPROTROPH = 6,        // Decomposers - break down dead matter
  PARASITE = 7,          // Live on/in hosts
  MUTUALIST = 8,         // Mutually beneficial relationships
  DETRITIVORE = 9        // Consume detritus and organic particles
}

/**
 * Trophic Levels - The position in the energy flow
 * Based on BioMasters rules: -2D, -1S, 0 (detritus), +1, +2, +3, +4
 */
export enum TrophicLevel {
  DETRITIVORE = -2,      // Level -2D: Process detritus and organic particles
  SAPROTROPH = -1,       // Level -1S: Break down dead organic matter
  DETRITUS_TILE = 0,     // Level 0: Dead matter on grid (face-down cards)
  PRODUCER = 1,          // Level +1: Photoautotrophs and chemoautotrophs
  PRIMARY_CONSUMER = 2,  // Level +2: Herbivores
  SECONDARY_CONSUMER = 3, // Level +3: Carnivores
  APEX_PREDATOR = 4      // Level +4: Top predators
}

/**
 * Domains - Habitat types for card placement compatibility
 * Standardized domain system replacing keyword-based approach
 */
export enum Domain {
  HOME = 0,                   // HOME cards - compatible with all domains
  TERRESTRIAL = 1,
  FRESHWATER = 2,
  MARINE = 3,
  AMPHIBIOUS_FRESHWATER = 4, // Can connect to TERRESTRIAL + FRESHWATER
  AMPHIBIOUS_MARINE = 5,     // Can connect to TERRESTRIAL + MARINE
  EURYHALINE = 6,            // Can connect to FRESHWATER + MARINE
}

/**
 * Keywords - All game keywords for domains, traits, and abilities
 * Based on BioMasterEngine.txt and database
 */
export enum KeywordId {
  // Domain Keywords (1-10)
  TERRESTRIAL = 1,
  AQUATIC = 2,
  AMPHIBIOUS = 3,
  FRESHWATER = 4,
  MARINE = 5,
  EURYHALINE = 6,        // Can live in both fresh and salt water
  AMPHIBIOUS_FRESHWATER = 7,  // Amphibious species in freshwater
  AMPHIBIOUS_MARINE = 8,      // Amphibious species in marine water

  // Habitat Keywords (11-20)
  FOREST = 11,
  RIVER = 12,
  OCEAN = 13,
  DESERT = 14,
  GRASSLAND = 15,
  WETLAND = 16,
  MOUNTAIN = 17,
  ARCTIC = 18,
  TROPICAL = 19,
  TEMPERATE = 20,
  
  // Taxonomic Keywords (21-40)
  FISH = 21,
  MAMMAL = 22,
  BIRD = 23,
  REPTILE = 24,
  AMPHIBIAN = 25,
  INSECT = 26,
  ARACHNID = 27,
  CRUSTACEAN = 28,
  MOLLUSK = 29,
  PLANT = 30,
  FUNGI = 31,
  BACTERIA = 32,
  PROTIST = 33,
  ARTHROPOD = 34,        // Arthropods (insects, arachnids, crustaceans)

  // Behavioral Keywords (41-60)
  PACK_HUNTER = 41,
  SOLITARY = 42,
  SOCIAL = 43,
  MIGRATORY = 44,
  TERRITORIAL = 45,
  NOCTURNAL = 46,
  DIURNAL = 47,
  CREPUSCULAR = 48,
  
  // Special Abilities (61-80)
  VENOMOUS = 61,
  POISONOUS = 62,
  SCAVENGE = 63,
  HYPERCARNIVORE = 64,
  WATERSHED_PREDATOR = 65,
  PARASITIC_DRAIN = 66,
  RECYCLER = 67,
  APEX_PREDATOR = 68,
  
  // Size Categories (81-90)
  MICROSCOPIC = 81,
  TINY = 82,
  SMALL = 83,
  MEDIUM = 84,
  LARGE = 85,
  HUGE = 86,
  GIGANTIC = 87
}

/**
 * Trigger Types - When abilities activate
 * Based on database schema and BioMasterEngine.txt
 */
export enum TriggerId {
  ON_ACTIVATE = 1,       // Manual activation (Action abilities)
  PERSISTENT_ATTACHED = 2, // Continuous effect while attached
  ON_ENTER_PLAY = 3,     // When card is played
  ON_LEAVE_PLAY = 4,     // When card is removed
  ON_TURN_START = 5,     // At start of turn
  ON_TURN_END = 6,       // At end of turn
  ON_READY = 7,          // When card becomes ready
  ON_EXHAUST = 8,        // When card becomes exhausted
  ON_DAMAGE = 9,         // When taking damage
  ON_DEATH = 10,         // When creature dies
  ON_ATTACK = 11,        // When attacking
  ON_DEFEND = 12,        // When being attacked
  ON_PLAY = 13,          // When card is played (alias)
  ON_ATTACH = 14,        // When attached to host
  ON_DETACH = 15,        // When detached from host
  PERSISTENT = 16,       // Always active while in play
  ACTION = 17            // Activated by player action
}

/**
 * Effect Types - What abilities do
 * Based on database schema
 */
export enum EffectId {
  TARGET = 1,            // Select a target
  TAKE_CARD = 2,         // Take a card from a zone
  APPLY_STATUS = 3,      // Apply status effect
  MOVE_CARD = 4,         // Move card to different zone
  EXHAUST_TARGET = 5,    // Exhaust target card
  READY_TARGET = 6,      // Ready target card
  DESTROY_TARGET = 7,    // Destroy target card
  GAIN_ENERGY = 8,       // Gain energy/resources
  LOSE_ENERGY = 9,       // Lose energy/resources
  DRAW_CARD = 10,        // Draw cards
  DISCARD_CARD = 11,     // Discard cards
  SEARCH_DECK = 12,      // Search deck for cards
  SHUFFLE_DECK = 13,     // Shuffle deck
  GAIN_VP = 14,          // Gain victory points
  LOSE_VP = 15           // Lose victory points
}

/**
 * Selector Types - How abilities choose targets
 * Based on database schema
 */
export enum SelectorId {
  ADJACENT = 1,          // Adjacent cards
  SELF = 2,              // The card with the ability
  ALL = 3,               // All valid targets
  RANDOM = 4,            // Random valid target
  CHOOSE = 5,            // Player chooses target
  NEAREST = 6,           // Nearest valid target
  FARTHEST = 7,          // Farthest valid target
  HIGHEST_TROPHIC = 8,   // Highest trophic level
  LOWEST_TROPHIC = 9,    // Lowest trophic level
  SAME_DOMAIN = 10,      // Same domain (terrestrial/aquatic/etc)
  DIFFERENT_DOMAIN = 11, // Different domain
  DETRITUS = 12,         // Cards in detritus zone
  HAND = 13,             // Cards in hand
  DECK = 14,             // Cards in deck
  SCORE_PILE = 15,       // Cards in score pile
  ADJACENT_SAME_DOMAIN = 16,       // Adjacent cards with same domain
  ADJACENT_AQUATIC = 17,           // Adjacent aquatic cards
  ADJACENT_TERRESTRIAL = 18,       // Adjacent terrestrial cards
  ADJACENT_TO_SHARED_AMPHIBIOUS = 19, // Adjacent to shared amphibious card
  ALL_OWNED_CARDS = 20,            // All cards owned by player
  TARGET_CREATURE = 21,            // Specific targeted creature
  HOST_CREATURE = 22               // Host creature (for parasites/mutualists)
}



/**
 * Action Types - What happens to targets
 * Based on database schema
 */
export enum ActionId {
  EXHAUST = 1,           // Make target exhausted
  READY = 2,             // Make target ready
  DESTROY = 3,           // Destroy target
  MOVE_TO_HAND = 4,      // Move to hand
  MOVE_TO_DECK = 5,      // Move to deck
  MOVE_TO_DETRITUS = 6,  // Move to detritus
  MOVE_TO_SCORE = 7,     // Move to score pile
  APPLY_MODIFIER = 8,    // Apply temporary modifier
  REMOVE_MODIFIER = 9,   // Remove modifier
  ATTACH = 10,           // Attach to target
  DETACH = 11            // Detach from target
}

// ============================================================================
// GAME STATE ENUMS
// ============================================================================

/**
 * Game Phases - Overall game state
 */
export enum GamePhase {
  SETUP = 'setup',
  PLAYING = 'playing',
  FINAL_TURN = 'final_turn',  // Final turn phase when a player can't draw
  ENDED = 'ended'
}

/**
 * Turn Phases - Phases within a player's turn
 */
export enum TurnPhase {
  READY = 'ready',       // Ready all cards, gain energy
  DRAW = 'draw',         // Draw a card
  ACTION = 'action',     // Take actions
  END = 'end'            // End turn cleanup
}

/**
 * Card Zones - Where cards can be located
 */
export enum CardZone {
  DECK = 'deck',
  HAND = 'hand',
  GRID = 'grid',         // In play on the game board
  DETRITUS = 'detritus', // Discard pile/decomposer zone
  SCORE_PILE = 'score_pile',
  REMOVED = 'removed'    // Permanently removed from game
}

/**
 * Game End Conditions
 */
export enum GameEndReason {
  DECK_EMPTY = 'deck_empty',
  PLAYER_QUIT = 'player_quit',
  TIME_LIMIT = 'time_limit',
  FORFEIT = 'forfeit'
}

// ============================================================================
// CARD SPECIFIC ENUMS
// ============================================================================

/**
 * Specific Card IDs - Based on BioMasterEngine.txt examples
 * These will be expanded as more cards are added
 */
export enum CardId {
  // Producers (Trophic Level 1)
  OAK_TREE = 1,
  GIANT_KELP = 2,                    // Replaced "Kelp Forest" with individual species
  REED_CANARY_GRASS = 3,             // Replaced "Riverbank Grass" with individual species

  // Primary Consumers (Trophic Level 2)
  EUROPEAN_RABBIT = 4,               // Updated from "Field Rabbit"
  SOCKEYE_SALMON = 5,

  // Marine ecosystem cards
  ZOOPLANKTON = 21,                  // Marine primary consumer

  // Secondary/Tertiary Consumers (Trophic Level 3-4)
  AMERICAN_BLACK_BEAR = 6,           // Trophic level 3, terrestrial, requires 2 herbivores
  GREAT_WHITE_SHARK = 7,             // Trophic level 4, marine, requires 2 trophic level 3 carnivores

  // Decomposers (Trophic Level -1)
  MYCENA_MUSHROOM = 8,
  TURKEY_VULTURE = 9,                // Trophic level 3, terrestrial, requires 1 herbivore

  // Additional Trophic Level 3 Carnivores (cost: null - no requirements)
  DOMESTIC_CAT = 37,                 // Trophic level 3, terrestrial, cost: null
  DOMESTIC_DOG = 48,                 // Trophic level 3, terrestrial, cost: null

  // Parasites
  DEER_TICK = 10,

  // Detritivores (Trophic Level -2)
  COMMON_EARTHWORM = 11,
  DUNG_BEETLE = 12,

  // Saprotrophs (Trophic Level -1)
  SOIL_BACTERIA = 13,
  DECOMPOSER_MUSHROOM = 14,

  // Chemoautotrophs (Trophic Level 1)
  DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA = 15,
  IRON_SPRING_BACTERIA = 16,

  // Mutualists (Variable trophic level)
  MYCORRHIZAL_FUNGI = 17,
  NITROGEN_FIXING_BACTERIA = 18,

  // Marine organisms
  PACIFIC_KRILL = 19,
  PHYTOPLANKTON = 20,
  EUROPEAN_HONEY_BEE = 22,

  // Additional chemoautotrophs
  VOLCANIC_HYDROGEN_BACTERIA = 25,
  NITRIFYING_SOIL_BACTERIA = 26,
  SEDIMENT_CHEMOSYNTHETIC_BACTERIA = 27,

  // Additional species (migrated from legacy files)
  // Insects and Arthropods
  ANT = 28,
  CRICKET = 29,
  SCORPION = 30,
  SPIDER = 31,

  // Plants and Trees
  APPLE_TREE = 32,
  BUSH_CHERRY = 33,
  CACTUS = 34,
  CHERRY_BLOSSOM = 35,
  DAISY = 36,
  DECIDUOUS_TREE = 37,
  EELGRASS = 38,
  EVERGREEN_TREE = 39,
  GRAPES = 40,
  HERB = 41,
  HIBISCUS = 42,
  PALM_TREE = 43,
  PRICKLY_PEAR = 44,
  RICE = 45,
  ROSE = 46,
  STRAWBERRY = 47,
  SUNFLOWER = 48,
  TULIP = 49,
  WHITE_CLOVER = 50,

  // Mammals
  BEAVER = 51,
  BISON = 52,
  RED_FOX = 53,                         // Trophic level 3, terrestrial, cost: null
  CAMEL = 54,
  CAT = 55,
  CHIPMUNK = 56,
  COW = 57,
  DOG = 58,
  ELEPHANT = 59,
  GIRAFFE = 60,
  GOAT = 61,
  GORILLA = 62,
  HAMSTER = 63,
  HEDGEHOG = 64,
  HIPPOPOTAMUS = 65,
  HORSE = 66,
  LEOPARD = 67,                         // Trophic level 3, terrestrial, cost: null (CardId 67)
  AFRICAN_LION = 68,                    // Trophic level 3, terrestrial, cost: null (CardId 68)
  LLAMA = 70,
  MAMMOTH = 71,
  MONKEY = 72,
  HOUSE_MOUSE = 73,                     // Small urban adapter (CardId 73)
  OX = 74,
  PANDA = 75,
  PIG = 76,
  RAM = 77,
  GIANT_PANDA = 78,                     // Trophic level 3, terrestrial, cost: null (CardId 78)
  TIGER = 91,                           // Trophic level 3, terrestrial, cost: null (CardId 91)
  WATER_BUFFALO = 80,
  ZEBRA = 81,

  // Amphibians and Reptiles
  FROG = 82,
  SNAKE = 83,
  TURTLE = 84,

  // Invertebrates
  CATERPILLAR = 85,
  CATERPILLAR_EGG = 86,
  EARTHWORM = 87,
  SNAIL = 88,

  // Fungi
  MUSHROOM = 89,

  // Additional specific species (formerly legacy files)
  // Alternative bear species with different abilities
  GRIZZLY_BEAR = 90,                    // Larger, more aggressive bear variant

  // Alternative rabbit species
  COTTONTAIL_RABBIT = 91,               // North American cottontail variant

  // Additional mammals (avoiding duplicates)
  COMMON_RACCOON = 94,                  // Intelligent omnivore
  WHITE_TAILED_DEER = 95,               // Graceful herbivore
  GRAY_WOLF = 96,                       // Pack hunter (corrected from JSON data)
  DESERT_LIZARD = 97,                   // Heat-adapted reptile

  // Additional plants
  CORN_MAIZE = 98,                      // Agricultural crop
  PERENNIAL_RYEGRASS = 99,              // Common grass species

  // Additional insects
  MONARCH_BUTTERFLY = 100               // Migratory pollinator
}

/**
 * Ability IDs - Based on BioMasterEngine.txt examples
 */
export enum AbilityId {
  WATERSHED_PREDATOR = 1,  // Grizzly Bear ability
  APEX_PREDATOR = 2,       // Great White Shark ability
  SCAVENGE = 3,            // Vulture ability
  PARASITIC_DRAIN = 4,     // Deer Tick ability
  RECYCLER = 5             // Mushroom ability
}

// ============================================================================
// 🌍 IUCN RED LIST INTEGRATION
// ============================================================================

/**
 * IUCN Conservation Status - Based on IUCN Red List October 28, 2024
 * These drive the rarity system and educational content
 */
export enum ConservationStatus {
  EXTINCT = 1,                    // EX - No known individuals remaining (0.54%)
  EXTINCT_IN_WILD = 2,           // EW - Known only in captivity (0.054%)
  CRITICALLY_ENDANGERED = 3,      // CR - Extremely high extinction risk (5.95%)
  ENDANGERED = 4,                // EN - Very high extinction risk (10.92%)
  VULNERABLE = 5,                // VU - High extinction risk (13.19%)
  NEAR_THREATENED = 6,           // NT - Close to threatened status (5.73%)
  LEAST_CONCERN = 7,             // LC - Widespread and abundant (50.51%)
  DATA_DEFICIENT = 8,            // DD - Inadequate information (12.97%)
  NOT_EVALUATED = 9              // NE - Not yet evaluated against the criteria
}



/**
 * Card Names - All card names with their IDs
 * Based on BioMasterEngine.txt examples
 */
export enum CardNames {
  OAK_TREE = 'Oak Tree',
  KELP_FOREST = 'Kelp Forest',
  RIVERBANK = 'Riverbank',
  FIELD_RABBIT = 'Field Rabbit',
  SOCKEYE_SALMON = 'Sockeye Salmon',
  GRIZZLY_BEAR = 'Grizzly Bear',
  GREAT_WHITE_SHARK = 'Great White Shark',
  MYCENA_MUSHROOM = 'Mycena Mushroom',
  VULTURE = 'Vulture',
  DEER_TICK = 'Deer Tick'
}

/**
 * Card Abilities Text - Localized ability descriptions
 * Based on BioMasterEngine.txt examples
 */
export enum CardAbilitiesText {
  WATERSHED_PREDATOR = '[WATERSHED PREDATOR] (Action): Exhaust this card. Target one [AQUATIC] creature adjacent to an [AMPHIBIOUS] card that this Bear is also adjacent to. Exhaust that target.',
  APEX_PREDATOR = '[APEX PREDATOR] (Action): Exhaust this card. Target an adjacent +3C or +4C creature. It becomes Exhausted.',
  SCAVENGE = '[SCAVENGE] (Action): Exhaust this card. Take one creature card from the Detritus Zone and put it into your hand.',
  PARASITIC_DRAIN = '[PARASITIC DRAIN] (Persistent): The host creature does not Ready during its owner\'s Ready Phase.',
  RECYCLER = '[RECYCLER] (Action): Exhaust this card. Place the card underneath the adjacent -1S card into your score pile. It is worth its printed VP +1. Then, draw a card.'
}

// ============================================================================
// USER & SYSTEM ENUMS
// ============================================================================

/**
 * User Account Types
 */
export enum UserType {
  GUEST = 'guest',
  REGISTERED = 'registered',
  ADMIN = 'admin'
}

/**
 * Card Acquisition Methods
 */
export enum AcquisitionMethod {
  PACK = 'pack',
  PURCHASE = 'purchase',
  REWARD = 'reward',
  PHYSICAL = 'physical',
  TRADE = 'trade',
  CRAFT = 'craft',
  DAILY = 'daily',
  ACHIEVEMENT = 'achievement',
  STARTER = 'starter'
}

/**
 * Card Conditions (for physical cards)
 */
export enum CardCondition {
  MINT = 'mint',
  NEAR_MINT = 'near_mint',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  PLAYED = 'played',
  POOR = 'poor'
}

/**
 * Sync Status for offline/online functionality
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
  ERROR = 'error'
}

/**
 * Action Types for game actions
 */
export enum GameActionType {
  PLAY_CARD = 'PLAY_CARD',
  ACTIVATE_ABILITY = 'ACTIVATE_ABILITY',
  PASS_TURN = 'PASS_TURN',
  MOVE_CARD = 'MOVE_CARD',
  CHALLENGE = 'CHALLENGE',
  PLAYER_READY = 'PLAYER_READY',
  REMOVE_CARD = 'REMOVE_CARD',
  METAMORPHOSIS = 'METAMORPHOSIS',
  FORFEIT = 'FORFEIT'
}

// ============================================================================
// VALIDATION & ERROR ENUMS
// ============================================================================

/**
 * Validation Error Types
 */
export enum ValidationError {
  INVALID_POSITION = 'invalid_position',
  INVALID_TROPHIC_CONNECTION = 'invalid_trophic_connection',
  INVALID_DOMAIN_CONNECTION = 'invalid_domain_connection',
  INSUFFICIENT_RESOURCES = 'insufficient_resources',
  CARD_NOT_IN_HAND = 'card_not_in_hand',
  POSITION_OCCUPIED = 'position_occupied',
  CARD_EXHAUSTED = 'card_exhausted',
  INVALID_TARGET = 'invalid_target',
  NO_ACTIONS_REMAINING = 'no_actions_remaining',
  GAME_ENDED = 'game_ended'
}

/**
 * API Response Status
 */
export enum ApiStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  VALIDATION_ERROR = 'validation_error',
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found'
}

// ============================================================================
// SPECIES RENDERING ENUMS
// ============================================================================

// ============================================================================
// NOTE: SpeciesFileId enum has been removed as files now use enum names directly
// Files are now loaded using nameId directly (e.g., CARD_OAK_TREE.json)
// This eliminates the need for conversion between naming systems
// ============================================================================

// ============================================================================
// UTILITY TYPES & CONSTANTS
// ============================================================================

/**
 * Domain compatibility matrix
 * Defines which domains can connect to each other
 * HOME cards are compatible with all domains (per official rules)
 */
export const DOMAIN_COMPATIBILITY = {
  [Domain.TERRESTRIAL]: [Domain.TERRESTRIAL, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.HOME],
  [Domain.FRESHWATER]: [Domain.FRESHWATER, Domain.AMPHIBIOUS_FRESHWATER, Domain.EURYHALINE, Domain.HOME],
  [Domain.MARINE]: [Domain.MARINE, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME],
  [Domain.AMPHIBIOUS_FRESHWATER]: [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.HOME],
  [Domain.AMPHIBIOUS_MARINE]: [Domain.TERRESTRIAL, Domain.MARINE, Domain.HOME],
  [Domain.EURYHALINE]: [Domain.FRESHWATER, Domain.MARINE, Domain.HOME],
  [Domain.HOME]: [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.MARINE, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME]
} as const;

/**
 * Trophic level connections
 * Defines valid trophic level connections (what can eat what)
 */
export const TROPHIC_CONNECTIONS = {
  [TrophicLevel.PRODUCER]: [], // Producers don't eat anything
  [TrophicLevel.PRIMARY_CONSUMER]: [TrophicLevel.PRODUCER], // Herbivores eat producers
  [TrophicLevel.SECONDARY_CONSUMER]: [TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.PRODUCER], // Can eat herbivores and plants
  [TrophicLevel.APEX_PREDATOR]: [TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.PRIMARY_CONSUMER], // Can eat other consumers
  [TrophicLevel.SAPROTROPH]: [TrophicLevel.PRODUCER, TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.APEX_PREDATOR], // Can decompose anything
  [TrophicLevel.DETRITIVORE]: [TrophicLevel.SAPROTROPH] // Detritivores consume detritus from saprotrophs
} as const;

/**
 * Game Constants
 */
export const GAME_CONSTANTS = {
  MAX_HAND_SIZE: 7,
  STARTING_HAND_SIZE: 3,
  ACTIONS_PER_TURN: 3,
  STARTING_ENERGY: 0,
  ENERGY_PER_TURN: 1,
  GRID_WIDTH: 15,
  GRID_HEIGHT: 15,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  TURN_TIME_LIMIT: 300, // 5 minutes in seconds
  MAX_DECK_SIZE: 30,
  MIN_DECK_SIZE: 25,
  CARDS_PER_BOOSTER_PACK: 8
} as const;

/**
 * IUCN Conservation Data - Based on October 28, 2024 Red List Update
 * Real conservation percentages drive the rarity system (per 100,000 packs for maximum precision)
 */
export const IUCN_CONSERVATION_DATA = {
  [ConservationStatus.EXTINCT]: {
    percentage: 0.54,
    packRarity: 540, // per 100,000 packs
    description: 'No known individuals remaining',
    color: '#000000', // 🖤 Black - Ultra Rare
    emoji: '🖤',
    rarityName: 'Ultra Rare'
  },
  [ConservationStatus.EXTINCT_IN_WILD]: {
    percentage: 0.054,
    packRarity: 54, // per 100,000 packs
    description: 'Known only to survive in captivity',
    color: '#800080', // 💜 Purple - Legendary
    emoji: '💜',
    rarityName: 'Legendary'
  },
  [ConservationStatus.CRITICALLY_ENDANGERED]: {
    percentage: 5.95,
    packRarity: 5950, // per 100,000 packs
    description: 'Extremely high risk of extinction',
    color: '#FF0000', // ❤️ Red - Epic
    emoji: '❤️',
    rarityName: 'Epic'
  },
  [ConservationStatus.ENDANGERED]: {
    percentage: 10.92,
    packRarity: 10920, // per 100,000 packs
    description: 'Very high risk of extinction',
    color: '#FF8C00', // 🧡 Orange - Rare
    emoji: '🧡',
    rarityName: 'Rare'
  },
  [ConservationStatus.VULNERABLE]: {
    percentage: 13.19,
    packRarity: 13190, // per 100,000 packs
    description: 'High risk of extinction',
    color: '#FFD700', // 💛 Yellow - Uncommon
    emoji: '💛',
    rarityName: 'Uncommon'
  },
  [ConservationStatus.NEAR_THREATENED]: {
    percentage: 5.73,
    packRarity: 5730, // per 100,000 packs
    description: 'Close to qualifying for threatened status',
    color: '#90EE90', // 💚 Light Green - Uncommon
    emoji: '💚',
    rarityName: 'Uncommon'
  },
  [ConservationStatus.LEAST_CONCERN]: {
    percentage: 50.51,
    packRarity: 50396, // per 100,000 packs (adjusted to make total = 100,000 including NOT_EVALUATED)
    description: 'Widespread and abundant',
    color: '#008000', // 💚 Green - Common
    emoji: '💚',
    rarityName: 'Common'
  },
  [ConservationStatus.DATA_DEFICIENT]: {
    percentage: 12.97,
    packRarity: 12970, // per 100,000 packs
    description: 'Inadequate information for assessment',
    color: '#808080', // 🩶 Gray - Special
    emoji: '🩶',
    rarityName: 'Special'
  },
  [ConservationStatus.NOT_EVALUATED]: {
    percentage: 0.25,
    packRarity: 250, // per 100,000 packs
    description: 'Not yet evaluated against the criteria',
    color: '#C0C0C0', // 🤍 Silver - Special
    emoji: '🤍',
    rarityName: 'Special'
  }
} as const;
