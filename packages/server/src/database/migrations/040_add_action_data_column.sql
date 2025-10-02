-- Migration: Add action_data column to sync_actions_log for full action reconstruction
-- This allows the server to return complete action details to clients for queue reconciliation

-- Add action_data column to store full action payload
ALTER TABLE sync_actions_log 
ADD COLUMN IF NOT EXISTS action_data JSONB;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_sync_actions_log_action_data ON sync_actions_log USING GIN (action_data);

-- Add helpful comment
COMMENT ON COLUMN sync_actions_log.action_data IS 'Full action payload for queue reconstruction - includes all action-specific data (cardId, pack_type, deck_data, battle_data, etc.)';

