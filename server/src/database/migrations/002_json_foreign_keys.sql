-- Migration: Convert to JSON Foreign Keys
-- Drop the cards table and update references to use species_name

-- Drop existing tables that reference cards
DROP TABLE IF EXISTS deck_cards CASCADE;
DROP TABLE IF EXISTS user_cards CASCADE;
DROP TABLE IF EXISTS redemption_codes CASCADE;
DROP TABLE IF EXISTS cards CASCADE;

-- Recreate user_cards with proper ID and species_name foreign key
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file (e.g., 'bear', 'tiger')
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    acquired_via acquisition_method NOT NULL DEFAULT 'starter',
    first_acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, species_name) -- Ensure one record per user per species
);

-- Recreate deck_cards with species_name foreign key
CREATE TABLE IF NOT EXISTS deck_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file
    position_in_deck INT DEFAULT 0
);

-- Recreate redemption_codes with species_name foreign key
CREATE TABLE IF NOT EXISTS redemption_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    species_name VARCHAR(100) NOT NULL, -- Foreign key to JSON file
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ
);

-- Recreate indexes with proper ID indexing
CREATE INDEX IF NOT EXISTS idx_user_cards_id ON user_cards(id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_species_name ON user_cards(species_name);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_species ON user_cards(user_id, species_name);
CREATE INDEX IF NOT EXISTS idx_user_cards_acquired_at ON user_cards(first_acquired_at);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_species_name ON deck_cards(species_name);

CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_species_name ON redemption_codes(species_name);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_is_redeemed ON redemption_codes(is_redeemed);
