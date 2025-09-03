-- Migration 005: Add last_used_at column to device_sync_states table
-- This tracks when each device was last used by each user for better device management

-- Add last_used_at column to track device usage timestamps
ALTER TABLE device_sync_states ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW();

-- Create index for efficient queries by last_used_at
CREATE INDEX IF NOT EXISTS idx_device_sync_states_last_used_at ON device_sync_states(last_used_at);

-- Update existing records to have a last_used_at timestamp
UPDATE device_sync_states 
SET last_used_at = updated_at 
WHERE last_used_at IS NULL;
