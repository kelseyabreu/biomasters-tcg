-- Migration 018: Add Missing User Cards Metadata Columns
-- Adds the missing metadata columns to user_cards table that are referenced in constraints
-- but were never actually added in previous migrations

-- Add missing metadata columns to user_cards table
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS is_foil BOOLEAN DEFAULT FALSE;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS variant VARCHAR(50);
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'mint' 
    CHECK (condition IN ('mint', 'near_mint', 'excellent', 'good', 'played', 'poor'));
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update the acquisition_method column to match the expected enum values
-- First, add the column if it doesn't exist (for compatibility)
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(50) DEFAULT 'unknown';

-- Update the check constraint for acquisition_method to match the expected values
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_acquisition_method_check;
ALTER TABLE user_cards ADD CONSTRAINT user_cards_acquisition_method_check 
    CHECK (acquisition_method IN ('pack', 'purchase', 'reward', 'physical', 'trade', 'craft', 'daily', 'achievement', 'starter', 'unknown'));

-- Rename acquired_via to acquisition_method if it exists and acquisition_method doesn't have data
DO $$
BEGIN
    -- Check if acquired_via column exists and acquisition_method is mostly empty
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_cards' AND column_name = 'acquired_via') THEN
        
        -- Update acquisition_method from acquired_via where acquisition_method is default
        UPDATE user_cards 
        SET acquisition_method = acquired_via::text 
        WHERE acquisition_method = 'unknown' OR acquisition_method IS NULL;
        
        -- Drop the old acquired_via column
        ALTER TABLE user_cards DROP COLUMN IF EXISTS acquired_via;
    END IF;
END $$;

-- Add acquired_at column if it doesn't exist (some migrations reference this)
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP DEFAULT NOW();

-- Update acquired_at from first_acquired_at if acquired_at is null
UPDATE user_cards
SET acquired_at = first_acquired_at
WHERE acquired_at IS NULL AND first_acquired_at IS NOT NULL;

-- Handle legacy species_name column - make it nullable if it exists
-- This fixes the NOT NULL constraint violation for new records
DO $$
BEGIN
    -- Check if species_name column exists and is NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_cards'
               AND column_name = 'species_name'
               AND is_nullable = 'NO') THEN

        -- Make species_name nullable to allow new records without species_name
        ALTER TABLE user_cards ALTER COLUMN species_name DROP NOT NULL;

        -- Add a default value for existing NULL species_name based on card_id
        UPDATE user_cards
        SET species_name = 'card_' || card_id::text
        WHERE species_name IS NULL AND card_id IS NOT NULL;

    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_user_cards_is_foil ON user_cards(is_foil);
CREATE INDEX IF NOT EXISTS idx_user_cards_variant ON user_cards(variant);
CREATE INDEX IF NOT EXISTS idx_user_cards_condition ON user_cards(condition);
CREATE INDEX IF NOT EXISTS idx_user_cards_acquisition_method ON user_cards(acquisition_method);

-- Ensure the unique constraint exists with the correct columns
-- Drop the old constraint if it exists
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_user_id_card_id_variant_unique;
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_user_id_card_id_variant_key;

-- Add the correct unique constraint
ALTER TABLE user_cards ADD CONSTRAINT user_cards_user_id_card_id_variant_unique 
    UNIQUE(user_id, card_id, variant);

-- Add comment for documentation
COMMENT ON TABLE user_cards IS 'User card collection with metadata support for variants, condition, and foil status';
COMMENT ON COLUMN user_cards.variant IS 'Card variant (e.g., foil, alternate art, special edition)';
COMMENT ON COLUMN user_cards.condition IS 'Physical condition of the card';
COMMENT ON COLUMN user_cards.metadata IS 'Additional card metadata as JSON';
