"use strict";
/**
 * BioMasters TCG - Shared Enums
 *
 * This file contains all the enums used throughout the BioMasters TCG system.
 * These enums ensure type safety and consistency between server and client.
 * All IDs are integers as specified in the BioMasters rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IUCN_CONSERVATION_DATA = exports.GAME_CONSTANTS = exports.TROPHIC_CONNECTIONS = exports.DOMAIN_COMPATIBILITY = exports.SPECIES_DISPLAY_NAMES = exports.CommonName = exports.ApiStatus = exports.ValidationError = exports.GameActionType = exports.SyncStatus = exports.CardCondition = exports.AcquisitionMethod = exports.UserType = exports.CardAbilitiesText = exports.CardNames = exports.ConservationStatus = exports.AbilityId = exports.CardId = exports.GameEndReason = exports.CardZone = exports.TurnPhase = exports.GamePhase = exports.ActionId = exports.SelectorId = exports.EffectId = exports.TriggerId = exports.KeywordId = exports.Domain = exports.TrophicLevel = exports.TrophicCategoryId = void 0;
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
    // Secondary/Tertiary Consumers (Trophic Level 3-4)
    CardId[CardId["AMERICAN_BLACK_BEAR"] = 6] = "AMERICAN_BLACK_BEAR";
    CardId[CardId["GREAT_WHITE_SHARK"] = 7] = "GREAT_WHITE_SHARK";
    // Decomposers (Trophic Level -1)
    CardId[CardId["MYCENA_MUSHROOM"] = 8] = "MYCENA_MUSHROOM";
    CardId[CardId["TURKEY_VULTURE"] = 9] = "TURKEY_VULTURE";
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
    CardId[CardId["ZOOPLANKTON"] = 21] = "ZOOPLANKTON";
    CardId[CardId["EUROPEAN_HONEY_BEE"] = 22] = "EUROPEAN_HONEY_BEE";
    // Additional chemoautotrophs
    CardId[CardId["VOLCANIC_HYDROGEN_BACTERIA"] = 25] = "VOLCANIC_HYDROGEN_BACTERIA";
    CardId[CardId["NITRIFYING_SOIL_BACTERIA"] = 26] = "NITRIFYING_SOIL_BACTERIA";
    CardId[CardId["SEDIMENT_CHEMOSYNTHETIC_BACTERIA"] = 27] = "SEDIMENT_CHEMOSYNTHETIC_BACTERIA";
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
    ConservationStatus[ConservationStatus["DATA_DEFICIENT"] = 8] = "DATA_DEFICIENT"; // DD - Inadequate information (12.97%)
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
/**
 * CommonName Enum - Maps species common names to their file identifiers
 * Used to connect public/species/ JSON files with OrganismRenderer.tsx
 * Based on the manifest.json and individual species files
 */
var CommonName;
(function (CommonName) {
    // Cards from cards.json - Producers (Trophic Level 1)
    CommonName["OAK_TREE"] = "oak-tree";
    CommonName["GIANT_KELP"] = "giant-kelp";
    CommonName["REED_CANARY_GRASS"] = "reed-canary-grass";
    // Primary Consumers (Trophic Level 2)
    CommonName["EUROPEAN_RABBIT"] = "european-rabbit";
    CommonName["SOCKEYE_SALMON"] = "sockeye-salmon";
    // Secondary/Tertiary Consumers (Trophic Level 3-4)
    CommonName["AMERICAN_BLACK_BEAR"] = "american-black-bear";
    CommonName["GREAT_WHITE_SHARK"] = "great-white-shark";
    // Decomposers (Trophic Level -1)
    CommonName["MYCENA_MUSHROOM"] = "mycena-mushroom";
    CommonName["TURKEY_VULTURE"] = "turkey-vulture";
    // Parasites
    CommonName["DEER_TICK"] = "deer-tick";
    // Detritivores (Trophic Level -2)
    CommonName["COMMON_EARTHWORM"] = "common-earthworm";
    CommonName["DUNG_BEETLE"] = "dung-beetle";
    // Saprotrophs (Trophic Level -1)
    CommonName["SOIL_BACTERIA"] = "soil-bacteria";
    CommonName["DECOMPOSER_MUSHROOM"] = "decomposer-mushroom";
    // Chemoautotrophs (Trophic Level 1)
    CommonName["DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA"] = "deep-sea-hydrothermal-vent-bacteria";
    CommonName["IRON_SPRING_BACTERIA"] = "iron-spring-bacteria";
    // Mutualists (Variable trophic level)
    CommonName["MYCORRHIZAL_FUNGI"] = "mycorrhizal-fungi";
    CommonName["NITROGEN_FIXING_BACTERIA"] = "nitrogen-fixing-bacteria";
    // Marine organisms
    CommonName["PACIFIC_KRILL"] = "pacific-krill";
    CommonName["PHYTOPLANKTON"] = "phytoplankton";
    CommonName["ZOOPLANKTON"] = "zooplankton";
    CommonName["EUROPEAN_HONEY_BEE"] = "european-honey-bee";
    // Additional chemoautotrophs
    CommonName["VOLCANIC_HYDROGEN_BACTERIA"] = "volcanic-hydrogen-bacteria";
    CommonName["NITRIFYING_SOIL_BACTERIA"] = "nitrifying-soil-bacteria";
    CommonName["SEDIMENT_CHEMOSYNTHETIC_BACTERIA"] = "sediment-chemosynthetic-bacteria";
    // Legacy species from existing files (keep for backward compatibility)
    CommonName["RABBIT"] = "rabbit";
    CommonName["BEAR"] = "bear";
    CommonName["MOUSE"] = "mouse";
})(CommonName || (exports.CommonName = CommonName = {}));
/**
 * Species Display Names - Maps CommonName enum to human-readable display names
 * Based on the commonName field from species JSON files
 */
exports.SPECIES_DISPLAY_NAMES = {
    // Cards from cards.json - match the CommonName field exactly
    [CommonName.OAK_TREE]: 'Oak Tree',
    [CommonName.GIANT_KELP]: 'Giant Kelp',
    [CommonName.REED_CANARY_GRASS]: 'Reed Canary Grass',
    [CommonName.EUROPEAN_RABBIT]: 'European Rabbit',
    [CommonName.SOCKEYE_SALMON]: 'Sockeye Salmon',
    [CommonName.AMERICAN_BLACK_BEAR]: 'American Black Bear',
    [CommonName.GREAT_WHITE_SHARK]: 'Great White Shark',
    [CommonName.MYCENA_MUSHROOM]: 'Mycena Mushroom',
    [CommonName.TURKEY_VULTURE]: 'Turkey Vulture',
    [CommonName.DEER_TICK]: 'Deer Tick',
    [CommonName.COMMON_EARTHWORM]: 'Common Earthworm',
    [CommonName.DUNG_BEETLE]: 'Dung Beetle',
    [CommonName.SOIL_BACTERIA]: 'Soil Bacteria',
    [CommonName.DECOMPOSER_MUSHROOM]: 'Decomposer Mushroom',
    [CommonName.DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA]: 'Deep Sea Hydrothermal Vent Bacteria',
    [CommonName.IRON_SPRING_BACTERIA]: 'Iron Spring Bacteria',
    [CommonName.MYCORRHIZAL_FUNGI]: 'Mycorrhizal Fungi',
    [CommonName.NITROGEN_FIXING_BACTERIA]: 'Nitrogen Fixing Bacteria',
    [CommonName.PACIFIC_KRILL]: 'Pacific Krill',
    [CommonName.PHYTOPLANKTON]: 'Phytoplankton',
    [CommonName.ZOOPLANKTON]: 'Zooplankton',
    [CommonName.EUROPEAN_HONEY_BEE]: 'European Honey Bee',
    [CommonName.VOLCANIC_HYDROGEN_BACTERIA]: 'Volcanic Hydrogen Bacteria',
    [CommonName.NITRIFYING_SOIL_BACTERIA]: 'Nitrifying Soil Bacteria',
    [CommonName.SEDIMENT_CHEMOSYNTHETIC_BACTERIA]: 'Sediment Chemosynthetic Bacteria',
    // Legacy species (backward compatibility)
    [CommonName.RABBIT]: 'European Rabbit',
    [CommonName.BEAR]: 'American Black Bear',
    [CommonName.MOUSE]: 'Mouse'
};
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
        packRarity: 50646, // per 100,000 packs (adjusted to make total = 100,000)
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
    }
};
