-- Migration: Fix device_sync_states table constraints for multi-user device support
-- This enables multiple users to use the same device with separate sync states

-- 1. Drop the existing primary key constraint on device_id only
ALTER TABLE device_sync_states DROP CONSTRAINT device_sync_states_pkey;

-- 2. Add a composite primary key on (device_id, user_id)
ALTER TABLE device_sync_states ADD CONSTRAINT device_sync_states_pkey PRIMARY KEY (device_id, user_id);

-- 3. Add an index for efficient lookups by user_id (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_device_sync_states_user_id ON device_sync_states(user_id);

-- 4. Add an index for efficient lookups by device_id
CREATE INDEX IF NOT EXISTS idx_device_sync_states_device_id ON device_sync_states(device_id);

-- 5. Add an index for efficient cleanup of expired keys
CREATE INDEX IF NOT EXISTS idx_device_sync_states_expires ON device_sync_states(key_expires_at);
