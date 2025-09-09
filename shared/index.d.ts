/**
 * BioMasters TCG - Shared Module Index
 *
 * This file exports all shared types and enums for use by both server and client.
 * Import from this file to get access to all shared definitions.
 *
 * Usage:
 * import { CardId, TrophicLevel, CardData, GameState } from '@biomasters/shared';
 */
export * from './enums';
export * from './types';
export * from './utils/cardIdHelpers';
export * from './data/DataLoader';
export * from './data/DataCache';
export * from './taxonomy-mapping';
export * from './services/TaxonomyFilter';
export * from './services/TaxonomyDisplay';
export { TaxonomyDisplayId } from './text-ids';
export { TaxonomyMapper } from './taxonomy-mapping';
export type { CardData, AbilityData, GameState, Player, CardInstance, GameAction, ActionResult, User, UserCard, UserDeck, ApiResponse, PaginatedResponse } from './types';
export { CardId, AbilityId, TrophicLevel, TrophicCategoryId, Domain, KeywordId, TriggerId, EffectId, SelectorId, ActionId, GamePhase, TurnPhase, GameActionType, ValidationError, ApiStatus, GAME_CONSTANTS, DOMAIN_COMPATIBILITY, TROPHIC_CONNECTIONS, TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass, TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies } from './enums';
//# sourceMappingURL=index.d.ts.map