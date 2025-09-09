/**
 * BioMasters TCG - Shared Module Index
 * 
 * This file exports all shared types and enums for use by both server and client.
 * Import from this file to get access to all shared definitions.
 * 
 * Usage:
 * import { CardId, TrophicLevel, CardData, GameState } from '@biomasters/shared';
 */

// Export all enums
export * from './enums';

// Export all types
export * from './types';

// Export shared utilities
export * from './utils/cardIdHelpers';

export * from './data/DataLoader';
export * from './data/DataCache';
export * from './taxonomy-mapping';

// Export services
export * from './services/TaxonomyFilter';
export * from './services/TaxonomyDisplay';

// Export text IDs and taxonomy mapping
export { TaxonomyDisplayId } from './text-ids';
export { TaxonomyMapper } from './taxonomy-mapping';

// Re-export commonly used combinations for convenience
export type {
  CardData,
  AbilityData,
  GameState,
  Player,
  CardInstance,
  GameAction,
  ActionResult,
  // New unified user types
  BaseUser,
  DatabaseUser,
  AuthenticatedUser,
  PublicUser,
  GuestUser,
  RegisteredUser,
  AdminUser,
  FirebaseUserData,
  GuestJWTPayload,
  AuthenticationContext,
  NewUserData,
  UserUpdateData,
  UserState,
  UserSession,

  UserCard,
  UserDeck,
  ApiResponse,
  PaginatedResponse
} from './types';

export {
  CardId,
  AbilityId,
  TrophicLevel,
  TrophicCategoryId,
  Domain,
  KeywordId,
  TriggerId,
  EffectId,
  SelectorId,
  ActionId,
  GamePhase,
  TurnPhase,
  GameActionType,
  ValidationError,
  ApiStatus,
  GAME_CONSTANTS,
  DOMAIN_COMPATIBILITY,
  TROPHIC_CONNECTIONS,
  TaxoDomain,
  TaxoKingdom,
  TaxoPhylum,
  TaxoClass,
  TaxoOrder,
  TaxoFamily,
  TaxoGenus,
  TaxoSpecies
} from './enums';
