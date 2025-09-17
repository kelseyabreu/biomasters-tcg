-- Migration 020: Add Pub/Sub Matchmaking System
-- Extends existing matchmaking system with Pub/Sub support
-- Adds match history and enhanced tracking

-- Add match history table for tracking completed matches
CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) NOT NULL,
    players JSONB NOT NULL, -- Array of player objects with ratings
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    duration_seconds INTEGER,
    rating_changes JSONB DEFAULT '{}', -- Rating changes for each player
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata for analytics
    metadata JSONB DEFAULT '{}'
);

-- Add matchmaking analytics table for tracking queue performance
CREATE TABLE IF NOT EXISTS matchmaking_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    game_mode VARCHAR(20) NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_matches INTEGER DEFAULT 0,
    average_wait_time_seconds INTEGER DEFAULT 0,
    peak_queue_size INTEGER DEFAULT 0,
    timeout_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_rating_difference DECIMAL(5,2) DEFAULT 0.00,
    match_quality_score DECIMAL(3,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, game_mode)
);

-- Add Pub/Sub message tracking table for debugging and monitoring
CREATE TABLE IF NOT EXISTS pubsub_message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_name VARCHAR(100) NOT NULL,
    message_id VARCHAR(255),
    player_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'received', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Extend matchmaking_queue table with additional fields for Pub/Sub
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS request_id VARCHAR(255) UNIQUE;
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE matchmaking_queue ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- Add Redis queue tracking table
CREATE TABLE IF NOT EXISTS redis_queue_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL,
    game_mode VARCHAR(20) NOT NULL,
    current_size INTEGER DEFAULT 0,
    peak_size INTEGER DEFAULT 0,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(queue_name, game_mode)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_history_session_id ON match_history(session_id);
CREATE INDEX IF NOT EXISTS idx_match_history_game_mode ON match_history(game_mode);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at);
CREATE INDEX IF NOT EXISTS idx_match_history_winner_id ON match_history(winner_id);

CREATE INDEX IF NOT EXISTS idx_matchmaking_analytics_date ON matchmaking_analytics(date);
CREATE INDEX IF NOT EXISTS idx_matchmaking_analytics_game_mode ON matchmaking_analytics(game_mode);

CREATE INDEX IF NOT EXISTS idx_pubsub_message_log_topic ON pubsub_message_log(topic_name);
CREATE INDEX IF NOT EXISTS idx_pubsub_message_log_player_id ON pubsub_message_log(player_id);
CREATE INDEX IF NOT EXISTS idx_pubsub_message_log_status ON pubsub_message_log(status);
CREATE INDEX IF NOT EXISTS idx_pubsub_message_log_created_at ON pubsub_message_log(created_at);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_request_id ON matchmaking_queue(request_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_priority ON matchmaking_queue(priority);

CREATE INDEX IF NOT EXISTS idx_redis_queue_state_queue_name ON redis_queue_state(queue_name);
CREATE INDEX IF NOT EXISTS idx_redis_queue_state_game_mode ON redis_queue_state(game_mode);

-- Add trigger to automatically update redis_queue_state updated_at
CREATE OR REPLACE FUNCTION update_redis_queue_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_redis_queue_state_updated_at
    BEFORE UPDATE ON redis_queue_state
    FOR EACH ROW
    EXECUTE FUNCTION update_redis_queue_state_updated_at();

-- Add comments for documentation
COMMENT ON TABLE match_history IS 'Historical record of completed matches';
COMMENT ON TABLE matchmaking_analytics IS 'Daily analytics for matchmaking performance';
COMMENT ON TABLE pubsub_message_log IS 'Log of Pub/Sub messages for debugging and monitoring';
COMMENT ON TABLE redis_queue_state IS 'Current state of Redis matchmaking queues';

COMMENT ON COLUMN match_history.players IS 'Array of player objects with IDs and ratings';
COMMENT ON COLUMN match_history.rating_changes IS 'Rating changes for each player after the match';
COMMENT ON COLUMN matchmaking_analytics.match_quality_score IS 'Quality score based on rating differences and wait times';
COMMENT ON COLUMN pubsub_message_log.payload IS 'Full message payload as JSON';
COMMENT ON COLUMN matchmaking_queue.request_id IS 'Unique request ID for tracking across Pub/Sub';
COMMENT ON COLUMN matchmaking_queue.priority IS 'Priority for processing (higher = more urgent)';
