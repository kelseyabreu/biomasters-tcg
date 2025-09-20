-- Migration 013: Add Matchmaking System
-- Extends existing schema with matchmaking queue and rating system
-- Builds on existing users table and game_sessions infrastructure

-- Extend users table with rating fields (leverages existing eco_credits/xp_points pattern)
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_rating INTEGER DEFAULT 1000 CHECK (current_rating >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS peak_rating INTEGER DEFAULT 1000 CHECK (peak_rating >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0 CHECK (games_played >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0 CHECK (games_won >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0 CHECK (win_streak >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_season VARCHAR(50) DEFAULT 'season_1';

-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p')),
    rating INTEGER NOT NULL DEFAULT 1000,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
    
    -- Ensure user can only be in one queue at a time
    UNIQUE(user_id)
);

-- Create indexes for efficient matchmaking queries
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_mode ON matchmaking_queue(game_mode);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_rating ON matchmaking_queue(rating);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_expires ON matchmaking_queue(expires_at);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created ON matchmaking_queue(created_at);

-- Create composite index for efficient matchmaking
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode_rating ON matchmaking_queue(game_mode, rating);

-- Create indexes for user rating fields
CREATE INDEX IF NOT EXISTS idx_users_current_rating ON users(current_rating);
CREATE INDEX IF NOT EXISTS idx_users_peak_rating ON users(peak_rating);
CREATE INDEX IF NOT EXISTS idx_users_games_played ON users(games_played);
CREATE INDEX IF NOT EXISTS idx_users_win_streak ON users(win_streak);
CREATE INDEX IF NOT EXISTS idx_users_current_season ON users(current_season);

-- Update existing users with default rating values
UPDATE users SET 
    current_rating = COALESCE(current_rating, 1000),
    peak_rating = COALESCE(peak_rating, 1000),
    games_played = COALESCE(games_played, 0),
    games_won = COALESCE(games_won, 0),
    win_streak = COALESCE(win_streak, 0),
    current_season = COALESCE(current_season, 'season_1')
WHERE current_rating IS NULL 
   OR peak_rating IS NULL 
   OR games_played IS NULL 
   OR games_won IS NULL 
   OR win_streak IS NULL 
   OR current_season IS NULL;

-- Add comments for documentation
COMMENT ON TABLE matchmaking_queue IS 'Queue for players looking for online matches';
COMMENT ON COLUMN matchmaking_queue.game_mode IS 'Type of game mode player is queuing for';
COMMENT ON COLUMN matchmaking_queue.rating IS 'Player rating for matchmaking purposes';
COMMENT ON COLUMN matchmaking_queue.preferences IS 'Player preferences for matchmaking (JSON)';
COMMENT ON COLUMN matchmaking_queue.expires_at IS 'When this queue entry expires';

COMMENT ON COLUMN users.current_rating IS 'Current ELO rating for competitive play';
COMMENT ON COLUMN users.peak_rating IS 'Highest rating ever achieved';
COMMENT ON COLUMN users.games_played IS 'Total number of competitive games played';
COMMENT ON COLUMN users.games_won IS 'Total number of competitive games won';
COMMENT ON COLUMN users.win_streak IS 'Current consecutive wins';
COMMENT ON COLUMN users.current_season IS 'Current competitive season identifier';
