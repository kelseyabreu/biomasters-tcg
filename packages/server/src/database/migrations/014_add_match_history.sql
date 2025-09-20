-- Migration 014: Add Match History and Results
-- Extends existing game_sessions table with match results tracking
-- Builds on existing session infrastructure for comprehensive match history

-- Create match results table (extends existing game_sessions)
CREATE TABLE IF NOT EXISTS match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('ranked_1v1', 'casual_1v1', 'team_2v2', 'ffa_4p')),
    result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss', 'draw', 'forfeit')),
    rating_before INTEGER,
    rating_after INTEGER,
    rating_change INTEGER,
    duration_seconds INTEGER,
    final_score JSONB, -- Store game-specific scoring data
    ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each player has only one result per session
    UNIQUE(session_id, player_user_id)
);

-- Create comprehensive indexes for match history queries
CREATE INDEX IF NOT EXISTS idx_match_results_session_id ON match_results(session_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player_user_id ON match_results(player_user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_opponent_user_id ON match_results(opponent_user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_game_mode ON match_results(game_mode);
CREATE INDEX IF NOT EXISTS idx_match_results_result ON match_results(result);
CREATE INDEX IF NOT EXISTS idx_match_results_ended_at ON match_results(ended_at);
CREATE INDEX IF NOT EXISTS idx_match_results_rating_after ON match_results(rating_after);

-- Composite indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_match_results_player_mode ON match_results(player_user_id, game_mode);
CREATE INDEX IF NOT EXISTS idx_match_results_player_ended ON match_results(player_user_id, ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_mode_ended ON match_results(game_mode, ended_at DESC);

-- Create leaderboard view for efficient ranking queries
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.current_rating,
    u.peak_rating,
    u.games_played,
    u.games_won,
    CASE 
        WHEN u.games_played > 0 THEN ROUND((u.games_won::DECIMAL / u.games_played::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate,
    u.win_streak,
    u.current_season,
    u.last_login_at,
    ROW_NUMBER() OVER (ORDER BY u.current_rating DESC, u.peak_rating DESC) as rank
FROM users u
WHERE u.is_active = true 
  AND u.games_played > 0
ORDER BY u.current_rating DESC, u.peak_rating DESC;

-- Create recent matches view for match history
CREATE OR REPLACE VIEW recent_matches_view AS
SELECT 
    mr.id,
    mr.session_id,
    mr.player_user_id,
    p.username as player_username,
    p.display_name as player_display_name,
    mr.opponent_user_id,
    o.username as opponent_username,
    o.display_name as opponent_display_name,
    mr.game_mode,
    mr.result,
    mr.rating_before,
    mr.rating_after,
    mr.rating_change,
    mr.duration_seconds,
    mr.final_score,
    mr.ended_at,
    gs.status as session_status
FROM match_results mr
JOIN users p ON mr.player_user_id = p.id
LEFT JOIN users o ON mr.opponent_user_id = o.id
JOIN game_sessions gs ON mr.session_id = gs.id
ORDER BY mr.ended_at DESC;

-- Add comments for documentation
COMMENT ON TABLE match_results IS 'Results and statistics for completed matches';
COMMENT ON COLUMN match_results.session_id IS 'Reference to the game session';
COMMENT ON COLUMN match_results.player_user_id IS 'User who played this match';
COMMENT ON COLUMN match_results.opponent_user_id IS 'Primary opponent (for 1v1) or null for multi-player';
COMMENT ON COLUMN match_results.game_mode IS 'Type of game mode that was played';
COMMENT ON COLUMN match_results.result IS 'Outcome for this player';
COMMENT ON COLUMN match_results.rating_before IS 'Player rating before the match';
COMMENT ON COLUMN match_results.rating_after IS 'Player rating after the match';
COMMENT ON COLUMN match_results.rating_change IS 'Change in rating (+/-)';
COMMENT ON COLUMN match_results.duration_seconds IS 'Match duration in seconds';
COMMENT ON COLUMN match_results.final_score IS 'Game-specific scoring data (JSON)';

COMMENT ON VIEW leaderboard_view IS 'Ranked leaderboard with calculated statistics';
COMMENT ON VIEW recent_matches_view IS 'Recent match history with player details';
