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
  ConservationStatus,
  TaxoDomain,
  TaxoKingdom,
  TaxoPhylum,
  TaxoClass,
  TaxoOrder,
  TaxoFamily,
  TaxoGenus,
  TaxoSpecies
} from './enums';
import { CardNameId, ScientificNameId } from './text-ids';

// ============================================================================
// SERIALIZATION UTILITIES
// ============================================================================

/**
 * Utility functions for serializing/deserializing Maps for WebSocket transmission
 * Maps don't serialize properly to JSON, so we need custom handling
 */
export interface SerializableMap<K, V> {
  __type: 'Map';
  entries: [K, V][];
}

/**
 * Convert a Map to a serializable format
 */
export function serializeMap<K, V>(map: Map<K, V>): SerializableMap<K, V> {
  return {
    __type: 'Map',
    entries: Array.from(map.entries())
  };
}

/**
 * Convert a serializable map back to a Map
 */
export function deserializeMap<K, V>(serialized: SerializableMap<K, V>): Map<K, V> {
  return new Map(serialized.entries);
}

/**
 * Deep serialize an object, converting Maps to serializable format
 */
export function deepSerialize(obj: any): any {
  if (obj instanceof Map) {
    return serializeMap(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSerialize);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepSerialize(value);
    }
    return result;
  }
  return obj;
}

/**
 * Deep deserialize an object, converting serializable maps back to Maps
 */
export function deepDeserialize(obj: any): any {
  if (obj && typeof obj === 'object' && obj.__type === 'Map') {
    return deserializeMap(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepDeserialize);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepDeserialize(value);
    }
    return result;
  }
  return obj;
}

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
 * Card data structure - uses enum-based localization IDs
 * Implements dual-key system: id (UUID) + cardId (INTEGER)
 * Field names match JSON format (camelCase) for optimal performance
 */
export interface CardData {
  id: string;                        // UUID database primary key
  cardId: number;                    // Integer game logic identifier (enum-based)
  nameId: CardNameId;                    // Enum-based card name ID for localization
  scientificNameId: ScientificNameId;          // Enum-based scientific name ID for localization
  descriptionId: string;             // Enum-based description ID for localization
  taxonomyId: string;                // Enum-based taxonomy ID for localization

  // Species name mapping (for backward compatibility)
  speciesName?: string;              // Kebab-case species name (e.g., 'oak-tree', 'sea-otter')

  // Taxonomy for filtering (numeric enums for performance)
  taxoDomain: TaxoDomain;
  taxoKingdom: TaxoKingdom;
  taxoPhylum: TaxoPhylum;
  taxoClass: TaxoClass;
  taxoOrder: TaxoOrder;
  taxoFamily: TaxoFamily;
  taxoGenus: TaxoGenus;
  taxoSpecies: TaxoSpecies;

  // Game mechanics
  trophicLevel: TrophicLevel | null;
  trophicCategory: TrophicCategoryId | null;
  cost: string | null; // JSON string of cost requirements
  victoryPoints: number;
  
  // Physical characteristics (keeping snake_case as they match JSON)
  mass_kg: number | null;
  lifespan_max_days: number | null;

  // Sensory capabilities (keeping snake_case as they match JSON)
  vision_range_m: number | null;
  smell_range_m: number | null;
  hearing_range_m: number | null;

  // Movement capabilities (keeping snake_case as they match JSON)
  walk_speed_m_per_hr: number | null;
  run_speed_m_per_hr: number | null;
  swim_speed_m_per_hr: number | null;
  fly_speed_m_per_hr: number | null;

  // Reproduction (keeping snake_case as they match JSON)
  offspring_count: number | null;
  gestation_days: number | null;
  
  // Game metadata
  domain: number; // Domain for ecosystem compatibility (0 = HOME/universal)
  keywords: KeywordId[];
  abilities: AbilityId[];
  artwork_url: string | null;

  // IUCN Conservation Data
  conservation_status: ConservationStatus | null;
  iucn_id: string | null; // IUCN Red List species ID
  population_trend: string | null; // Increasing, Decreasing, Stable, Unknown
}

/**
 * Ability data structure - field names match JSON format (camelCase)
 */
export interface AbilityData {
  id: AbilityId;
  nameId: string;
  descriptionId: string;
  triggerId: TriggerId;
  effects: AbilityEffect[];
}

/**
 * Enhanced Ability data structure - matches database schema
 * Implements dual-key system: id (UUID) + abilityId (INTEGER)
 * Includes versioning and sync fields for comprehensive ability management
 */
export interface EnhancedAbilityData {
  id: string;                        // UUID database primary key
  abilityId: number;                 // Integer game logic identifier (enum-based)
  ability_name?: string;             // Legacy field (backward compatibility)
  nameId?: string;                   // Localization key for ability name
  descriptionId?: string;            // Localization key for description
  triggerId: number;                 // Trigger type ID
  effects: any;                      // JSONB effects data
  description?: string;              // Legacy description field
  version: number;                   // Version for sync
  isActive: boolean;                 // Whether ability is active
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Keyword data structure - matches database schema
 * Implements dual-key system: id (UUID) + keywordId (INTEGER)
 * Includes versioning and sync fields for comprehensive keyword management
 */
export interface KeywordData {
  id: string;                        // UUID database primary key
  keywordId: number;                 // Integer game logic identifier (enum-based)
  keyword_name?: string;             // Legacy field (backward compatibility)
  name?: string;                     // Keyword name
  keyword_type?: string;             // Keyword type (legacy)
  description?: string;              // Keyword description (legacy)
  version: number;                   // Version for sync
  isActive: boolean;                 // Whether keyword is active
  createdAt: Date;
  updatedAt?: Date;
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
  instanceId: string; // Legacy compatibility - same as id
  cardId: CardId;
  ownerId: string;
  position: Position;
  isExhausted: boolean;
  isReady: boolean;
  attachedCards: string[]; // IDs of cards attached to this one
  attachments: CardInstance[]; // Legacy compatibility - attached card instances
  modifiers: CardModifier[];
  statusEffects: StatusEffect[]; // Temporary effects on this card
  zone: CardZone;
  isDetritus: boolean; // For detritus tiles
  isHOME: boolean; // For HOME cards
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
 * Status effects on cards
 */
export interface StatusEffect {
  effectId: string;
  type: string;
  duration: number;
  source: string;
  metadata: Record<string, any>;
}

/**
 * Base player data structure - Core properties shared across all game modes
 */
export interface BasePlayer {
  id: string;
  name: string;
  hand: string[]; // Card instance IDs
  deck: string[]; // Card instance IDs
  isReady: boolean;
}

/**
 * TCG Player - For BioMasters TCG mode
 */
export interface TCGPlayer extends BasePlayer {
  discardPile: string[]; // Card instance IDs in discard pile
  scorePile: string[]; // Card instance IDs
  energy: number;
  actionsRemaining: number;
  field: any[]; // Cards currently in play on the field
  playedSpecies: Set<string>; // Set of species nameIds that have been played
  // Deck selection properties (online matches only)
  selectedDeckId?: string; // ID of the deck chosen for this match
  hasDeckSelected?: boolean; // Whether player has selected a deck
}

/**
 * Phylo Player - For Phylo domino-style gameplay
 */
export interface PhyloPlayer extends BasePlayer {
  discardPile: string[]; // Card IDs in player's discard pile
  score: number;
  timeRemaining?: number; // For timed games
}

/**
 * Default Player interface - TCG Player for backward compatibility
 */
export interface Player extends TCGPlayer {}

/**
 * Base game state structure - Core properties shared across all game modes
 */
export interface BaseGameState {
  gameId: string;
  currentPlayerIndex: number;
  turnNumber: number;
  metadata: GameMetadata;
  winner?: string;
  endReason?: GameEndReason;
  // Legacy compatibility properties
  currentPlayer?: number; // Alias for currentPlayerIndex
}

/**
 * TCG Game State - For BioMasters TCG mode
 */
export interface TCGGameState extends BaseGameState {
  players: TCGPlayer[];
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number;
  finalTurnTriggeredBy?: string; // Player ID who triggered final turn (deck empty)
  finalTurnPlayersRemaining?: string[]; // Players who still need their final turn
  grid: Map<string, CardInstance>; // Position key (x,y) -> CardInstance
  detritus: CardInstance[]; // Cards in the detritus zone
  gameSettings: TCGGameSettings;
  // Deck selection phase properties (online matches only)
  deckSelectionTimeRemaining?: number; // Seconds remaining for deck selection
  deckSelectionDeadline?: number; // Timestamp when deck selection ends
}

/**
 * Phylo Game State - For Phylo domino-style gameplay
 */
export interface PhyloGameState extends BaseGameState {
  players: PhyloPlayer[];
  gameBoard: any; // PhyloGameBoard - will be defined when needed
  cards: Map<string, any>; // Card map for Phylo mode
  gamePhase: 'setup' | 'playing' | 'event_reaction' | 'challenge_phase' | 'game_over';
  actionHistory: any[]; // GameAction[] - will be typed when needed
  pendingChallenges: any[]; // ScientificChallenge[] - will be typed when needed
  eventDeck: any[]; // EventCard[] - will be typed when needed
  gameSettings: PhyloGameSettings; // Override with Phylo-specific settings
  gameStats: {
    gameStartTime: number;
    totalTurns: number;
    cardsPlayed: number;
    eventsTriggered: number;
  };
  environment?: string; // Environment/habitat setting
}

/**
 * Default GameState interface - TCG GameState for backward compatibility
 */
export interface GameState extends TCGGameState {}

/**
 * Base game settings - Core properties shared across all game modes
 */
export interface BaseGameSettings {
  maxPlayers: number;
  startingHandSize: number;
  turnTimeLimit?: number; // milliseconds
}

/**
 * TCG Game settings - For BioMasters TCG mode
 */
export interface TCGGameSettings extends BaseGameSettings {
  gridWidth: number;
  gridHeight: number;
  maxHandSize: number;
  startingEnergy: number; // Starting energy for players
}

/**
 * Phylo Game settings - For Phylo domino-style gameplay
 */
export interface PhyloGameSettings extends BaseGameSettings {
  gameTimeLimit?: number; // milliseconds
  maxTurns?: number;
  eventFrequency: number; // 0-1, probability of event each turn
  allowChallenges: boolean;
  deckSize: number;
}

/**
 * Default GameSettings interface - TCG GameSettings for backward compatibility
 */
export interface GameSettings extends TCGGameSettings {}

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
 * Universal interface for all game actions across TCG and Phylo modes
 */
export interface BaseGameAction {
  type: GameActionType;
  playerId: string;
  payload: any;
  timestamp?: Date;
  id?: string; // Optional for tracking and history
}

/**
 * Standard TCG game action (extends base)
 */
export interface GameAction extends BaseGameAction {
  // TCG-specific extensions can be added here
}

/**
 * Phylo game action with additional tracking fields
 */
export interface PhyloGameAction extends Omit<BaseGameAction, 'type' | 'timestamp' | 'payload'> {
  id: string; // Required for Phylo mode
  timestamp: number; // Required as number for Phylo
  type: 'place_card' | 'move_card' | 'play_event' | 'challenge' | 'pass_turn' | 'react_to_event' | 'drop_and_draw';
  data: any; // Phylo uses 'data' instead of 'payload'
  result?: 'success' | 'failure' | 'pending';
  errorMessage?: string;
}

/**
 * Client-side action interface (for frontend use)
 */
export interface ClientPlayerAction extends BaseGameAction {
  // Inherits all base properties, no additional fields needed
}

/**
 * Play card action
 */
export interface PlayCardAction extends BaseGameAction {
  type: GameActionType.PLAY_CARD;
  payload: {
    cardId: string;
    position: Position;
  };
}

/**
 * Activate ability action
 */
export interface ActivateAbilityAction extends BaseGameAction {
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
export interface PassTurnAction extends BaseGameAction {
  type: GameActionType.PASS_TURN;
  payload: {};
}

/**
 * Drop and draw three action
 */
export interface DropAndDrawThreeAction extends BaseGameAction {
  type: GameActionType.DROP_AND_DRAW_THREE;
  payload: {
    cardIdToDiscard: string;
  };
}

/**
 * Player ready action
 */
export interface PlayerReadyAction extends BaseGameAction {
  type: GameActionType.PLAYER_READY;
  payload: {};
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

// ============================================================================
// UNIFIED USER TYPE SYSTEM
// Cross-platform support for web/iOS/Android and offline/online modes
// ============================================================================

/**
 * Core user properties shared across all contexts
 * Minimal interface for maximum compatibility across platforms
 */
export interface BaseUser {
  id: string;
  username: string;
  display_name?: string | null;
  user_type: UserType;
  is_guest: boolean;
  created_at: Date;
}

/**
 * Complete database user record (all fields from UsersTable)
 * Used for server-side operations and full user data management
 */
export interface DatabaseUser extends BaseUser {
  firebase_uid: string | null;
  email: string;
  email_verified: boolean;
  eco_credits: number;
  xp_points: number;
  last_reward_claimed_at: Date | null;
  is_active: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  account_type: string;

  // Guest account support
  guest_id: string | null;
  guest_secret_hash: string | null;
  needs_registration: boolean;

  // Profile fields
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  experience: number;
  title: string | null;
  gems: number;
  coins: number;
  dust: number;

  // Game statistics
  games_played: number;
  games_won: number;
  cards_collected: number;
  packs_opened: number;

  // Profile settings
  bio: string | null;
  location: string | null;
  favorite_species: string | null;
  is_public_profile: boolean;
  email_notifications: boolean;
  push_notifications: boolean;

  // Metadata
  preferences: string | null;
  last_login_at: Date | null;
  updated_at: Date;
}

/**
 * Authenticated user (either Firebase or Guest)
 * Used for client-side authentication state management
 * Compatible with offline/online modes
 */
export interface AuthenticatedUser extends BaseUser {
  firebase_uid?: string;
  email?: string;
  last_login?: Date;

  // Cross-platform authentication state
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  lastSyncTime?: Date;
}

/**
 * Public user profile (safe for external consumption)
 * Used for leaderboards, social features, and public APIs
 */
export interface PublicUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string;
  level: number;
  experience: number;
  title: string | null;
  games_played: number;
  games_won: number;
  cards_collected: number;
  packs_opened: number;
  created_at: Date;
}

// ============================================================================
// SPECIALIZED USER TYPES
// ============================================================================

/**
 * Guest user with authentication payload
 * Supports offline-first gameplay on all platforms
 */
export interface GuestUser extends BaseUser {
  guest_id: string;
  guest_secret?: string; // Only present during authentication
  is_guest: true;
  user_type: UserType.GUEST;

  // Offline support
  localStorageKey?: string;
  deviceId?: string; // For mobile platforms
}

/**
 * Registered user with Firebase authentication
 * Full cloud sync and cross-platform features
 */
export interface RegisteredUser extends AuthenticatedUser {
  firebase_uid: string;
  email: string;
  email_verified: boolean;
  is_guest: false;
  user_type: UserType.REGISTERED | UserType.ADMIN;
}

/**
 * Admin user with elevated privileges
 */
export interface AdminUser extends RegisteredUser {
  user_type: UserType.ADMIN;
}

// ============================================================================
// AUTHENTICATION CONTEXT TYPES
// ============================================================================

/**
 * Firebase user data
 * Standardized across web and mobile platforms
 */
export interface FirebaseUserData {
  uid: string;
  email?: string;
  email_verified?: boolean;
  displayName?: string;
  photoURL?: string;
}

/**
 * Guest JWT payload for custom authentication
 * Works offline and across platform boundaries
 */
export interface GuestJWTPayload {
  userId: string;
  guestId: string;
  isGuest: true;
  type: 'guest';
  iat?: number;
  exp?: number;
  deviceId?: string; // For mobile device binding
}

/**
 * Authentication context for Express requests
 * Unified interface for all authentication types
 */
export interface AuthenticationContext {
  user?: DatabaseUser;
  firebaseUser?: FirebaseUserData;
  guestUser?: GuestJWTPayload;
  isGuestAuth?: boolean;
  platform?: 'web' | 'ios' | 'android';
  isOffline?: boolean;
}

// ============================================================================
// DATABASE OPERATION TYPES
// ============================================================================

/**
 * User data for database insertion
 * Supports both guest and registered user creation
 * Matches the actual database schema fields
 */
export interface NewUserData {
  firebase_uid?: string | null;
  username: string;
  email: string;
  email_verified: boolean; // Required in database
  user_type?: UserType; // Optional for database insertion
  is_guest: boolean;
  guest_id?: string | null;
  guest_secret_hash?: string | null;
  account_type?: string;

  // Required database fields with defaults
  eco_credits?: number;
  xp_points?: number;
  last_reward_claimed_at?: Date | null;
  is_active?: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  needs_registration?: boolean;

  // Profile defaults
  display_name?: string | null;
  avatar_url?: string | null;
  level?: number;
  experience?: number;
  title?: string | null;
  gems?: number;
  coins?: number;
  dust?: number;

  // Game statistics defaults
  games_played?: number;
  games_won?: number;
  cards_collected?: number;
  packs_opened?: number;

  // Profile settings defaults
  bio?: string | null;
  location?: string | null;
  favorite_species?: string | null;
  is_public_profile?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;

  // Metadata
  preferences?: string | null;
}

/**
 * User data for database updates
 * Flexible interface for partial updates
 */
export interface UserUpdateData {
  username?: string;
  email?: string;
  email_verified?: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  favorite_species?: string | null;
  is_public_profile?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  preferences?: string | null;
  last_login_at?: Date | null;

  // Game progress updates
  level?: number;
  experience?: number;
  title?: string | null;
  gems?: number;
  coins?: number;
  dust?: number;
  eco_credits?: number;
  xp_points?: number;

  // Statistics updates
  games_played?: number;
  games_won?: number;
  cards_collected?: number;
  packs_opened?: number;

  // Admin fields
  is_active?: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  account_type?: string;
  needs_registration?: boolean;
}

// ============================================================================
// CROSS-PLATFORM USER STATE TYPES
// ============================================================================

/**
 * Client-side user state for state management
 * Works across web, iOS, and Android platforms
 */
export interface UserState {
  // Authentication state
  isAuthenticated: boolean;
  isGuestMode: boolean;
  userId: string | null;

  // User data
  currentUser: AuthenticatedUser | null;
  userProfile: DatabaseUser | null;

  // Platform-specific state
  firebaseUser: FirebaseUserData | null;
  guestCredentials: {
    guestId: string;
    guestSecret: string;
  } | null;

  // Sync state
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  syncConflicts: any[];

  // Platform detection
  platform: 'web' | 'ios' | 'android';
  deviceId: string | null;
}

/**
 * User session data for offline storage
 * Serializable for localStorage/AsyncStorage
 */
export interface UserSession {
  userId: string;
  username: string;
  isGuest: boolean;
  userType: UserType;
  authToken: string;
  expiresAt: Date;

  // Platform-specific data
  deviceId?: string;
  localStorageKey?: string;

  // Offline capabilities
  offlineCapable: boolean;
  lastOnlineSync?: Date;
}



/**
 * User's card collection entry (legacy)
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
  variant?: number;                  // Integer variant (see CardVariant enum)
  condition?: CardCondition;
}

/**
 * Enhanced User Collection entry - matches new database schema
 * Supports golden cards, flair levels, and sync metadata
 */
export interface UserCollection {
  id: number;                        // BIGSERIAL primary key
  user_id: string;                   // UUID reference to users
  card_id: number;                   // Integer reference to cards.card_id
  quantity: number;                  // Number of cards owned
  is_golden: boolean;                // Whether card has golden variant
  flair_level: number;               // Card flair/upgrade level (0-5)
  acquired_via: string;              // How card was acquired
  acquired_at: Date;                 // When card was first acquired
  last_synced?: Date;                // Last sync timestamp
  dirty: boolean;                    // Whether record needs sync to server
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
 * Deck selection data for online matches
 */
export interface DeckSelectionData {
  availableDecks: UserDeck[];
  timeRemaining: number; // Seconds remaining for selection
  deadline: number; // Timestamp when selection ends
  playersReady: string[]; // Player IDs who have selected decks
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
 * Unified interface for all API responses across frontend and server
 */
export interface ApiResponse<T = any> {
  // Core response fields
  status: ApiStatus;
  success: boolean; // For backward compatibility with frontend
  message?: string;
  data?: T;
  errors?: ValidationError[];
  error?: string; // Alternative error field for simple errors

  // Optional extensions for specific use cases
  user?: any; // For authentication responses
  auth?: {
    token: string;
    type: 'guest' | 'firebase';
    guestSecret?: string; // Only provided for new guest registrations
    expiresIn?: string;
  }; // For authentication responses
  sync?: any; // For sync-related responses
}

/**
 * Unified API error interface
 * Compatible with both frontend and server error handling
 */
export interface ApiError extends Error {
  // Core error fields
  code: string;
  message: string;
  status?: number; // HTTP status code
  statusCode?: number; // Alternative field name for compatibility

  // Additional error context
  details?: any;
  errors?: ValidationError[]; // For validation errors
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
 * Profile update data interface
 * Used for updating user profile information
 */
export interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  location?: string;
  favoriteSpecies?: string;
  isPublicProfile?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  username: string;
  email?: string;
  displayName?: string;
}

/**
 * Guest authentication data
 */
export interface GuestAuthData {
  guestId: string;
  guestSecret: string;
}

/**
 * Guest registration and sync data
 */
export interface GuestRegistrationData {
  guestId: string;
  actionQueue: any[];
  deviceId?: string;
  client_user_id?: string; // For 3-ID architecture tracking
}

// ============================================================================
// STANDARDIZED RESPONSE INTERFACES
// ============================================================================

/**
 * Base result interface for all operations
 * Consolidates LoadResult, ServiceResult, ActionResult patterns
 */
export interface BaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Extended result interface with metadata
 * Used for complex operations that need additional context
 */
export interface ExtendedResult<T = any> extends BaseResult<T> {
  metadata?: {
    // Common metadata fields
    timestamp?: number;
    fromCache?: boolean;

    // Game-specific metadata
    gameEnded?: boolean;
    nextPlayer?: string;
    winCondition?: any;
    triggeredEffects?: any[];

    // Sync-specific metadata
    conflicts?: any[];
    discardedActions?: string[];

    // Performance metadata
    executionTime?: number;
    cacheHit?: boolean;
  };
}

/**
 * Validation result interface
 * Used for operations that need detailed validation feedback
 */
export interface ValidationResult extends BaseResult {
  isValid: boolean; // Alias for success for backward compatibility
  errors?: ValidationError[];
  warnings?: string[];
}

/**
 * Sync result interface
 * Standardizes sync operations across the application
 */
export interface SyncResult<T = any> extends ExtendedResult<T> {
  conflicts: any[];
  discardedActions: string[];
  updatedCollection?: T;
}

/**
 * Update result interface
 * Used for background updates and file operations
 */
export interface UpdateResult extends BaseResult {
  updatedFiles: string[];
  errors: string[];
  totalSize: number;
}

/**
 * Load result interface (replaces various LoadResult definitions)
 * Standardizes data loading operations
 */
export interface LoadResult<T = any> extends BaseResult<T> {
  fromCache?: boolean;
  timestamp?: number;
}

/**
 * Service result interface (replaces ServiceResult in UnifiedGameService)
 * Standardizes service operation responses
 */
export interface ServiceResult<T = any> extends ExtendedResult<T> {
  isValid: boolean; // Alias for success for backward compatibility
  newState?: T; // Alias for data for backward compatibility
  errorMessage?: string; // Alias for error for backward compatibility
}

/**
 * Action result interface (replaces ActionResult in types.ts)
 * Standardizes game action responses
 */
export interface ActionResult<T = any> extends ExtendedResult<T> {
  isValid: boolean; // Alias for success for backward compatibility
  newState?: T; // Alias for data for backward compatibility
  errorMessage?: string; // Alias for error for backward compatibility
  effects?: GameEffect[];
}

/**
 * Image load result interface
 * Standardizes image loading operations
 */
export interface ImageLoadResult extends BaseResult {
  imagePath?: string;
}

/**
 * Pack opening result interface
 * Standardizes booster pack operations
 */
export interface PackOpeningResult<T = any> extends BaseResult<T> {
  pack?: T;
  totalValue?: number;
  rareCards?: any[];
  newSpecies?: any[];
}

// ============================================================================
// REDEMPTION SYSTEM INTERFACES
// ============================================================================

/**
 * User redemption record
 * Tracks what users have redeemed (starter decks, promo codes, etc.)
 */
export interface UserRedemption {
  id: string;                        // UUID primary key
  user_id: string;                   // UUID reference to users
  redemption_type: number;           // RedemptionType enum value
  redemption_code?: string;          // For promo codes, NULL for automatic redemptions
  redeemed_at: Date;                 // When the redemption occurred
  expires_at?: Date;                 // For time-limited redemptions
  redemption_data: Record<string, any>; // Flexible JSON data storage
  status: number;                    // RedemptionStatus enum value
}

/**
 * Redemption result interface
 * Standardizes redemption operation responses
 */
export interface RedemptionResult<T = any> extends BaseResult<T> {
  code?: string;                     // Error/success code for frontend handling
  rewards?: T[];                     // Items/cards/currency given
  redemption_id?: string;            // ID of the redemption record created
}

/**
 * User redemption status summary
 * Used by frontend to show what user can redeem
 */
export interface UserRedemptionStatus {
  starter_deck_redeemed: boolean;
  starter_pack_redeemed: boolean;
  tutorial_rewards_redeemed: boolean;
  total_redemptions: number;
  recent_redemptions: UserRedemption[];
  available_promo_codes: string[];   // Codes user hasn't redeemed yet
}

/**
 * Promo code definition
 * Defines available promotional codes and their rewards
 */
export interface PromoCode {
  id: string;
  code: string;                      // The actual code users enter
  redemption_type: number;           // RedemptionType enum value
  rewards: PromoCodeReward[];        // What the code gives
  max_redemptions?: number;          // Global limit (null = unlimited)
  max_per_user?: number;             // Per-user limit (default 1)
  expires_at?: Date;                 // When code expires
  active: boolean;                   // Whether code is currently active
  created_at: Date;
  description?: string;              // Description for admin panel
}

/**
 * Promo code reward definition
 */
export interface PromoCodeReward {
  type: 'cards' | 'currency' | 'packs' | 'items';
  item_id?: number;                  // Card ID, item ID, etc.
  quantity: number;                  // How many to give
  metadata?: Record<string, any>;    // Additional reward data
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
// MATCHMAKING & PUB/SUB TYPES
// ============================================================================

/**
 * Matchmaking request for Pub/Sub system
 */
export interface MatchmakingRequest {
  playerId: string;
  gameMode: string;
  rating: number;
  preferences: {
    maxWaitTime?: number;
    regionPreference?: string;
  };
  requestId: string;
  timestamp: number;
}

/**
 * Match found notification
 */
export interface MatchFound {
  sessionId: string;
  players: Array<{
    playerId: string;
    rating: number;
  }>;
  gameMode: string;
  estimatedStartTime: number;
}

/**
 * Matchmaking queue entry for Redis
 */
export interface MatchmakingQueueEntry {
  playerId: string;
  gameMode: string;
  rating: number;
  timestamp: number;
  preferences: Record<string, any>;
}

/**
 * Match notification payload for WebSocket
 */
export interface MatchNotification {
  sessionId: string;
  gameMode: string;
  estimatedStartTime: number;

  // For 1v1 modes
  opponent?: {
    playerId: string;
    rating: number;
    name?: string;
  };

  // For team-based modes (2v2)
  teamAssignment?: string;
  teammates?: Array<{
    playerId: string;
    rating: number;
    name?: string;
  }>;
  enemies?: Array<{
    playerId: string;
    rating: number;
    name?: string;
  }>;

  // For FFA modes
  opponents?: Array<{
    playerId: string;
    rating: number;
    name?: string;
  }>;
}

// ============================================================================

// ============================================================================
// Redis key patterns with TTLs
// Redis schema types for documentation
// Session ownership (TTL: 60s, renewed every 30s)
// sessionLease: `session:{sessionId}:lease`, // Value: `${workerId}:${expirationTimestamp}`

// Worker process health (TTL: 90s, renewed every 30s)
// workerHealth: `worker:{workerId}:health`, // Value: `${timestamp}:${ownedSessionCount}`

// Session state cache (TTL: 1 hour)
// sessionState: `session:{sessionId}:state`, // Value: JSON game state

// Turn timers (TTL: 120s - 2x turn time for safety)
// turnTimer: `timer{sessionId}:{playerId}`, // Value: timer metadata

// Orphan detection (TTL: 300s)
// orphanQueue: `orphans:pending`, // Set of session IDs needing recovery

// Action rate limiting (TTL: 60s)
// playerActions: `rate:{playerId}:{minute}`, // Value: action count

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
