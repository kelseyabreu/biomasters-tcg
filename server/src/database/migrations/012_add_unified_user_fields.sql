-- Migration 012: Add Unified User Type Fields
-- Adds missing fields required by the unified user type system
-- Supports cross-platform functionality and enhanced user profiles

-- Add missing game economy fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS eco_credits INTEGER DEFAULT 100 CHECK (eco_credits >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0 CHECK (xp_points >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reward_claimed_at TIMESTAMP;

-- Add missing profile fields for enhanced user experience
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_species VARCHAR(255);

-- Add privacy and notification preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_eco_credits ON users(eco_credits);
CREATE INDEX IF NOT EXISTS idx_users_xp_points ON users(xp_points);
CREATE INDEX IF NOT EXISTS idx_users_last_reward_claimed ON users(last_reward_claimed_at);
CREATE INDEX IF NOT EXISTS idx_users_is_public_profile ON users(is_public_profile);

-- Update existing users with default values for new fields
UPDATE users SET 
    eco_credits = COALESCE(eco_credits, 100),
    xp_points = COALESCE(xp_points, 0),
    is_public_profile = COALESCE(is_public_profile, TRUE),
    email_notifications = COALESCE(email_notifications, TRUE),
    push_notifications = COALESCE(push_notifications, TRUE)
WHERE eco_credits IS NULL 
   OR xp_points IS NULL 
   OR is_public_profile IS NULL 
   OR email_notifications IS NULL 
   OR push_notifications IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.eco_credits IS 'Game currency for ecological actions and rewards';
COMMENT ON COLUMN users.xp_points IS 'Experience points earned through gameplay';
COMMENT ON COLUMN users.last_reward_claimed_at IS 'Timestamp of last reward claim for daily/periodic rewards';
COMMENT ON COLUMN users.bio IS 'User biography/description for public profile';
COMMENT ON COLUMN users.location IS 'User location for community features';
COMMENT ON COLUMN users.favorite_species IS 'User favorite species for personalization';
COMMENT ON COLUMN users.is_public_profile IS 'Whether user profile is visible to other players';
COMMENT ON COLUMN users.email_notifications IS 'User preference for email notifications';
COMMENT ON COLUMN users.push_notifications IS 'User preference for push notifications (mobile)';
