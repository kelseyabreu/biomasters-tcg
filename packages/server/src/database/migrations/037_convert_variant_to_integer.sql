-- Migration 037: Convert variant column to INTEGER for proper unique constraint handling
-- This migration converts the variant column from VARCHAR to INTEGER to fix the unique constraint issue
-- PostgreSQL treats NULL values as distinct in unique constraints, but 0 values are properly compared

-- Step 1: Add a new integer variant column
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS variant_int INTEGER;

-- Step 2: Convert existing variant data to integers
-- Map common variant types to integer values:
-- NULL or empty -> 0 (default/normal)
-- 'foil' -> 1
-- 'holographic' -> 2  
-- 'alternate_art' -> 3
-- 'special_edition' -> 4
-- Any other string -> hash it to a consistent integer

UPDATE user_cards 
SET variant_int = CASE 
    WHEN variant IS NULL OR variant = '' THEN 0
    WHEN variant = 'foil' THEN 1
    WHEN variant = 'holographic' THEN 2
    WHEN variant = 'alternate_art' THEN 3
    WHEN variant = 'special_edition' THEN 4
    WHEN variant = 'promo' THEN 5
    WHEN variant = 'first_edition' THEN 6
    WHEN variant = 'limited' THEN 7
    WHEN variant = 'shiny' THEN 8
    WHEN variant = 'rare' THEN 9
    -- For any other string values, create a consistent hash
    ELSE ABS(('x' || substr(md5(variant), 1, 8))::bit(32)::int) % 1000 + 100
END;

-- Step 3: Verify all records have been converted
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM user_cards WHERE variant_int IS NULL;
    SELECT COUNT(*) INTO total_count FROM user_cards;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % records still have NULL variant_int out of % total', null_count, total_count;
    END IF;
    
    RAISE NOTICE 'Migration verification: All % records successfully converted to integer variants', total_count;
END $$;

-- Step 4: Drop the old unique constraint
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_user_id_card_id_variant_unique;
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_unique_combination;

-- Step 5: Drop any related indexes
DROP INDEX IF EXISTS user_cards_unique_with_nulls;

-- Step 6: Make variant_int NOT NULL with default 0
ALTER TABLE user_cards ALTER COLUMN variant_int SET NOT NULL;
ALTER TABLE user_cards ALTER COLUMN variant_int SET DEFAULT 0;

-- Step 7: Drop the old varchar variant column
ALTER TABLE user_cards DROP COLUMN IF EXISTS variant;

-- Step 8: Rename variant_int to variant
ALTER TABLE user_cards RENAME COLUMN variant_int TO variant;

-- Step 9: Create the new unique constraint with integer variant
ALTER TABLE user_cards ADD CONSTRAINT user_cards_unique_user_card_variant 
    UNIQUE(user_id, card_id, variant);

-- Step 10: Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_cards_variant ON user_cards(variant);

-- Step 11: Add comments for documentation
COMMENT ON COLUMN user_cards.variant IS 'Card variant as integer: 0=normal, 1=foil, 2=holographic, 3=alternate_art, 4=special_edition, 5=promo, 6=first_edition, 7=limited, 8=shiny, 9=rare, 100+=custom';

-- Step 12: Log migration results
DO $$
DECLARE
    total_records INTEGER;
    variant_distribution RECORD;
BEGIN
    SELECT COUNT(*) INTO total_records FROM user_cards;
    
    RAISE NOTICE 'Migration 037 completed successfully:';
    RAISE NOTICE '  Total records: %', total_records;
    RAISE NOTICE '  Variant column converted from VARCHAR to INTEGER';
    RAISE NOTICE '  Unique constraint now works properly with integer variants';
    
    -- Show variant distribution
    RAISE NOTICE 'Variant distribution:';
    FOR variant_distribution IN 
        SELECT variant, COUNT(*) as count 
        FROM user_cards 
        GROUP BY variant 
        ORDER BY variant 
        LIMIT 10
    LOOP
        RAISE NOTICE '  Variant %: % records', variant_distribution.variant, variant_distribution.count;
    END LOOP;
END $$;
