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
export * from './data/IServerDataLoader';
export {
  createUnifiedDataLoader,
  sharedDataLoader,
  createClientDataLoader_Factory,
  createDevelopmentDataLoader,
  createProductionDataLoader,
  createTestDataLoader
} from './data/UnifiedDataLoader';
export * from './taxonomy-mapping';

// Export unified game engine system
export type { IGameEngine, IGameEngineFactory, UnifiedGameSettings, UnifiedGameAction, UnifiedActionResult, GameEngineData } from './game-engine/IGameEngine';
export { GameMode } from './game-engine/IGameEngine';
export { BaseGameEngine } from './game-engine/BaseGameEngine';
export { TCGEngine } from './game-engine/TCGEngine';
export { PhyloEngine } from './game-engine/PhyloEngine';
export { GameEngineFactory, gameEngineFactory, createTCGEngine, createPhyloEngine } from './game-engine/GameEngineFactory';

// Export legacy engine for backward compatibility
export { BioMastersEngine } from './game-engine/BioMastersEngine';

// Export services
export * from './services/TaxonomyFilter';
export * from './services/TaxonomyDisplay';

// Export localization manager
export * from './localization-manager';

// Export AI components
export * from './ai/AIStrategy';
export * from './ai/AIStrategyFactory';

// Export text IDs and taxonomy mapping
export {
  TaxonomyDisplayId,
  SupportedLanguage,
  LANGUAGE_CONFIG,
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  AbilityDescriptionId,
  KeywordNameId,
  UITextId,
  TaxonomyId
} from './text-ids';
export type { LanguageInfo } from './text-ids';
export { TaxonomyMapper } from './taxonomy-mapping';

// Re-export commonly used combinations for convenience
export type {
  CardData,
  AbilityData,
  GameState,
  Player,
  CardInstance,
  // Consolidated GameAction types
  BaseGameAction,
  GameAction,
  PhyloGameAction,
  ClientPlayerAction,
  PlayCardAction,
  ActivateAbilityAction,
  PassTurnAction,
  PlayerReadyAction,
  ActionResult,
  GameSettings,
  MatchmakingRequest,
  MatchmakingQueueEntry,
  MatchFound,
  MatchNotification,
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
  ApiError,
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
