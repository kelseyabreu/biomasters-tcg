/**
 * BioMasters TCG - Shared Types
 * 
 * This file contains all the TypeScript types used throughout the BioMasters TCG system.
 * These types use the enums from enums.ts to ensure type safety and consistency.
 */

import {
  TrophicCategoryId,
  TrophicLevel,
  KeywordId,
  TriggerId,
  GamePhase,
  TurnPhase,
  CardZone,
  GameEndReason,
  CardId,
  AbilityId,
  UserType,
  AcquisitionMethod,
  CardCondition,
  SyncStatus,
  GameActionType,
  ValidationError,
  ApiStatus,
  ConservationStatus
} from './enums';

// ============================================================================
// CORE GAME TYPES
// ============================================================================

/**
 * Position on the game grid
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Card data structure - matches database schema
 */
export interface CardData {
  id: CardId;
  card_name: string;
  trophic_level: TrophicLevel | null;
  trophic_category_id: TrophicCategoryId | null;
  cost: string | null; // JSON string of cost requirements
  victory_points: number;
  
  // Biological data
  common_name: string | null;
  scientific_name: string | null;
  taxonomy: string | null; // JSON string
  
  // Physical characteristics
  mass_kg: number | null;
  lifespan_max_days: number | null;
  
  // Sensory capabilities
  vision_range_m: number | null;
  smell_range_m: number | null;
  hearing_range_m: number | null;
  
  // Movement capabilities
  walk_speed_m_per_hr: number | null;
  run_speed_m_per_hr: number | null;
  swim_speed_m_per_hr: number | null;
  fly_speed_m_per_hr: number | null;
  
  // Reproduction
  offspring_count: number | null;
  gestation_days: number | null;
  
  // Game metadata
  keywords: KeywordId[];
  abilities: AbilityId[];
  artwork_url: string | null;

  // IUCN Conservation Data
  conservation_status: ConservationStatus | null;
  iucn_id: string | null; // IUCN Red List species ID
  population_trend: string | null; // Increasing, Decreasing, Stable, Unknown
}

/**
 * Ability data structure
 */
export interface AbilityData {
  id: AbilityId;
  ability_name: string;
  trigger_id: TriggerId;
  effects: AbilityEffect[];
  description: string | null;
}

/**
 * Individual ability effect
 */
export interface AbilityEffect {
  type: string; // Effect type as string for flexibility
  value?: number;
  selector?: string;
  filter?: {
    trophicLevels?: TrophicLevel[];
    trophicCategories?: TrophicCategoryId[];
    keywords?: KeywordId[];
    domains?: KeywordId[];
  };
  target?: string;
}

/**
 * Cost requirement structure
 */
export interface CostRequirement {
  Requires?: {
    Category: TrophicCategoryId;
    Level: TrophicLevel;
    Count: number;
  }[];
  Energy?: number; // Legacy - being phased out
}

/**
 * Card instance on the game board
 */
export interface CardInstance {
  id: string; // Unique instance ID (e.g., "1_algae1")
  cardId: CardId;
  ownerId: string;
  position: Position;
  isExhausted: boolean;
  isReady: boolean;
  attachedCards: string[]; // IDs of cards attached to this one
  modifiers: CardModifier[];
  zone: CardZone;
}

/**
 * Temporary card modifiers
 */
export interface CardModifier {
  id: string;
  type: string;
  value: number;
  duration: number; // -1 for permanent
  source: string; // ID of the card/ability that applied this
}

/**
 * Player data structure
 */
export interface Player {
  id: string;
  name: string;
  hand: string[]; // Card instance IDs
  deck: string[]; // Card instance IDs
  scorePile: string[]; // Card instance IDs
  energy: number;
  isReady: boolean;
  actionsRemaining: number;
}

/**
 * Game state structure
 */
export interface GameState {
  gameId: string;
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number;
  turnNumber: number;
  grid: Map<string, CardInstance>; // Position key (x,y) -> CardInstance
  detritus: CardInstance[]; // Cards in the detritus zone
  gameSettings: GameSettings;
  metadata: GameMetadata;
  winner?: string;
  endReason?: GameEndReason;
}

/**
 * Game settings
 */
export interface GameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  turnTimeLimit: number; // seconds
}

/**
 * Game metadata
 */
export interface GameMetadata {
  createdAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  totalTurns?: number;
  [key: string]: any;
}

// ============================================================================
// GAME ACTION TYPES
// ============================================================================

/**
 * Base game action structure
 */
export interface GameAction {
  type: GameActionType;
  playerId: string;
  payload: any;
  timestamp?: Date;
}

/**
 * Play card action
 */
export interface PlayCardAction extends GameAction {
  type: GameActionType.PLAY_CARD;
  payload: {
    cardId: string;
    position: Position;
  };
}

/**
 * Activate ability action
 */
export interface ActivateAbilityAction extends GameAction {
  type: GameActionType.ACTIVATE_ABILITY;
  payload: {
    cardId: string;
    abilityId: AbilityId;
    target?: string;
    position?: Position;
  };
}

/**
 * Pass turn action
 */
export interface PassTurnAction extends GameAction {
  type: GameActionType.PASS_TURN;
  payload: {};
}

/**
 * Player ready action
 */
export interface PlayerReadyAction extends GameAction {
  type: GameActionType.PLAYER_READY;
  payload: {};
}

/**
 * Game action result
 */
export interface ActionResult {
  isValid: boolean;
  errorMessage?: string;
  newState?: GameState;
  effects?: GameEffect[];
}

/**
 * Game effect (visual/audio feedback)
 */
export interface GameEffect {
  type: string;
  target?: string;
  position?: Position;
  value?: number;
  duration?: number;
}

// ============================================================================
// USER & COLLECTION TYPES
// ============================================================================

/**
 * User account data
 */
export interface User {
  id: string;
  firebase_uid?: string;
  email?: string;
  username?: string;
  is_guest: boolean;
  user_type: UserType;
  created_at: Date;
  last_login?: Date;
}

/**
 * User's card collection entry
 */
export interface UserCard {
  id: string;
  user_id: string;
  card_id: CardId;
  quantity: number;
  acquired_via: AcquisitionMethod;
  first_acquired_at: Date;
  last_acquired_at: Date;
  is_foil?: boolean;
  variant?: string;
  condition?: CardCondition;
}

/**
 * User's deck
 */
export interface UserDeck {
  id: string;
  user_id: string;
  name: string;
  cards: DeckCard[];
  is_valid: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Card in a deck
 */
export interface DeckCard {
  card_id: CardId;
  quantity: number;
  position_in_deck?: number;
}

/**
 * Booster pack data
 */
export interface BoosterPack {
  id: string;
  pack_type: string;
  cards: CardId[];
  rarity_distribution: {
    [key in ConservationStatus]: number;
  };
  conservation_education: {
    featured_status: ConservationStatus;
    educational_message: string;
    conservation_facts: string[];
  };
  opened_at?: Date;
  total_value: number; // Based on rarity
}

/**
 * Conservation education data
 */
export interface ConservationEducation {
  status: ConservationStatus;
  percentage: number;
  pack_rarity: number;
  description: string;
  color: string;
  emoji: string;
  rarity_name: string;
  educational_facts: string[];
  action_suggestions: string[];
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Standard API response
 */
export interface ApiResponse<T = any> {
  status: ApiStatus;
  message?: string;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Search filters for cards
 */
export interface CardSearchFilters {
  name?: string;
  trophic_level?: TrophicLevel[];
  trophic_category?: TrophicCategoryId[];
  keywords?: KeywordId[];
  cost_min?: number;
  cost_max?: number;
  victory_points_min?: number;
  victory_points_max?: number;
}

// ============================================================================
// SYNC & OFFLINE TYPES
// ============================================================================

/**
 * Sync state for offline functionality
 */
export interface SyncState {
  last_sync: Date;
  status: SyncStatus;
  pending_actions: number;
  conflicts: SyncConflict[];
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  type: string;
  local_data: any;
  server_data: any;
  timestamp: Date;
}

/**
 * Offline action queue entry
 */
export interface OfflineAction {
  id: string;
  action_type: string;
  payload: any;
  timestamp: Date;
  retry_count: number;
  status: SyncStatus;
}
