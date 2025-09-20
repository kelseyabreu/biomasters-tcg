-- Migration 026: Add card_id column to deck_cards table
-- This migration adds the card_id column to support the new card ID system

-- Step 1: Add the card_id column (nullable initially)
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS card_id INTEGER;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_id ON deck_cards(card_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN deck_cards.card_id IS 'Numeric card ID referencing cards.id table';
