-- Migration 015: Add missing end_reason and ended_at columns to game_sessions table
-- This fixes the GameWorker.forceEndSession method that expects these columns

-- Add end_reason column for tracking why a session ended
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS end_reason VARCHAR(50);

-- Add ended_at column for tracking when a session ended
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.end_reason IS 'Reason why the session ended (abandonment_timeout, connection_timeout, normal_completion, etc.)';
COMMENT ON COLUMN game_sessions.ended_at IS 'Timestamp when the session ended';

-- Create index for performance on ended sessions queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_ended_at ON game_sessions(ended_at) WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_sessions_end_reason ON game_sessions(end_reason) WHERE end_reason IS NOT NULL;
