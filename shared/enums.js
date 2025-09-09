"use strict";
/**
 * BioMasters TCG - Shared Enums
 *
 * This file contains all the enums used throughout the BioMasters TCG system.
 * These enums ensure type safety and consistency between server and client.
 * All IDs are integers as specified in the BioMasters rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IUCN_CONSERVATION_DATA = exports.GAME_CONSTANTS = exports.TROPHIC_CONNECTIONS = exports.DOMAIN_COMPATIBILITY = exports.ApiStatus = exports.ValidationError = exports.GameActionType = exports.SyncStatus = exports.CardCondition = exports.AcquisitionMethod = exports.UserType = exports.TaxoSpecies = exports.TaxoGenus = exports.TaxoFamily = exports.TaxoOrder = exports.TaxoClass = exports.TaxoPhylum = exports.TaxoKingdom = exports.TaxoDomain = exports.CardAbilitiesText = exports.CardNames = exports.ConservationStatus = exports.AbilityId = exports.CardId = exports.GameEndReason = exports.CardZone = exports.TurnPhase = exports.GamePhase = exports.ActionId = exports.SelectorId = exports.EffectId = exports.TriggerId = exports.KeywordId = exports.Domain = exports.TrophicLevel = exports.TrophicCategoryId = void 0;
// ============================================================================
// CORE GAME ENUMS
// ============================================================================
/**
 * Trophic Categories - The fundamental feeding types in ecosystems
 * Based on BioMasterEngine.txt and database schema
 */
var TrophicCategoryId;
(function (TrophicCategoryId) {
    TrophicCategoryId[TrophicCategoryId["PHOTOAUTOTROPH"] = 1] = "PHOTOAUTOTROPH";
    TrophicCategoryId[TrophicCategoryId["CHEMOAUTOTROPH"] = 2] = "CHEMOAUTOTROPH";
    TrophicCategoryId[TrophicCategoryId["HERBIVORE"] = 3] = "HERBIVORE";
    TrophicCategoryId[TrophicCategoryId["OMNIVORE"] = 4] = "OMNIVORE";
    TrophicCategoryId[TrophicCategoryId["CARNIVORE"] = 5] = "CARNIVORE";
    TrophicCategoryId[TrophicCategoryId["SAPROTROPH"] = 6] = "SAPROTROPH";
    TrophicCategoryId[TrophicCategoryId["PARASITE"] = 7] = "PARASITE";
    TrophicCategoryId[TrophicCategoryId["MUTUALIST"] = 8] = "MUTUALIST";
    TrophicCategoryId[TrophicCategoryId["DETRITIVORE"] = 9] = "DETRITIVORE"; // Consume detritus and organic particles
})(TrophicCategoryId || (exports.TrophicCategoryId = TrophicCategoryId = {}));
/**
 * Trophic Levels - The position in the energy flow
 * Based on BioMasters rules: -2D, -1S, 0 (detritus), +1, +2, +3, +4
 */
var TrophicLevel;
(function (TrophicLevel) {
    TrophicLevel[TrophicLevel["DETRITIVORE"] = -2] = "DETRITIVORE";
    TrophicLevel[TrophicLevel["SAPROTROPH"] = -1] = "SAPROTROPH";
    TrophicLevel[TrophicLevel["DETRITUS_TILE"] = 0] = "DETRITUS_TILE";
    TrophicLevel[TrophicLevel["PRODUCER"] = 1] = "PRODUCER";
    TrophicLevel[TrophicLevel["PRIMARY_CONSUMER"] = 2] = "PRIMARY_CONSUMER";
    TrophicLevel[TrophicLevel["SECONDARY_CONSUMER"] = 3] = "SECONDARY_CONSUMER";
    TrophicLevel[TrophicLevel["APEX_PREDATOR"] = 4] = "APEX_PREDATOR"; // Level +4: Top predators
})(TrophicLevel || (exports.TrophicLevel = TrophicLevel = {}));
/**
 * Domains - Habitat types for card placement compatibility
 * Standardized domain system replacing keyword-based approach
 */
var Domain;
(function (Domain) {
    Domain[Domain["HOME"] = 0] = "HOME";
    Domain[Domain["TERRESTRIAL"] = 1] = "TERRESTRIAL";
    Domain[Domain["FRESHWATER"] = 2] = "FRESHWATER";
    Domain[Domain["MARINE"] = 3] = "MARINE";
    Domain[Domain["AMPHIBIOUS_FRESHWATER"] = 4] = "AMPHIBIOUS_FRESHWATER";
    Domain[Domain["AMPHIBIOUS_MARINE"] = 5] = "AMPHIBIOUS_MARINE";
    Domain[Domain["EURYHALINE"] = 6] = "EURYHALINE";
})(Domain || (exports.Domain = Domain = {}));
/**
 * Keywords - All game keywords for domains, traits, and abilities
 * Based on BioMasterEngine.txt and database
 */
var KeywordId;
(function (KeywordId) {
    // Domain Keywords (1-10)
    KeywordId[KeywordId["TERRESTRIAL"] = 1] = "TERRESTRIAL";
    KeywordId[KeywordId["AQUATIC"] = 2] = "AQUATIC";
    KeywordId[KeywordId["AMPHIBIOUS"] = 3] = "AMPHIBIOUS";
    KeywordId[KeywordId["FRESHWATER"] = 4] = "FRESHWATER";
    KeywordId[KeywordId["MARINE"] = 5] = "MARINE";
    KeywordId[KeywordId["EURYHALINE"] = 6] = "EURYHALINE";
    KeywordId[KeywordId["AMPHIBIOUS_FRESHWATER"] = 7] = "AMPHIBIOUS_FRESHWATER";
    KeywordId[KeywordId["AMPHIBIOUS_MARINE"] = 8] = "AMPHIBIOUS_MARINE";
    // Habitat Keywords (11-20)
    KeywordId[KeywordId["FOREST"] = 11] = "FOREST";
    KeywordId[KeywordId["RIVER"] = 12] = "RIVER";
    KeywordId[KeywordId["OCEAN"] = 13] = "OCEAN";
    KeywordId[KeywordId["DESERT"] = 14] = "DESERT";
    KeywordId[KeywordId["GRASSLAND"] = 15] = "GRASSLAND";
    KeywordId[KeywordId["WETLAND"] = 16] = "WETLAND";
    KeywordId[KeywordId["MOUNTAIN"] = 17] = "MOUNTAIN";
    KeywordId[KeywordId["ARCTIC"] = 18] = "ARCTIC";
    KeywordId[KeywordId["TROPICAL"] = 19] = "TROPICAL";
    KeywordId[KeywordId["TEMPERATE"] = 20] = "TEMPERATE";
    // Taxonomic Keywords (21-40)
    KeywordId[KeywordId["FISH"] = 21] = "FISH";
    KeywordId[KeywordId["MAMMAL"] = 22] = "MAMMAL";
    KeywordId[KeywordId["BIRD"] = 23] = "BIRD";
    KeywordId[KeywordId["REPTILE"] = 24] = "REPTILE";
    KeywordId[KeywordId["AMPHIBIAN"] = 25] = "AMPHIBIAN";
    KeywordId[KeywordId["INSECT"] = 26] = "INSECT";
    KeywordId[KeywordId["ARACHNID"] = 27] = "ARACHNID";
    KeywordId[KeywordId["CRUSTACEAN"] = 28] = "CRUSTACEAN";
    KeywordId[KeywordId["MOLLUSK"] = 29] = "MOLLUSK";
    KeywordId[KeywordId["PLANT"] = 30] = "PLANT";
    KeywordId[KeywordId["FUNGI"] = 31] = "FUNGI";
    KeywordId[KeywordId["BACTERIA"] = 32] = "BACTERIA";
    KeywordId[KeywordId["PROTIST"] = 33] = "PROTIST";
    KeywordId[KeywordId["ARTHROPOD"] = 34] = "ARTHROPOD";
    // Behavioral Keywords (41-60)
    KeywordId[KeywordId["PACK_HUNTER"] = 41] = "PACK_HUNTER";
    KeywordId[KeywordId["SOLITARY"] = 42] = "SOLITARY";
    KeywordId[KeywordId["SOCIAL"] = 43] = "SOCIAL";
    KeywordId[KeywordId["MIGRATORY"] = 44] = "MIGRATORY";
    KeywordId[KeywordId["TERRITORIAL"] = 45] = "TERRITORIAL";
    KeywordId[KeywordId["NOCTURNAL"] = 46] = "NOCTURNAL";
    KeywordId[KeywordId["DIURNAL"] = 47] = "DIURNAL";
    KeywordId[KeywordId["CREPUSCULAR"] = 48] = "CREPUSCULAR";
    // Special Abilities (61-80)
    KeywordId[KeywordId["VENOMOUS"] = 61] = "VENOMOUS";
    KeywordId[KeywordId["POISONOUS"] = 62] = "POISONOUS";
    KeywordId[KeywordId["SCAVENGE"] = 63] = "SCAVENGE";
    KeywordId[KeywordId["HYPERCARNIVORE"] = 64] = "HYPERCARNIVORE";
    KeywordId[KeywordId["WATERSHED_PREDATOR"] = 65] = "WATERSHED_PREDATOR";
    KeywordId[KeywordId["PARASITIC_DRAIN"] = 66] = "PARASITIC_DRAIN";
    KeywordId[KeywordId["RECYCLER"] = 67] = "RECYCLER";
    KeywordId[KeywordId["APEX_PREDATOR"] = 68] = "APEX_PREDATOR";
    // Size Categories (81-90)
    KeywordId[KeywordId["MICROSCOPIC"] = 81] = "MICROSCOPIC";
    KeywordId[KeywordId["TINY"] = 82] = "TINY";
    KeywordId[KeywordId["SMALL"] = 83] = "SMALL";
    KeywordId[KeywordId["MEDIUM"] = 84] = "MEDIUM";
    KeywordId[KeywordId["LARGE"] = 85] = "LARGE";
    KeywordId[KeywordId["HUGE"] = 86] = "HUGE";
    KeywordId[KeywordId["GIGANTIC"] = 87] = "GIGANTIC";
})(KeywordId || (exports.KeywordId = KeywordId = {}));
/**
 * Trigger Types - When abilities activate
 * Based on database schema and BioMasterEngine.txt
 */
var TriggerId;
(function (TriggerId) {
    TriggerId[TriggerId["ON_ACTIVATE"] = 1] = "ON_ACTIVATE";
    TriggerId[TriggerId["PERSISTENT_ATTACHED"] = 2] = "PERSISTENT_ATTACHED";
    TriggerId[TriggerId["ON_ENTER_PLAY"] = 3] = "ON_ENTER_PLAY";
    TriggerId[TriggerId["ON_LEAVE_PLAY"] = 4] = "ON_LEAVE_PLAY";
    TriggerId[TriggerId["ON_TURN_START"] = 5] = "ON_TURN_START";
    TriggerId[TriggerId["ON_TURN_END"] = 6] = "ON_TURN_END";
    TriggerId[TriggerId["ON_READY"] = 7] = "ON_READY";
    TriggerId[TriggerId["ON_EXHAUST"] = 8] = "ON_EXHAUST";
    TriggerId[TriggerId["ON_DAMAGE"] = 9] = "ON_DAMAGE";
    TriggerId[TriggerId["ON_DEATH"] = 10] = "ON_DEATH";
    TriggerId[TriggerId["ON_ATTACK"] = 11] = "ON_ATTACK";
    TriggerId[TriggerId["ON_DEFEND"] = 12] = "ON_DEFEND";
    TriggerId[TriggerId["ON_PLAY"] = 13] = "ON_PLAY";
    TriggerId[TriggerId["ON_ATTACH"] = 14] = "ON_ATTACH";
    TriggerId[TriggerId["ON_DETACH"] = 15] = "ON_DETACH";
    TriggerId[TriggerId["PERSISTENT"] = 16] = "PERSISTENT";
    TriggerId[TriggerId["ACTION"] = 17] = "ACTION"; // Activated by player action
})(TriggerId || (exports.TriggerId = TriggerId = {}));
/**
 * Effect Types - What abilities do
 * Based on database schema
 */
var EffectId;
(function (EffectId) {
    EffectId[EffectId["TARGET"] = 1] = "TARGET";
    EffectId[EffectId["TAKE_CARD"] = 2] = "TAKE_CARD";
    EffectId[EffectId["APPLY_STATUS"] = 3] = "APPLY_STATUS";
    EffectId[EffectId["MOVE_CARD"] = 4] = "MOVE_CARD";
    EffectId[EffectId["EXHAUST_TARGET"] = 5] = "EXHAUST_TARGET";
    EffectId[EffectId["READY_TARGET"] = 6] = "READY_TARGET";
    EffectId[EffectId["DESTROY_TARGET"] = 7] = "DESTROY_TARGET";
    EffectId[EffectId["GAIN_ENERGY"] = 8] = "GAIN_ENERGY";
    EffectId[EffectId["LOSE_ENERGY"] = 9] = "LOSE_ENERGY";
    EffectId[EffectId["DRAW_CARD"] = 10] = "DRAW_CARD";
    EffectId[EffectId["DISCARD_CARD"] = 11] = "DISCARD_CARD";
    EffectId[EffectId["SEARCH_DECK"] = 12] = "SEARCH_DECK";
    EffectId[EffectId["SHUFFLE_DECK"] = 13] = "SHUFFLE_DECK";
    EffectId[EffectId["GAIN_VP"] = 14] = "GAIN_VP";
    EffectId[EffectId["LOSE_VP"] = 15] = "LOSE_VP"; // Lose victory points
})(EffectId || (exports.EffectId = EffectId = {}));
/**
 * Selector Types - How abilities choose targets
 * Based on database schema
 */
var SelectorId;
(function (SelectorId) {
    SelectorId[SelectorId["ADJACENT"] = 1] = "ADJACENT";
    SelectorId[SelectorId["SELF"] = 2] = "SELF";
    SelectorId[SelectorId["ALL"] = 3] = "ALL";
    SelectorId[SelectorId["RANDOM"] = 4] = "RANDOM";
    SelectorId[SelectorId["CHOOSE"] = 5] = "CHOOSE";
    SelectorId[SelectorId["NEAREST"] = 6] = "NEAREST";
    SelectorId[SelectorId["FARTHEST"] = 7] = "FARTHEST";
    SelectorId[SelectorId["HIGHEST_TROPHIC"] = 8] = "HIGHEST_TROPHIC";
    SelectorId[SelectorId["LOWEST_TROPHIC"] = 9] = "LOWEST_TROPHIC";
    SelectorId[SelectorId["SAME_DOMAIN"] = 10] = "SAME_DOMAIN";
    SelectorId[SelectorId["DIFFERENT_DOMAIN"] = 11] = "DIFFERENT_DOMAIN";
    SelectorId[SelectorId["DETRITUS"] = 12] = "DETRITUS";
    SelectorId[SelectorId["HAND"] = 13] = "HAND";
    SelectorId[SelectorId["DECK"] = 14] = "DECK";
    SelectorId[SelectorId["SCORE_PILE"] = 15] = "SCORE_PILE";
    SelectorId[SelectorId["ADJACENT_SAME_DOMAIN"] = 16] = "ADJACENT_SAME_DOMAIN";
    SelectorId[SelectorId["ADJACENT_AQUATIC"] = 17] = "ADJACENT_AQUATIC";
    SelectorId[SelectorId["ADJACENT_TERRESTRIAL"] = 18] = "ADJACENT_TERRESTRIAL";
    SelectorId[SelectorId["ADJACENT_TO_SHARED_AMPHIBIOUS"] = 19] = "ADJACENT_TO_SHARED_AMPHIBIOUS";
    SelectorId[SelectorId["ALL_OWNED_CARDS"] = 20] = "ALL_OWNED_CARDS";
    SelectorId[SelectorId["TARGET_CREATURE"] = 21] = "TARGET_CREATURE";
    SelectorId[SelectorId["HOST_CREATURE"] = 22] = "HOST_CREATURE"; // Host creature (for parasites/mutualists)
})(SelectorId || (exports.SelectorId = SelectorId = {}));
/**
 * Action Types - What happens to targets
 * Based on database schema
 */
var ActionId;
(function (ActionId) {
    ActionId[ActionId["EXHAUST"] = 1] = "EXHAUST";
    ActionId[ActionId["READY"] = 2] = "READY";
    ActionId[ActionId["DESTROY"] = 3] = "DESTROY";
    ActionId[ActionId["MOVE_TO_HAND"] = 4] = "MOVE_TO_HAND";
    ActionId[ActionId["MOVE_TO_DECK"] = 5] = "MOVE_TO_DECK";
    ActionId[ActionId["MOVE_TO_DETRITUS"] = 6] = "MOVE_TO_DETRITUS";
    ActionId[ActionId["MOVE_TO_SCORE"] = 7] = "MOVE_TO_SCORE";
    ActionId[ActionId["APPLY_MODIFIER"] = 8] = "APPLY_MODIFIER";
    ActionId[ActionId["REMOVE_MODIFIER"] = 9] = "REMOVE_MODIFIER";
    ActionId[ActionId["ATTACH"] = 10] = "ATTACH";
    ActionId[ActionId["DETACH"] = 11] = "DETACH"; // Detach from target
})(ActionId || (exports.ActionId = ActionId = {}));
// ============================================================================
// GAME STATE ENUMS
// ============================================================================
/**
 * Game Phases - Overall game state
 */
var GamePhase;
(function (GamePhase) {
    GamePhase["SETUP"] = "setup";
    GamePhase["PLAYING"] = "playing";
    GamePhase["FINAL_TURN"] = "final_turn";
    GamePhase["ENDED"] = "ended";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
/**
 * Turn Phases - Phases within a player's turn
 */
var TurnPhase;
(function (TurnPhase) {
    TurnPhase["READY"] = "ready";
    TurnPhase["DRAW"] = "draw";
    TurnPhase["ACTION"] = "action";
    TurnPhase["END"] = "end"; // End turn cleanup
})(TurnPhase || (exports.TurnPhase = TurnPhase = {}));
/**
 * Card Zones - Where cards can be located
 */
var CardZone;
(function (CardZone) {
    CardZone["DECK"] = "deck";
    CardZone["HAND"] = "hand";
    CardZone["GRID"] = "grid";
    CardZone["DETRITUS"] = "detritus";
    CardZone["SCORE_PILE"] = "score_pile";
    CardZone["REMOVED"] = "removed"; // Permanently removed from game
})(CardZone || (exports.CardZone = CardZone = {}));
/**
 * Game End Conditions
 */
var GameEndReason;
(function (GameEndReason) {
    GameEndReason["DECK_EMPTY"] = "deck_empty";
    GameEndReason["PLAYER_QUIT"] = "player_quit";
    GameEndReason["TIME_LIMIT"] = "time_limit";
    GameEndReason["FORFEIT"] = "forfeit";
})(GameEndReason || (exports.GameEndReason = GameEndReason = {}));
// ============================================================================
// CARD SPECIFIC ENUMS
// ============================================================================
/**
 * Specific Card IDs - Based on BioMasterEngine.txt examples
 * These will be expanded as more cards are added
 */
var CardId;
(function (CardId) {
    // Producers (Trophic Level 1)
    CardId[CardId["OAK_TREE"] = 1] = "OAK_TREE";
    CardId[CardId["GIANT_KELP"] = 2] = "GIANT_KELP";
    CardId[CardId["REED_CANARY_GRASS"] = 3] = "REED_CANARY_GRASS";
    // Primary Consumers (Trophic Level 2)
    CardId[CardId["EUROPEAN_RABBIT"] = 4] = "EUROPEAN_RABBIT";
    CardId[CardId["SOCKEYE_SALMON"] = 5] = "SOCKEYE_SALMON";
    // Marine ecosystem cards
    CardId[CardId["ZOOPLANKTON"] = 21] = "ZOOPLANKTON";
    // Secondary/Tertiary Consumers (Trophic Level 3-4)
    CardId[CardId["AMERICAN_BLACK_BEAR"] = 6] = "AMERICAN_BLACK_BEAR";
    CardId[CardId["GREAT_WHITE_SHARK"] = 7] = "GREAT_WHITE_SHARK";
    // Decomposers (Trophic Level -1)
    CardId[CardId["MYCENA_MUSHROOM"] = 8] = "MYCENA_MUSHROOM";
    CardId[CardId["TURKEY_VULTURE"] = 9] = "TURKEY_VULTURE";
    // Additional Trophic Level 3 Carnivores (cost: null - no requirements)
    CardId[CardId["DOMESTIC_CAT"] = 37] = "DOMESTIC_CAT";
    CardId[CardId["DOMESTIC_DOG"] = 48] = "DOMESTIC_DOG";
    // Parasites
    CardId[CardId["DEER_TICK"] = 10] = "DEER_TICK";
    // Detritivores (Trophic Level -2)
    CardId[CardId["COMMON_EARTHWORM"] = 11] = "COMMON_EARTHWORM";
    CardId[CardId["DUNG_BEETLE"] = 12] = "DUNG_BEETLE";
    // Saprotrophs (Trophic Level -1)
    CardId[CardId["SOIL_BACTERIA"] = 13] = "SOIL_BACTERIA";
    CardId[CardId["DECOMPOSER_MUSHROOM"] = 14] = "DECOMPOSER_MUSHROOM";
    // Chemoautotrophs (Trophic Level 1)
    CardId[CardId["DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA"] = 15] = "DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA";
    CardId[CardId["IRON_SPRING_BACTERIA"] = 16] = "IRON_SPRING_BACTERIA";
    // Mutualists (Variable trophic level)
    CardId[CardId["MYCORRHIZAL_FUNGI"] = 17] = "MYCORRHIZAL_FUNGI";
    CardId[CardId["NITROGEN_FIXING_BACTERIA"] = 18] = "NITROGEN_FIXING_BACTERIA";
    // Marine organisms
    CardId[CardId["PACIFIC_KRILL"] = 19] = "PACIFIC_KRILL";
    CardId[CardId["PHYTOPLANKTON"] = 20] = "PHYTOPLANKTON";
    CardId[CardId["EUROPEAN_HONEY_BEE"] = 22] = "EUROPEAN_HONEY_BEE";
    // Additional chemoautotrophs
    CardId[CardId["VOLCANIC_HYDROGEN_BACTERIA"] = 25] = "VOLCANIC_HYDROGEN_BACTERIA";
    CardId[CardId["NITRIFYING_SOIL_BACTERIA"] = 26] = "NITRIFYING_SOIL_BACTERIA";
    CardId[CardId["SEDIMENT_CHEMOSYNTHETIC_BACTERIA"] = 27] = "SEDIMENT_CHEMOSYNTHETIC_BACTERIA";
    // Additional species (migrated from legacy files)
    // Insects and Arthropods
    CardId[CardId["ANT"] = 28] = "ANT";
    CardId[CardId["CRICKET"] = 29] = "CRICKET";
    CardId[CardId["SCORPION"] = 30] = "SCORPION";
    CardId[CardId["SPIDER"] = 31] = "SPIDER";
    // Plants and Trees
    CardId[CardId["APPLE_TREE"] = 32] = "APPLE_TREE";
    CardId[CardId["BUSH_CHERRY"] = 33] = "BUSH_CHERRY";
    CardId[CardId["CACTUS"] = 34] = "CACTUS";
    CardId[CardId["CHERRY_BLOSSOM"] = 35] = "CHERRY_BLOSSOM";
    CardId[CardId["DAISY"] = 36] = "DAISY";
    CardId[CardId["DECIDUOUS_TREE"] = 37] = "DECIDUOUS_TREE";
    CardId[CardId["EELGRASS"] = 38] = "EELGRASS";
    CardId[CardId["EVERGREEN_TREE"] = 39] = "EVERGREEN_TREE";
    CardId[CardId["GRAPES"] = 40] = "GRAPES";
    CardId[CardId["HERB"] = 41] = "HERB";
    CardId[CardId["HIBISCUS"] = 42] = "HIBISCUS";
    CardId[CardId["PALM_TREE"] = 43] = "PALM_TREE";
    CardId[CardId["PRICKLY_PEAR"] = 44] = "PRICKLY_PEAR";
    CardId[CardId["RICE"] = 45] = "RICE";
    CardId[CardId["ROSE"] = 46] = "ROSE";
    CardId[CardId["STRAWBERRY"] = 47] = "STRAWBERRY";
    CardId[CardId["SUNFLOWER"] = 48] = "SUNFLOWER";
    CardId[CardId["TULIP"] = 49] = "TULIP";
    CardId[CardId["WHITE_CLOVER"] = 50] = "WHITE_CLOVER";
    // Mammals
    CardId[CardId["BEAVER"] = 51] = "BEAVER";
    CardId[CardId["BISON"] = 52] = "BISON";
    CardId[CardId["RED_FOX"] = 53] = "RED_FOX";
    CardId[CardId["CAMEL"] = 54] = "CAMEL";
    CardId[CardId["CAT"] = 55] = "CAT";
    CardId[CardId["CHIPMUNK"] = 56] = "CHIPMUNK";
    CardId[CardId["COW"] = 57] = "COW";
    CardId[CardId["DOG"] = 58] = "DOG";
    CardId[CardId["ELEPHANT"] = 59] = "ELEPHANT";
    CardId[CardId["GIRAFFE"] = 60] = "GIRAFFE";
    CardId[CardId["GOAT"] = 61] = "GOAT";
    CardId[CardId["GORILLA"] = 62] = "GORILLA";
    CardId[CardId["HAMSTER"] = 63] = "HAMSTER";
    CardId[CardId["HEDGEHOG"] = 64] = "HEDGEHOG";
    CardId[CardId["HIPPOPOTAMUS"] = 65] = "HIPPOPOTAMUS";
    CardId[CardId["HORSE"] = 66] = "HORSE";
    CardId[CardId["LEOPARD"] = 67] = "LEOPARD";
    CardId[CardId["AFRICAN_LION"] = 68] = "AFRICAN_LION";
    CardId[CardId["LLAMA"] = 70] = "LLAMA";
    CardId[CardId["MAMMOTH"] = 71] = "MAMMOTH";
    CardId[CardId["MONKEY"] = 72] = "MONKEY";
    CardId[CardId["HOUSE_MOUSE"] = 73] = "HOUSE_MOUSE";
    CardId[CardId["OX"] = 74] = "OX";
    CardId[CardId["PANDA"] = 75] = "PANDA";
    CardId[CardId["PIG"] = 76] = "PIG";
    CardId[CardId["RAM"] = 77] = "RAM";
    CardId[CardId["GIANT_PANDA"] = 78] = "GIANT_PANDA";
    CardId[CardId["TIGER"] = 91] = "TIGER";
    CardId[CardId["WATER_BUFFALO"] = 80] = "WATER_BUFFALO";
    CardId[CardId["ZEBRA"] = 81] = "ZEBRA";
    // Amphibians and Reptiles
    CardId[CardId["FROG"] = 82] = "FROG";
    CardId[CardId["SNAKE"] = 83] = "SNAKE";
    CardId[CardId["TURTLE"] = 84] = "TURTLE";
    // Invertebrates
    CardId[CardId["CATERPILLAR"] = 85] = "CATERPILLAR";
    CardId[CardId["CATERPILLAR_EGG"] = 86] = "CATERPILLAR_EGG";
    CardId[CardId["EARTHWORM"] = 87] = "EARTHWORM";
    CardId[CardId["SNAIL"] = 88] = "SNAIL";
    // Fungi
    CardId[CardId["MUSHROOM"] = 89] = "MUSHROOM";
    // Additional specific species (formerly legacy files)
    // Alternative bear species with different abilities
    CardId[CardId["GRIZZLY_BEAR"] = 90] = "GRIZZLY_BEAR";
    // Alternative rabbit species
    CardId[CardId["COTTONTAIL_RABBIT"] = 91] = "COTTONTAIL_RABBIT";
    // Additional mammals (avoiding duplicates)
    CardId[CardId["COMMON_RACCOON"] = 94] = "COMMON_RACCOON";
    CardId[CardId["WHITE_TAILED_DEER"] = 95] = "WHITE_TAILED_DEER";
    CardId[CardId["GRAY_WOLF"] = 96] = "GRAY_WOLF";
    CardId[CardId["DESERT_LIZARD"] = 97] = "DESERT_LIZARD";
    // Additional plants
    CardId[CardId["CORN_MAIZE"] = 98] = "CORN_MAIZE";
    CardId[CardId["PERENNIAL_RYEGRASS"] = 99] = "PERENNIAL_RYEGRASS";
    // Additional insects
    CardId[CardId["MONARCH_BUTTERFLY"] = 100] = "MONARCH_BUTTERFLY"; // Migratory pollinator
})(CardId || (exports.CardId = CardId = {}));
/**
 * Ability IDs - Based on BioMasterEngine.txt examples
 */
var AbilityId;
(function (AbilityId) {
    AbilityId[AbilityId["WATERSHED_PREDATOR"] = 1] = "WATERSHED_PREDATOR";
    AbilityId[AbilityId["APEX_PREDATOR"] = 2] = "APEX_PREDATOR";
    AbilityId[AbilityId["SCAVENGE"] = 3] = "SCAVENGE";
    AbilityId[AbilityId["PARASITIC_DRAIN"] = 4] = "PARASITIC_DRAIN";
    AbilityId[AbilityId["RECYCLER"] = 5] = "RECYCLER"; // Mushroom ability
})(AbilityId || (exports.AbilityId = AbilityId = {}));
// ============================================================================
// 🌍 IUCN RED LIST INTEGRATION
// ============================================================================
/**
 * IUCN Conservation Status - Based on IUCN Red List October 28, 2024
 * These drive the rarity system and educational content
 */
var ConservationStatus;
(function (ConservationStatus) {
    ConservationStatus[ConservationStatus["EXTINCT"] = 1] = "EXTINCT";
    ConservationStatus[ConservationStatus["EXTINCT_IN_WILD"] = 2] = "EXTINCT_IN_WILD";
    ConservationStatus[ConservationStatus["CRITICALLY_ENDANGERED"] = 3] = "CRITICALLY_ENDANGERED";
    ConservationStatus[ConservationStatus["ENDANGERED"] = 4] = "ENDANGERED";
    ConservationStatus[ConservationStatus["VULNERABLE"] = 5] = "VULNERABLE";
    ConservationStatus[ConservationStatus["NEAR_THREATENED"] = 6] = "NEAR_THREATENED";
    ConservationStatus[ConservationStatus["LEAST_CONCERN"] = 7] = "LEAST_CONCERN";
    ConservationStatus[ConservationStatus["DATA_DEFICIENT"] = 8] = "DATA_DEFICIENT";
    ConservationStatus[ConservationStatus["NOT_EVALUATED"] = 9] = "NOT_EVALUATED"; // NE - Not yet evaluated against the criteria
})(ConservationStatus || (exports.ConservationStatus = ConservationStatus = {}));
/**
 * Card Names - All card names with their IDs
 * Based on BioMasterEngine.txt examples
 */
var CardNames;
(function (CardNames) {
    CardNames["OAK_TREE"] = "Oak Tree";
    CardNames["KELP_FOREST"] = "Kelp Forest";
    CardNames["RIVERBANK"] = "Riverbank";
    CardNames["FIELD_RABBIT"] = "Field Rabbit";
    CardNames["SOCKEYE_SALMON"] = "Sockeye Salmon";
    CardNames["GRIZZLY_BEAR"] = "Grizzly Bear";
    CardNames["GREAT_WHITE_SHARK"] = "Great White Shark";
    CardNames["MYCENA_MUSHROOM"] = "Mycena Mushroom";
    CardNames["VULTURE"] = "Vulture";
    CardNames["DEER_TICK"] = "Deer Tick";
})(CardNames || (exports.CardNames = CardNames = {}));
/**
 * Card Abilities Text - Localized ability descriptions
 * Based on BioMasterEngine.txt examples
 */
var CardAbilitiesText;
(function (CardAbilitiesText) {
    CardAbilitiesText["WATERSHED_PREDATOR"] = "[WATERSHED PREDATOR] (Action): Exhaust this card. Target one [AQUATIC] creature adjacent to an [AMPHIBIOUS] card that this Bear is also adjacent to. Exhaust that target.";
    CardAbilitiesText["APEX_PREDATOR"] = "[APEX PREDATOR] (Action): Exhaust this card. Target an adjacent +3C or +4C creature. It becomes Exhausted.";
    CardAbilitiesText["SCAVENGE"] = "[SCAVENGE] (Action): Exhaust this card. Take one creature card from the Detritus Zone and put it into your hand.";
    CardAbilitiesText["PARASITIC_DRAIN"] = "[PARASITIC DRAIN] (Persistent): The host creature does not Ready during its owner's Ready Phase.";
    CardAbilitiesText["RECYCLER"] = "[RECYCLER] (Action): Exhaust this card. Place the card underneath the adjacent -1S card into your score pile. It is worth its printed VP +1. Then, draw a card.";
})(CardAbilitiesText || (exports.CardAbilitiesText = CardAbilitiesText = {}));
// ============================================================================
// TAXONOMY ENUMS - Complete Classification for All 95 Cards
// ============================================================================
/**
 * Taxonomic Domain - Highest level of biological classification
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoDomain;
(function (TaxoDomain) {
    TaxoDomain[TaxoDomain["None"] = 0] = "None";
    TaxoDomain[TaxoDomain["ARCHAEA"] = 1] = "ARCHAEA";
    TaxoDomain[TaxoDomain["BACTERIA"] = 2] = "BACTERIA";
    TaxoDomain[TaxoDomain["EUKARYOTA"] = 3] = "EUKARYOTA";
})(TaxoDomain || (exports.TaxoDomain = TaxoDomain = {}));
/**
 * Taxonomic Kingdom - Major groups within domains
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoKingdom;
(function (TaxoKingdom) {
    TaxoKingdom[TaxoKingdom["None"] = 0] = "None";
    TaxoKingdom[TaxoKingdom["ANIMALIA"] = 1] = "ANIMALIA";
    TaxoKingdom[TaxoKingdom["ARCHAEA"] = 2] = "ARCHAEA";
    TaxoKingdom[TaxoKingdom["BACTERIA"] = 3] = "BACTERIA";
    TaxoKingdom[TaxoKingdom["CHROMISTA"] = 4] = "CHROMISTA";
    TaxoKingdom[TaxoKingdom["FUNGI"] = 5] = "FUNGI";
    TaxoKingdom[TaxoKingdom["PLANTAE"] = 6] = "PLANTAE";
})(TaxoKingdom || (exports.TaxoKingdom = TaxoKingdom = {}));
/**
 * Taxonomic Phylum - Major body plan groups
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoPhylum;
(function (TaxoPhylum) {
    TaxoPhylum[TaxoPhylum["None"] = 0] = "None";
    TaxoPhylum[TaxoPhylum["ANNELIDA"] = 1] = "ANNELIDA";
    TaxoPhylum[TaxoPhylum["AQUIFICOTA"] = 2] = "AQUIFICOTA";
    TaxoPhylum[TaxoPhylum["ARTHROPODA"] = 3] = "ARTHROPODA";
    TaxoPhylum[TaxoPhylum["BACILLOTA"] = 4] = "BACILLOTA";
    TaxoPhylum[TaxoPhylum["BASIDIOMYCOTA"] = 5] = "BASIDIOMYCOTA";
    TaxoPhylum[TaxoPhylum["CHORDATA"] = 6] = "CHORDATA";
    TaxoPhylum[TaxoPhylum["GLOMEROMYCOTA"] = 7] = "GLOMEROMYCOTA";
    TaxoPhylum[TaxoPhylum["MOLLUSCA"] = 8] = "MOLLUSCA";
    TaxoPhylum[TaxoPhylum["OCHROPHYTA"] = 9] = "OCHROPHYTA";
    TaxoPhylum[TaxoPhylum["PSEUDOMONADOTA"] = 10] = "PSEUDOMONADOTA";
    TaxoPhylum[TaxoPhylum["THERMOPROTEOTA"] = 11] = "THERMOPROTEOTA";
    TaxoPhylum[TaxoPhylum["TRACHEOPHYTA"] = 12] = "TRACHEOPHYTA";
})(TaxoPhylum || (exports.TaxoPhylum = TaxoPhylum = {}));
/**
 * Taxonomic Class - Groups with similar characteristics
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoClass;
(function (TaxoClass) {
    TaxoClass[TaxoClass["None"] = 0] = "None";
    TaxoClass[TaxoClass["ACIDITHIOBACILLIA"] = 1] = "ACIDITHIOBACILLIA";
    TaxoClass[TaxoClass["ACTINOPTERYGII"] = 2] = "ACTINOPTERYGII";
    TaxoClass[TaxoClass["AGARICOMYCETES"] = 3] = "AGARICOMYCETES";
    TaxoClass[TaxoClass["ALPHAPROTEOBACTERIA"] = 4] = "ALPHAPROTEOBACTERIA";
    TaxoClass[TaxoClass["AMPHIBIA"] = 5] = "AMPHIBIA";
    TaxoClass[TaxoClass["AQUIFICAE"] = 6] = "AQUIFICAE";
    TaxoClass[TaxoClass["ARACHNIDA"] = 7] = "ARACHNIDA";
    TaxoClass[TaxoClass["AVES"] = 8] = "AVES";
    TaxoClass[TaxoClass["BACILLARIOPHYCEAE"] = 9] = "BACILLARIOPHYCEAE";
    TaxoClass[TaxoClass["BACILLI"] = 10] = "BACILLI";
    TaxoClass[TaxoClass["BETAPROTEOBACTERIA"] = 11] = "BETAPROTEOBACTERIA";
    TaxoClass[TaxoClass["CHONDRICHTHYES"] = 12] = "CHONDRICHTHYES";
    TaxoClass[TaxoClass["CLITELLATA"] = 13] = "CLITELLATA";
    TaxoClass[TaxoClass["COPEPODA"] = 14] = "COPEPODA";
    TaxoClass[TaxoClass["GASTROPODA"] = 15] = "GASTROPODA";
    TaxoClass[TaxoClass["GLOMEROMYCETES"] = 16] = "GLOMEROMYCETES";
    TaxoClass[TaxoClass["INSECTA"] = 17] = "INSECTA";
    TaxoClass[TaxoClass["LILIOPSIDA"] = 18] = "LILIOPSIDA";
    TaxoClass[TaxoClass["MAGNOLIOPSIDA"] = 19] = "MAGNOLIOPSIDA";
    TaxoClass[TaxoClass["MALACOSTRACA"] = 20] = "MALACOSTRACA";
    TaxoClass[TaxoClass["MAMMALIA"] = 21] = "MAMMALIA";
    TaxoClass[TaxoClass["PHAEOPHYCEAE"] = 22] = "PHAEOPHYCEAE";
    TaxoClass[TaxoClass["PINOPSIDA"] = 23] = "PINOPSIDA";
    TaxoClass[TaxoClass["REPTILIA"] = 24] = "REPTILIA";
    TaxoClass[TaxoClass["THERMOPROTEI"] = 25] = "THERMOPROTEI";
})(TaxoClass || (exports.TaxoClass = TaxoClass = {}));
/**
 * Taxonomic Order - Groups with similar lifestyles/ecology
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoOrder;
(function (TaxoOrder) {
    TaxoOrder[TaxoOrder["None"] = 0] = "None";
    TaxoOrder[TaxoOrder["ACIDITHIOBACILLALES"] = 1] = "ACIDITHIOBACILLALES";
    TaxoOrder[TaxoOrder["AGARICALES"] = 2] = "AGARICALES";
    TaxoOrder[TaxoOrder["ALISMATALES"] = 3] = "ALISMATALES";
    TaxoOrder[TaxoOrder["ANURA"] = 4] = "ANURA";
    TaxoOrder[TaxoOrder["AQUIFICALES"] = 5] = "AQUIFICALES";
    TaxoOrder[TaxoOrder["ARANEAE"] = 6] = "ARANEAE";
    TaxoOrder[TaxoOrder["ARECALES"] = 7] = "ARECALES";
    TaxoOrder[TaxoOrder["ARTIODACTYLA"] = 8] = "ARTIODACTYLA";
    TaxoOrder[TaxoOrder["ASTERALES"] = 9] = "ASTERALES";
    TaxoOrder[TaxoOrder["BACILLALES"] = 10] = "BACILLALES";
    TaxoOrder[TaxoOrder["BURKHOLDERIALES"] = 11] = "BURKHOLDERIALES";
    TaxoOrder[TaxoOrder["CALANOIDA"] = 12] = "CALANOIDA";
    TaxoOrder[TaxoOrder["CARNIVORA"] = 13] = "CARNIVORA";
    TaxoOrder[TaxoOrder["CARYOPHYLLALES"] = 14] = "CARYOPHYLLALES";
    TaxoOrder[TaxoOrder["CATHARTIFORMES"] = 15] = "CATHARTIFORMES";
    TaxoOrder[TaxoOrder["COLEOPTERA"] = 16] = "COLEOPTERA";
    TaxoOrder[TaxoOrder["CRASSICLITELLATA"] = 17] = "CRASSICLITELLATA";
    TaxoOrder[TaxoOrder["DIPROTODONTIA"] = 18] = "DIPROTODONTIA";
    TaxoOrder[TaxoOrder["ERINACEOMORPHA"] = 19] = "ERINACEOMORPHA";
    TaxoOrder[TaxoOrder["EUPHAUSIACEA"] = 20] = "EUPHAUSIACEA";
    TaxoOrder[TaxoOrder["FABALES"] = 21] = "FABALES";
    TaxoOrder[TaxoOrder["FAGALES"] = 22] = "FAGALES";
    TaxoOrder[TaxoOrder["GLOMERALES"] = 23] = "GLOMERALES";
    TaxoOrder[TaxoOrder["HYMENOPTERA"] = 24] = "HYMENOPTERA";
    TaxoOrder[TaxoOrder["HYPHOMICROBIALES"] = 25] = "HYPHOMICROBIALES";
    TaxoOrder[TaxoOrder["IXODIDA"] = 26] = "IXODIDA";
    TaxoOrder[TaxoOrder["LAGOMORPHA"] = 27] = "LAGOMORPHA";
    TaxoOrder[TaxoOrder["LAMIALES"] = 28] = "LAMIALES";
    TaxoOrder[TaxoOrder["LAMINARIALES"] = 29] = "LAMINARIALES";
    TaxoOrder[TaxoOrder["LAMNIFORMES"] = 30] = "LAMNIFORMES";
    TaxoOrder[TaxoOrder["LEPIDOPTERA"] = 31] = "LEPIDOPTERA";
    TaxoOrder[TaxoOrder["LILIALES"] = 32] = "LILIALES";
    TaxoOrder[TaxoOrder["MALVALES"] = 33] = "MALVALES";
    TaxoOrder[TaxoOrder["NITROSOMONADALES"] = 34] = "NITROSOMONADALES";
    TaxoOrder[TaxoOrder["ORTHOPTERA"] = 35] = "ORTHOPTERA";
    TaxoOrder[TaxoOrder["PERISSODACTYLA"] = 36] = "PERISSODACTYLA";
    TaxoOrder[TaxoOrder["PINALES"] = 37] = "PINALES";
    TaxoOrder[TaxoOrder["POALES"] = 38] = "POALES";
    TaxoOrder[TaxoOrder["PRIMATES"] = 39] = "PRIMATES";
    TaxoOrder[TaxoOrder["PROBOSCIDEA"] = 40] = "PROBOSCIDEA";
    TaxoOrder[TaxoOrder["RODENTIA"] = 41] = "RODENTIA";
    TaxoOrder[TaxoOrder["ROSALES"] = 42] = "ROSALES";
    TaxoOrder[TaxoOrder["SALMONIFORMES"] = 43] = "SALMONIFORMES";
    TaxoOrder[TaxoOrder["SCORPIONES"] = 44] = "SCORPIONES";
    TaxoOrder[TaxoOrder["SQUAMATA"] = 45] = "SQUAMATA";
    TaxoOrder[TaxoOrder["STYLOMMATOPHORA"] = 46] = "STYLOMMATOPHORA";
    TaxoOrder[TaxoOrder["TESTUDINES"] = 47] = "TESTUDINES";
    TaxoOrder[TaxoOrder["THALASSIOSIRALES"] = 48] = "THALASSIOSIRALES";
    TaxoOrder[TaxoOrder["THERMOPROTEALES"] = 49] = "THERMOPROTEALES";
    TaxoOrder[TaxoOrder["VITALES"] = 50] = "VITALES";
})(TaxoOrder || (exports.TaxoOrder = TaxoOrder = {}));
/**
 * Taxonomic Family - Groups of related genera
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoFamily;
(function (TaxoFamily) {
    TaxoFamily[TaxoFamily["None"] = 0] = "None";
    TaxoFamily[TaxoFamily["ACIDITHIOBACILLACEAE"] = 1] = "ACIDITHIOBACILLACEAE";
    TaxoFamily[TaxoFamily["AGARICACEAE"] = 2] = "AGARICACEAE";
    TaxoFamily[TaxoFamily["APIDAE"] = 3] = "APIDAE";
    TaxoFamily[TaxoFamily["AQUIFICACEAE"] = 4] = "AQUIFICACEAE";
    TaxoFamily[TaxoFamily["ARANEIDAE"] = 5] = "ARANEIDAE";
    TaxoFamily[TaxoFamily["ARECACEAE"] = 6] = "ARECACEAE";
    TaxoFamily[TaxoFamily["ASTERACEAE"] = 7] = "ASTERACEAE";
    TaxoFamily[TaxoFamily["BACILLACEAE"] = 8] = "BACILLACEAE";
    TaxoFamily[TaxoFamily["BOVIDAE"] = 9] = "BOVIDAE";
    TaxoFamily[TaxoFamily["CACTACEAE"] = 10] = "CACTACEAE";
    TaxoFamily[TaxoFamily["CALANIDAE"] = 11] = "CALANIDAE";
    TaxoFamily[TaxoFamily["CAMELIDAE"] = 12] = "CAMELIDAE";
    TaxoFamily[TaxoFamily["CANIDAE"] = 13] = "CANIDAE";
    TaxoFamily[TaxoFamily["CASTORIDAE"] = 14] = "CASTORIDAE";
    TaxoFamily[TaxoFamily["CATHARTIDAE"] = 15] = "CATHARTIDAE";
    TaxoFamily[TaxoFamily["CERVIDAE"] = 16] = "CERVIDAE";
    TaxoFamily[TaxoFamily["CHELONIIDAE"] = 17] = "CHELONIIDAE";
    TaxoFamily[TaxoFamily["COMAMONADACEAE"] = 18] = "COMAMONADACEAE";
    TaxoFamily[TaxoFamily["CRICETIDAE"] = 19] = "CRICETIDAE";
    TaxoFamily[TaxoFamily["ELEPHANTIDAE"] = 20] = "ELEPHANTIDAE";
    TaxoFamily[TaxoFamily["EQUIDAE"] = 21] = "EQUIDAE";
    TaxoFamily[TaxoFamily["ERINACEIDAE"] = 22] = "ERINACEIDAE";
    TaxoFamily[TaxoFamily["EUPHAUSIIDAE"] = 23] = "EUPHAUSIIDAE";
    TaxoFamily[TaxoFamily["FABACEAE"] = 24] = "FABACEAE";
    TaxoFamily[TaxoFamily["FAGACEAE"] = 25] = "FAGACEAE";
    TaxoFamily[TaxoFamily["FELIDAE"] = 26] = "FELIDAE";
    TaxoFamily[TaxoFamily["FORMICIDAE"] = 27] = "FORMICIDAE";
    TaxoFamily[TaxoFamily["GIRAFFIDAE"] = 28] = "GIRAFFIDAE";
    TaxoFamily[TaxoFamily["GLOMERACEAE"] = 29] = "GLOMERACEAE";
    TaxoFamily[TaxoFamily["GRYLLIDAE"] = 30] = "GRYLLIDAE";
    TaxoFamily[TaxoFamily["HADRURIDAE"] = 31] = "HADRURIDAE";
    TaxoFamily[TaxoFamily["HELICIDAE"] = 32] = "HELICIDAE";
    TaxoFamily[TaxoFamily["HIPPOPOTAMIDAE"] = 33] = "HIPPOPOTAMIDAE";
    TaxoFamily[TaxoFamily["HOMINIDAE"] = 34] = "HOMINIDAE";
    TaxoFamily[TaxoFamily["IXODIDAE"] = 35] = "IXODIDAE";
    TaxoFamily[TaxoFamily["LACERTIDAE"] = 36] = "LACERTIDAE";
    TaxoFamily[TaxoFamily["LAMIACEAE"] = 37] = "LAMIACEAE";
    TaxoFamily[TaxoFamily["LAMINARIACEAE"] = 38] = "LAMINARIACEAE";
    TaxoFamily[TaxoFamily["LAMNIDAE"] = 39] = "LAMNIDAE";
    TaxoFamily[TaxoFamily["LEPORIDAE"] = 40] = "LEPORIDAE";
    TaxoFamily[TaxoFamily["LILIACEAE"] = 41] = "LILIACEAE";
    TaxoFamily[TaxoFamily["LUMBRICIDAE"] = 42] = "LUMBRICIDAE";
    TaxoFamily[TaxoFamily["MALVACEAE"] = 43] = "MALVACEAE";
    TaxoFamily[TaxoFamily["MURIDAE"] = 44] = "MURIDAE";
    TaxoFamily[TaxoFamily["MYCENACEAE"] = 45] = "MYCENACEAE";
    TaxoFamily[TaxoFamily["NITROSOMONADACEAE"] = 46] = "NITROSOMONADACEAE";
    TaxoFamily[TaxoFamily["NYMPHALIDAE"] = 47] = "NYMPHALIDAE";
    TaxoFamily[TaxoFamily["PHASCOLARCTIDAE"] = 48] = "PHASCOLARCTIDAE";
    TaxoFamily[TaxoFamily["PINACEAE"] = 49] = "PINACEAE";
    TaxoFamily[TaxoFamily["POACEAE"] = 50] = "POACEAE";
    TaxoFamily[TaxoFamily["PROCYONIDAE"] = 51] = "PROCYONIDAE";
    TaxoFamily[TaxoFamily["PYTHONIDAE"] = 52] = "PYTHONIDAE";
    TaxoFamily[TaxoFamily["RANIDAE"] = 53] = "RANIDAE";
    TaxoFamily[TaxoFamily["RHINOCEROTIDAE"] = 54] = "RHINOCEROTIDAE";
    TaxoFamily[TaxoFamily["RHIZOBIACEAE"] = 55] = "RHIZOBIACEAE";
    TaxoFamily[TaxoFamily["ROSACEAE"] = 56] = "ROSACEAE";
    TaxoFamily[TaxoFamily["SALMONIDAE"] = 57] = "SALMONIDAE";
    TaxoFamily[TaxoFamily["SCARABAEIDAE"] = 58] = "SCARABAEIDAE";
    TaxoFamily[TaxoFamily["SCIURIDAE"] = 59] = "SCIURIDAE";
    TaxoFamily[TaxoFamily["SUIDAE"] = 60] = "SUIDAE";
    TaxoFamily[TaxoFamily["THALASSIOSIRACEAE"] = 61] = "THALASSIOSIRACEAE";
    TaxoFamily[TaxoFamily["THERMOFILACEAE"] = 62] = "THERMOFILACEAE";
    TaxoFamily[TaxoFamily["URSIDAE"] = 63] = "URSIDAE";
    TaxoFamily[TaxoFamily["VITACEAE"] = 64] = "VITACEAE";
    TaxoFamily[TaxoFamily["ZOSTERACEAE"] = 65] = "ZOSTERACEAE";
})(TaxoFamily || (exports.TaxoFamily = TaxoFamily = {}));
/**
 * Taxonomic Genus - Groups of closely related species
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoGenus;
(function (TaxoGenus) {
    TaxoGenus[TaxoGenus["None"] = 0] = "None";
    TaxoGenus[TaxoGenus["ACHETA"] = 1] = "ACHETA";
    TaxoGenus[TaxoGenus["ACIDITHIOBACILLUS"] = 2] = "ACIDITHIOBACILLUS";
    TaxoGenus[TaxoGenus["AGARICUS"] = 3] = "AGARICUS";
    TaxoGenus[TaxoGenus["AILUROPODA"] = 4] = "AILUROPODA";
    TaxoGenus[TaxoGenus["APIS"] = 5] = "APIS";
    TaxoGenus[TaxoGenus["AQUIFEX"] = 6] = "AQUIFEX";
    TaxoGenus[TaxoGenus["ARANEUS"] = 7] = "ARANEUS";
    TaxoGenus[TaxoGenus["BACILLUS"] = 8] = "BACILLUS";
    TaxoGenus[TaxoGenus["BELLIS"] = 9] = "BELLIS";
    TaxoGenus[TaxoGenus["BISON"] = 10] = "BISON";
    TaxoGenus[TaxoGenus["BOS"] = 11] = "BOS";
    TaxoGenus[TaxoGenus["BUBALUS"] = 12] = "BUBALUS";
    TaxoGenus[TaxoGenus["CALANUS"] = 13] = "CALANUS";
    TaxoGenus[TaxoGenus["CAMELUS"] = 14] = "CAMELUS";
    TaxoGenus[TaxoGenus["CANIS"] = 15] = "CANIS";
    TaxoGenus[TaxoGenus["CAPRA"] = 16] = "CAPRA";
    TaxoGenus[TaxoGenus["CARCHARODON"] = 17] = "CARCHARODON";
    TaxoGenus[TaxoGenus["CASTOR"] = 18] = "CASTOR";
    TaxoGenus[TaxoGenus["CATHARTES"] = 19] = "CATHARTES";
    TaxoGenus[TaxoGenus["CERATOTHERIUM"] = 20] = "CERATOTHERIUM";
    TaxoGenus[TaxoGenus["CHELONIA"] = 21] = "CHELONIA";
    TaxoGenus[TaxoGenus["COCOS"] = 22] = "COCOS";
    TaxoGenus[TaxoGenus["DANAUS"] = 23] = "DANAUS";
    TaxoGenus[TaxoGenus["EQUUS"] = 24] = "EQUUS";
    TaxoGenus[TaxoGenus["ERINACEUS"] = 25] = "ERINACEUS";
    TaxoGenus[TaxoGenus["EUPHAUSIA"] = 26] = "EUPHAUSIA";
    TaxoGenus[TaxoGenus["FELIS"] = 27] = "FELIS";
    TaxoGenus[TaxoGenus["FORMICA"] = 28] = "FORMICA";
    TaxoGenus[TaxoGenus["FRAGARIA"] = 29] = "FRAGARIA";
    TaxoGenus[TaxoGenus["GIRAFFA"] = 30] = "GIRAFFA";
    TaxoGenus[TaxoGenus["GLOMUS"] = 31] = "GLOMUS";
    TaxoGenus[TaxoGenus["GORILLA"] = 32] = "GORILLA";
    TaxoGenus[TaxoGenus["HADRURUS"] = 33] = "HADRURUS";
    TaxoGenus[TaxoGenus["HELIANTHUS"] = 34] = "HELIANTHUS";
    TaxoGenus[TaxoGenus["HELIX"] = 35] = "HELIX";
    TaxoGenus[TaxoGenus["HIBISCUS"] = 36] = "HIBISCUS";
    TaxoGenus[TaxoGenus["HIPPOPOTAMUS"] = 37] = "HIPPOPOTAMUS";
    TaxoGenus[TaxoGenus["IXODES"] = 38] = "IXODES";
    TaxoGenus[TaxoGenus["LACERTA"] = 39] = "LACERTA";
    TaxoGenus[TaxoGenus["LAMA"] = 40] = "LAMA";
    TaxoGenus[TaxoGenus["LOLIUM"] = 41] = "LOLIUM";
    TaxoGenus[TaxoGenus["LOXODONTA"] = 42] = "LOXODONTA";
    TaxoGenus[TaxoGenus["LUMBRICUS"] = 43] = "LUMBRICUS";
    TaxoGenus[TaxoGenus["MACROCYSTIS"] = 44] = "MACROCYSTIS";
    TaxoGenus[TaxoGenus["MALUS"] = 45] = "MALUS";
    TaxoGenus[TaxoGenus["MAMMUTHUS"] = 46] = "MAMMUTHUS";
    TaxoGenus[TaxoGenus["MENTHA"] = 47] = "MENTHA";
    TaxoGenus[TaxoGenus["MESOCRICETUS"] = 48] = "MESOCRICETUS";
    TaxoGenus[TaxoGenus["MUS"] = 49] = "MUS";
    TaxoGenus[TaxoGenus["MYCENA"] = 50] = "MYCENA";
    TaxoGenus[TaxoGenus["NITROSOMONAS"] = 51] = "NITROSOMONAS";
    TaxoGenus[TaxoGenus["ODOCOILEUS"] = 52] = "ODOCOILEUS";
    TaxoGenus[TaxoGenus["ONCORHYNCHUS"] = 53] = "ONCORHYNCHUS";
    TaxoGenus[TaxoGenus["OPUNTIA"] = 54] = "OPUNTIA";
    TaxoGenus[TaxoGenus["ORYCTOLAGUS"] = 55] = "ORYCTOLAGUS";
    TaxoGenus[TaxoGenus["ORYZA"] = 56] = "ORYZA";
    TaxoGenus[TaxoGenus["OVIS"] = 57] = "OVIS";
    TaxoGenus[TaxoGenus["PAN"] = 58] = "PAN";
    TaxoGenus[TaxoGenus["PANTHERA"] = 59] = "PANTHERA";
    TaxoGenus[TaxoGenus["PHALARIS"] = 60] = "PHALARIS";
    TaxoGenus[TaxoGenus["PHASCOLARCTOS"] = 61] = "PHASCOLARCTOS";
    TaxoGenus[TaxoGenus["PINUS"] = 62] = "PINUS";
    TaxoGenus[TaxoGenus["PONGO"] = 63] = "PONGO";
    TaxoGenus[TaxoGenus["PROCYON"] = 64] = "PROCYON";
    TaxoGenus[TaxoGenus["PRUNUS"] = 65] = "PRUNUS";
    TaxoGenus[TaxoGenus["PYROCOCCUS"] = 66] = "PYROCOCCUS";
    TaxoGenus[TaxoGenus["PYTHON"] = 67] = "PYTHON";
    TaxoGenus[TaxoGenus["QUERCUS"] = 68] = "QUERCUS";
    TaxoGenus[TaxoGenus["RANA"] = 69] = "RANA";
    TaxoGenus[TaxoGenus["RHIZOBIUM"] = 70] = "RHIZOBIUM";
    TaxoGenus[TaxoGenus["ROSA"] = 71] = "ROSA";
    TaxoGenus[TaxoGenus["SCARABAEUS"] = 72] = "SCARABAEUS";
    TaxoGenus[TaxoGenus["SUS"] = 73] = "SUS";
    TaxoGenus[TaxoGenus["TAMIAS"] = 74] = "TAMIAS";
    TaxoGenus[TaxoGenus["THALASSIOSIRA"] = 75] = "THALASSIOSIRA";
    TaxoGenus[TaxoGenus["THIOBACILLUS"] = 76] = "THIOBACILLUS";
    TaxoGenus[TaxoGenus["TRIFOLIUM"] = 77] = "TRIFOLIUM";
    TaxoGenus[TaxoGenus["TULIPA"] = 78] = "TULIPA";
    TaxoGenus[TaxoGenus["URSUS"] = 79] = "URSUS";
    TaxoGenus[TaxoGenus["VITIS"] = 80] = "VITIS";
    TaxoGenus[TaxoGenus["VULPES"] = 81] = "VULPES";
    TaxoGenus[TaxoGenus["ZEA"] = 82] = "ZEA";
    TaxoGenus[TaxoGenus["ZOSTERA"] = 83] = "ZOSTERA";
})(TaxoGenus || (exports.TaxoGenus = TaxoGenus = {}));
/**
 * Taxonomic Species - Individual species epithets
 * Auto-generated from complete taxonomy data for all 95 cards.
 */
var TaxoSpecies;
(function (TaxoSpecies) {
    TaxoSpecies[TaxoSpecies["None"] = 0] = "None";
    TaxoSpecies[TaxoSpecies["AEGAGRUS"] = 1] = "AEGAGRUS";
    TaxoSpecies[TaxoSpecies["AEOLICUS"] = 2] = "AEOLICUS";
    TaxoSpecies[TaxoSpecies["AFRICANA"] = 3] = "AFRICANA";
    TaxoSpecies[TaxoSpecies["AMERICANUS"] = 4] = "AMERICANUS";
    TaxoSpecies[TaxoSpecies["AMPHIBIUS"] = 5] = "AMPHIBIUS";
    TaxoSpecies[TaxoSpecies["ANANASSA"] = 6] = "ANANASSA";
    TaxoSpecies[TaxoSpecies["ANNUUS"] = 7] = "ANNUUS";
    TaxoSpecies[TaxoSpecies["ARIZONENSIS"] = 8] = "ARIZONENSIS";
    TaxoSpecies[TaxoSpecies["ARUNDINACEA"] = 9] = "ARUNDINACEA";
    TaxoSpecies[TaxoSpecies["AURA"] = 10] = "AURA";
    TaxoSpecies[TaxoSpecies["AURATUS"] = 11] = "AURATUS";
    TaxoSpecies[TaxoSpecies["BERINGEI"] = 12] = "BERINGEI";
    TaxoSpecies[TaxoSpecies["BISON"] = 13] = "BISON";
    TaxoSpecies[TaxoSpecies["BISPORUS"] = 14] = "BISPORUS";
    TaxoSpecies[TaxoSpecies["BUBALIS"] = 15] = "BUBALIS";
    TaxoSpecies[TaxoSpecies["CABALLUS"] = 16] = "CABALLUS";
    TaxoSpecies[TaxoSpecies["CAMELOPARDALIS"] = 17] = "CAMELOPARDALIS";
    TaxoSpecies[TaxoSpecies["CANADENSIS"] = 18] = "CANADENSIS";
    TaxoSpecies[TaxoSpecies["CARCHARIAS"] = 19] = "CARCHARIAS";
    TaxoSpecies[TaxoSpecies["CATUS"] = 20] = "CATUS";
    TaxoSpecies[TaxoSpecies["CINEREUS"] = 21] = "CINEREUS";
    TaxoSpecies[TaxoSpecies["CUNICULUS"] = 22] = "CUNICULUS";
    TaxoSpecies[TaxoSpecies["DENITRIFICANS"] = 23] = "DENITRIFICANS";
    TaxoSpecies[TaxoSpecies["DESERTI"] = 24] = "DESERTI";
    TaxoSpecies[TaxoSpecies["DIADEMATUS"] = 25] = "DIADEMATUS";
    TaxoSpecies[TaxoSpecies["DOMESTICUS"] = 26] = "DOMESTICUS";
    TaxoSpecies[TaxoSpecies["DROMEDARIUS"] = 27] = "DROMEDARIUS";
    TaxoSpecies[TaxoSpecies["EUROPAEA"] = 28] = "EUROPAEA";
    TaxoSpecies[TaxoSpecies["EUROPAEUS"] = 29] = "EUROPAEUS";
    TaxoSpecies[TaxoSpecies["FERROOXIDANS"] = 30] = "FERROOXIDANS";
    TaxoSpecies[TaxoSpecies["FICUS_INDICA"] = 31] = "FICUS_INDICA";
    TaxoSpecies[TaxoSpecies["FINMARCHICUS"] = 32] = "FINMARCHICUS";
    TaxoSpecies[TaxoSpecies["FURIOSUS"] = 33] = "FURIOSUS";
    TaxoSpecies[TaxoSpecies["GALERICULATA"] = 34] = "GALERICULATA";
    TaxoSpecies[TaxoSpecies["GESNERIANA"] = 35] = "GESNERIANA";
    TaxoSpecies[TaxoSpecies["GLAMA"] = 36] = "GLAMA";
    TaxoSpecies[TaxoSpecies["INTRARADICES"] = 37] = "INTRARADICES";
    TaxoSpecies[TaxoSpecies["LATICOLLIS"] = 38] = "LATICOLLIS";
    TaxoSpecies[TaxoSpecies["LEGUMINOSARUM"] = 39] = "LEGUMINOSARUM";
    TaxoSpecies[TaxoSpecies["LEO"] = 40] = "LEO";
    TaxoSpecies[TaxoSpecies["LOTOR"] = 41] = "LOTOR";
    TaxoSpecies[TaxoSpecies["LUPUS"] = 42] = "LUPUS";
    TaxoSpecies[TaxoSpecies["MARINA"] = 43] = "MARINA";
    TaxoSpecies[TaxoSpecies["MAYS"] = 44] = "MAYS";
    TaxoSpecies[TaxoSpecies["MELANOLEUCA"] = 45] = "MELANOLEUCA";
    TaxoSpecies[TaxoSpecies["MELLIFERA"] = 46] = "MELLIFERA";
    TaxoSpecies[TaxoSpecies["MUSCULUS"] = 47] = "MUSCULUS";
    TaxoSpecies[TaxoSpecies["MYDAS"] = 48] = "MYDAS";
    TaxoSpecies[TaxoSpecies["NERKA"] = 49] = "NERKA";
    TaxoSpecies[TaxoSpecies["NUCIFERA"] = 50] = "NUCIFERA";
    TaxoSpecies[TaxoSpecies["PACIFICA"] = 51] = "PACIFICA";
    TaxoSpecies[TaxoSpecies["PARDUS"] = 52] = "PARDUS";
    TaxoSpecies[TaxoSpecies["PERENNE"] = 53] = "PERENNE";
    TaxoSpecies[TaxoSpecies["PERENNIS"] = 54] = "PERENNIS";
    TaxoSpecies[TaxoSpecies["PLEXIPPUS"] = 55] = "PLEXIPPUS";
    TaxoSpecies[TaxoSpecies["POMATIA"] = 56] = "POMATIA";
    TaxoSpecies[TaxoSpecies["PRIMIGENIUS"] = 57] = "PRIMIGENIUS";
    TaxoSpecies[TaxoSpecies["PSEUDONANA"] = 58] = "PSEUDONANA";
    TaxoSpecies[TaxoSpecies["PUMILA"] = 59] = "PUMILA";
    TaxoSpecies[TaxoSpecies["PYGMAEUS"] = 60] = "PYGMAEUS";
    TaxoSpecies[TaxoSpecies["PYRIFERA"] = 61] = "PYRIFERA";
    TaxoSpecies[TaxoSpecies["QUAGGA"] = 62] = "QUAGGA";
    TaxoSpecies[TaxoSpecies["REGIUS"] = 63] = "REGIUS";
    TaxoSpecies[TaxoSpecies["REPENS"] = 64] = "REPENS";
    TaxoSpecies[TaxoSpecies["ROBUR"] = 65] = "ROBUR";
    TaxoSpecies[TaxoSpecies["ROSA_SINENSIS"] = 66] = "ROSA_SINENSIS";
    TaxoSpecies[TaxoSpecies["RUBIGINOSA"] = 67] = "RUBIGINOSA";
    TaxoSpecies[TaxoSpecies["RUFA"] = 68] = "RUFA";
    TaxoSpecies[TaxoSpecies["SACER"] = 69] = "SACER";
    TaxoSpecies[TaxoSpecies["SATIVA"] = 70] = "SATIVA";
    TaxoSpecies[TaxoSpecies["SCAPULARIS"] = 71] = "SCAPULARIS";
    TaxoSpecies[TaxoSpecies["SCROFA"] = 72] = "SCROFA";
    TaxoSpecies[TaxoSpecies["SERRULATA"] = 73] = "SERRULATA";
    TaxoSpecies[TaxoSpecies["SIMUM"] = 74] = "SIMUM";
    TaxoSpecies[TaxoSpecies["SPICATA"] = 75] = "SPICATA";
    TaxoSpecies[TaxoSpecies["STRIATUS"] = 76] = "STRIATUS";
    TaxoSpecies[TaxoSpecies["SUBTILIS"] = 77] = "SUBTILIS";
    TaxoSpecies[TaxoSpecies["SYLVESTRIS"] = 78] = "SYLVESTRIS";
    TaxoSpecies[TaxoSpecies["TAURUS"] = 79] = "TAURUS";
    TaxoSpecies[TaxoSpecies["TEMPORARIA"] = 80] = "TEMPORARIA";
    TaxoSpecies[TaxoSpecies["TERRESTRIS"] = 81] = "TERRESTRIS";
    TaxoSpecies[TaxoSpecies["TIGRIS"] = 82] = "TIGRIS";
    TaxoSpecies[TaxoSpecies["TROGLODYTES"] = 83] = "TROGLODYTES";
    TaxoSpecies[TaxoSpecies["VINIFERA"] = 84] = "VINIFERA";
    TaxoSpecies[TaxoSpecies["VIRGINIANUS"] = 85] = "VIRGINIANUS";
    TaxoSpecies[TaxoSpecies["VULPES"] = 86] = "VULPES";
})(TaxoSpecies || (exports.TaxoSpecies = TaxoSpecies = {}));
// ============================================================================
// USER & SYSTEM ENUMS
// ============================================================================
/**
 * User Account Types
 */
var UserType;
(function (UserType) {
    UserType["GUEST"] = "guest";
    UserType["REGISTERED"] = "registered";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
/**
 * Card Acquisition Methods
 */
var AcquisitionMethod;
(function (AcquisitionMethod) {
    AcquisitionMethod["PACK"] = "pack";
    AcquisitionMethod["PURCHASE"] = "purchase";
    AcquisitionMethod["REWARD"] = "reward";
    AcquisitionMethod["PHYSICAL"] = "physical";
    AcquisitionMethod["TRADE"] = "trade";
    AcquisitionMethod["CRAFT"] = "craft";
    AcquisitionMethod["DAILY"] = "daily";
    AcquisitionMethod["ACHIEVEMENT"] = "achievement";
    AcquisitionMethod["STARTER"] = "starter";
})(AcquisitionMethod || (exports.AcquisitionMethod = AcquisitionMethod = {}));
/**
 * Card Conditions (for physical cards)
 */
var CardCondition;
(function (CardCondition) {
    CardCondition["MINT"] = "mint";
    CardCondition["NEAR_MINT"] = "near_mint";
    CardCondition["EXCELLENT"] = "excellent";
    CardCondition["GOOD"] = "good";
    CardCondition["PLAYED"] = "played";
    CardCondition["POOR"] = "poor";
})(CardCondition || (exports.CardCondition = CardCondition = {}));
/**
 * Sync Status for offline/online functionality
 */
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["PENDING"] = "pending";
    SyncStatus["CONFLICT"] = "conflict";
    SyncStatus["ERROR"] = "error";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
/**
 * Action Types for game actions
 */
var GameActionType;
(function (GameActionType) {
    GameActionType["PLAY_CARD"] = "PLAY_CARD";
    GameActionType["ACTIVATE_ABILITY"] = "ACTIVATE_ABILITY";
    GameActionType["PASS_TURN"] = "PASS_TURN";
    GameActionType["MOVE_CARD"] = "MOVE_CARD";
    GameActionType["CHALLENGE"] = "CHALLENGE";
    GameActionType["PLAYER_READY"] = "PLAYER_READY";
    GameActionType["REMOVE_CARD"] = "REMOVE_CARD";
    GameActionType["METAMORPHOSIS"] = "METAMORPHOSIS";
    GameActionType["FORFEIT"] = "FORFEIT";
})(GameActionType || (exports.GameActionType = GameActionType = {}));
// ============================================================================
// VALIDATION & ERROR ENUMS
// ============================================================================
/**
 * Validation Error Types
 */
var ValidationError;
(function (ValidationError) {
    ValidationError["INVALID_POSITION"] = "invalid_position";
    ValidationError["INVALID_TROPHIC_CONNECTION"] = "invalid_trophic_connection";
    ValidationError["INVALID_DOMAIN_CONNECTION"] = "invalid_domain_connection";
    ValidationError["INSUFFICIENT_RESOURCES"] = "insufficient_resources";
    ValidationError["CARD_NOT_IN_HAND"] = "card_not_in_hand";
    ValidationError["POSITION_OCCUPIED"] = "position_occupied";
    ValidationError["CARD_EXHAUSTED"] = "card_exhausted";
    ValidationError["INVALID_TARGET"] = "invalid_target";
    ValidationError["NO_ACTIONS_REMAINING"] = "no_actions_remaining";
    ValidationError["GAME_ENDED"] = "game_ended";
})(ValidationError || (exports.ValidationError = ValidationError = {}));
/**
 * API Response Status
 */
var ApiStatus;
(function (ApiStatus) {
    ApiStatus["SUCCESS"] = "success";
    ApiStatus["ERROR"] = "error";
    ApiStatus["VALIDATION_ERROR"] = "validation_error";
    ApiStatus["UNAUTHORIZED"] = "unauthorized";
    ApiStatus["NOT_FOUND"] = "not_found";
})(ApiStatus || (exports.ApiStatus = ApiStatus = {}));
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
exports.DOMAIN_COMPATIBILITY = {
    [Domain.TERRESTRIAL]: [Domain.TERRESTRIAL, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.HOME],
    [Domain.FRESHWATER]: [Domain.FRESHWATER, Domain.AMPHIBIOUS_FRESHWATER, Domain.EURYHALINE, Domain.HOME],
    [Domain.MARINE]: [Domain.MARINE, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME],
    [Domain.AMPHIBIOUS_FRESHWATER]: [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.HOME],
    [Domain.AMPHIBIOUS_MARINE]: [Domain.TERRESTRIAL, Domain.MARINE, Domain.HOME],
    [Domain.EURYHALINE]: [Domain.FRESHWATER, Domain.MARINE, Domain.HOME],
    [Domain.HOME]: [Domain.TERRESTRIAL, Domain.FRESHWATER, Domain.MARINE, Domain.AMPHIBIOUS_FRESHWATER, Domain.AMPHIBIOUS_MARINE, Domain.EURYHALINE, Domain.HOME]
};
/**
 * Trophic level connections
 * Defines valid trophic level connections (what can eat what)
 */
exports.TROPHIC_CONNECTIONS = {
    [TrophicLevel.PRODUCER]: [], // Producers don't eat anything
    [TrophicLevel.PRIMARY_CONSUMER]: [TrophicLevel.PRODUCER], // Herbivores eat producers
    [TrophicLevel.SECONDARY_CONSUMER]: [TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.PRODUCER], // Can eat herbivores and plants
    [TrophicLevel.APEX_PREDATOR]: [TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.PRIMARY_CONSUMER], // Can eat other consumers
    [TrophicLevel.SAPROTROPH]: [TrophicLevel.PRODUCER, TrophicLevel.PRIMARY_CONSUMER, TrophicLevel.SECONDARY_CONSUMER, TrophicLevel.APEX_PREDATOR], // Can decompose anything
    [TrophicLevel.DETRITIVORE]: [TrophicLevel.SAPROTROPH] // Detritivores consume detritus from saprotrophs
};
/**
 * Game Constants
 */
exports.GAME_CONSTANTS = {
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
};
/**
 * IUCN Conservation Data - Based on October 28, 2024 Red List Update
 * Real conservation percentages drive the rarity system (per 100,000 packs for maximum precision)
 */
exports.IUCN_CONSERVATION_DATA = {
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
};
//# sourceMappingURL=enums.js.map