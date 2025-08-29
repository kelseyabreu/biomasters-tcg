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
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'guest';

-- Add check constraint separately (PostgreSQL doesn't allow CHECK in ADD COLUMN IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_account_type_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_account_type_check
    CHECK (account_type IN ('guest', 'registered', 'premium'));
  END IF;
END $$;

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
  ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS dust INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cards_collected INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packs_opened INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 5. Add CHECK constraints for currency columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_gems_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_gems_check CHECK (gems >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_coins_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_coins_check CHECK (coins >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_dust_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_dust_check CHECK (dust >= 0);
  END IF;
END $$;

-- 6. Add indexes for guest account lookups
CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_users_needs_registration ON users(needs_registration);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- 7. Add constraint to ensure either firebase_uid OR guest_id is present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_user_identity'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT check_user_identity
    CHECK (
      (firebase_uid IS NOT NULL AND guest_id IS NULL) OR
      (firebase_uid IS NULL AND guest_id IS NOT NULL) OR
      (firebase_uid IS NOT NULL AND guest_id IS NOT NULL) -- For converted accounts
    );
  END IF;
END $$;

-- 8. Update existing users to be registered accounts (not guests)
UPDATE users 
SET is_guest = FALSE, 
    account_type = 'registered',
    needs_registration = FALSE
WHERE firebase_uid IS NOT NULL;

-- 9. Create offline action queue table for guest sync
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

-- 10. Create device sync state table - tracks offline signing keys and sync status
CREATE TABLE IF NOT EXISTS device_sync_states (
    device_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    signing_key VARCHAR(512) NOT NULL,
    key_expires_at TIMESTAMP NOT NULL,
    last_sync_timestamp BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_sync_states_user_id ON device_sync_states(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sync_states_expires ON device_sync_states(key_expires_at);

-- 11. Create sync actions log - tracks processed offline actions
CREATE TABLE IF NOT EXISTS sync_actions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    action_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'conflict', 'rejected')),
    conflict_reason TEXT,

    UNIQUE(user_id, action_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_actions_log_user_id ON sync_actions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_actions_log_device_id ON sync_actions_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_actions_log_status ON sync_actions_log(status);
