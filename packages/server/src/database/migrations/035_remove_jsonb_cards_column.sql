-- Migration 035: Remove JSONB Cards Column
-- Phase 3: Remove the cards JSONB column from decks table
-- All functionality now uses the normalized deck_cards table

-- ============================================================================
-- STEP 1: Verify migration readiness
-- ============================================================================

-- Check that all decks have corresponding deck_cards entries
DO $$
DECLARE
    decks_without_cards INTEGER;
    total_decks INTEGER;
BEGIN
    -- Count decks without any deck_cards
    SELECT COUNT(*) INTO decks_without_cards
    FROM decks d
    WHERE NOT EXISTS (
        SELECT 1 FROM deck_cards dc WHERE dc.deck_id = d.id
    );
    
    SELECT COUNT(*) INTO total_decks FROM decks;
    
    RAISE NOTICE '=== MIGRATION READINESS CHECK ===';
    RAISE NOTICE 'Total decks: %', total_decks;
    RAISE NOTICE 'Decks without cards: %', decks_without_cards;
    
    IF decks_without_cards > 0 THEN
        RAISE WARNING 'Found % decks without cards in deck_cards table. Migration may cause data loss.', decks_without_cards;
    ELSE
        RAISE NOTICE 'All decks have corresponding deck_cards entries. Safe to proceed.';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create backup of JSONB data (optional safety measure)
-- ============================================================================

-- Create a backup table with JSONB data before dropping the column
CREATE TABLE IF NOT EXISTS decks_jsonb_backup AS
SELECT 
    id,
    name,
    cards,
    created_at
FROM decks 
WHERE cards IS NOT NULL AND cards != '[]'::jsonb;

-- Log backup creation
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM decks_jsonb_backup;
    RAISE NOTICE 'Created backup of % decks with JSONB cards data', backup_count;
END $$;

-- ============================================================================
-- STEP 3: Remove the cards JSONB column
-- ============================================================================

-- Drop the cards column from decks table
ALTER TABLE decks DROP COLUMN IF EXISTS cards;

-- Log the column removal
DO $$
BEGIN
    RAISE NOTICE 'Removed cards JSONB column from decks table';
END $$;

-- ============================================================================
-- STEP 4: Update database types and constraints
-- ============================================================================

-- Add any missing constraints now that we're fully normalized
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_deck_cards_deck_id'
    ) THEN
        ALTER TABLE deck_cards ADD CONSTRAINT fk_deck_cards_deck_id
            FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure proper indexing for performance
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id_position ON deck_cards(deck_id, position_in_deck);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_id_deck ON deck_cards(card_id, deck_id);

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

-- Verify the column was dropped
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'decks' 
        AND column_name = 'cards'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE EXCEPTION 'Failed to drop cards column from decks table';
    ELSE
        RAISE NOTICE '✅ Successfully removed cards JSONB column from decks table';
    END IF;
END $$;

-- Show final statistics
DO $$
DECLARE
    total_decks INTEGER;
    total_deck_cards INTEGER;
    avg_cards_per_deck NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_decks FROM decks;
    SELECT COUNT(*) INTO total_deck_cards FROM deck_cards;
    
    IF total_decks > 0 THEN
        SELECT ROUND(total_deck_cards::numeric / total_decks::numeric, 2) INTO avg_cards_per_deck;
    ELSE
        avg_cards_per_deck := 0;
    END IF;
    
    RAISE NOTICE '=== FINAL MIGRATION STATISTICS ===';
    RAISE NOTICE 'Total decks: %', total_decks;
    RAISE NOTICE 'Total deck cards: %', total_deck_cards;
    RAISE NOTICE 'Average cards per deck: %', avg_cards_per_deck;
    RAISE NOTICE '✅ Migration 035 completed successfully';
END $$;

COMMIT;
