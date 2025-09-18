-- Purchase System Tables Migration
-- Creates tables for the complete purchase and onboarding system
-- Supports Stripe, App Store, Google Play, and virtual currency purchases

-- ============================================================================
-- PURCHASE SYSTEM TABLES
-- ============================================================================

-- Enhanced purchases table with comprehensive payment support
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method INTEGER NOT NULL, -- PaymentMethod enum
    platform INTEGER NOT NULL, -- Platform enum
    status INTEGER DEFAULT 0 CHECK (status IN (0,1,2,3,4,5)), -- PurchaseStatus enum
    
    -- Stripe payment details
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Platform payment details
    external_transaction_id VARCHAR(255), -- App Store/Google Play transaction ID
    app_store_receipt_data TEXT, -- App Store receipt
    google_play_purchase_token TEXT, -- Google Play purchase token
    
    -- Risk and fraud detection
    risk_score INTEGER,
    risk_level INTEGER, -- RiskLevel enum
    fraud_details JSONB DEFAULT '{}',
    
    -- Refund information
    refund_amount DECIMAL(10,2),
    refund_status INTEGER, -- RefundStatus enum
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    -- Metadata and tracking
    metadata JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL, -- External event ID (Stripe, etc.)
    event_type VARCHAR(100) NOT NULL,
    raw_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User onboarding tracking
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    user_type INTEGER NOT NULL, -- UserType enum
    
    -- Onboarding steps
    starter_decks_given BOOLEAN DEFAULT FALSE,
    tutorial_completed BOOLEAN DEFAULT FALSE,
    first_game_played BOOLEAN DEFAULT FALSE,
    
    -- Tracking data
    deck_ids JSONB DEFAULT '[]', -- Array of starter deck IDs given
    onboarding_version VARCHAR(10) DEFAULT '1.0',
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED EXISTING TABLES
-- ============================================================================

-- Add missing columns to existing tables if they don't exist
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS source_product_id UUID REFERENCES products(id);

ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS deck_type INTEGER DEFAULT 1; -- DeckType.CUSTOM
ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS source_product_id UUID REFERENCES products(id);
ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS is_claimable BOOLEAN DEFAULT FALSE;

-- Create player_deck_cards table if it doesn't exist
CREATE TABLE IF NOT EXISTS player_deck_cards (
    deck_id UUID REFERENCES user_decks(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id),
    quantity INTEGER DEFAULT 1,
    position INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (deck_id, card_id)
);

-- Create player_inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    item_type INTEGER NOT NULL, -- ProductType enum
    item_data JSONB DEFAULT '{}',
    quantity INTEGER DEFAULT 1,
    source_type VARCHAR(50) DEFAULT 'purchase',
    acquired_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- For subscriptions
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Purchase system indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_purchases_platform ON purchases(platform);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_payment_intent ON purchases(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_external_transaction ON purchases(external_transaction_id) WHERE external_transaction_id IS NOT NULL;

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Onboarding indexes
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_type ON user_onboarding(user_type);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_starter_decks ON user_onboarding(starter_decks_given);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed ON user_onboarding(completed_at);

-- Enhanced existing table indexes
CREATE INDEX IF NOT EXISTS idx_user_cards_source_product ON user_cards(source_product_id) WHERE source_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_decks_deck_type ON user_decks(deck_type);
CREATE INDEX IF NOT EXISTS idx_user_decks_public ON user_decks(is_public);
CREATE INDEX IF NOT EXISTS idx_user_decks_claimable ON user_decks(is_claimable);
CREATE INDEX IF NOT EXISTS idx_user_decks_source_product ON user_decks(source_product_id) WHERE source_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_deck_cards_deck_id ON player_deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_player_deck_cards_card_id ON player_deck_cards(card_id);

CREATE INDEX IF NOT EXISTS idx_player_inventory_user_id ON player_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_product_id ON player_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item_type ON player_inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_player_inventory_expires_at ON player_inventory(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View for purchase analytics
CREATE OR REPLACE VIEW purchase_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as purchase_date,
    platform,
    payment_method,
    status,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_transaction_value
FROM purchases
GROUP BY DATE_TRUNC('day', created_at), platform, payment_method, status
ORDER BY purchase_date DESC;

-- View for onboarding analytics
CREATE OR REPLACE VIEW onboarding_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as onboarding_date,
    user_type,
    COUNT(*) as users_onboarded,
    COUNT(CASE WHEN starter_decks_given THEN 1 END) as starter_decks_given_count,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_count
FROM user_onboarding
GROUP BY DATE_TRUNC('day', created_at), user_type
ORDER BY onboarding_date DESC;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE purchases IS 'Universal purchase tracking for all product types and payment methods';
COMMENT ON TABLE webhook_events IS 'Webhook event storage for idempotency and audit trail';
COMMENT ON TABLE user_onboarding IS 'User onboarding progress and starter deck distribution tracking';
COMMENT ON TABLE player_inventory IS 'Non-card items owned by players (merchandise, digital content, subscriptions)';

COMMENT ON COLUMN purchases.status IS '0=pending, 1=completed, 2=failed, 3=refunded, 4=disputed, 5=cancelled';
COMMENT ON COLUMN purchases.payment_method IS '1=virtual_currency, 2=real_money, 3=stripe';
COMMENT ON COLUMN purchases.platform IS '1=web, 2=ios, 3=android';
COMMENT ON COLUMN purchases.risk_level IS '1=normal, 2=elevated, 3=highest';

COMMENT ON COLUMN user_onboarding.user_type IS 'UserType enum from shared/enums.ts';
COMMENT ON COLUMN user_onboarding.deck_ids IS 'JSON array of starter deck IDs given to user';

COMMENT ON COLUMN player_inventory.item_type IS 'ProductType enum - type of item in inventory';
COMMENT ON COLUMN player_inventory.expires_at IS 'Expiration date for subscriptions and time-limited items';
