-- Migration: Add guest account support for lazy registration
-- This enables the "Client-Authoritative Guest ID" architecture

-- 1. Make firebase_uid nullable to support guest accounts
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;

-- 2. Add guest-specific columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS guest_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS guest_secret_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS needs_registration BOOLEAN DEFAULT FALSE;

-- 3. Add account_type column for user classification
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'guest'
  CHECK (account_type IN ('guest', 'registered', 'premium'));

-- 4. Add additional user profile fields needed for the game
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0 CHECK (gems >= 0),
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100 CHECK (coins >= 0),
  ADD COLUMN IF NOT EXISTS dust INTEGER DEFAULT 0 CHECK (dust >= 0),
  ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cards_collected INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packs_opened INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 5. Add indexes for guest account lookups
CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_users_needs_registration ON users(needs_registration);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- 5. Add constraint to ensure either firebase_uid OR guest_id is present
ALTER TABLE users ADD CONSTRAINT check_user_identity 
  CHECK (
    (firebase_uid IS NOT NULL AND guest_id IS NULL) OR 
    (firebase_uid IS NULL AND guest_id IS NOT NULL) OR
    (firebase_uid IS NOT NULL AND guest_id IS NOT NULL) -- For converted accounts
  );

-- 6. Update existing users to be registered accounts (not guests)
UPDATE users 
SET is_guest = FALSE, 
    account_type = 'registered',
    needs_registration = FALSE
WHERE firebase_uid IS NOT NULL;

-- 7. Create offline action queue table for guest sync
CREATE TABLE IF NOT EXISTS offline_action_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_payload JSONB NOT NULL,
    action_signature VARCHAR(512), -- NULL for unsigned actions from new guests
    client_timestamp BIGINT NOT NULL,
    server_timestamp TIMESTAMP DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_actions_user_device ON offline_action_queue(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_offline_actions_processed ON offline_action_queue(is_processed);
CREATE INDEX IF NOT EXISTS idx_offline_actions_timestamp ON offline_action_queue(client_timestamp);
