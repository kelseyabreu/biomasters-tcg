/**
 * Kysely Database Types for Biomasters TCG
 * Type-safe database schema definitions
 */

import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Enum types
export type AcquisitionMethod = 'starter' | 'pack' | 'redeem' | 'reward' | 'admin_grant';
export type TransactionType = 'in_app_purchase' | 'pack_purchase' | 'reward' | 'redemption' | 'admin_grant';

// BioMasters Engine Enum types
export type TriggerType = 'ON_ACTIVATE' | 'PERSISTENT_ATTACHED' | 'ON_ENTER_PLAY' | 'ON_LEAVE_PLAY' | 'START_OF_TURN' | 'END_OF_TURN';
export type EffectType = 'TARGET' | 'TAKE_CARD' | 'APPLY_STATUS' | 'MOVE_CARD' | 'EXHAUST_TARGET' | 'READY_TARGET' | 'DESTROY_TARGET' | 'GAIN_ENERGY' | 'LOSE_ENERGY';
export type SelectorType = 'ADJACENT' | 'ADJACENT_TO_SHARED_AMPHIBIOUS' | 'CARD_IN_DETRITUS_ZONE' | 'SELF_HOST' | 'ALL_CARDS' | 'RANDOM_CARD' | 'TARGET_PLAYER';
export type ActionType = 'EXHAUST_TARGET' | 'READY_TARGET' | 'MOVE_TO_HAND' | 'MOVE_TO_DETRITUS' | 'PREVENT_READY' | 'GAIN_VP' | 'DRAW_CARD' | 'DISCARD_CARD';
export type DomainType = 'TERRESTRIAL' | 'AQUATIC' | 'AMPHIBIOUS' | 'FRESHWATER' | 'MARINE' | 'EURYHALINE';
export type TrophicCategoryType = 'PHOTOAUTOTROPH' | 'CHEMOAUTOTROPH' | 'HERBIVORE' | 'OMNIVORE' | 'CARNIVORE' | 'SAPROTROPH' | 'PARASITE' | 'MUTUALIST';

// Table interfaces
export interface UsersTable {
  id: Generated<string>;
  firebase_uid: string | null; // Nullable for guest accounts
  username: string;
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
  guest_id: string | null; // Client-generated UUID for guest accounts
  guest_secret_hash: string | null; // Hashed secret for guest authentication
  is_guest: boolean; // Explicit guest flag
  needs_registration: boolean; // For tracking lazy registration state

  // Additional user profile fields
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  experience: number;
  title: string | null;
  gems: number;
  coins: number;
  dust: number;

  // Online multiplayer fields (from migration 013)
  current_rating: number;
  peak_rating: number;
  games_played: number;
  games_won: number;
  win_streak: number;

  // Quest system fields (from migration 015)
  daily_quest_streak: number;
  last_daily_reset: Date;
  total_quests_completed: number;

  // Game statistics
  cards_collected: number;
  packs_opened: number;
  // Profile fields
  bio: string | null;
  location: string | null;
  favorite_species: string | null;
  is_public_profile: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  // User preferences and metadata
  preferences: string | null; // JSON string
  last_login_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// User decks table
export interface UserDecksTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  description: string | null;
  cards: string; // JSON string
  is_valid: boolean;
  is_favorite: boolean;
  format: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  total_cards: number;
  win_rate: number;
  games_played: number;
}

// Offline action queue for guest sync
export interface OfflineActionQueueTable {
  id: Generated<string>;
  user_id: string;
  device_id: string;
  action_type: string;
  action_payload: string; // JSON string
  action_signature: string | null; // NULL for unsigned actions from new guests
  client_timestamp: number; // Unix timestamp
  server_timestamp: Generated<Date>;
  is_processed: boolean;
  processing_error: string | null;
  created_at: Generated<Date>;
}

export interface UserCardsTable {
  id: Generated<string>; // UUID for fast retrieval
  user_id: string;
  card_id: number; // Foreign key to cards table
  quantity: number;
  acquired_via: AcquisitionMethod;
  first_acquired_at: Generated<Date>;
  last_acquired_at: Generated<Date>;
}

export interface DecksTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DeckCardsTable {
  id: Generated<string>;
  deck_id: string;
  card_id: number; // Foreign key to cards table
  position_in_deck: number;
}

export interface RedemptionCodesTable {
  id: Generated<string>;
  code: string;
  card_id: number; // Foreign key to cards table
  is_redeemed: Generated<boolean>;
  redeemed_by_user_id: string | null;
  redeemed_at: Date | null;
}

export interface TransactionsTable {
  id: Generated<string>;
  user_id: string;
  type: TransactionType;
  description: string | null;
  eco_credits_change: number;
  created_at: Generated<Date>;
}

// Add migrations table for database versioning
export interface MigrationsTable {
  id: Generated<number>;
  name: string;
  executed_at: Generated<Date>;
}

export interface DeviceSyncStatesTable {
  device_id: string; // Part of composite primary key
  user_id: string; // Part of composite primary key
  signing_key: string;
  key_expires_at: Date;
  last_sync_timestamp: number;
  last_used_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SyncActionsLogTable {
  id: Generated<string>;
  user_id: string;
  device_id: string;
  action_id: string;
  action_type: string;
  processed_at: Generated<Date>;
  status: 'success' | 'conflict' | 'rejected';
  conflict_reason: string | null;
}

// BioMasters Engine Tables
export interface TrophicCategoriesTable {
  id: Generated<number>;
  name: string;
  category_type: TrophicCategoryType;
  description: string | null;
  created_at: Generated<Date>;
}

export interface KeywordsTable {
  id: Generated<number>;
  keyword_name: string;
  keyword_type: string;
  description: string | null;
  created_at: Generated<Date>;
}

export interface TriggersTable {
  id: Generated<number>;
  trigger_name: string;
  trigger_type: TriggerType;
  description: string | null;
  created_at: Generated<Date>;
}

export interface EffectsTable {
  id: Generated<number>;
  effect_name: string;
  effect_type: EffectType;
  description: string | null;
  created_at: Generated<Date>;
}

export interface SelectorsTable {
  id: Generated<number>;
  selector_name: string;
  selector_type: SelectorType;
  description: string | null;
  created_at: Generated<Date>;
}

export interface ActionsTable {
  id: Generated<number>;
  action_name: string;
  action_type: ActionType;
  description: string | null;
  created_at: Generated<Date>;
}

export interface AbilitiesTable {
  id: Generated<number>;
  ability_name: string;
  trigger_id: number;
  effects: string; // JSONB as string
  description: string | null;
  created_at: Generated<Date>;
}

export interface ConservationStatusesTable {
  id: Generated<number>;
  status_name: string;
  percentage: number;
  pack_rarity: string;
  color: string;
  emoji: string;
  created_at: Generated<Date>;
}

export interface CardsTable {
  id: Generated<number>;
  card_name: string;
  trophic_level: number | null;
  trophic_category_id: number | null;
  conservation_status_id: number | null;
  cost: string | null; // JSONB as string
  victory_points: number;

  // Biological data
  common_name: string | null;
  scientific_name: string | null;
  taxonomy: string | null; // JSONB as string (legacy)

  // New taxonomy enum fields (hybrid system)
  taxo_domain: number | null;
  taxo_kingdom: number | null;
  taxo_phylum: number | null;
  taxo_class: number | null;
  taxo_order: number | null;
  taxo_family: number | null;
  taxo_genus: number | null;
  taxo_species: number | null;

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
  artwork_url: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CardKeywordsTable {
  card_id: number;
  keyword_id: number;
}

export interface CardAbilitiesTable {
  card_id: number;
  ability_id: number;
}

export interface LocalizationsTable {
  id: Generated<number>;
  language_code: string;
  object_type: string;
  object_id: number;
  field_name: string;
  localized_text: string;
  created_at: Generated<Date>;
}

// Game sessions table for multiplayer functionality
export interface GameSessionsTable {
  id: string; // UUID
  host_user_id: string;
  game_mode: 'campaign' | 'online' | 'scenarios' | 'tutorial';
  is_private: boolean;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  game_state: object; // JSONB object
  settings: object; // JSONB object
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Online multiplayer tables (from migrations 013-015)
export interface MatchmakingQueueTable {
  id: Generated<string>;
  user_id: string;
  game_mode: string;
  rating: number;
  preferences: string; // JSON string
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface MatchResultsTable {
  id: Generated<string>;
  session_id: string;
  player_user_id: string;
  opponent_user_id: string;
  result: 'win' | 'loss' | 'draw';
  rating_before: number;
  rating_after: number;
  rating_change: number;
  game_mode: string;
  match_duration: number | null;
  created_at: Generated<Date>;
}

export interface DailyQuestDefinitionsTable {
  quest_type: string; // Primary key
  name: string;
  description: string;
  requirements: any; // JSONB
  rewards: any; // JSONB
  is_active: boolean;
  sort_order: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface UserDailyProgressTable {
  id: Generated<string>;
  user_id: string;
  quest_date: Generated<Date>;
  quest_type: string;
  progress: any; // JSONB
  target_progress: any; // JSONB
  is_completed: boolean;
  completed_at: Date | null;
  is_claimed: boolean;
  claimed_at: Date | null;
  rewards_granted: any | null; // JSONB
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Leaderboard view (read-only)
export interface LeaderboardView {
  user_id: string;
  username: string;
  current_rating: number;
  peak_rating: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  rank: number;
}

// Database interface
export interface Database {
  users: UsersTable;
  user_cards: UserCardsTable;
  user_decks: UserDecksTable;
  decks: DecksTable;
  deck_cards: DeckCardsTable;
  redemption_codes: RedemptionCodesTable;
  transactions: TransactionsTable;
  migrations: MigrationsTable;
  device_sync_states: DeviceSyncStatesTable;
  sync_actions_log: SyncActionsLogTable;
  offline_action_queue: OfflineActionQueueTable;

  // BioMasters Engine tables
  trophic_categories: TrophicCategoriesTable;
  keywords: KeywordsTable;
  triggers: TriggersTable;
  effects: EffectsTable;
  selectors: SelectorsTable;
  actions: ActionsTable;
  abilities: AbilitiesTable;
  cards: CardsTable;
  card_keywords: CardKeywordsTable;
  card_abilities: CardAbilitiesTable;
  localizations: LocalizationsTable;
  game_sessions: GameSessionsTable;
  conservation_statuses: ConservationStatusesTable;

  // Online multiplayer tables
  matchmaking_queue: MatchmakingQueueTable;
  match_results: MatchResultsTable;
  daily_quest_definitions: DailyQuestDefinitionsTable;
  user_daily_progress: UserDailyProgressTable;
  leaderboard_view: LeaderboardView;
}

// ============================================================================
// UNIFIED USER TYPES INTEGRATION
// ============================================================================

// Import unified types from shared module
import type {
  DatabaseUser
} from '../../../shared/types';

// Helper types for CRUD operations using unified types
export type User = DatabaseUser; // Use unified DatabaseUser type
export type NewUser = Insertable<UsersTable>; // Keep Kysely type for database operations
export type UserUpdate = Updateable<UsersTable>; // Keep Kysely type for database operations

// Type adapter to convert database results to unified types
export function adaptDatabaseUserToUnified(dbUser: Selectable<UsersTable>): DatabaseUser {
  return {
    ...dbUser,
    user_type: dbUser.account_type as any, // Convert account_type to UserType enum
  };
}



// Removed Card types since we're using JSON files

export type UserCard = Selectable<UserCardsTable>;
export type NewUserCard = Insertable<UserCardsTable>;
export type UserCardUpdate = Updateable<UserCardsTable>;

export type UserDeck = Selectable<UserDecksTable>;
export type NewUserDeck = Insertable<UserDecksTable>;
export type UserDeckUpdate = Updateable<UserDecksTable>;

export type OfflineAction = Selectable<OfflineActionQueueTable>;
export type NewOfflineAction = Insertable<OfflineActionQueueTable>;
export type OfflineActionUpdate = Updateable<OfflineActionQueueTable>;

export type Deck = Selectable<DecksTable>;
export type NewDeck = Insertable<DecksTable>;
export type DeckUpdate = Updateable<DecksTable>;

export type DeckCard = Selectable<DeckCardsTable>;
export type NewDeckCard = Insertable<DeckCardsTable>;

export type RedemptionCode = Selectable<RedemptionCodesTable>;
export type NewRedemptionCode = Insertable<RedemptionCodesTable>;
export type RedemptionCodeUpdate = Updateable<RedemptionCodesTable>;

export type Transaction = Selectable<TransactionsTable>;
export type NewTransaction = Insertable<TransactionsTable>;

export type DeviceSyncState = Selectable<DeviceSyncStatesTable>;
export type NewDeviceSyncState = Insertable<DeviceSyncStatesTable>;
export type DeviceSyncStateUpdate = Updateable<DeviceSyncStatesTable>;

export type SyncActionLog = Selectable<SyncActionsLogTable>;
export type NewSyncActionLog = Insertable<SyncActionsLogTable>;

// BioMasters Engine helper types
export type TrophicCategory = Selectable<TrophicCategoriesTable>;
export type NewTrophicCategory = Insertable<TrophicCategoriesTable>;
export type TrophicCategoryUpdate = Updateable<TrophicCategoriesTable>;

export type Keyword = Selectable<KeywordsTable>;
export type NewKeyword = Insertable<KeywordsTable>;
export type KeywordUpdate = Updateable<KeywordsTable>;

export type Trigger = Selectable<TriggersTable>;
export type NewTrigger = Insertable<TriggersTable>;
export type TriggerUpdate = Updateable<TriggersTable>;

export type Effect = Selectable<EffectsTable>;
export type NewEffect = Insertable<EffectsTable>;
export type EffectUpdate = Updateable<EffectsTable>;

export type Selector = Selectable<SelectorsTable>;
export type NewSelector = Insertable<SelectorsTable>;
export type SelectorUpdate = Updateable<SelectorsTable>;

export type Action = Selectable<ActionsTable>;
export type NewAction = Insertable<ActionsTable>;
export type ActionUpdate = Updateable<ActionsTable>;

export type Ability = Selectable<AbilitiesTable>;
export type NewAbility = Insertable<AbilitiesTable>;
export type AbilityUpdate = Updateable<AbilitiesTable>;

export type Card = Selectable<CardsTable>;
export type NewCard = Insertable<CardsTable>;
export type CardUpdate = Updateable<CardsTable>;

export type CardKeyword = Selectable<CardKeywordsTable>;
export type NewCardKeyword = Insertable<CardKeywordsTable>;

export type CardAbility = Selectable<CardAbilitiesTable>;
export type NewCardAbility = Insertable<CardAbilitiesTable>;

export type Localization = Selectable<LocalizationsTable>;
export type NewLocalization = Insertable<LocalizationsTable>;
export type LocalizationUpdate = Updateable<LocalizationsTable>;

export type ConservationStatus = Selectable<ConservationStatusesTable>;
export type NewConservationStatus = Insertable<ConservationStatusesTable>;
export type ConservationStatusUpdate = Updateable<ConservationStatusesTable>;

// Online multiplayer types
export type MatchmakingQueue = Selectable<MatchmakingQueueTable>;
export type NewMatchmakingQueue = Insertable<MatchmakingQueueTable>;

export type MatchResult = Selectable<MatchResultsTable>;
export type NewMatchResult = Insertable<MatchResultsTable>;

export type DailyQuestDefinition = Selectable<DailyQuestDefinitionsTable>;
export type NewDailyQuestDefinition = Insertable<DailyQuestDefinitionsTable>;
export type DailyQuestDefinitionUpdate = Updateable<DailyQuestDefinitionsTable>;

export type UserDailyProgress = Selectable<UserDailyProgressTable>;
export type NewUserDailyProgress = Insertable<UserDailyProgressTable>;
export type UserDailyProgressUpdate = Updateable<UserDailyProgressTable>;
