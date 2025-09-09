"use strict";
/**
 * Card ID Helper Functions - Shared Module
 * Utilities to convert between CardId (numbers) and nameId (strings)
 * This provides a clean interface between game logic (uses CardId) and data files (use nameId)
 *
 * SINGLE SOURCE OF TRUTH for all card ID mappings across frontend, server, and shared modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpeciesOwnership = exports.isSpeciesOwned = void 0;
exports.initializeCardMapping = initializeCardMapping;
exports.cardIdToNameId = cardIdToNameId;
exports.nameIdToCardId = nameIdToCardId;
exports.isValidCardId = isValidCardId;
exports.isValidNameId = isValidNameId;
exports.getAllCardIds = getAllCardIds;
exports.getAllNameIds = getAllNameIds;
exports.cardIdsToNameIds = cardIdsToNameIds;
exports.nameIdsToCardIds = nameIdsToCardIds;
exports.getCollectionStats = getCollectionStats;
exports.isCardOwnedByNameId = isCardOwnedByNameId;
exports.getCardOwnershipByNameId = getCardOwnershipByNameId;
exports.getCardDisplayName = getCardDisplayName;
const enums_1 = require("../enums");
/**
 * Dynamic mapping cache for cardId to nameId
 */
let CARD_ID_TO_NAME_ID_MAP = null;
/**
 * Initialize the card mapping from the cards data
 * This ensures we have a complete mapping for all cards in the system
 */
function initializeCardMapping(cardsData) {
    if (CARD_ID_TO_NAME_ID_MAP === null) {
        CARD_ID_TO_NAME_ID_MAP = {};
        cardsData.forEach(card => {
            CARD_ID_TO_NAME_ID_MAP[card.cardId] = card.nameId;
        });
        console.log(`🗺️ Initialized card mapping with ${cardsData.length} cards`);
    }
}
/**
 * Get the card mapping, initializing it if necessary
 */
function getCardMapping() {
    if (CARD_ID_TO_NAME_ID_MAP === null) {
        // Fallback to basic mapping if not initialized
        console.warn('⚠️ Card mapping not initialized, using fallback mapping');
        return {
            [enums_1.CardId.OAK_TREE]: 'CARD_OAK_TREE',
            [enums_1.CardId.GIANT_KELP]: 'CARD_GIANT_KELP',
            [enums_1.CardId.REED_CANARY_GRASS]: 'CARD_REED_CANARY_GRASS',
            [enums_1.CardId.EUROPEAN_RABBIT]: 'CARD_EUROPEAN_RABBIT',
            [enums_1.CardId.SOCKEYE_SALMON]: 'CARD_SOCKEYE_SALMON',
            [enums_1.CardId.AMERICAN_BLACK_BEAR]: 'CARD_AMERICAN_BLACK_BEAR',
            [enums_1.CardId.GREAT_WHITE_SHARK]: 'CARD_GREAT_WHITE_SHARK',
            [enums_1.CardId.MYCENA_MUSHROOM]: 'CARD_MYCENA_MUSHROOM',
            [enums_1.CardId.TURKEY_VULTURE]: 'CARD_TURKEY_VULTURE',
            [enums_1.CardId.DEER_TICK]: 'CARD_DEER_TICK',
            [enums_1.CardId.COMMON_EARTHWORM]: 'CARD_COMMON_EARTHWORM',
            [enums_1.CardId.DUNG_BEETLE]: 'CARD_DUNG_BEETLE',
            [enums_1.CardId.SOIL_BACTERIA]: 'CARD_SOIL_BACTERIA',
            [enums_1.CardId.DECOMPOSER_MUSHROOM]: 'CARD_DECOMPOSER_MUSHROOM',
            [enums_1.CardId.DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA]: 'CARD_DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA',
            [enums_1.CardId.IRON_SPRING_BACTERIA]: 'CARD_IRON_SPRING_BACTERIA',
            [enums_1.CardId.MYCORRHIZAL_FUNGI]: 'CARD_MYCORRHIZAL_FUNGI',
            [enums_1.CardId.NITROGEN_FIXING_BACTERIA]: 'CARD_NITROGEN_FIXING_BACTERIA',
            [enums_1.CardId.PACIFIC_KRILL]: 'CARD_PACIFIC_KRILL',
            [enums_1.CardId.PHYTOPLANKTON]: 'CARD_PHYTOPLANKTON',
            [enums_1.CardId.ZOOPLANKTON]: 'CARD_ZOOPLANKTON',
            [enums_1.CardId.EUROPEAN_HONEY_BEE]: 'CARD_EUROPEAN_HONEY_BEE',
            [enums_1.CardId.VOLCANIC_HYDROGEN_BACTERIA]: 'CARD_VOLCANIC_HYDROGEN_BACTERIA',
            [enums_1.CardId.NITRIFYING_SOIL_BACTERIA]: 'CARD_NITRIFYING_SOIL_BACTERIA',
            [enums_1.CardId.SEDIMENT_CHEMOSYNTHETIC_BACTERIA]: 'CARD_SEDIMENT_CHEMOSYNTHETIC_BACTERIA',
        };
    }
    return CARD_ID_TO_NAME_ID_MAP;
}
/**
 * Get reverse map for nameId to CardId lookups
 */
function getNameIdToCardIdMap() {
    const cardMapping = getCardMapping();
    return Object.fromEntries(Object.entries(cardMapping).map(([cardId, nameId]) => [nameId, parseInt(cardId)]));
}
/**
 * Convert CardId (number) to nameId (string)
 * Used when game logic needs to interface with data files
 */
function cardIdToNameId(cardId) {
    const mapping = getCardMapping();
    return mapping[cardId] || null;
}
/**
 * Convert nameId (string) to CardId (number)
 * Used when data files need to interface with game logic
 */
function nameIdToCardId(nameId) {
    const mapping = getNameIdToCardIdMap();
    return mapping[nameId] || null;
}
/**
 * Validate that a CardId exists in the system
 */
function isValidCardId(cardId) {
    const mapping = getCardMapping();
    return cardId in mapping;
}
/**
 * Validate that a nameId exists in the system
 */
function isValidNameId(nameId) {
    const mapping = getNameIdToCardIdMap();
    return nameId in mapping;
}
/**
 * Get all valid CardIds in the system
 */
function getAllCardIds() {
    const mapping = getCardMapping();
    return Object.keys(mapping).map(id => parseInt(id));
}
/**
 * Get all valid nameIds in the system
 */
function getAllNameIds() {
    const mapping = getCardMapping();
    return Object.values(mapping);
}
/**
 * Batch convert array of CardIds to nameIds
 */
function cardIdsToNameIds(cardIds) {
    return cardIds.map(cardIdToNameId).filter((nameId) => nameId !== null);
}
/**
 * Batch convert array of nameIds to CardIds
 */
function nameIdsToCardIds(nameIds) {
    return nameIds.map(nameIdToCardId).filter((cardId) => cardId !== null);
}
/**
 * Get collection statistics from cards_owned
 */
function getCollectionStats(cardsOwned) {
    const ownedSpecies = Object.keys(cardsOwned).length;
    const totalCards = Object.values(cardsOwned).reduce((sum, card) => sum + (card.quantity || 0), 0);
    return { ownedSpecies, totalCards };
}
/**
 * Check if a card is owned by nameId
 */
function isCardOwnedByNameId(nameId, cardsOwned) {
    const cardId = nameIdToCardId(nameId);
    return cardId ? !!cardsOwned[cardId] : false;
}
/**
 * Get ownership data for a card by nameId
 */
function getCardOwnershipByNameId(nameId, cardsOwned) {
    const cardId = nameIdToCardId(nameId);
    return cardId ? cardsOwned[cardId] || null : null;
}
// Legacy function names for backward compatibility - will be removed in future versions
exports.isSpeciesOwned = isCardOwnedByNameId;
exports.getSpeciesOwnership = getCardOwnershipByNameId;
/**
 * Get the display name for a card using localization
 * This is the proper way to get user-facing card names
 */
function getCardDisplayName(card, localization) {
    try {
        return localization.getCardName(card.nameId);
    }
    catch (error) {
        console.warn(`Failed to get localized name for ${card.nameId}:`, error);
        // Fallback: convert nameId to readable format
        return card.nameId.replace('CARD_', '').replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}
//# sourceMappingURL=cardIdHelpers.js.map