-- Biomasters TCG MVP Database Schema
-- Refined schema following the analysis for lean, powerful starting point

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE acquisition_method AS ENUM ('starter', 'pack', 'redeem', 'reward', 'admin_grant');
CREATE TYPE transaction_type AS ENUM ('in_app_purchase', 'pack_purchase', 'reward', 'redemption', 'admin_grant');

-- 1. Users table - Core user accounts
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    eco_credits INT NOT NULL DEFAULT 100, -- Start with some currency
    xp_points INT NOT NULL DEFAULT 0,
    last_reward_claimed_at TIMESTAMPTZ, -- For daily rewards later
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Cards table - The Collection (references JSON files)
CREATE TABLE IF NOT EXISTS user_cards (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file (e.g., 'bear', 'tiger')
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    acquired_via acquisition_method NOT NULL DEFAULT 'starter',
    first_acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, species_name)
);

-- 3. Decks table - Saved deck configurations
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Deck Cards table - Cards in each deck (references JSON files)
CREATE TABLE IF NOT EXISTS deck_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file
    position_in_deck INT DEFAULT 0
);

-- 5. Redemption Codes table - Physical card integration (references JSON files)
CREATE TABLE IF NOT EXISTS redemption_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ
);

-- 6. Transactions table - The Economy Ledger
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    description VARCHAR(255),
    eco_credits_change INT NOT NULL, -- Can be positive (gain) or negative (spend)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_species_name ON user_cards(species_name);
CREATE INDEX IF NOT EXISTS idx_user_cards_acquired_at ON user_cards(first_acquired_at);

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_species_name ON deck_cards(species_name);

CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_species_name ON redemption_codes(species_name);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_is_redeemed ON redemption_codes(is_redeemed);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
