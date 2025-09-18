/**
 * Card ID Helper Functions - Shared Module
 * Utilities to convert between CardId (numbers) and nameId (strings)
 * This provides a clean interface between game logic (uses CardId) and data files (use nameId)
 * 
 * SINGLE SOURCE OF TRUTH for all card ID mappings across frontend, server, and shared modules
 */

import { CardId } from '../enums';

/**
 * Dynamic mapping cache for cardId to nameId
 */
let CARD_ID_TO_NAME_ID_MAP: Record<number, string> | null = null;

/**
 * Initialize the card mapping from the cards data
 * This ensures we have a complete mapping for all cards in the system
 */
export function initializeCardMapping(cardsData: Array<{ cardId: number; nameId: string }>): void {
  if (CARD_ID_TO_NAME_ID_MAP === null) {
    CARD_ID_TO_NAME_ID_MAP = {};
    cardsData.forEach(card => {
      CARD_ID_TO_NAME_ID_MAP![card.cardId] = card.nameId;
    });
    console.log(`🗺️ Initialized card mapping with ${cardsData.length} cards`);
  }
}

/**
 * Get the card mapping, initializing it if necessary
 */
function getCardMapping(): Record<number, string> {
  if (CARD_ID_TO_NAME_ID_MAP === null) {
    // Fallback to basic mapping if not initialized
    console.warn('⚠️ Card mapping not initialized, using fallback mapping');
    return {
      [CardId.OAK_TREE]: 'CARD_OAK_TREE',
      [CardId.GIANT_KELP]: 'CARD_GIANT_KELP',
      [CardId.REED_CANARY_GRASS]: 'CARD_REED_CANARY_GRASS',
      [CardId.EUROPEAN_RABBIT]: 'CARD_EUROPEAN_RABBIT',
      [CardId.SOCKEYE_SALMON]: 'CARD_SOCKEYE_SALMON',
      [CardId.AMERICAN_BLACK_BEAR]: 'CARD_AMERICAN_BLACK_BEAR',
      [CardId.GREAT_WHITE_SHARK]: 'CARD_GREAT_WHITE_SHARK',
      [CardId.MYCENA_MUSHROOM]: 'CARD_MYCENA_MUSHROOM',
      [CardId.TURKEY_VULTURE]: 'CARD_TURKEY_VULTURE',
      [CardId.DEER_TICK]: 'CARD_DEER_TICK',
      [CardId.COMMON_EARTHWORM]: 'CARD_COMMON_EARTHWORM',
      [CardId.DUNG_BEETLE]: 'CARD_DUNG_BEETLE',
      [CardId.SOIL_BACTERIA]: 'CARD_SOIL_BACTERIA',
      [CardId.DECOMPOSER_MUSHROOM]: 'CARD_DECOMPOSER_MUSHROOM',
      [CardId.DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA]: 'CARD_DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA',
      [CardId.IRON_SPRING_BACTERIA]: 'CARD_IRON_SPRING_BACTERIA',
      [CardId.MYCORRHIZAL_FUNGI]: 'CARD_MYCORRHIZAL_FUNGI',
      [CardId.NITROGEN_FIXING_BACTERIA]: 'CARD_NITROGEN_FIXING_BACTERIA',
      [CardId.PACIFIC_KRILL]: 'CARD_PACIFIC_KRILL',
      [CardId.PHYTOPLANKTON]: 'CARD_PHYTOPLANKTON',
      [CardId.ZOOPLANKTON]: 'CARD_ZOOPLANKTON',
      [CardId.EUROPEAN_HONEY_BEE]: 'CARD_EUROPEAN_HONEY_BEE',
      [CardId.VOLCANIC_HYDROGEN_BACTERIA]: 'CARD_VOLCANIC_HYDROGEN_BACTERIA',
      [CardId.NITRIFYING_SOIL_BACTERIA]: 'CARD_NITRIFYING_SOIL_BACTERIA',
      [CardId.SEDIMENT_CHEMOSYNTHETIC_BACTERIA]: 'CARD_SEDIMENT_CHEMOSYNTHETIC_BACTERIA',
    };
  }
  return CARD_ID_TO_NAME_ID_MAP;
}

/**
 * Get reverse map for nameId to CardId lookups
 */
function getNameIdToCardIdMap(): Record<string, number> {
  const cardMapping = getCardMapping();
  return Object.fromEntries(
    Object.entries(cardMapping).map(([cardId, nameId]) => [nameId, parseInt(cardId)])
  );
}

/**
 * Convert CardId (number) to nameId (string)
 * Used when game logic needs to interface with data files
 */
export function cardIdToNameId(cardId: number): string | null {
  const mapping = getCardMapping();
  return mapping[cardId] || null;
}

/**
 * Convert nameId (string) to CardId (number)
 * Used when data files need to interface with game logic
 */
export function nameIdToCardId(nameId: string): number | null {
  const mapping = getNameIdToCardIdMap();
  return mapping[nameId] || null;
}



/**
 * Validate that a CardId exists in the system
 */
export function isValidCardId(cardId: number): boolean {
  const mapping = getCardMapping();
  return cardId in mapping;
}

/**
 * Validate that a nameId exists in the system
 */
export function isValidNameId(nameId: string): boolean {
  const mapping = getNameIdToCardIdMap();
  return nameId in mapping;
}

/**
 * Get all valid CardIds in the system
 */
export function getAllCardIds(): number[] {
  const mapping = getCardMapping();
  return Object.keys(mapping).map(id => parseInt(id));
}

/**
 * Get all valid nameIds in the system
 */
export function getAllNameIds(): string[] {
  const mapping = getCardMapping();
  return Object.values(mapping);
}

/**
 * Batch convert array of CardIds to nameIds
 */
export function cardIdsToNameIds(cardIds: number[]): string[] {
  return cardIds.map(cardIdToNameId).filter((nameId): nameId is string => nameId !== null);
}

/**
 * Batch convert array of nameIds to CardIds
 */
export function nameIdsToCardIds(nameIds: string[]): number[] {
  return nameIds.map(nameIdToCardId).filter((cardId): cardId is number => cardId !== null);
}

/**
 * Get collection statistics from cards_owned
 */
export function getCollectionStats(cardsOwned: Record<number, any>): {
  ownedSpecies: number;
  totalCards: number;
} {
  const ownedSpecies = Object.keys(cardsOwned).length;
  const totalCards = Object.values(cardsOwned).reduce((sum, card: any) => sum + (card.quantity || 0), 0);
  return { ownedSpecies, totalCards };
}

/**
 * Check if a card is owned by nameId
 */
export function isCardOwnedByNameId(nameId: string, cardsOwned: Record<number, any>): boolean {
  const cardId = nameIdToCardId(nameId);
  return cardId ? !!cardsOwned[cardId] : false;
}

/**
 * Get ownership data for a card by nameId
 */
export function getCardOwnershipByNameId(nameId: string, cardsOwned: Record<number, any>): any | null {
  const cardId = nameIdToCardId(nameId);
  return cardId ? cardsOwned[cardId] || null : null;
}



// Legacy function names for backward compatibility - will be removed in future versions
export const isSpeciesOwned = isCardOwnedByNameId;
export const getSpeciesOwnership = getCardOwnershipByNameId;

/**
 * Get the display name for a card using localization
 * This is the proper way to get user-facing card names
 */
export function getCardDisplayName(card: { nameId: string }, localization: any): string {
  try {
    return localization.getCardName(card.nameId);
  } catch (error) {
    console.warn(`Failed to get localized name for ${card.nameId}:`, error);
    // Fallback: convert nameId to readable format
    return card.nameId.replace('CARD_', '').replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

// ============================================================================
// SPECIES NAME MAPPING - Bridge between server species_name and card system
// ============================================================================

/**
 * Species name to CardId mapping
 * Maps server species_name (kebab-case) to CardId (numeric)
 * Based on the database migration mappings and starter deck service
 */
const SPECIES_NAME_TO_CARD_ID_MAP: Record<string, number> = {
  // Core starter pack species (from starterDeckService.ts)
  'oak-tree': 1,
  'kelp': 2,
  'giant-kelp': 2,
  'grass': 3,
  'reed-canary-grass': 3,
  'rabbit': 4,
  'european-rabbit': 4,
  'sea-otter': 5,
  'red-fox': 6,
  'american-black-bear': 6,
  'great-white-shark': 7,
  'mycena-mushroom': 8,
  'turkey-vulture': 9,
  'deer-tick': 10,
  'common-earthworm': 10,

  // Additional mappings from migration files
  'bear': 6,
  'fox': 6,
  'salmon': 5,
  'sockeye-salmon': 5,
  'butterfly': 34,
  'monarch-butterfly': 34,
  'deer': 47,
  'whitetailed-deer': 47,
  'wolf': 96,
  'gray-wolf': 96,
  'mouse': 73,
  'house-mouse': 73,
  'cat': 37,
  'domestic-cat': 37,
  'dog': 48,
  'domestic-dog': 48
};

/**
 * Reverse mapping: CardId to species name
 */
const CARD_ID_TO_SPECIES_NAME_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(SPECIES_NAME_TO_CARD_ID_MAP).map(([speciesName, cardId]) => [cardId, speciesName])
);

/**
 * Convert species name (kebab-case) to CardId (numeric)
 * Used when server sends species_name and frontend needs cardId
 */
export function speciesNameToCardId(speciesName: string): number | null {
  return SPECIES_NAME_TO_CARD_ID_MAP[speciesName] || null;
}

/**
 * Convert CardId (numeric) to species name (kebab-case)
 * Used when frontend has cardId and needs to send species_name to server
 */
export function cardIdToSpeciesName(cardId: number): string | null {
  return CARD_ID_TO_SPECIES_NAME_MAP[cardId] || null;
}

/**
 * Extract species name from server card instance ID
 * Handles format: "card-oak-tree-timestamp-random"
 */
export function extractSpeciesNameFromInstanceId(instanceId: string): string | null {
  if (!instanceId.startsWith('card-')) {
    return null;
  }

  const parts = instanceId.split('-');
  if (parts.length < 3) {
    return null;
  }

  // Find the timestamp part (first numeric part after 'card-')
  const timestampIndex = parts.findIndex((part, index) => index > 0 && /^\d+$/.test(part));
  if (timestampIndex <= 1) {
    return null;
  }

  // Join the parts between 'card-' and timestamp
  return parts.slice(1, timestampIndex).join('-');
}

/**
 * Convert server card instance ID to CardId
 * Combines extraction and mapping in one step
 */
export function instanceIdToCardId(instanceId: string): number | null {
  const speciesName = extractSpeciesNameFromInstanceId(instanceId);
  return speciesName ? speciesNameToCardId(speciesName) : null;
}

/**
 * Validate that a species name exists in the mapping
 */
export function isValidSpeciesName(speciesName: string): boolean {
  return speciesName in SPECIES_NAME_TO_CARD_ID_MAP;
}

/**
 * Get all valid species names
 */
export function getAllSpeciesNames(): string[] {
  return Object.keys(SPECIES_NAME_TO_CARD_ID_MAP);
}

/**
 * Get species name to CardId mapping for debugging
 */
export function getSpeciesNameMapping(): Record<string, number> {
  return { ...SPECIES_NAME_TO_CARD_ID_MAP };
}
