-- Migration 032: Add Admin User
-- Creates a system admin user with empty GUID for administrative functions

-- First, update the account_type constraint to include 'admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;
ALTER TABLE users ADD CONSTRAINT users_account_type_check
  CHECK (account_type IN ('guest', 'registered', 'premium', 'admin'));

-- Insert admin user with empty GUID
INSERT INTO users (
  id,
  firebase_uid,
  username,
  email,
  email_verified,
  display_name,
  account_type,
  is_guest,
  needs_registration,
  eco_credits,
  xp_points,
  last_reward_claimed_at,
  is_active,
  is_banned,
  ban_reason,
  level,
  experience,
  title,
  gems,
  coins,
  dust,
  games_played,
  games_won,
  cards_collected,
  packs_opened,
  bio,
  location,
  favorite_species,
  is_public_profile,
  email_notifications,
  push_notifications,
  preferences,
  last_login_at,
  guest_id,
  guest_secret_hash,
  avatar_url
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Empty GUID for admin
  'admin-system-user',                     -- Firebase UID (system identifier)
  'SystemAdmin',                           -- Username
  'biomasters.tcg@gmail.com',             -- Email
  true,                                    -- Email verified
  'BioMasters System Administrator',       -- Display name
  'admin',                                 -- Account type (admin)
  false,                                   -- Not a guest
  false,                                   -- No registration needed
  999999,                                  -- High eco credits for testing
  0,                                       -- XP points
  NULL,                                    -- Last reward claimed
  true,                                    -- Active
  false,                                   -- Not banned
  NULL,                                    -- No ban reason
  100,                                     -- Max level
  999999,                                  -- High experience
  'System Administrator',                  -- Title
  999999,                                  -- High gems
  999999,                                  -- High coins
  999999,                                  -- High dust
  0,                                       -- Games played
  0,                                       -- Games won
  0,                                       -- Cards collected
  0,                                       -- Packs opened
  'System administrator account for BioMasters TCG administrative functions.', -- Bio
  'System',                               -- Location
  NULL,                                   -- No favorite species
  false,                                  -- Private profile
  false,                                  -- No email notifications
  false,                                  -- No push notifications
  '{"admin": true, "system_user": true}', -- Preferences (JSON)
  NOW(),                                  -- Last login
  NULL,                                   -- No guest ID
  NULL,                                   -- No guest secret
  NULL                                    -- No avatar URL
) ON CONFLICT (id) DO NOTHING; -- Don't insert if already exists

-- Log admin user creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000000') THEN
    RAISE NOTICE 'Admin user created successfully with ID: 00000000-0000-0000-0000-000000000000';
  ELSE
    RAISE NOTICE 'Admin user was not created (may already exist)';
  END IF;
END $$;
