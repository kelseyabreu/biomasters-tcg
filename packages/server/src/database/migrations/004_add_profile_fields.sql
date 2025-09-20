-- Migration: Add profile fields to users table
-- Date: 2024-01-XX
-- Description: Add bio, location, favorite_species, and notification preference fields

-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS favorite_species VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_public_profile ON users(is_public_profile);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location) WHERE location IS NOT NULL;

-- Update the schema version
-- Note: This would be handled by a proper migration system in production
