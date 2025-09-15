-- Migration 019: Fix species_name NOT NULL constraint
-- Fixes the legacy species_name column constraint that prevents new records

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
        
        RAISE NOTICE 'Made species_name column nullable and updated NULL values';
        
    ELSE
        RAISE NOTICE 'species_name column is already nullable or does not exist';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN user_cards.species_name IS 'Legacy species name field - nullable for backward compatibility during CardId migration';
