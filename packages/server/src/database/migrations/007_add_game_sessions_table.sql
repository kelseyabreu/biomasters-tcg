-- Migration: Add game_sessions table for multiplayer functionality
-- Created: 2025-01-03

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('campaign', 'online', 'scenarios', 'tutorial')),
    is_private BOOLEAN NOT NULL DEFAULT false,
    max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players >= 2 AND max_players <= 4),
    current_players INTEGER NOT NULL DEFAULT 1 CHECK (current_players >= 0 AND current_players <= max_players),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
    game_state JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_mode ON game_sessions(game_mode);
CREATE INDEX IF NOT EXISTS idx_game_sessions_host_user_id ON game_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_is_private ON game_sessions(is_private);

-- Create composite index for finding available sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_available ON game_sessions(status, is_private, current_players, max_players) 
WHERE status = 'waiting' AND is_private = false;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_game_sessions_updated_at
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_game_sessions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE game_sessions IS 'Game sessions for multiplayer functionality';
COMMENT ON COLUMN game_sessions.id IS 'Unique identifier for the game session';
COMMENT ON COLUMN game_sessions.host_user_id IS 'User who created the session';
COMMENT ON COLUMN game_sessions.game_mode IS 'Type of game: campaign, online, scenarios, tutorial';
COMMENT ON COLUMN game_sessions.is_private IS 'Whether the session is private (invite-only)';
COMMENT ON COLUMN game_sessions.max_players IS 'Maximum number of players allowed';
COMMENT ON COLUMN game_sessions.current_players IS 'Current number of players in the session';
COMMENT ON COLUMN game_sessions.status IS 'Current status: waiting, playing, finished, cancelled';
COMMENT ON COLUMN game_sessions.game_state IS 'Current game state as JSON';
COMMENT ON COLUMN game_sessions.settings IS 'Game settings as JSON';
