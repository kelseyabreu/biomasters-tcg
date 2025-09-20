-- Migration 015: Add Quest and Daily Reward System
-- Extends existing reward system (eco_credits, xp_points, last_reward_claimed_at)
-- Builds on existing user infrastructure for quest tracking

-- Create daily quest definitions table
CREATE TABLE IF NOT EXISTS daily_quest_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_type VARCHAR(50) NOT NULL UNIQUE, -- 'play_games', 'win_matches', 'use_species', etc.
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL, -- { "count": 3, "game_mode": "any", "species_domain": "animals" }
    rewards JSONB NOT NULL, -- { "eco_credits": 100, "xp_points": 50, "packs": 1 }
    is_active BOOLEAN DEFAULT TRUE,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user daily progress table
CREATE TABLE IF NOT EXISTS user_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quest_type VARCHAR(50) NOT NULL REFERENCES daily_quest_definitions(quest_type),
    progress JSONB DEFAULT '{}', -- { "games_played": 2, "wins": 1, "species_used": ["mammals", "birds"] }
    target_progress JSONB NOT NULL, -- Copy of requirements for historical tracking
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    rewards_granted JSONB, -- Track what rewards were actually given
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one quest per user per day
    UNIQUE(user_id, quest_date, quest_type)
);

-- Extend users table for quest tracking (builds on existing last_reward_claimed_at)
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_quest_streak INTEGER DEFAULT 0 CHECK (daily_quest_streak >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_reset DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_quests_completed INTEGER DEFAULT 0 CHECK (total_quests_completed >= 0);

-- Create indexes for efficient quest queries
CREATE INDEX IF NOT EXISTS idx_daily_quest_definitions_quest_type ON daily_quest_definitions(quest_type);
CREATE INDEX IF NOT EXISTS idx_daily_quest_definitions_is_active ON daily_quest_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_quest_definitions_difficulty ON daily_quest_definitions(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_id ON user_daily_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_quest_date ON user_daily_progress(quest_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_quest_type ON user_daily_progress(quest_type);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_is_completed ON user_daily_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_is_claimed ON user_daily_progress(is_claimed);

-- Composite indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_date ON user_daily_progress(user_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_completed ON user_daily_progress(user_id, is_completed, is_claimed);

-- Create indexes for new user quest fields
CREATE INDEX IF NOT EXISTS idx_users_daily_quest_streak ON users(daily_quest_streak);
CREATE INDEX IF NOT EXISTS idx_users_last_daily_reset ON users(last_daily_reset);
CREATE INDEX IF NOT EXISTS idx_users_total_quests_completed ON users(total_quests_completed);

-- Insert default daily quest definitions
INSERT INTO daily_quest_definitions (quest_type, name, description, requirements, rewards, difficulty_level) VALUES
('play_games', 'Daily Player', 'Play 3 games of any mode', '{"count": 3, "game_mode": "any"}', '{"eco_credits": 50, "xp_points": 25}', 1),
('win_matches', 'Victory Seeker', 'Win 2 competitive matches', '{"count": 2, "game_mode": "ranked"}', '{"eco_credits": 100, "xp_points": 50}', 2),
('use_species_variety', 'Biodiversity Champion', 'Use species from 3 different domains', '{"count": 3, "type": "domains"}', '{"eco_credits": 75, "xp_points": 40}', 2),
('play_consecutive', 'Streak Master', 'Win 3 games in a row', '{"count": 3, "type": "consecutive_wins"}', '{"eco_credits": 150, "xp_points": 75}', 3),
('use_endangered_species', 'Conservation Hero', 'Play 5 endangered species cards', '{"count": 5, "conservation_status": "endangered"}', '{"eco_credits": 200, "xp_points": 100}', 4)
ON CONFLICT (quest_type) DO NOTHING;

-- Update existing users with default quest values
UPDATE users SET 
    daily_quest_streak = COALESCE(daily_quest_streak, 0),
    last_daily_reset = COALESCE(last_daily_reset, CURRENT_DATE),
    total_quests_completed = COALESCE(total_quests_completed, 0)
WHERE daily_quest_streak IS NULL 
   OR last_daily_reset IS NULL 
   OR total_quests_completed IS NULL;

-- Create view for active daily quests
CREATE OR REPLACE VIEW active_daily_quests_view AS
SELECT 
    dqd.id,
    dqd.quest_type,
    dqd.name,
    dqd.description,
    dqd.requirements,
    dqd.rewards,
    dqd.difficulty_level
FROM daily_quest_definitions dqd
WHERE dqd.is_active = TRUE
ORDER BY dqd.difficulty_level, dqd.name;

-- Add comments for documentation
COMMENT ON TABLE daily_quest_definitions IS 'Definitions for daily quest types and their requirements';
COMMENT ON TABLE user_daily_progress IS 'Individual user progress on daily quests';

COMMENT ON COLUMN daily_quest_definitions.quest_type IS 'Unique identifier for quest type';
COMMENT ON COLUMN daily_quest_definitions.requirements IS 'JSON requirements for quest completion';
COMMENT ON COLUMN daily_quest_definitions.rewards IS 'JSON rewards granted upon completion';
COMMENT ON COLUMN daily_quest_definitions.difficulty_level IS 'Quest difficulty from 1 (easy) to 5 (very hard)';

COMMENT ON COLUMN user_daily_progress.progress IS 'Current progress toward quest completion (JSON)';
COMMENT ON COLUMN user_daily_progress.target_progress IS 'Historical copy of requirements';
COMMENT ON COLUMN user_daily_progress.rewards_granted IS 'Actual rewards given (for audit trail)';

COMMENT ON COLUMN users.daily_quest_streak IS 'Consecutive days of completing daily quests';
COMMENT ON COLUMN users.last_daily_reset IS 'Last date daily quests were reset for this user';
COMMENT ON COLUMN users.total_quests_completed IS 'Total number of quests completed by user';
