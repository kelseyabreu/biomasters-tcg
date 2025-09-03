/**
 * Kysely Database Types for Biomasters TCG
 * Type-safe database schema definitions
 */

import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Enum types
export type AcquisitionMethod = 'starter' | 'pack' | 'redeem' | 'reward' | 'admin_grant';
export type TransactionType = 'in_app_purchase' | 'pack_purchase' | 'reward' | 'redemption' | 'admin_grant';

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
  // Game statistics
  games_played: number;
  games_won: number;
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
  species_name: string; // Foreign key to JSON file (e.g., 'bear', 'tiger')
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
  species_name: string; // Foreign key to JSON file
  position_in_deck: number;
}

export interface RedemptionCodesTable {
  id: Generated<string>;
  code: string;
  species_name: string; // Foreign key to JSON file
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
}

// Helper types for CRUD operations
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

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
