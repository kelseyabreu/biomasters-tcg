-- Migration 036: Add Worker Management Schema
-- Adds session ownership and staleness tracking for distributed game workers
-- Implements the worker lease system for session ownership
-- Created: 2025-01-19

-- Step 1: Add session ownership and staleness tracking to game_sessions
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS owner_worker_id VARCHAR(50);
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create session recovery log for monitoring/debugging
CREATE TABLE IF NOT EXISTS session_recovery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    old_worker_id VARCHAR(50),
    new_worker_id VARCHAR(50),
    recovery_reason VARCHAR(50), -- lease_expired, worker_dead, graceful_transfer
    recovery_action VARCHAR(50), -- resumed, force_ended, transferred
    session_age_seconds INTEGER, -- how long session existed when recovered
    recovery_time_ms INTEGER,    -- how long recovery took
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create action logging for debugging and anti-cheat
CREATE TABLE IF NOT EXISTS game_action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    player_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB,
    worker_id VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_owner_active 
ON game_sessions(owner_worker_id, status);

CREATE INDEX IF NOT EXISTS idx_game_sessions_stale 
ON game_sessions(status, last_action_at);

CREATE INDEX IF NOT EXISTS idx_game_sessions_lease_expires 
ON game_sessions(lease_expires_at) 
WHERE lease_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recovery_log_session 
ON session_recovery_log(session_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_game_action_log_session 
ON game_action_log(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_game_action_log_worker 
ON game_action_log(worker_id, created_at);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN game_sessions.owner_worker_id IS 'ID of the worker process that owns this session';
COMMENT ON COLUMN game_sessions.lease_expires_at IS 'When the worker lease expires (60 second TTL)';
COMMENT ON COLUMN game_sessions.last_action_at IS 'Last time any game action was processed';
COMMENT ON COLUMN game_sessions.last_heartbeat_at IS 'Last worker heartbeat timestamp';

COMMENT ON TABLE session_recovery_log IS 'Log of session recovery events for monitoring';
COMMENT ON TABLE game_action_log IS 'Log of all game actions for debugging and anti-cheat';

-- Step 6: Update existing records with default values
UPDATE game_sessions 
SET last_action_at = updated_at 
WHERE last_action_at IS NULL;

UPDATE game_sessions 
SET last_heartbeat_at = updated_at 
WHERE last_heartbeat_at IS NULL;
