-- Migration 031: Fix Dual Key System
-- Converts existing id columns to UUID and maintains integer game logic IDs
-- System: id (UUID) + card_id/ability_id/keyword_id (INTEGER)

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: Fix CARDS table - Convert id to UUID, keep card_id as INTEGER
-- ============================================================================

-- Remove the uuid_id column we added in migration 030
ALTER TABLE cards DROP COLUMN IF EXISTS uuid_id;

-- Add a temporary UUID column
ALTER TABLE cards ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid();

-- Update any foreign key references to use temp column temporarily
-- (We'll handle this in subsequent steps)

-- Drop the old SERIAL id column and rename temp to id
ALTER TABLE cards DROP COLUMN id CASCADE;
ALTER TABLE cards RENAME COLUMN temp_uuid_id TO id;

-- Set id as primary key
ALTER TABLE cards ADD PRIMARY KEY (id);

-- Ensure card_id remains as INTEGER for game logic
-- (This should already exist from migration 030)

-- ============================================================================
-- STEP 2: Fix ABILITIES table - Convert id to UUID, keep ability_id as INTEGER
-- ============================================================================

-- Remove the uuid_id column we added in migration 030
ALTER TABLE abilities DROP COLUMN IF EXISTS uuid_id;

-- Add a temporary UUID column
ALTER TABLE abilities ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid();

-- Drop the old SERIAL id column and rename temp to id
ALTER TABLE abilities DROP COLUMN id CASCADE;
ALTER TABLE abilities RENAME COLUMN temp_uuid_id TO id;

-- Set id as primary key
ALTER TABLE abilities ADD PRIMARY KEY (id);

-- Ensure ability_id remains as INTEGER for game logic
-- (This should already exist from migration 030)

-- ============================================================================
-- STEP 3: Fix KEYWORDS table - Convert id to UUID, keep keyword_id as INTEGER
-- ============================================================================

-- Remove the uuid_id column we added in migration 030
ALTER TABLE keywords DROP COLUMN IF EXISTS uuid_id;

-- Add a temporary UUID column
ALTER TABLE keywords ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid();

-- Drop the old SERIAL id column and rename temp to id
ALTER TABLE keywords DROP COLUMN id CASCADE;
ALTER TABLE keywords RENAME COLUMN temp_uuid_id TO id;

-- Set id as primary key
ALTER TABLE keywords ADD PRIMARY KEY (id);

-- Ensure keyword_id remains as INTEGER for game logic
-- (This should already exist from migration 030)

-- ============================================================================
-- STEP 4: Fix other tables that reference these IDs
-- ============================================================================

-- Fix trophic_categories table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trophic_categories') THEN
        -- Add temp UUID column
        ALTER TABLE trophic_categories ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid();
        
        -- Drop old id and rename temp
        ALTER TABLE trophic_categories DROP COLUMN id CASCADE;
        ALTER TABLE trophic_categories RENAME COLUMN temp_uuid_id TO id;
        
        -- Set as primary key
        ALTER TABLE trophic_categories ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Fix triggers table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'triggers') THEN
        -- Add temp UUID column
        ALTER TABLE triggers ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid();
        
        -- Drop old id and rename temp
        ALTER TABLE triggers DROP COLUMN id CASCADE;
        ALTER TABLE triggers RENAME COLUMN temp_uuid_id TO id;
        
        -- Set as primary key
        ALTER TABLE triggers ADD PRIMARY KEY (id);
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Recreate foreign key relationships with UUID references
-- ============================================================================

-- Note: Since we dropped CASCADE, we need to recreate the junction tables

-- Recreate card_keywords table if it exists
DROP TABLE IF EXISTS card_keywords;
CREATE TABLE IF NOT EXISTS card_keywords (
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, keyword_id)
);

-- Recreate card_abilities table if it exists
DROP TABLE IF EXISTS card_abilities;
CREATE TABLE IF NOT EXISTS card_abilities (
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    ability_id UUID NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, ability_id)
);

-- ============================================================================
-- STEP 6: Update indexes for the new UUID system
-- ============================================================================

-- Cards table indexes
CREATE INDEX IF NOT EXISTS idx_cards_id ON cards(id);
CREATE INDEX IF NOT EXISTS idx_cards_card_id ON cards(card_id);
CREATE INDEX IF NOT EXISTS idx_cards_name_id ON cards(name_id);
CREATE INDEX IF NOT EXISTS idx_cards_species_name ON cards(species_name);

-- Abilities table indexes
CREATE INDEX IF NOT EXISTS idx_abilities_id ON abilities(id);
CREATE INDEX IF NOT EXISTS idx_abilities_ability_id ON abilities(ability_id);
CREATE INDEX IF NOT EXISTS idx_abilities_name_id ON abilities(name_id);

-- Keywords table indexes
CREATE INDEX IF NOT EXISTS idx_keywords_id ON keywords(id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword_id ON keywords(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keywords_name ON keywords(name);

-- ============================================================================
-- STEP 7: Add comments for the corrected dual-key system
-- ============================================================================

COMMENT ON COLUMN cards.id IS 'UUID primary key for database relationships';
COMMENT ON COLUMN cards.card_id IS 'Integer game logic identifier (enum-based)';
COMMENT ON COLUMN cards.species_name IS 'Kebab-case species name for backward compatibility';

COMMENT ON COLUMN abilities.id IS 'UUID primary key for database relationships';
COMMENT ON COLUMN abilities.ability_id IS 'Integer game logic identifier (enum-based)';

COMMENT ON COLUMN keywords.id IS 'UUID primary key for database relationships';
COMMENT ON COLUMN keywords.keyword_id IS 'Integer game logic identifier (enum-based)';

-- ============================================================================
-- VERIFICATION QUERIES (commented for manual use)
-- ============================================================================

-- Verify the dual-key system:
-- SELECT id, card_id, species_name FROM cards LIMIT 5;
-- SELECT id, ability_id, ability_name FROM abilities LIMIT 5;
-- SELECT id, keyword_id, keyword_name FROM keywords LIMIT 5;

-- Check data types:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cards' AND column_name IN ('id', 'card_id');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'abilities' AND column_name IN ('id', 'ability_id');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'keywords' AND column_name IN ('id', 'keyword_id');
