-- Migration: Fix key_version column type to support timestamp values
-- The key_version field needs to be BIGINT to store timestamp values like 1758233904775

-- Fix device_signing_keys.key_version column type
ALTER TABLE device_signing_keys 
ALTER COLUMN key_version TYPE BIGINT;

-- Fix device_sync_states.current_key_version column type  
ALTER TABLE device_sync_states 
ALTER COLUMN current_key_version TYPE BIGINT;

-- Update the unique constraint to handle the new type
ALTER TABLE device_signing_keys 
DROP CONSTRAINT IF EXISTS device_signing_keys_device_id_user_id_key_version_key;

ALTER TABLE device_signing_keys 
ADD CONSTRAINT device_signing_keys_device_id_user_id_key_version_key 
UNIQUE(device_id, user_id, key_version);

-- Update comments to reflect the change
COMMENT ON COLUMN device_signing_keys.key_version IS 'Timestamp-based version number for this device signing key';
COMMENT ON COLUMN device_sync_states.current_key_version IS 'Points to the current active key version (timestamp) in device_signing_keys table';
