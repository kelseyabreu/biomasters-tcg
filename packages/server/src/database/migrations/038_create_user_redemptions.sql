-- Migration 038: Create user_redemptions table for tracking what users have redeemed
-- This table tracks starter decks, promo codes, event rewards, etc.
-- Uses numbered enums for redemption_type and status for better performance

-- Create user_redemptions table
CREATE TABLE IF NOT EXISTS user_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redemption_type INTEGER NOT NULL, -- RedemptionType enum (1=starter_deck, 2=starter_pack, etc.)
    redemption_code VARCHAR(100), -- For promo codes, NULL for automatic redemptions like starter_deck
    redeemed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- For time-limited redemptions
    redemption_data JSONB DEFAULT '{}', -- Flexible data storage for reward details
    status INTEGER DEFAULT 1 CHECK (status IN (1, 2, 3, 4)), -- RedemptionStatus enum (1=active, 2=expired, 3=revoked, 4=pending)
    
    -- Prevent duplicate redemptions
    CONSTRAINT unique_user_redemption UNIQUE(user_id, redemption_type, redemption_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_redemptions_user_type ON user_redemptions(user_id, redemption_type);
CREATE INDEX IF NOT EXISTS idx_user_redemptions_code ON user_redemptions(redemption_code) WHERE redemption_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_redemptions_expires ON user_redemptions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_redemptions_status ON user_redemptions(status);

-- Create promo_codes table for managing promotional codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    redemption_type INTEGER NOT NULL, -- RedemptionType enum
    rewards JSONB NOT NULL DEFAULT '[]', -- Array of PromoCodeReward objects
    max_redemptions INTEGER, -- Global limit (NULL = unlimited)
    max_per_user INTEGER DEFAULT 1, -- Per-user limit
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    description TEXT, -- Description for admin panel
    
    -- Ensure code is uppercase and alphanumeric
    CONSTRAINT valid_promo_code CHECK (code ~ '^[A-Z0-9]+$')
);

-- Create index for promo code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active, expires_at);

-- Add comments for documentation
COMMENT ON TABLE user_redemptions IS 'Tracks what users have redeemed (starter decks, promo codes, rewards, etc.)';
COMMENT ON COLUMN user_redemptions.redemption_type IS 'RedemptionType enum: 1=starter_deck, 2=starter_pack, 10=daily_login, 20=promo_code, etc.';
COMMENT ON COLUMN user_redemptions.status IS 'RedemptionStatus enum: 1=active, 2=expired, 3=revoked, 4=pending';
COMMENT ON COLUMN user_redemptions.redemption_data IS 'JSON data with reward details: {cards_given: 10, deck_types: ["forest", "ocean"]}';

COMMENT ON TABLE promo_codes IS 'Defines available promotional codes and their rewards';
COMMENT ON COLUMN promo_codes.rewards IS 'JSON array of rewards: [{"type": "cards", "item_id": 1, "quantity": 3}]';

-- Insert some example promo codes for testing
INSERT INTO promo_codes (code, redemption_type, rewards, max_redemptions, description) VALUES
('BIOMASTERS2024', 20, '[{"type": "packs", "quantity": 5}, {"type": "currency", "quantity": 1000}]', 1000, 'Launch celebration code - 5 booster packs + 1000 coins'),
('WELCOME100', 20, '[{"type": "cards", "item_id": 1, "quantity": 3}, {"type": "cards", "item_id": 2, "quantity": 2}]', NULL, 'Welcome bonus - starter cards'),
('TESTCODE', 20, '[{"type": "packs", "quantity": 1}]', 100, 'Test promo code for development')
ON CONFLICT (code) DO NOTHING;
