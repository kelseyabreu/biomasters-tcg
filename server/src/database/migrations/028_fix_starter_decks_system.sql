-- Migration 028: Fix Starter Decks System
-- Convert starter decks from JSONB cards to proper deck_cards table entries
-- Use system user ID for starter decks

-- ============================================================================
-- STEP 1: Create system user for starter decks
-- ============================================================================

-- Insert system user if it doesn't exist
INSERT INTO users (
    id,
    username,
    email,
    firebase_uid,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system@biomasters.local',
    'system-user',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Update existing starter decks to use system user
-- ============================================================================

-- Update Forest Starter Deck
UPDATE decks 
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE id = '00000000-0000-0000-0000-000000000101';

-- Update Ocean Starter Deck  
UPDATE decks 
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE id = '00000000-0000-0000-0000-000000000102';

-- ============================================================================
-- STEP 3: Create deck_cards entries from JSONB data
-- ============================================================================

-- Clear any existing deck_cards for starter decks
DELETE FROM deck_cards WHERE deck_id IN (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- Forest Starter Deck Cards (from migration 027 JSONB data)
-- [{"cardId": 1, "quantity": 3}, {"cardId": 3, "quantity": 3}, ...]
INSERT INTO deck_cards (deck_id, card_id, species_name, position_in_deck) VALUES
-- From cardId 1, quantity 3
('00000000-0000-0000-0000-000000000101', 1, 'oak-tree', 1),
('00000000-0000-0000-0000-000000000101', 1, 'oak-tree', 2),
('00000000-0000-0000-0000-000000000101', 1, 'oak-tree', 3),
-- From cardId 3, quantity 3  
('00000000-0000-0000-0000-000000000101', 3, 'grass', 4),
('00000000-0000-0000-0000-000000000101', 3, 'grass', 5),
('00000000-0000-0000-0000-000000000101', 3, 'grass', 6),
-- From cardId 4, quantity 3
('00000000-0000-0000-0000-000000000101', 4, 'rabbit', 7),
('00000000-0000-0000-0000-000000000101', 4, 'rabbit', 8),
('00000000-0000-0000-0000-000000000101', 4, 'rabbit', 9),
-- From cardId 6, quantity 2
('00000000-0000-0000-0000-000000000101', 6, 'american-black-bear', 10),
('00000000-0000-0000-0000-000000000101', 6, 'american-black-bear', 11),
-- From cardId 8, quantity 1
('00000000-0000-0000-0000-000000000101', 8, 'mycena-mushroom', 12),
-- From cardId 9, quantity 2
('00000000-0000-0000-0000-000000000101', 9, 'turkey-vulture', 13),
('00000000-0000-0000-0000-000000000101', 9, 'turkey-vulture', 14),
-- From cardId 10, quantity 2
('00000000-0000-0000-0000-000000000101', 10, 'common-earthworm', 15),
('00000000-0000-0000-0000-000000000101', 10, 'common-earthworm', 16),
-- From cardId 2, quantity 2
('00000000-0000-0000-0000-000000000101', 2, 'kelp', 17),
('00000000-0000-0000-0000-000000000101', 2, 'kelp', 18),
-- From cardId 5, quantity 2
('00000000-0000-0000-0000-000000000101', 5, 'sea-otter', 19),
('00000000-0000-0000-0000-000000000101', 5, 'sea-otter', 20),
-- From cardId 7, quantity 1
('00000000-0000-0000-0000-000000000101', 7, 'great-white-shark', 21);

-- Ocean Starter Deck Cards (from migration 027 JSONB data)
-- [{"cardId": 2, "quantity": 3}, {"cardId": 3, "quantity": 3}, ...]
INSERT INTO deck_cards (deck_id, card_id, species_name, position_in_deck) VALUES
-- From cardId 2, quantity 3
('00000000-0000-0000-0000-000000000102', 2, 'kelp', 1),
('00000000-0000-0000-0000-000000000102', 2, 'kelp', 2),
('00000000-0000-0000-0000-000000000102', 2, 'kelp', 3),
-- From cardId 3, quantity 3
('00000000-0000-0000-0000-000000000102', 3, 'grass', 4),
('00000000-0000-0000-0000-000000000102', 3, 'grass', 5),
('00000000-0000-0000-0000-000000000102', 3, 'grass', 6),
-- From cardId 5, quantity 3
('00000000-0000-0000-0000-000000000102', 5, 'sea-otter', 7),
('00000000-0000-0000-0000-000000000102', 5, 'sea-otter', 8),
('00000000-0000-0000-0000-000000000102', 5, 'sea-otter', 9),
-- From cardId 7, quantity 2
('00000000-0000-0000-0000-000000000102', 7, 'great-white-shark', 10),
('00000000-0000-0000-0000-000000000102', 7, 'great-white-shark', 11),
-- From cardId 8, quantity 1
('00000000-0000-0000-0000-000000000102', 8, 'mycena-mushroom', 12),
-- From cardId 10, quantity 2
('00000000-0000-0000-0000-000000000102', 10, 'common-earthworm', 13),
('00000000-0000-0000-0000-000000000102', 10, 'common-earthworm', 14),
-- From cardId 1, quantity 2
('00000000-0000-0000-0000-000000000102', 1, 'oak-tree', 15),
('00000000-0000-0000-0000-000000000102', 1, 'oak-tree', 16),
-- From cardId 4, quantity 2
('00000000-0000-0000-0000-000000000102', 4, 'rabbit', 17),
('00000000-0000-0000-0000-000000000102', 4, 'rabbit', 18),
-- From cardId 6, quantity 2
('00000000-0000-0000-0000-000000000102', 6, 'american-black-bear', 19),
('00000000-0000-0000-0000-000000000102', 6, 'american-black-bear', 20),
-- From cardId 9, quantity 1
('00000000-0000-0000-0000-000000000102', 9, 'turkey-vulture', 21);

-- ============================================================================
-- STEP 4: Clear JSONB cards field (no longer needed)
-- ============================================================================

-- Clear the JSONB cards field since we now use deck_cards table
UPDATE decks 
SET cards = '[]'::jsonb 
WHERE id IN (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- ============================================================================
-- STEP 5: Verification queries (for debugging)
-- ============================================================================

-- These are just comments for manual verification:
-- SELECT COUNT(*) FROM deck_cards WHERE deck_id = '00000000-0000-0000-0000-000000000101'; -- Should be 21
-- SELECT COUNT(*) FROM deck_cards WHERE deck_id = '00000000-0000-0000-0000-000000000102'; -- Should be 21
-- SELECT user_id FROM decks WHERE id IN ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102'); -- Should be system user
