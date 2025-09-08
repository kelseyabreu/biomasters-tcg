-- Migration 010: Migrate to CardId System
-- This migration properly transitions from species_name strings to numeric CardIds
-- while maintaining data integrity and backward compatibility during transition

-- Step 1: Rename the old card_id VARCHAR column to species_name for clarity
-- (This column was storing species names like "oak-tree", not actual card IDs)
ALTER TABLE user_cards RENAME COLUMN card_id TO species_name;

-- Step 2: Remove the old unique constraint that used the VARCHAR card_id
ALTER TABLE user_cards DROP CONSTRAINT IF EXISTS user_cards_user_id_card_id_variant_key;

-- Step 3: Make the INTEGER card_id column NOT NULL and add proper constraints
-- First, we need to populate it with data from our mapping
-- Create a temporary mapping table for species_name -> card_id conversion
CREATE TEMP TABLE species_to_cardid_mapping (
    species_name VARCHAR(100) PRIMARY KEY,
    card_id INTEGER NOT NULL
);

-- Insert comprehensive mappings from cards.json and legacy species names
INSERT INTO species_to_cardid_mapping (species_name, card_id) VALUES
    -- Core starter pack species (exact matches from starterPackService.ts)
    ('oak-tree', 1),           -- OAK_TREE
    ('giant-kelp', 2),          -- GIANT_KELP
    ('grass', 3),               -- REED_CANARY_GRASS (legacy mapping)
    ('reed-canary-grass', 3),   -- REED_CANARY_GRASS (proper mapping)
    ('rabbit', 4),              -- EUROPEAN_RABBIT (legacy mapping)
    ('european-rabbit', 4),     -- EUROPEAN_RABBIT (proper mapping)
    ('fox', 53),                -- RED_FOX (legacy mapping)
    ('red-fox', 53),            -- RED_FOX (proper mapping)
    ('butterfly', 34),          -- MONARCH_BUTTERFLY (legacy mapping)
    ('monarch-butterfly', 34),  -- MONARCH_BUTTERFLY (proper mapping)

    -- Other cards from cards.json (CardId 1-97)
    ('sockeye-salmon', 5),
    ('american-black-bear', 6),
    ('great-white-shark', 7),
    ('mycena-mushroom', 8),
    ('turkey-vulture', 9),
    ('deer-tick', 10),
    ('common-earthworm', 11),
    ('dung-beetle', 12),
    ('soil-bacteria', 13),
    ('decomposer-mushroom', 14),
    ('deep-sea-hydrothermal-vent-bacteria', 15),
    ('iron-spring-bacteria', 16),
    ('mycorrhizal-fungi', 17),
    ('nitrogen-fixing-bacteria', 18),
    ('pacific-krill', 19),
    ('phytoplankton', 20),
    ('zooplankton', 21),
    ('european-honey-bee', 22),
    ('volcanic-hydrogen-bacteria', 25),
    ('nitrifying-soil-bacteria', 26),
    ('sediment-chemosynthetic-bacteria', 27),
    ('red-wood-ant', 28),
    ('apple-tree', 29),
    ('north-american-beaver', 30),
    ('american-bison', 31),
    ('wild-boar', 32),
    ('bush-cherry', 33),
    ('prickly-pear-cactus', 35),
    ('dromedary-camel', 36),
    ('domestic-cat', 37),
    ('monarch-caterpillar', 38),
    ('butterfly-egg', 39),
    ('cherry-blossom', 40),
    ('eastern-chipmunk', 41),
    ('corn', 42),
    ('domestic-cattle', 43),
    ('house-cricket', 44),
    ('common-daisy', 45),
    ('english-oak', 46),
    ('whitetailed-deer', 47),
    ('domestic-dog', 48),
    ('sacred-dung-beetle', 49),
    ('eelgrass', 50),
    ('african-bush-elephant', 51),
    ('scots-pine', 52),
    ('common-frog', 54),
    ('giraffe', 55),
    ('domestic-goat', 56),
    ('mountain-gorilla', 57),
    ('common-grape-vine', 58),
    ('perennial-ryegrass', 59),
    ('golden-hamster', 60),
    ('european-hedgehog', 61),
    ('spearmint', 62),
    ('hibiscus', 63),
    ('common-hippopotamus', 64),
    ('domestic-horse', 65),
    ('koala', 66),
    ('leopard', 67),
    ('african-lion', 68),
    ('desert-lizard', 69),
    ('llama', 70),
    ('woolly-mammoth', 71),
    ('common-chimpanzee', 72),
    ('house-mouse', 73),
    ('common-decomposer', 74),
    ('bornean-orangutan', 75),
    ('ox', 76),
    ('coconut-palm', 77),
    ('giant-panda', 78),
    ('domestic-pig', 79),
    ('common-raccoon', 80),
    ('bighorn-sheep', 81),
    ('white-rhinoceros', 82),
    ('rice', 83),
    ('sweet-briar', 84),
    ('desert-hairy-scorpion', 85),
    ('roman-snail', 86),
    ('ball-python', 87),
    ('garden-spider', 88),
    ('garden-strawberry', 89),
    ('common-sunflower', 90),
    ('tiger', 91),
    ('garden-tulip', 92),
    ('green-sea-turtle', 93),
    ('asian-water-buffalo', 94),
    ('white-clover', 95),
    ('gray-wolf', 96),
    ('plains-zebra', 97),

    -- Legacy species name mappings (from manifest.json and fallback systems)
    ('bear', 6),                -- Maps to AMERICAN_BLACK_BEAR
    ('deer', 47),               -- Maps to WHITETAILED_DEER
    ('wolf', 96),               -- Maps to GRAY_WOLF
    ('mouse', 73),              -- Maps to HOUSE_MOUSE
    ('cat', 37),                -- Maps to DOMESTIC_CAT
    ('dog', 48),                -- Maps to DOMESTIC_DOG
    ('pig', 79),                -- Maps to DOMESTIC_PIG
    ('cow', 43),                -- Maps to DOMESTIC_CATTLE
    ('horse', 65),              -- Maps to DOMESTIC_HORSE
    ('goat', 56),               -- Maps to DOMESTIC_GOAT
    ('sheep', 81),              -- Maps to BIGHORN_SHEEP (closest match)
    ('camel', 36),              -- Maps to DROMEDARY_CAMEL
    ('elephant', 51),           -- Maps to AFRICAN_BUSH_ELEPHANT
    ('giraffe', 55),            -- Maps to GIRAFFE
    ('lion', 68),               -- Maps to AFRICAN_LION
    ('tiger', 91),              -- Maps to TIGER
    ('leopard', 67),            -- Maps to LEOPARD
    ('panda', 78),              -- Maps to GIANT_PANDA
    ('koala', 66),              -- Maps to KOALA
    ('zebra', 97),              -- Maps to PLAINS_ZEBRA
    ('bison', 31),              -- Maps to AMERICAN_BISON
    ('boar', 32),               -- Maps to WILD_BOAR
    ('beaver', 30),             -- Maps to NORTH_AMERICAN_BEAVER
    ('raccoon', 80),            -- Maps to COMMON_RACCOON
    ('chipmunk', 41),           -- Maps to EASTERN_CHIPMUNK
    ('hamster', 60),            -- Maps to GOLDEN_HAMSTER
    ('hedgehog', 61),           -- Maps to EUROPEAN_HEDGEHOG
    ('frog', 54),               -- Maps to COMMON_FROG
    ('turtle', 93),             -- Maps to GREEN_SEA_TURTLE
    ('snake', 87),              -- Maps to BALL_PYTHON
    ('snail', 86),              -- Maps to ROMAN_SNAIL
    ('spider', 88),             -- Maps to GARDEN_SPIDER
    ('scorpion', 85),           -- Maps to DESERT_HAIRY_SCORPION
    ('ant', 28),                -- Maps to RED_WOOD_ANT
    ('cricket', 44),            -- Maps to HOUSE_CRICKET
    ('earthworm', 11),          -- Maps to COMMON_EARTHWORM
    ('mushroom', 8),            -- Maps to MYCENA_MUSHROOM
    ('sunflower', 90),          -- Maps to COMMON_SUNFLOWER
    ('strawberry', 89),         -- Maps to GARDEN_STRAWBERRY
    ('grapes', 58),             -- Maps to COMMON_GRAPE_VINE
    ('mammoth', 71),            -- Maps to WOOLLY_MAMMOTH
    ('rhinoceros', 82),         -- Maps to WHITE_RHINOCEROS
    ('hippopotamus', 64),       -- Maps to COMMON_HIPPOPOTAMUS
    ('monkey', 72),             -- Maps to COMMON_CHIMPANZEE (closest match)
    ('gorilla', 57),            -- Maps to MOUNTAIN_GORILLA
    ('orangutan', 75),          -- Maps to BORNEAN_ORANGUTAN
    ('water-buffalo', 94),      -- Maps to ASIAN_WATER_BUFFALO
    ('ram', 81),                -- Maps to BIGHORN_SHEEP
    ('herb', 62),               -- Maps to SPEARMINT (closest herb match)
    ('cactus', 35),             -- Maps to PRICKLY_PEAR_CACTUS
    ('evergreen-tree', 52),     -- Maps to SCOTS_PINE
    ('deciduous-tree', 1),      -- Maps to OAK_TREE
    ('caterpillar', 38),        -- Maps to MONARCH_CATERPILLAR
    ('caterpillar_egg', 39);    -- Maps to BUTTERFLY_EGG

-- Step 4: Update existing user_cards records to populate card_id from species_name
UPDATE user_cards 
SET card_id = mapping.card_id
FROM species_to_cardid_mapping mapping
WHERE user_cards.species_name = mapping.species_name
AND user_cards.card_id IS NULL;

-- Step 5: For any remaining records without a mapping, we'll need to handle them
-- Log unmapped species for manual review
DO $$
DECLARE
    unmapped_count INTEGER;
    unmapped_species TEXT[];
BEGIN
    SELECT COUNT(*), ARRAY_AGG(DISTINCT species_name)
    INTO unmapped_count, unmapped_species
    FROM user_cards 
    WHERE card_id IS NULL;
    
    IF unmapped_count > 0 THEN
        RAISE NOTICE 'Found % unmapped species: %', unmapped_count, unmapped_species;
        -- For now, we'll delete these records as they represent invalid data
        -- In production, you might want to handle this differently
        DELETE FROM user_cards WHERE card_id IS NULL;
        RAISE NOTICE 'Deleted % records with unmapped species', unmapped_count;
    END IF;
END $$;

-- Step 6: Now make card_id NOT NULL and add proper constraints
ALTER TABLE user_cards ALTER COLUMN card_id SET NOT NULL;

-- Step 7: Add foreign key constraint to reference the cards table
ALTER TABLE user_cards ADD CONSTRAINT fk_user_cards_card_id 
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;

-- Step 8: Add new unique constraint using the numeric card_id
ALTER TABLE user_cards ADD CONSTRAINT user_cards_user_id_card_id_variant_unique 
    UNIQUE(user_id, card_id, variant);

-- Step 9: Update indexes for performance
DROP INDEX IF EXISTS idx_user_cards_card_id;
CREATE INDEX idx_user_cards_card_id ON user_cards(card_id);
CREATE INDEX idx_user_cards_species_name ON user_cards(species_name); -- Keep for transition period

-- Step 10: Add a migration tracking column
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS migrated_to_cardid BOOLEAN DEFAULT TRUE;

-- Step 11: Update any other tables that might reference the old card_id format
-- Check physical_redemptions table
ALTER TABLE physical_redemptions RENAME COLUMN card_id TO species_name;
ALTER TABLE physical_redemptions ADD COLUMN card_id INTEGER;

-- Update physical_redemptions with card_id mapping
UPDATE physical_redemptions 
SET card_id = mapping.card_id
FROM species_to_cardid_mapping mapping
WHERE physical_redemptions.species_name = mapping.species_name;

-- Step 12: Update user_decks.cards JSONB to use numeric card IDs
-- This is more complex as it involves JSON manipulation
UPDATE user_decks 
SET cards = (
    SELECT jsonb_agg(
        CASE 
            WHEN jsonb_typeof(card_entry) = 'object' AND card_entry ? 'cardId' THEN
                -- If it's already an object with cardId, try to convert string to number
                jsonb_set(
                    card_entry,
                    '{cardId}',
                    COALESCE(
                        (SELECT to_jsonb(mapping.card_id) 
                         FROM species_to_cardid_mapping mapping 
                         WHERE mapping.species_name = (card_entry->>'cardId')),
                        card_entry->'cardId'
                    )
                )
            WHEN jsonb_typeof(card_entry) = 'object' AND card_entry ? 'species_name' THEN
                -- Convert species_name to cardId
                jsonb_set(
                    card_entry - 'species_name',
                    '{cardId}',
                    COALESCE(
                        (SELECT to_jsonb(mapping.card_id) 
                         FROM species_to_cardid_mapping mapping 
                         WHERE mapping.species_name = (card_entry->>'species_name')),
                        to_jsonb(-1) -- Invalid card ID for unmapped species
                    )
                )
            ELSE
                card_entry
        END
    )
    FROM jsonb_array_elements(cards) AS card_entry
)
WHERE jsonb_typeof(cards) = 'array';

-- Step 13: Clean up temporary mapping table
DROP TABLE species_to_cardid_mapping;

-- Step 14: Add comments for documentation
COMMENT ON COLUMN user_cards.card_id IS 'Numeric card ID referencing cards.id table';
COMMENT ON COLUMN user_cards.species_name IS 'Legacy species name (kebab-case) - kept for transition period';
COMMENT ON COLUMN user_cards.migrated_to_cardid IS 'Indicates this record has been migrated to use numeric card_id';

-- Step 15: Create a view for backward compatibility during transition
CREATE OR REPLACE VIEW user_cards_legacy AS
SELECT 
    id,
    user_id,
    species_name as card_id, -- Map back to old column name for legacy code
    card_id as numeric_card_id,
    quantity,
    acquired_at,
    acquisition_method,
    is_foil,
    variant,
    condition,
    metadata,
    migrated_to_cardid
FROM user_cards;

COMMENT ON VIEW user_cards_legacy IS 'Backward compatibility view for legacy code during CardId migration';
