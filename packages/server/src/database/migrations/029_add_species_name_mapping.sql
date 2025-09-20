-- Migration 029: Add Species Name Mapping to Cards Table
-- Adds species_name field to cards table for backward compatibility
-- This bridges the gap between server species_name format and card system

-- ============================================================================
-- STEP 1: Add species_name column to cards table
-- ============================================================================

-- Add optional species_name column for backward compatibility
ALTER TABLE cards ADD COLUMN IF NOT EXISTS species_name VARCHAR(255);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cards_species_name ON cards(species_name);

-- ============================================================================
-- STEP 2: Populate species_name field based on cardId mapping
-- ============================================================================

-- Update cards with species names based on the established mapping
-- This mapping comes from starterDeckService.ts and migration files
-- Note: Using 'id' column since that's the primary key in the cards table

UPDATE cards SET species_name = 'oak-tree' WHERE id = 1;
UPDATE cards SET species_name = 'kelp' WHERE id = 2;
UPDATE cards SET species_name = 'grass' WHERE id = 3;
UPDATE cards SET species_name = 'rabbit' WHERE id = 4;
UPDATE cards SET species_name = 'sea-otter' WHERE id = 5;
UPDATE cards SET species_name = 'red-fox' WHERE id = 6;
UPDATE cards SET species_name = 'great-white-shark' WHERE id = 7;
UPDATE cards SET species_name = 'mycena-mushroom' WHERE id = 8;
UPDATE cards SET species_name = 'turkey-vulture' WHERE id = 9;
UPDATE cards SET species_name = 'deer-tick' WHERE id = 10;

-- Additional mappings for extended card set
UPDATE cards SET species_name = 'common-earthworm' WHERE id = 10; -- Alternative name
UPDATE cards SET species_name = 'giant-kelp' WHERE id = 2; -- Alternative name
UPDATE cards SET species_name = 'reed-canary-grass' WHERE id = 3; -- Alternative name
UPDATE cards SET species_name = 'european-rabbit' WHERE id = 4; -- Alternative name
UPDATE cards SET species_name = 'american-black-bear' WHERE id = 6; -- Alternative name

-- Extended mappings from migration files
UPDATE cards SET species_name = 'butterfly' WHERE id = 34;
UPDATE cards SET species_name = 'monarch-butterfly' WHERE id = 34; -- Alternative
UPDATE cards SET species_name = 'deer' WHERE id = 47;
UPDATE cards SET species_name = 'whitetailed-deer' WHERE id = 47; -- Alternative
UPDATE cards SET species_name = 'wolf' WHERE id = 96;
UPDATE cards SET species_name = 'gray-wolf' WHERE id = 96; -- Alternative
UPDATE cards SET species_name = 'mouse' WHERE id = 73;
UPDATE cards SET species_name = 'house-mouse' WHERE id = 73; -- Alternative
UPDATE cards SET species_name = 'cat' WHERE id = 37;
UPDATE cards SET species_name = 'domestic-cat' WHERE id = 37; -- Alternative
UPDATE cards SET species_name = 'dog' WHERE id = 48;
UPDATE cards SET species_name = 'domestic-dog' WHERE id = 48; -- Alternative

-- ============================================================================
-- STEP 3: Add constraints and validation
-- ============================================================================

-- Add check constraint to ensure species_name follows kebab-case format
ALTER TABLE cards ADD CONSTRAINT chk_species_name_format 
CHECK (species_name IS NULL OR species_name ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ============================================================================
-- STEP 4: Update existing deck_cards to use primary species names
-- ============================================================================

-- Ensure deck_cards table uses the primary species names (not alternatives)
-- This ensures consistency with the new mapping system

-- Update any alternative names to primary names in deck_cards
UPDATE deck_cards SET species_name = 'oak-tree' WHERE species_name IN ('oak', 'oak_tree');
UPDATE deck_cards SET species_name = 'kelp' WHERE species_name IN ('giant-kelp', 'kelp-forest');
UPDATE deck_cards SET species_name = 'grass' WHERE species_name IN ('reed-canary-grass', 'riverbank-grass');
UPDATE deck_cards SET species_name = 'rabbit' WHERE species_name IN ('european-rabbit', 'field-rabbit');
UPDATE deck_cards SET species_name = 'sea-otter' WHERE species_name IN ('otter', 'sea_otter');
UPDATE deck_cards SET species_name = 'red-fox' WHERE species_name IN ('fox', 'american-red-fox');
UPDATE deck_cards SET species_name = 'great-white-shark' WHERE species_name IN ('shark', 'white-shark');
UPDATE deck_cards SET species_name = 'mycena-mushroom' WHERE species_name IN ('mushroom', 'decomposer-mushroom');
UPDATE deck_cards SET species_name = 'turkey-vulture' WHERE species_name IN ('vulture', 'scavenger-bird');
UPDATE deck_cards SET species_name = 'deer-tick' WHERE species_name IN ('tick', 'parasite-tick');

-- ============================================================================
-- STEP 5: Verification queries (for debugging)
-- ============================================================================

-- These are comments for manual verification:
-- SELECT id, card_name, species_name FROM cards WHERE species_name IS NOT NULL ORDER BY id;
-- SELECT DISTINCT species_name FROM deck_cards ORDER BY species_name;
-- SELECT COUNT(*) FROM cards WHERE species_name IS NOT NULL; -- Should show mapped cards
