-- Migration 039: Add client_user_id tracking to device_sync_states
-- This enables stable user identity tracking across devices and auth states
-- Required for the new 3-ID architecture: clientUserId, dbUserId, firebaseUserId

-- Step 1: Add client_user_id column (nullable initially for backfill)
ALTER TABLE device_sync_states 
ADD COLUMN client_user_id UUID;

-- Step 2: Backfill existing records with generated client UUIDs
-- Each existing device_sync_state gets a unique client_user_id
UPDATE device_sync_states 
SET client_user_id = uuid_generate_v4() 
WHERE client_user_id IS NULL;

-- Step 3: Make client_user_id required (NOT NULL constraint)
ALTER TABLE device_sync_states 
ALTER COLUMN client_user_id SET NOT NULL;

-- Step 4: Create indexes for efficient lookups
CREATE INDEX idx_device_sync_states_client_user_id 
ON device_sync_states(client_user_id);

-- Index for cross-device user linking (find all devices for a client user)
CREATE INDEX idx_device_sync_states_user_client 
ON device_sync_states(user_id, client_user_id);

-- Index for user journey analytics (find user progression)
CREATE INDEX idx_device_sync_states_client_created 
ON device_sync_states(client_user_id, created_at);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN device_sync_states.client_user_id IS 
'Stable client-generated UUID that persists across auth state changes. Part of 3-ID architecture.';
