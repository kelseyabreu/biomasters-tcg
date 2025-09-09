-- Biomasters TCG Database Schema
-- PostgreSQL database schema for the FIRE stack implementation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user account information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE, -- Made nullable for guest accounts
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    account_type VARCHAR(20) DEFAULT 'guest' CHECK (account_type IN ('guest', 'registered', 'premium')),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,

    -- Guest account support for lazy registration
    guest_id VARCHAR(255) UNIQUE, -- Client-generated UUID for guest accounts
    guest_secret_hash VARCHAR(255), -- Hashed secret for guest authentication
    is_guest BOOLEAN DEFAULT TRUE, -- Explicit guest flag
    needs_registration BOOLEAN DEFAULT FALSE, -- For tracking lazy registration state

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    
    -- Game profile data
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    title VARCHAR(100),
    
    -- Currency
    gems INTEGER DEFAULT 0 CHECK (gems >= 0),
    coins INTEGER DEFAULT 100 CHECK (coins >= 0),
    dust INTEGER DEFAULT 0 CHECK (dust >= 0),
    eco_credits INTEGER DEFAULT 100 CHECK (eco_credits >= 0),
    xp_points INTEGER DEFAULT 0 CHECK (xp_points >= 0),
    last_reward_claimed_at TIMESTAMP,

    -- Statistics
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    cards_collected INTEGER DEFAULT 0,
    packs_opened INTEGER DEFAULT 0,

    -- Profile fields
    bio TEXT,
    location VARCHAR(255),
    favorite_species VARCHAR(255),
    is_public_profile BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,

    -- Preferences
    preferences JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- User cards table - stores user's card collection
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    acquired_at TIMESTAMP DEFAULT NOW(),
    acquisition_method VARCHAR(50) DEFAULT 'unknown' CHECK (
        acquisition_method IN ('pack', 'purchase', 'reward', 'physical', 'trade', 'craft', 'daily', 'achievement')
    ),
    
    -- Card metadata (foil, special variants, etc.)
    is_foil BOOLEAN DEFAULT FALSE,
    variant VARCHAR(50),
    condition VARCHAR(20) DEFAULT 'mint' CHECK (
        condition IN ('mint', 'near_mint', 'excellent', 'good', 'played', 'poor')
    ),
    
    -- Metadata for special properties
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, card_id, variant)
);

-- User decks table - stores user's saved decks
CREATE TABLE IF NOT EXISTS user_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cards JSONB NOT NULL, -- Array of {cardId, quantity}
    is_valid BOOLEAN DEFAULT TRUE,
    is_favorite BOOLEAN DEFAULT FALSE,
    format VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Deck statistics
    total_cards INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    
    UNIQUE(user_id, name)
);

-- Transactions table - stores all monetary transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('purchase', 'reward', 'pack_opening', 'card_sale', 'refund', 'bonus', 'penalty')
    ),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(20) NOT NULL CHECK (currency IN ('gems', 'coins', 'dust', 'usd')),
    description TEXT,
    
    -- Items involved in transaction
    items JSONB DEFAULT '[]', -- Array of items purchased/received
    
    -- External transaction reference (for payments)
    external_transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
    ),
    
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Metadata for additional information
    metadata JSONB DEFAULT '{}'
);

-- Physical card redemptions table
CREATE TABLE IF NOT EXISTS physical_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    nfc_chip VARCHAR(255) UNIQUE,
    serial_number VARCHAR(100) NOT NULL,
    card_id INTEGER NOT NULL,
    set_id VARCHAR(50) NOT NULL,
    
    -- Redemption status
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMP,
    
    -- Validation
    is_valid BOOLEAN DEFAULT TRUE,
    expiration_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata for special properties
    metadata JSONB DEFAULT '{}'
);

-- Game sessions table - stores battle/game session data
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Game configuration
    game_mode VARCHAR(50) DEFAULT 'standard' CHECK (
        game_mode IN ('standard', 'ranked', 'casual', 'tournament', 'ai')
    ),
    format VARCHAR(50) DEFAULT 'standard',
    
    -- Game state
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('waiting', 'active', 'completed', 'abandoned', 'error')
    ),
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Decks used
    player1_deck_id UUID REFERENCES user_decks(id) ON DELETE SET NULL,
    player2_deck_id UUID REFERENCES user_decks(id) ON DELETE SET NULL,
    
    -- Game data
    game_data JSONB DEFAULT '{}', -- Complete game state and history
    turn_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Leaderboards table - stores ranking information
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    season VARCHAR(50) NOT NULL,
    leaderboard_type VARCHAR(50) DEFAULT 'ranked' CHECK (
        leaderboard_type IN ('ranked', 'tournament', 'weekly', 'monthly', 'all_time')
    ),
    
    -- Ranking data
    rank INTEGER,
    rating INTEGER DEFAULT 1000,
    peak_rating INTEGER DEFAULT 1000,
    
    -- Statistics
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    
    -- Timestamps
    season_start TIMESTAMP,
    season_end TIMESTAMP,
    last_game_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, season, leaderboard_type)
);

-- Achievements table - stores user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    
    -- Achievement data
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Rewards
    rewards JSONB DEFAULT '[]', -- Array of rewards given
    is_claimed BOOLEAN DEFAULT FALSE,
    
    unlocked_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

-- Daily rewards table - tracks daily login rewards
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL,
    
    -- Streak information
    streak_day INTEGER DEFAULT 1,
    total_streak INTEGER DEFAULT 1,
    
    -- Rewards given
    rewards JSONB NOT NULL, -- Array of rewards
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, reward_date)
);

-- Device sync state table - tracks offline signing keys and sync status
CREATE TABLE IF NOT EXISTS device_sync_states (
    device_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    signing_key VARCHAR(512) NOT NULL,
    key_expires_at TIMESTAMP NOT NULL,
    last_sync_timestamp BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync actions log - tracks processed offline actions
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON user_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_acquired_at ON user_cards(acquired_at);

CREATE INDEX IF NOT EXISTS idx_user_decks_user_id ON user_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_created_at ON user_decks(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_physical_redemptions_qr_code ON physical_redemptions(qr_code);
CREATE INDEX IF NOT EXISTS idx_physical_redemptions_redeemed_by ON physical_redemptions(redeemed_by);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player1_id ON game_sessions(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player2_id ON game_sessions(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_season ON leaderboard_entries(season);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON leaderboard_entries(rank);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_reward_date ON daily_rewards(reward_date);

CREATE INDEX IF NOT EXISTS idx_device_sync_states_user_id ON device_sync_states(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sync_states_expires ON device_sync_states(key_expires_at);

CREATE INDEX IF NOT EXISTS idx_sync_actions_log_user_id ON sync_actions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_actions_log_device_id ON sync_actions_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_actions_log_action_id ON sync_actions_log(action_id);
