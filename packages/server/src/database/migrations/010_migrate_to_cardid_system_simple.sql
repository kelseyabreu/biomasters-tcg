-- Migration 010: Migrate to CardId System (Simple Version)
-- This migration updates the existing schema to support the CardId system
-- without breaking existing data

-- Step 1: Add card_id_int column to user_cards table
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS card_id_int INTEGER;

-- Step 2: Add species_name column if it doesn't exist
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS species_name VARCHAR(100);

-- Step 3: Create a temporary mapping table for species name to CardId conversion
CREATE TEMP TABLE species_to_cardid_mapping (
    species_name VARCHAR(100) PRIMARY KEY,
    card_id INTEGER NOT NULL
);

-- Insert the mapping data (subset for testing)
INSERT INTO species_to_cardid_mapping (species_name, card_id) VALUES
  -- Starter pack cards
  ('oak-tree', 1),
  ('giant-kelp', 2),
  ('grass', 3),
  ('reed-canary-grass', 3),
  ('rabbit', 4),
  ('european-rabbit', 4),
  ('butterfly', 34),
  ('monarch-butterfly', 34),
  ('fox', 53),
  ('red-fox', 53),
  
  -- Common animals
  ('bear', 6),
  ('american-black-bear', 6),
  ('deer', 47),
  ('whitetailed-deer', 47),
  ('wolf', 96),
  ('gray-wolf', 96),
  ('mouse', 73),
  ('house-mouse', 73),
  ('cat', 37),
  ('domestic-cat', 37),
  ('dog', 48),
  ('domestic-dog', 48),
  
  -- Plants
  ('apple-tree', 29),
  ('corn', 42),
  ('rice', 83),
  ('sunflower', 90),
  ('common-sunflower', 90),
  ('strawberry', 89),
  ('garden-strawberry', 89);

-- Step 4: Update existing records where card_id is a species name
UPDATE user_cards
SET
    card_id_int = mapping.card_id,
    species_name = COALESCE(user_cards.species_name, mapping.species_name)
FROM species_to_cardid_mapping mapping
WHERE user_cards.card_id::text = mapping.species_name;

-- Step 5: For records where card_id is already numeric, try to convert
UPDATE user_cards
SET card_id_int = CAST(card_id AS INTEGER)
WHERE card_id_int IS NULL
  AND card_id::text ~ '^[0-9]+$';

-- Step 6: Add foreign key constraint to cards table (if cards table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cards') THEN
        -- Add foreign key constraint
        ALTER TABLE user_cards 
        ADD CONSTRAINT fk_user_cards_card_id 
        FOREIGN KEY (card_id_int) REFERENCES cards(id);
    END IF;
END $$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id_int ON user_cards(card_id_int);
CREATE INDEX IF NOT EXISTS idx_user_cards_species_name ON user_cards(species_name);

-- Step 8: Add a migration tracking column
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS migrated_to_cardid BOOLEAN DEFAULT FALSE;

-- Mark migrated records
UPDATE user_cards 
SET migrated_to_cardid = TRUE 
WHERE card_id_int IS NOT NULL;

-- Step 9: Log migration results
DO $$
DECLARE
    total_records INTEGER;
    migrated_records INTEGER;
    unmigrated_records INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO total_records FROM user_cards;
    SELECT COUNT(*) INTO migrated_records FROM user_cards WHERE card_id_int IS NOT NULL;
    SELECT COUNT(*) INTO unmigrated_records FROM user_cards WHERE card_id_int IS NULL;

    RAISE NOTICE 'CardId Migration Summary:';
    RAISE NOTICE '  Total records: %', total_records;
    RAISE NOTICE '  Migrated records: %', migrated_records;
    RAISE NOTICE '  Unmigrated records: %', unmigrated_records;

    IF unmigrated_records > 0 THEN
        RAISE NOTICE 'Unmigrated card_ids:';
        FOR rec IN SELECT DISTINCT card_id FROM user_cards WHERE card_id_int IS NULL LOOP
            RAISE NOTICE '  - %', rec.card_id;
        END LOOP;
    END IF;
END $$;
