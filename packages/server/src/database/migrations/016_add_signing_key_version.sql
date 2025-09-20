-- Migration: Add signing_key_version to device_sync_states table
-- This enables proper key versioning for offline action signature verification

-- Add signing_key_version column to device_sync_states table
ALTER TABLE device_sync_states 
ADD COLUMN signing_key_version INTEGER NOT NULL DEFAULT 1;

-- Create index for efficient lookups by device_id and key_version
CREATE INDEX IF NOT EXISTS idx_device_sync_states_key_version 
ON device_sync_states(device_id, signing_key_version);

-- Update existing records to have version 1
UPDATE device_sync_states 
SET signing_key_version = 1 
WHERE signing_key_version IS NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN device_sync_states.signing_key_version IS 'Version number for the signing key, incremented each time a new key is generated for the device';
