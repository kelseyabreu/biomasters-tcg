/**
 * Card ID Helper Functions - Shared Module
 * Utilities to convert between CardId (numbers) and nameId (strings)
 * This provides a clean interface between game logic (uses CardId) and data files (use nameId)
 *
 * SINGLE SOURCE OF TRUTH for all card ID mappings across frontend, server, and shared modules
 */
/**
 * Initialize the card mapping from the cards data
 * This ensures we have a complete mapping for all cards in the system
 */
export declare function initializeCardMapping(cardsData: Array<{
    cardId: number;
    nameId: string;
}>): void;
/**
 * Convert CardId (number) to nameId (string)
 * Used when game logic needs to interface with data files
 */
export declare function cardIdToNameId(cardId: number): string | null;
/**
 * Convert nameId (string) to CardId (number)
 * Used when data files need to interface with game logic
 */
export declare function nameIdToCardId(nameId: string): number | null;
/**
 * Convert legacy species_name (kebab-case) to CardId (number)
 * Used for migrating old data that uses species_name format
 * @deprecated Legacy migration utility - use direct CardId system instead
 */
export declare function speciesNameToCardId_old(speciesName: string): number | null;
/**
 * Convert CardId (number) to legacy species_name (kebab-case)
 * Used for backward compatibility during migration
 * @deprecated Legacy migration utility - use direct CardId system instead
 */
export declare function cardIdToSpeciesName_old(cardId: number): string | null;
/**
 * Validate that a CardId exists in the system
 */
export declare function isValidCardId(cardId: number): boolean;
/**
 * Validate that a nameId exists in the system
 */
export declare function isValidNameId(nameId: string): boolean;
/**
 * Get all valid CardIds in the system
 */
export declare function getAllCardIds(): number[];
/**
 * Get all valid nameIds in the system
 */
export declare function getAllNameIds(): string[];
/**
 * Batch convert array of CardIds to nameIds
 */
export declare function cardIdsToNameIds(cardIds: number[]): string[];
/**
 * Batch convert array of nameIds to CardIds
 */
export declare function nameIdsToCardIds(nameIds: string[]): number[];
/**
 * Get collection statistics from cards_owned
 */
export declare function getCollectionStats(cardsOwned: Record<number, any>): {
    ownedSpecies: number;
    totalCards: number;
};
/**
 * Check if a card is owned by nameId
 */
export declare function isCardOwnedByNameId(nameId: string, cardsOwned: Record<number, any>): boolean;
/**
 * Get ownership data for a card by nameId
 */
export declare function getCardOwnershipByNameId(nameId: string, cardsOwned: Record<number, any>): any | null;
/**
 * Migration helper: Convert old collection format to new format
 * @deprecated Legacy migration utility - collections should use CardId system directly
 */
export declare function migrateCollectionToCardIds_old(oldCollection: Record<string, any>): Record<number, any>;
export declare const isSpeciesOwned: typeof isCardOwnedByNameId;
export declare const getSpeciesOwnership: typeof getCardOwnershipByNameId;
/**
 * Get the display name for a card using localization
 * This is the proper way to get user-facing card names
 */
export declare function getCardDisplayName(card: {
    nameId: string;
}, localization: any): string;
//# sourceMappingURL=cardIdHelpers.d.ts.map