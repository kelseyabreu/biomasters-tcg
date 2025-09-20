-- Migration 027: Deck Access System
-- Create template decks directly in user_decks table with system user

-- First, ensure we have the required columns in decks table
ALTER TABLE decks ADD COLUMN IF NOT EXISTS deck_type INTEGER DEFAULT 1;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_claimable BOOLEAN DEFAULT FALSE;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]';

-- Skip creating system user for now - will use existing user or create manually

-- Create Forest Ecosystem Starter template deck
INSERT INTO decks (
    id,
    user_id,
    name,
    deck_type,
    is_public,
    is_claimable,
    cards,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000101',
    '721eab5a-9239-4f66-b974-df7df6564b62', -- Use existing user for now
    'Forest Ecosystem Starter',
    2, -- DeckType.STARTER_FOREST
    true,
    true,
    '[
        {"cardId": 1, "quantity": 3},
        {"cardId": 3, "quantity": 3},
        {"cardId": 4, "quantity": 3},
        {"cardId": 6, "quantity": 2},
        {"cardId": 8, "quantity": 1},
        {"cardId": 9, "quantity": 2},
        {"cardId": 10, "quantity": 2},
        {"cardId": 2, "quantity": 2},
        {"cardId": 5, "quantity": 2},
        {"cardId": 7, "quantity": 1}
    ]',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create Ocean Ecosystem Starter template deck
INSERT INTO decks (
    id,
    user_id,
    name,
    deck_type,
    is_public,
    is_claimable,
    cards,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000102',
    '721eab5a-9239-4f66-b974-df7df6564b62', -- Use existing user for now
    'Ocean Ecosystem Starter',
    3, -- DeckType.STARTER_OCEAN
    true,
    true,
    '[
        {"cardId": 2, "quantity": 3},
        {"cardId": 3, "quantity": 3},
        {"cardId": 5, "quantity": 3},
        {"cardId": 7, "quantity": 2},
        {"cardId": 8, "quantity": 1},
        {"cardId": 10, "quantity": 2},
        {"cardId": 1, "quantity": 2},
        {"cardId": 4, "quantity": 2},
        {"cardId": 6, "quantity": 2},
        {"cardId": 9, "quantity": 1}
    ]',
    NOW()
) ON CONFLICT (id) DO NOTHING;
