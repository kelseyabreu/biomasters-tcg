-- Quick fix for database constraints
-- Run this manually to fix the device_sync_states table

-- First, check if the table has the old constraint
-- If it does, we need to fix it

-- Drop the old primary key if it exists (single column)
DO $$ 
BEGIN
    -- Try to drop the old single-column primary key
    BEGIN
        ALTER TABLE device_sync_states DROP CONSTRAINT device_sync_states_pkey;
        RAISE NOTICE 'Dropped old primary key constraint';
    EXCEPTION 
        WHEN undefined_object THEN 
            RAISE NOTICE 'Old primary key constraint does not exist';
    END;
    
    -- Add the composite primary key if it doesn't exist
    BEGIN
        ALTER TABLE device_sync_states ADD CONSTRAINT device_sync_states_pkey PRIMARY KEY (device_id, user_id);
        RAISE NOTICE 'Added composite primary key constraint';
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Composite primary key already exists';
    END;
END $$;

-- Add last_used_at column if it doesn't exist
ALTER TABLE device_sync_states ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT NOW();

-- Create index for efficient queries by last_used_at
CREATE INDEX IF NOT EXISTS idx_device_sync_states_last_used_at ON device_sync_states(last_used_at);

-- Update existing records to have a last_used_at timestamp
UPDATE device_sync_states 
SET last_used_at = updated_at 
WHERE last_used_at IS NULL;

-- Verify the fix
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'device_sync_states'::regclass 
AND contype = 'p';
