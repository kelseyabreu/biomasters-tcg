-- Starter Decks Data Migration
-- Creates 2 balanced starter decks (21 cards each) that are publicly visible and claimable
-- These decks will be given to all players (guests, unregistered, registered)

-- ============================================================================
-- INSERT STARTER DECK PRODUCTS
-- ============================================================================

-- Forest Ecosystem Starter Deck (21 cards)
INSERT INTO products (
    id,
    name,
    description,
    product_type,
    product_config,
    is_default_starter,
    is_public,
    is_purchasable,
    price_virtual,
    set_code,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Forest Ecosystem Starter',
    'A balanced terrestrial ecosystem deck featuring forest species and their interactions. Perfect for learning basic ecosystem dynamics.',
    1, -- ProductType.DECK
    '{"deck_type": 2, "card_count": 21, "theme": "forest", "difficulty": "beginner", "ecosystem": "terrestrial"}',
    true,
    true,
    false, -- Not purchasable since it's free
    0,
    'STARTER',
    NOW()
);

-- Ocean Ecosystem Starter Deck (21 cards)
INSERT INTO products (
    id,
    name,
    description,
    product_type,
    product_config,
    is_default_starter,
    is_public,
    is_purchasable,
    price_virtual,
    set_code,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Ocean Ecosystem Starter',
    'A balanced aquatic ecosystem deck featuring marine species and their interactions. Perfect for learning aquatic ecosystem dynamics.',
    1, -- ProductType.DECK
    '{"deck_type": 3, "card_count": 21, "theme": "ocean", "difficulty": "beginner", "ecosystem": "aquatic"}',
    true,
    true,
    false, -- Not purchasable since it's free
    0,
    'STARTER',
    NOW()
);

-- ============================================================================
-- FOREST ECOSYSTEM STARTER DECK CONTENTS (21 cards)
-- ============================================================================

-- Producers (8 cards) - Foundation of the ecosystem
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000001', 1, 1, 3),   -- Oak Tree x3 (CardId 1)
('00000000-0000-0000-0000-000000000001', 1, 29, 2),  -- Apple Tree x2 (CardId 29)
('00000000-0000-0000-0000-000000000001', 1, 26, 3);  -- Nitrifying Soil Bacteria x3 (CardId 26)

-- Primary Consumers (6 cards) - Herbivores
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000001', 1, 4, 3),   -- European Rabbit x3 (CardId 4)
('00000000-0000-0000-0000-000000000001', 1, 22, 3);  -- European Honey Bee x3 (CardId 22)

-- Secondary Consumers (4 cards) - Carnivores
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000001', 1, 6, 2),   -- American Black Bear x2 (CardId 6)
('00000000-0000-0000-0000-000000000001', 1, 53, 2);  -- Red Fox x2 (CardId 53)

-- Decomposers (3 cards) - Nutrient cycling
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000001', 1, 9, 1),   -- Turkey Vulture x1 (CardId 9)
('00000000-0000-0000-0000-000000000001', 1, 11, 2);  -- Common Earthworm x2 (CardId 11)

-- ============================================================================
-- OCEAN ECOSYSTEM STARTER DECK CONTENTS (21 cards)
-- ============================================================================

-- Producers (8 cards) - Marine foundation
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000002', 1, 2, 3),   -- Giant Kelp x3 (CardId 2)
('00000000-0000-0000-0000-000000000002', 1, 20, 3),  -- Phytoplankton x3 (CardId 20)
('00000000-0000-0000-0000-000000000002', 1, 15, 2);  -- Deep Sea Hydrothermal Vent Bacteria x2 (CardId 15)

-- Primary Consumers (6 cards) - Marine herbivores
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000002', 1, 19, 3),  -- Pacific Krill x3 (CardId 19)
('00000000-0000-0000-0000-000000000002', 1, 21, 3);  -- Zooplankton x3 (CardId 21)

-- Secondary Consumers (4 cards) - Marine predators
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000002', 1, 5, 2),   -- Sockeye Salmon x2 (CardId 5)
('00000000-0000-0000-0000-000000000002', 1, 7, 2);   -- Great White Shark x2 (CardId 7)

-- Decomposers (3 cards) - Marine decomposition
INSERT INTO product_contents (product_id, content_type, card_id, quantity) VALUES
('00000000-0000-0000-0000-000000000002', 1, 27, 1),  -- Sediment Chemosynthetic Bacteria x1 (CardId 27)
('00000000-0000-0000-0000-000000000002', 1, 13, 2);  -- Soil Bacteria x2 (CardId 13)

-- ============================================================================
-- CREATE DEFAULT STARTER DECK TEMPLATES
-- ============================================================================

-- These will be used to create user_decks for new players
-- Forest Starter Template
INSERT INTO user_decks (
    id,
    user_id,
    name,
    description,
    deck_type,
    source_product_id,
    is_public,
    is_claimable,
    cards,
    is_valid,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000', -- System user (will be updated for each player)
    'Forest Ecosystem Starter',
    'A balanced terrestrial ecosystem deck featuring forest species and their interactions.',
    2, -- DeckType.STARTER_FOREST
    '00000000-0000-0000-0000-000000000001',
    true,
    true,
    '[
        {"cardId": 1, "quantity": 3},
        {"cardId": 29, "quantity": 2},
        {"cardId": 26, "quantity": 3},
        {"cardId": 4, "quantity": 3},
        {"cardId": 22, "quantity": 3},
        {"cardId": 6, "quantity": 2},
        {"cardId": 53, "quantity": 2},
        {"cardId": 9, "quantity": 1},
        {"cardId": 11, "quantity": 2}
    ]',
    true,
    NOW()
);

-- Ocean Starter Template
INSERT INTO user_decks (
    id,
    user_id,
    name,
    description,
    deck_type,
    source_product_id,
    is_public,
    is_claimable,
    cards,
    is_valid,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000', -- System user (will be updated for each player)
    'Ocean Ecosystem Starter',
    'A balanced aquatic ecosystem deck featuring marine species and their interactions.',
    3, -- DeckType.STARTER_OCEAN
    '00000000-0000-0000-0000-000000000002',
    true,
    true,
    '[
        {"cardId": 2, "quantity": 3},
        {"cardId": 20, "quantity": 3},
        {"cardId": 15, "quantity": 2},
        {"cardId": 19, "quantity": 3},
        {"cardId": 21, "quantity": 3},
        {"cardId": 5, "quantity": 2},
        {"cardId": 7, "quantity": 2},
        {"cardId": 27, "quantity": 1},
        {"cardId": 13, "quantity": 2}
    ]',
    true,
    NOW()
);

-- ============================================================================
-- POPULATE PLAYER_DECK_CARDS FOR STARTER DECKS
-- ============================================================================

-- Forest Starter Deck Cards
INSERT INTO player_deck_cards (deck_id, card_id, quantity, position) VALUES
-- Producers
('00000000-0000-0000-0000-000000000101', 1, 3, 1),   -- Oak Tree
('00000000-0000-0000-0000-000000000101', 29, 2, 2),  -- Apple Tree
('00000000-0000-0000-0000-000000000101', 26, 3, 3),  -- Nitrifying Soil Bacteria
-- Primary Consumers
('00000000-0000-0000-0000-000000000101', 4, 3, 4),   -- European Rabbit
('00000000-0000-0000-0000-000000000101', 22, 3, 5),  -- European Honey Bee
-- Secondary Consumers
('00000000-0000-0000-0000-000000000101', 6, 2, 6),   -- American Black Bear
('00000000-0000-0000-0000-000000000101', 53, 2, 7),  -- Red Fox
-- Decomposers
('00000000-0000-0000-0000-000000000101', 9, 1, 8),   -- Turkey Vulture
('00000000-0000-0000-0000-000000000101', 11, 2, 9);  -- Common Earthworm

-- Ocean Starter Deck Cards
INSERT INTO player_deck_cards (deck_id, card_id, quantity, position) VALUES
-- Producers
('00000000-0000-0000-0000-000000000102', 2, 3, 1),   -- Giant Kelp
('00000000-0000-0000-0000-000000000102', 20, 3, 2),  -- Phytoplankton
('00000000-0000-0000-0000-000000000102', 15, 2, 3),  -- Deep Sea Hydrothermal Vent Bacteria
-- Primary Consumers
('00000000-0000-0000-0000-000000000102', 19, 3, 4),  -- Pacific Krill
('00000000-0000-0000-0000-000000000102', 21, 3, 5),  -- Zooplankton
-- Secondary Consumers
('00000000-0000-0000-0000-000000000102', 5, 2, 6),   -- Sockeye Salmon
('00000000-0000-0000-0000-000000000102', 7, 2, 7),   -- Great White Shark
-- Decomposers
('00000000-0000-0000-0000-000000000102', 27, 1, 8),  -- Sediment Chemosynthetic Bacteria
('00000000-0000-0000-0000-000000000102', 13, 2, 9);  -- Soil Bacteria
