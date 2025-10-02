-- Migration: Add collection version tracking for optimistic locking
-- This prevents the "last sync wins" problem by detecting concurrent modifications

-- Add collection_version column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS collection_version BIGINT DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_collection_version ON users(collection_version);

-- Add helpful comment
COMMENT ON COLUMN users.collection_version IS 'Optimistic locking version for collection sync - increments on every server-side collection change';

-- Initialize existing users to version 0
UPDATE users 
SET collection_version = 0 
WHERE collection_version IS NULL;

