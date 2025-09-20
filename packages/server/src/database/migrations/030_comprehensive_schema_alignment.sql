-- Migration 030: Comprehensive Schema Alignment
-- Aligns database schema with desired structure while maintaining backward compatibility
-- Implements dual-key system: UUID for database relationships, Integer for game logic
-- Adds missing fields, tables, and constraints to match the comprehensive schema

-- ============================================================================
-- STEP 1: Update CARDS table to match desired schema
-- ============================================================================

-- First, add UUID id column if not exists (for new dual-key system)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Ensure we have the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing localization ID fields
ALTER TABLE cards ADD COLUMN IF NOT EXISTS name_id VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS scientific_name_id VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS description_id VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxonomy_id VARCHAR(255);

-- Add missing taxonomy enum fields
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_domain INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_kingdom INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_phylum INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_class INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_order INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_family INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_genus INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_species INTEGER;

-- Add missing game mechanics fields
ALTER TABLE cards ADD COLUMN IF NOT EXISTS domain INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS keywords INTEGER[] DEFAULT '{}';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS abilities INTEGER[] DEFAULT '{}';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS conservation_status INTEGER;

-- Add versioning and sync fields
ALTER TABLE cards ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add card_id field for game logic (integer/enum for easy identification)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_id INTEGER;

-- Update card_id to match existing id values (temporary mapping)
UPDATE cards SET card_id = id WHERE card_id IS NULL;

-- Create unique constraint on card_id (this will be the game logic identifier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_card_id_unique ON cards(card_id) WHERE card_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Update ABILITIES table to match desired schema
-- ============================================================================

-- Add UUID id column for new dual-key system
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Add missing localization fields
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS name_id VARCHAR(255);
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS description_id VARCHAR(255);

-- Add versioning fields
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add ability_id field for game logic (integer/enum identifier)
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS ability_id INTEGER;
UPDATE abilities SET ability_id = id WHERE ability_id IS NULL;

-- Create unique constraint on ability_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_abilities_ability_id_unique ON abilities(ability_id) WHERE ability_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Update KEYWORDS table to match desired schema
-- ============================================================================

-- Add UUID id column for new dual-key system
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Add versioning fields
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add keyword_id field for game logic (integer/enum identifier)
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS keyword_id INTEGER;
UPDATE keywords SET keyword_id = id WHERE keyword_id IS NULL;

-- Create unique constraint on keyword_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_keyword_id_unique ON keywords(keyword_id) WHERE keyword_id IS NOT NULL;

-- Add name field for consistency (maps to keyword_name)
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS name VARCHAR(255);
UPDATE keywords SET name = keyword_name WHERE name IS NULL;

-- ============================================================================
-- STEP 4: Create USER_COLLECTIONS table (enhanced user_cards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_collections (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER, -- Will reference cards.card_id
    quantity INTEGER NOT NULL DEFAULT 1,
    is_golden BOOLEAN DEFAULT FALSE,
    flair_level INTEGER DEFAULT 0,
    acquired_via VARCHAR(50) NOT NULL DEFAULT 'starter',
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Sync metadata
    last_synced TIMESTAMP WITH TIME ZONE,
    dirty BOOLEAN DEFAULT FALSE, -- Needs sync to server
    
    UNIQUE(user_id, card_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_card_id ON user_collections(card_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_acquired_at ON user_collections(acquired_at);
CREATE INDEX IF NOT EXISTS idx_user_collections_dirty ON user_collections(dirty);

-- ============================================================================
-- STEP 5: Update DECKS table to match desired schema
-- ============================================================================

-- Add missing fields
ALTER TABLE decks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS dirty BOOLEAN DEFAULT FALSE;

-- Change id type to BIGSERIAL (keep existing UUID for compatibility)
ALTER TABLE decks ADD COLUMN IF NOT EXISTS deck_id BIGSERIAL;

-- ============================================================================
-- STEP 6: Create enhanced DECK_CARDS table
-- ============================================================================

-- Add missing fields to existing deck_cards table
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS card_id INTEGER;
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS position INTEGER;
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update position from position_in_deck
UPDATE deck_cards SET position = position_in_deck WHERE position IS NULL;

-- ============================================================================
-- STEP 7: Add indexes and constraints
-- ============================================================================

-- Cards table indexes
CREATE INDEX IF NOT EXISTS idx_cards_name_id ON cards(name_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_id ON cards(card_id);
CREATE INDEX IF NOT EXISTS idx_cards_domain ON cards(domain);
CREATE INDEX IF NOT EXISTS idx_cards_conservation_status ON cards(conservation_status);
CREATE INDEX IF NOT EXISTS idx_cards_is_active ON cards(is_active);

-- Abilities table indexes
CREATE INDEX IF NOT EXISTS idx_abilities_name_id ON abilities(name_id);
CREATE INDEX IF NOT EXISTS idx_abilities_ability_id ON abilities(ability_id);
CREATE INDEX IF NOT EXISTS idx_abilities_is_active ON abilities(is_active);

-- Keywords table indexes
CREATE INDEX IF NOT EXISTS idx_keywords_keyword_id ON keywords(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keywords_is_active ON keywords(is_active);

-- Deck cards indexes
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_id ON deck_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_position ON deck_cards(position);

-- ============================================================================
-- STEP 8: Add constraints for data integrity
-- ============================================================================

-- Ensure card_id is unique in cards table
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_card_id_unique ON cards(card_id) WHERE card_id IS NOT NULL;

-- Ensure ability_id is unique in abilities table
CREATE UNIQUE INDEX IF NOT EXISTS idx_abilities_ability_id_unique ON abilities(ability_id) WHERE ability_id IS NOT NULL;

-- Ensure keyword_id is unique in keywords table
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_keyword_id_unique ON keywords(keyword_id) WHERE keyword_id IS NOT NULL;

-- ============================================================================
-- STEP 9: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN cards.card_id IS 'Numeric card ID for JSON compatibility and frontend use';
COMMENT ON COLUMN cards.name_id IS 'Localization key for card name (e.g., CARD_OAK_TREE)';
COMMENT ON COLUMN cards.scientific_name_id IS 'Localization key for scientific name';
COMMENT ON COLUMN cards.description_id IS 'Localization key for card description';
COMMENT ON COLUMN cards.taxonomy_id IS 'Localization key for taxonomy information';
COMMENT ON COLUMN cards.domain IS 'Ecosystem domain (0=HOME/universal, 1=terrestrial, etc.)';
COMMENT ON COLUMN cards.keywords IS 'Array of keyword IDs for game mechanics';
COMMENT ON COLUMN cards.abilities IS 'Array of ability IDs for card abilities';
COMMENT ON COLUMN cards.version IS 'Version number for sync and updates';
COMMENT ON COLUMN cards.is_active IS 'Whether card is active/available in game';

COMMENT ON TABLE user_collections IS 'Enhanced user card collection with sync support';
COMMENT ON COLUMN user_collections.is_golden IS 'Whether card has golden/premium variant';
COMMENT ON COLUMN user_collections.flair_level IS 'Card flair/upgrade level (0-5)';
COMMENT ON COLUMN user_collections.dirty IS 'Whether record needs sync to server';

-- ============================================================================
-- VERIFICATION QUERIES (commented for manual use)
-- ============================================================================

-- Verify cards table structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'cards' ORDER BY ordinal_position;

-- Verify user_collections table:
-- SELECT COUNT(*) FROM user_collections;

-- Check for missing indexes:
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename IN ('cards', 'abilities', 'keywords', 'user_collections', 'deck_cards');
