/**
 * BioMasters TCG - Shared Enums
 *
 * This file contains all the enums used throughout the BioMasters TCG system.
 * These enums ensure type safety and consistency between server and client.
 * All IDs are integers as specified in the BioMasters rules.
 */
/**
 * Trophic Categories - The fundamental feeding types in ecosystems
 * Based on BioMasterEngine.txt and database schema
 */
export declare enum TrophicCategoryId {
    PHOTOAUTOTROPH = 1,// Plants, algae - produce energy from sunlight
    CHEMOAUTOTROPH = 2,// Bacteria - produce energy from chemicals
    HERBIVORE = 3,// Primary consumers - eat plants
    OMNIVORE = 4,// Eat both plants and animals
    CARNIVORE = 5,// Secondary/tertiary consumers - eat animals
    SAPROTROPH = 6,// Decomposers - break down dead matter
    PARASITE = 7,// Live on/in hosts
    MUTUALIST = 8,// Mutually beneficial relationships
    DETRITIVORE = 9
}
/**
 * Trophic Levels - The position in the energy flow
 * Based on BioMasters rules: -2D, -1S, 0 (detritus), +1, +2, +3, +4
 */
export declare enum TrophicLevel {
    DETRITIVORE = -2,// Level -2D: Process detritus and organic particles
    SAPROTROPH = -1,// Level -1S: Break down dead organic matter
    DETRITUS_TILE = 0,// Level 0: Dead matter on grid (face-down cards)
    PRODUCER = 1,// Level +1: Photoautotrophs and chemoautotrophs
    PRIMARY_CONSUMER = 2,// Level +2: Herbivores
    SECONDARY_CONSUMER = 3,// Level +3: Carnivores
    APEX_PREDATOR = 4
}
/**
 * Domains - Habitat types for card placement compatibility
 * Standardized domain system replacing keyword-based approach
 */
export declare enum Domain {
    HOME = 0,// HOME cards - compatible with all domains
    TERRESTRIAL = 1,
    FRESHWATER = 2,
    MARINE = 3,
    AMPHIBIOUS_FRESHWATER = 4,// Can connect to TERRESTRIAL + FRESHWATER
    AMPHIBIOUS_MARINE = 5,// Can connect to TERRESTRIAL + MARINE
    EURYHALINE = 6
}
/**
 * Keywords - All game keywords for domains, traits, and abilities
 * Based on BioMasterEngine.txt and database
 */
export declare enum KeywordId {
    TERRESTRIAL = 1,
    AQUATIC = 2,
    AMPHIBIOUS = 3,
    FRESHWATER = 4,
    MARINE = 5,
    EURYHALINE = 6,// Can live in both fresh and salt water
    AMPHIBIOUS_FRESHWATER = 7,// Amphibious species in freshwater
    AMPHIBIOUS_MARINE = 8,// Amphibious species in marine water
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
    ARTHROPOD = 34,// Arthropods (insects, arachnids, crustaceans)
    PACK_HUNTER = 41,
    SOLITARY = 42,
    SOCIAL = 43,
    MIGRATORY = 44,
    TERRITORIAL = 45,
    NOCTURNAL = 46,
    DIURNAL = 47,
    CREPUSCULAR = 48,
    VENOMOUS = 61,
    POISONOUS = 62,
    SCAVENGE = 63,
    HYPERCARNIVORE = 64,
    WATERSHED_PREDATOR = 65,
    PARASITIC_DRAIN = 66,
    RECYCLER = 67,
    APEX_PREDATOR = 68,
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
export declare enum TriggerId {
    ON_ACTIVATE = 1,// Manual activation (Action abilities)
    PERSISTENT_ATTACHED = 2,// Continuous effect while attached
    ON_ENTER_PLAY = 3,// When card is played
    ON_LEAVE_PLAY = 4,// When card is removed
    ON_TURN_START = 5,// At start of turn
    ON_TURN_END = 6,// At end of turn
    ON_READY = 7,// When card becomes ready
    ON_EXHAUST = 8,// When card becomes exhausted
    ON_DAMAGE = 9,// When taking damage
    ON_DEATH = 10,// When creature dies
    ON_ATTACK = 11,// When attacking
    ON_DEFEND = 12,// When being attacked
    ON_PLAY = 13,// When card is played (alias)
    ON_ATTACH = 14,// When attached to host
    ON_DETACH = 15,// When detached from host
    PERSISTENT = 16,// Always active while in play
    ACTION = 17
}
/**
 * Effect Types - What abilities do
 * Based on database schema
 */
export declare enum EffectId {
    TARGET = 1,// Select a target
    TAKE_CARD = 2,// Take a card from a zone
    APPLY_STATUS = 3,// Apply status effect
    MOVE_CARD = 4,// Move card to different zone
    EXHAUST_TARGET = 5,// Exhaust target card
    READY_TARGET = 6,// Ready target card
    DESTROY_TARGET = 7,// Destroy target card
    GAIN_ENERGY = 8,// Gain energy/resources
    LOSE_ENERGY = 9,// Lose energy/resources
    DRAW_CARD = 10,// Draw cards
    DISCARD_CARD = 11,// Discard cards
    SEARCH_DECK = 12,// Search deck for cards
    SHUFFLE_DECK = 13,// Shuffle deck
    GAIN_VP = 14,// Gain victory points
    LOSE_VP = 15
}
/**
 * Selector Types - How abilities choose targets
 * Based on database schema
 */
export declare enum SelectorId {
    ADJACENT = 1,// Adjacent cards
    SELF = 2,// The card with the ability
    ALL = 3,// All valid targets
    RANDOM = 4,// Random valid target
    CHOOSE = 5,// Player chooses target
    NEAREST = 6,// Nearest valid target
    FARTHEST = 7,// Farthest valid target
    HIGHEST_TROPHIC = 8,// Highest trophic level
    LOWEST_TROPHIC = 9,// Lowest trophic level
    SAME_DOMAIN = 10,// Same domain (terrestrial/aquatic/etc)
    DIFFERENT_DOMAIN = 11,// Different domain
    DETRITUS = 12,// Cards in detritus zone
    HAND = 13,// Cards in hand
    DECK = 14,// Cards in deck
    SCORE_PILE = 15,// Cards in score pile
    ADJACENT_SAME_DOMAIN = 16,// Adjacent cards with same domain
    ADJACENT_AQUATIC = 17,// Adjacent aquatic cards
    ADJACENT_TERRESTRIAL = 18,// Adjacent terrestrial cards
    ADJACENT_TO_SHARED_AMPHIBIOUS = 19,// Adjacent to shared amphibious card
    ALL_OWNED_CARDS = 20,// All cards owned by player
    TARGET_CREATURE = 21,// Specific targeted creature
    HOST_CREATURE = 22
}
/**
 * Action Types - What happens to targets
 * Based on database schema
 */
export declare enum ActionId {
    EXHAUST = 1,// Make target exhausted
    READY = 2,// Make target ready
    DESTROY = 3,// Destroy target
    MOVE_TO_HAND = 4,// Move to hand
    MOVE_TO_DECK = 5,// Move to deck
    MOVE_TO_DETRITUS = 6,// Move to detritus
    MOVE_TO_SCORE = 7,// Move to score pile
    APPLY_MODIFIER = 8,// Apply temporary modifier
    REMOVE_MODIFIER = 9,// Remove modifier
    ATTACH = 10,// Attach to target
    DETACH = 11
}
/**
 * Game Phases - Overall game state
 */
export declare enum GamePhase {
    SETUP = "setup",
    PLAYING = "playing",
    FINAL_TURN = "final_turn",// Final turn phase when a player can't draw
    ENDED = "ended"
}
/**
 * Turn Phases - Phases within a player's turn
 */
export declare enum TurnPhase {
    READY = "ready",// Ready all cards, gain energy
    DRAW = "draw",// Draw a card
    ACTION = "action",// Take actions
    END = "end"
}
/**
 * Card Zones - Where cards can be located
 */
export declare enum CardZone {
    DECK = "deck",
    HAND = "hand",
    GRID = "grid",// In play on the game board
    DETRITUS = "detritus",// Discard pile/decomposer zone
    SCORE_PILE = "score_pile",
    REMOVED = "removed"
}
/**
 * Game End Conditions
 */
export declare enum GameEndReason {
    DECK_EMPTY = "deck_empty",
    PLAYER_QUIT = "player_quit",
    TIME_LIMIT = "time_limit",
    FORFEIT = "forfeit"
}
/**
 * Specific Card IDs - Based on BioMasterEngine.txt examples
 * These will be expanded as more cards are added
 */
export declare enum CardId {
    OAK_TREE = 1,
    GIANT_KELP = 2,// Replaced "Kelp Forest" with individual species
    REED_CANARY_GRASS = 3,// Replaced "Riverbank Grass" with individual species
    EUROPEAN_RABBIT = 4,// Updated from "Field Rabbit"
    SOCKEYE_SALMON = 5,
    AMERICAN_BLACK_BEAR = 6,// Updated from "Grizzly Bear"
    GREAT_WHITE_SHARK = 7,
    MYCENA_MUSHROOM = 8,
    TURKEY_VULTURE = 9,// Updated from "Vulture"
    DEER_TICK = 10,
    COMMON_EARTHWORM = 11,
    DUNG_BEETLE = 12,
    SOIL_BACTERIA = 13,
    DECOMPOSER_MUSHROOM = 14,
    DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA = 15,
    IRON_SPRING_BACTERIA = 16,
    MYCORRHIZAL_FUNGI = 17,
    NITROGEN_FIXING_BACTERIA = 18,
    PACIFIC_KRILL = 19,
    PHYTOPLANKTON = 20,
    ZOOPLANKTON = 21,
    EUROPEAN_HONEY_BEE = 22,
    VOLCANIC_HYDROGEN_BACTERIA = 25,
    NITRIFYING_SOIL_BACTERIA = 26,
    SEDIMENT_CHEMOSYNTHETIC_BACTERIA = 27
}
/**
 * Ability IDs - Based on BioMasterEngine.txt examples
 */
export declare enum AbilityId {
    WATERSHED_PREDATOR = 1,// Grizzly Bear ability
    APEX_PREDATOR = 2,// Great White Shark ability
    SCAVENGE = 3,// Vulture ability
    PARASITIC_DRAIN = 4,// Deer Tick ability
    RECYCLER = 5
}
/**
 * IUCN Conservation Status - Based on IUCN Red List October 28, 2024
 * These drive the rarity system and educational content
 */
export declare enum ConservationStatus {
    EXTINCT = 1,// EX - No known individuals remaining (0.54%)
    EXTINCT_IN_WILD = 2,// EW - Known only in captivity (0.054%)
    CRITICALLY_ENDANGERED = 3,// CR - Extremely high extinction risk (5.95%)
    ENDANGERED = 4,// EN - Very high extinction risk (10.92%)
    VULNERABLE = 5,// VU - High extinction risk (13.19%)
    NEAR_THREATENED = 6,// NT - Close to threatened status (5.73%)
    LEAST_CONCERN = 7,// LC - Widespread and abundant (50.51%)
    DATA_DEFICIENT = 8
}
/**
 * Card Names - All card names with their IDs
 * Based on BioMasterEngine.txt examples
 */
export declare enum CardNames {
    OAK_TREE = "Oak Tree",
    KELP_FOREST = "Kelp Forest",
    RIVERBANK = "Riverbank",
    FIELD_RABBIT = "Field Rabbit",
    SOCKEYE_SALMON = "Sockeye Salmon",
    GRIZZLY_BEAR = "Grizzly Bear",
    GREAT_WHITE_SHARK = "Great White Shark",
    MYCENA_MUSHROOM = "Mycena Mushroom",
    VULTURE = "Vulture",
    DEER_TICK = "Deer Tick"
}
/**
 * Card Abilities Text - Localized ability descriptions
 * Based on BioMasterEngine.txt examples
 */
export declare enum CardAbilitiesText {
    WATERSHED_PREDATOR = "[WATERSHED PREDATOR] (Action): Exhaust this card. Target one [AQUATIC] creature adjacent to an [AMPHIBIOUS] card that this Bear is also adjacent to. Exhaust that target.",
    APEX_PREDATOR = "[APEX PREDATOR] (Action): Exhaust this card. Target an adjacent +3C or +4C creature. It becomes Exhausted.",
    SCAVENGE = "[SCAVENGE] (Action): Exhaust this card. Take one creature card from the Detritus Zone and put it into your hand.",
    PARASITIC_DRAIN = "[PARASITIC DRAIN] (Persistent): The host creature does not Ready during its owner's Ready Phase.",
    RECYCLER = "[RECYCLER] (Action): Exhaust this card. Place the card underneath the adjacent -1S card into your score pile. It is worth its printed VP +1. Then, draw a card."
}
/**
 * User Account Types
 */
export declare enum UserType {
    GUEST = "guest",
    REGISTERED = "registered",
    ADMIN = "admin"
}
/**
 * Card Acquisition Methods
 */
export declare enum AcquisitionMethod {
    PACK = "pack",
    PURCHASE = "purchase",
    REWARD = "reward",
    PHYSICAL = "physical",
    TRADE = "trade",
    CRAFT = "craft",
    DAILY = "daily",
    ACHIEVEMENT = "achievement",
    STARTER = "starter"
}
/**
 * Card Conditions (for physical cards)
 */
export declare enum CardCondition {
    MINT = "mint",
    NEAR_MINT = "near_mint",
    EXCELLENT = "excellent",
    GOOD = "good",
    PLAYED = "played",
    POOR = "poor"
}
/**
 * Sync Status for offline/online functionality
 */
export declare enum SyncStatus {
    SYNCED = "synced",
    PENDING = "pending",
    CONFLICT = "conflict",
    ERROR = "error"
}
/**
 * Action Types for game actions
 */
export declare enum GameActionType {
    PLAY_CARD = "PLAY_CARD",
    ACTIVATE_ABILITY = "ACTIVATE_ABILITY",
    PASS_TURN = "PASS_TURN",
    MOVE_CARD = "MOVE_CARD",
    CHALLENGE = "CHALLENGE",
    PLAYER_READY = "PLAYER_READY",
    REMOVE_CARD = "REMOVE_CARD",
    METAMORPHOSIS = "METAMORPHOSIS",
    FORFEIT = "FORFEIT"
}
/**
 * Validation Error Types
 */
export declare enum ValidationError {
    INVALID_POSITION = "invalid_position",
    INVALID_TROPHIC_CONNECTION = "invalid_trophic_connection",
    INVALID_DOMAIN_CONNECTION = "invalid_domain_connection",
    INSUFFICIENT_RESOURCES = "insufficient_resources",
    CARD_NOT_IN_HAND = "card_not_in_hand",
    POSITION_OCCUPIED = "position_occupied",
    CARD_EXHAUSTED = "card_exhausted",
    INVALID_TARGET = "invalid_target",
    NO_ACTIONS_REMAINING = "no_actions_remaining",
    GAME_ENDED = "game_ended"
}
/**
 * API Response Status
 */
export declare enum ApiStatus {
    SUCCESS = "success",
    ERROR = "error",
    VALIDATION_ERROR = "validation_error",
    UNAUTHORIZED = "unauthorized",
    NOT_FOUND = "not_found"
}
/**
 * CommonName Enum - Maps species common names to their file identifiers
 * Used to connect public/species/ JSON files with OrganismRenderer.tsx
 * Based on the manifest.json and individual species files
 */
export declare enum CommonName {
    OAK_TREE = "oak-tree",
    GIANT_KELP = "giant-kelp",// Replaced "Kelp Forest"
    REED_CANARY_GRASS = "reed-canary-grass",// Replaced "Riverbank Grass"
    EUROPEAN_RABBIT = "european-rabbit",
    SOCKEYE_SALMON = "sockeye-salmon",
    AMERICAN_BLACK_BEAR = "american-black-bear",
    GREAT_WHITE_SHARK = "great-white-shark",
    MYCENA_MUSHROOM = "mycena-mushroom",
    TURKEY_VULTURE = "turkey-vulture",
    DEER_TICK = "deer-tick",
    COMMON_EARTHWORM = "common-earthworm",
    DUNG_BEETLE = "dung-beetle",
    SOIL_BACTERIA = "soil-bacteria",
    DECOMPOSER_MUSHROOM = "decomposer-mushroom",
    DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA = "deep-sea-hydrothermal-vent-bacteria",
    IRON_SPRING_BACTERIA = "iron-spring-bacteria",
    MYCORRHIZAL_FUNGI = "mycorrhizal-fungi",
    NITROGEN_FIXING_BACTERIA = "nitrogen-fixing-bacteria",
    PACIFIC_KRILL = "pacific-krill",
    PHYTOPLANKTON = "phytoplankton",
    ZOOPLANKTON = "zooplankton",
    EUROPEAN_HONEY_BEE = "european-honey-bee",
    VOLCANIC_HYDROGEN_BACTERIA = "volcanic-hydrogen-bacteria",
    NITRIFYING_SOIL_BACTERIA = "nitrifying-soil-bacteria",
    SEDIMENT_CHEMOSYNTHETIC_BACTERIA = "sediment-chemosynthetic-bacteria",
    RABBIT = "rabbit",
    BEAR = "bear",
    MOUSE = "mouse"
}
/**
 * Species Display Names - Maps CommonName enum to human-readable display names
 * Based on the commonName field from species JSON files
 */
export declare const SPECIES_DISPLAY_NAMES: {
    readonly "oak-tree": "Oak Tree";
    readonly "giant-kelp": "Giant Kelp";
    readonly "reed-canary-grass": "Reed Canary Grass";
    readonly "european-rabbit": "European Rabbit";
    readonly "sockeye-salmon": "Sockeye Salmon";
    readonly "american-black-bear": "American Black Bear";
    readonly "great-white-shark": "Great White Shark";
    readonly "mycena-mushroom": "Mycena Mushroom";
    readonly "turkey-vulture": "Turkey Vulture";
    readonly "deer-tick": "Deer Tick";
    readonly "common-earthworm": "Common Earthworm";
    readonly "dung-beetle": "Dung Beetle";
    readonly "soil-bacteria": "Soil Bacteria";
    readonly "decomposer-mushroom": "Decomposer Mushroom";
    readonly "deep-sea-hydrothermal-vent-bacteria": "Deep Sea Hydrothermal Vent Bacteria";
    readonly "iron-spring-bacteria": "Iron Spring Bacteria";
    readonly "mycorrhizal-fungi": "Mycorrhizal Fungi";
    readonly "nitrogen-fixing-bacteria": "Nitrogen Fixing Bacteria";
    readonly "pacific-krill": "Pacific Krill";
    readonly phytoplankton: "Phytoplankton";
    readonly zooplankton: "Zooplankton";
    readonly "european-honey-bee": "European Honey Bee";
    readonly "volcanic-hydrogen-bacteria": "Volcanic Hydrogen Bacteria";
    readonly "nitrifying-soil-bacteria": "Nitrifying Soil Bacteria";
    readonly "sediment-chemosynthetic-bacteria": "Sediment Chemosynthetic Bacteria";
    readonly rabbit: "European Rabbit";
    readonly bear: "American Black Bear";
    readonly mouse: "Mouse";
};
/**
 * Domain compatibility matrix
 * Defines which domains can connect to each other
 * HOME cards are compatible with all domains (per official rules)
 */
export declare const DOMAIN_COMPATIBILITY: {
    readonly 1: readonly [Domain.TERRESTRIAL, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.HOME];
    readonly 2: readonly [Domain.FRESHWATER, Domain.AMPHIBIOUS_FRESHWATER, Domain.EURYHALINE, Domain.HOME];
    readonly 3: readonly [Domain.MARINE, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME];
    readonly 4: readonly [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.HOME];
    readonly 5: readonly [Domain.TERRESTRIAL, Domain.MARINE, Domain.HOME];
    readonly 6: readonly [Domain.FRESHWATER, Domain.MARINE, Domain.HOME];
    readonly 0: readonly [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.MARINE, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME];
};
/**
 * Trophic level connections
 * Defines valid trophic level connections (what can eat what)
 */
export declare const TROPHIC_CONNECTIONS: {
    readonly 1: readonly [];
    readonly 2: readonly [TrophicLevel.PRODUCER];
    readonly 3: readonly [TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.PRODUCER];
    readonly 4: readonly [TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.PRIMARY_CONSUMER];
    readonly [-1]: readonly [TrophicLevel.PRODUCER, TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.APEX_PREDATOR];
    readonly [-2]: readonly [TrophicLevel.SAPROTROPH];
};
/**
 * Game Constants
 */
export declare const GAME_CONSTANTS: {
    readonly MAX_HAND_SIZE: 7;
    readonly STARTING_HAND_SIZE: 3;
    readonly ACTIONS_PER_TURN: 3;
    readonly STARTING_ENERGY: 0;
    readonly ENERGY_PER_TURN: 1;
    readonly GRID_WIDTH: 15;
    readonly GRID_HEIGHT: 15;
    readonly MAX_PLAYERS: 4;
    readonly MIN_PLAYERS: 2;
    readonly TURN_TIME_LIMIT: 300;
    readonly MAX_DECK_SIZE: 30;
    readonly MIN_DECK_SIZE: 25;
    readonly CARDS_PER_BOOSTER_PACK: 8;
};
/**
 * IUCN Conservation Data - Based on October 28, 2024 Red List Update
 * Real conservation percentages drive the rarity system (per 100,000 packs for maximum precision)
 */
export declare const IUCN_CONSERVATION_DATA: {
    readonly 1: {
        readonly percentage: 0.54;
        readonly packRarity: 540;
        readonly description: "No known individuals remaining";
        readonly color: "#000000";
        readonly emoji: "🖤";
        readonly rarityName: "Ultra Rare";
    };
    readonly 2: {
        readonly percentage: 0.054;
        readonly packRarity: 54;
        readonly description: "Known only to survive in captivity";
        readonly color: "#800080";
        readonly emoji: "💜";
        readonly rarityName: "Legendary";
    };
    readonly 3: {
        readonly percentage: 5.95;
        readonly packRarity: 5950;
        readonly description: "Extremely high risk of extinction";
        readonly color: "#FF0000";
        readonly emoji: "❤️";
        readonly rarityName: "Epic";
    };
    readonly 4: {
        readonly percentage: 10.92;
        readonly packRarity: 10920;
        readonly description: "Very high risk of extinction";
        readonly color: "#FF8C00";
        readonly emoji: "🧡";
        readonly rarityName: "Rare";
    };
    readonly 5: {
        readonly percentage: 13.19;
        readonly packRarity: 13190;
        readonly description: "High risk of extinction";
        readonly color: "#FFD700";
        readonly emoji: "💛";
        readonly rarityName: "Uncommon";
    };
    readonly 6: {
        readonly percentage: 5.73;
        readonly packRarity: 5730;
        readonly description: "Close to qualifying for threatened status";
        readonly color: "#90EE90";
        readonly emoji: "💚";
        readonly rarityName: "Uncommon";
    };
    readonly 7: {
        readonly percentage: 50.51;
        readonly packRarity: 50646;
        readonly description: "Widespread and abundant";
        readonly color: "#008000";
        readonly emoji: "💚";
        readonly rarityName: "Common";
    };
    readonly 8: {
        readonly percentage: 12.97;
        readonly packRarity: 12970;
        readonly description: "Inadequate information for assessment";
        readonly color: "#808080";
        readonly emoji: "🩶";
        readonly rarityName: "Special";
    };
};
//# sourceMappingURL=enums.d.ts.map