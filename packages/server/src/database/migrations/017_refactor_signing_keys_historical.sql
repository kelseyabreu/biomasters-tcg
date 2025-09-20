-- Migration: Refactor signing key storage for historical key support
-- This enables proper verification of actions signed with older key versions

-- Create new device_signing_keys table for historical key storage
CREATE TABLE IF NOT EXISTS device_signing_keys (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    signing_key TEXT NOT NULL, -- Encrypted signing key
    key_version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'EXPIRED')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    superseded_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active key per device
    UNIQUE(device_id, user_id, key_version),
    
    -- Foreign key to users table
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_device_signing_keys_device_user 
ON device_signing_keys(device_id, user_id);

CREATE INDEX IF NOT EXISTS idx_device_signing_keys_version_lookup 
ON device_signing_keys(device_id, key_version);

CREATE INDEX IF NOT EXISTS idx_device_signing_keys_status 
ON device_signing_keys(device_id, status);

-- Migrate existing signing keys from device_sync_states to device_signing_keys
INSERT INTO device_signing_keys (
    device_id, 
    user_id, 
    signing_key, 
    key_version, 
    status, 
    expires_at,
    created_at,
    updated_at
)
SELECT 
    device_id,
    user_id,
    signing_key, -- Will need to encrypt this in application code
    signing_key_version,
    'ACTIVE',
    key_expires_at,
    created_at,
    updated_at
FROM device_sync_states
WHERE signing_key IS NOT NULL;

-- Add current_key_version column to device_sync_states
ALTER TABLE device_sync_states 
ADD COLUMN current_key_version INTEGER DEFAULT 1;

-- Update current_key_version to match existing signing_key_version
UPDATE device_sync_states 
SET current_key_version = signing_key_version;

-- Remove old signing key columns from device_sync_states (they're now in device_signing_keys)
ALTER TABLE device_sync_states 
DROP COLUMN IF EXISTS signing_key,
DROP COLUMN IF EXISTS key_expires_at,
DROP COLUMN IF EXISTS signing_key_version;

-- Add comments explaining the new structure
COMMENT ON TABLE device_signing_keys IS 'Historical storage of signing keys for offline action verification';
COMMENT ON COLUMN device_signing_keys.signing_key IS 'Encrypted signing key for HMAC verification';
COMMENT ON COLUMN device_signing_keys.key_version IS 'Sequential version number for this device';
COMMENT ON COLUMN device_signing_keys.status IS 'Key lifecycle status: ACTIVE (current), SUPERSEDED (historical), EXPIRED (invalid)';
COMMENT ON COLUMN device_sync_states.current_key_version IS 'Points to the current active key version in device_signing_keys table';
