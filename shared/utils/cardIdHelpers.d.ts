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