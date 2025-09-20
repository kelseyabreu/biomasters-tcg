-- Migration 034: Migrate User Decks to Normalized Structure
-- Migrates user_decks JSONB data to deck_cards table for consistency
-- Eliminates JSONB dependency and uses normalized deck storage

-- ============================================================================
-- STEP 1: Check if user_decks table exists and migrate if needed
-- ============================================================================

-- Check if user_decks table exists and migrate data if it does
DO $$
DECLARE
    user_decks_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_decks'
    ) INTO user_decks_exists;

    IF user_decks_exists THEN
        RAISE NOTICE 'user_decks table found, migrating data...';

        -- Insert user_decks as deck entries (if they don't already exist)
        INSERT INTO decks (
            id,
            user_id,
            name,
            created_at,
            updated_at,
            deck_type,
            is_public,
            is_claimable
        )
        SELECT
            ud.id,
            ud.user_id,
            ud.name,
            ud.created_at,
            ud.updated_at,
            1 as deck_type, -- DeckType.CUSTOM
            false as is_public,
            false as is_claimable
        FROM user_decks ud
        WHERE NOT EXISTS (
            SELECT 1 FROM decks d WHERE d.id = ud.id
        );
    ELSE
        RAISE NOTICE 'user_decks table not found, skipping user deck migration';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Migrate JSONB cards data to deck_cards table (if user_decks exists)
-- ============================================================================

-- Function to extract and insert cards from JSONB
DO $$
DECLARE
    deck_record RECORD;
    card_record RECORD;
    position_counter INTEGER;
    card_data JSONB;
    user_decks_exists BOOLEAN;
BEGIN
    -- Check if user_decks table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_decks'
    ) INTO user_decks_exists;

    IF user_decks_exists THEN
        -- Loop through each user_deck
        FOR deck_record IN
            SELECT id, cards, name
            FROM user_decks
            WHERE cards IS NOT NULL AND cards != '[]'::jsonb
        LOOP
            position_counter := 1;

            -- Parse JSONB cards array
            FOR card_record IN
                SELECT
                    COALESCE((card_entry->>'cardId')::integer, (card_entry->>'card_id')::integer) as card_id,
                    COALESCE((card_entry->>'quantity')::integer, 1) as quantity
                FROM jsonb_array_elements(deck_record.cards) as card_entry
                WHERE card_entry ? 'cardId' OR card_entry ? 'card_id'
            LOOP
                -- Insert multiple rows for quantity > 1
                FOR i IN 1..card_record.quantity LOOP
                    INSERT INTO deck_cards (
                        deck_id,
                        card_id,
                        species_name,
                        position_in_deck
                    ) VALUES (
                        deck_record.id,
                        card_record.card_id,
                        'card-' || card_record.card_id, -- Generate species_name from card_id
                        position_counter
                    ) ON CONFLICT DO NOTHING; -- Avoid duplicates if migration runs multiple times

                    position_counter := position_counter + 1;
                END LOOP;
            END LOOP;

            RAISE NOTICE 'Migrated deck: % (%) with % cards', deck_record.name, deck_record.id, position_counter - 1;
        END LOOP;
    ELSE
        RAISE NOTICE 'user_decks table not found, skipping JSONB migration';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify migration results
-- ============================================================================

-- Show migration summary
DO $$
DECLARE
    total_user_decks INTEGER;
    total_deck_cards INTEGER;
    decks_with_cards INTEGER;
    user_decks_exists BOOLEAN;
BEGIN
    -- Check if user_decks table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_decks'
    ) INTO user_decks_exists;

    IF user_decks_exists THEN
        SELECT COUNT(*) INTO total_user_decks FROM user_decks;
        SELECT COUNT(*) INTO total_deck_cards FROM deck_cards WHERE deck_id IN (SELECT id FROM user_decks);
        SELECT COUNT(DISTINCT deck_id) INTO decks_with_cards FROM deck_cards WHERE deck_id IN (SELECT id FROM user_decks);
    ELSE
        total_user_decks := 0;
        SELECT COUNT(*) INTO total_deck_cards FROM deck_cards;
        SELECT COUNT(DISTINCT deck_id) INTO decks_with_cards FROM deck_cards;
    END IF;

    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Total user_decks: %', total_user_decks;
    RAISE NOTICE 'Total deck_cards created: %', total_deck_cards;
    RAISE NOTICE 'Decks with cards: %', decks_with_cards;
END $$;

-- ============================================================================
-- STEP 4: Add indexes for performance
-- ============================================================================

-- Ensure we have proper indexes for deck_cards queries
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_id ON deck_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_position ON deck_cards(deck_id, position_in_deck);

-- ============================================================================
-- STEP 5: Fix existing data and add validation constraints
-- ============================================================================

-- Fix any existing deck_cards with position_in_deck = 0
UPDATE deck_cards
SET position_in_deck = 1
WHERE position_in_deck = 0;

-- Ensure position_in_deck is positive (only add if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_deck_cards_position_positive'
    ) THEN
        ALTER TABLE deck_cards ADD CONSTRAINT chk_deck_cards_position_positive
            CHECK (position_in_deck > 0);
    END IF;
END $$;

-- Ensure card_id is positive (only add if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_deck_cards_card_id_positive'
    ) THEN
        ALTER TABLE deck_cards ADD CONSTRAINT chk_deck_cards_card_id_positive
            CHECK (card_id > 0);
    END IF;
END $$;

COMMIT;
