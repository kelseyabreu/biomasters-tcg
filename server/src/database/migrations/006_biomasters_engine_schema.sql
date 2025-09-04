-- BioMasters Engine Database Schema
-- Complete implementation of the data-driven card game engine
-- Based on BioMasterEngine.txt specifications

-- Create ENUM types for the game engine
CREATE TYPE trigger_type AS ENUM ('ON_ACTIVATE', 'PERSISTENT_ATTACHED', 'ON_ENTER_PLAY', 'ON_LEAVE_PLAY', 'START_OF_TURN', 'END_OF_TURN');
CREATE TYPE effect_type AS ENUM ('TARGET', 'TAKE_CARD', 'APPLY_STATUS', 'MOVE_CARD', 'EXHAUST_TARGET', 'READY_TARGET', 'DESTROY_TARGET', 'GAIN_ENERGY', 'LOSE_ENERGY');
CREATE TYPE selector_type AS ENUM ('ADJACENT', 'ADJACENT_TO_SHARED_AMPHIBIOUS', 'CARD_IN_DETRITUS_ZONE', 'SELF_HOST', 'ALL_CARDS', 'RANDOM_CARD', 'TARGET_PLAYER');
CREATE TYPE action_type AS ENUM ('EXHAUST_TARGET', 'READY_TARGET', 'MOVE_TO_HAND', 'MOVE_TO_DETRITUS', 'PREVENT_READY', 'GAIN_VP', 'DRAW_CARD', 'DISCARD_CARD');
CREATE TYPE domain_type AS ENUM ('TERRESTRIAL', 'AQUATIC', 'AMPHIBIOUS', 'FRESHWATER', 'MARINE', 'EURYHALINE');
CREATE TYPE trophic_category_type AS ENUM ('PHOTOAUTOTROPH', 'CHEMOAUTOTROPH', 'HERBIVORE', 'OMNIVORE', 'CARNIVORE', 'SAPROTROPH', 'PARASITE', 'MUTUALIST');

-- 1. Trophic Categories table
CREATE TABLE IF NOT EXISTS trophic_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category_type trophic_category_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Keywords table - All game keywords
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    keyword_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., "AQUATIC", "SCAVENGE", "FOREST"
    keyword_type VARCHAR(50) NOT NULL, -- e.g., "DOMAIN", "TERRAIN", "CLIMATE", "FEEDING"
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Triggers table - When abilities activate
CREATE TABLE IF NOT EXISTS triggers (
    id SERIAL PRIMARY KEY,
    trigger_name VARCHAR(50) UNIQUE NOT NULL,
    trigger_type trigger_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Effects table - What abilities do
CREATE TABLE IF NOT EXISTS effects (
    id SERIAL PRIMARY KEY,
    effect_name VARCHAR(50) UNIQUE NOT NULL,
    effect_type effect_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Selectors table - How abilities choose targets
CREATE TABLE IF NOT EXISTS selectors (
    id SERIAL PRIMARY KEY,
    selector_name VARCHAR(50) UNIQUE NOT NULL,
    selector_type selector_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Actions table - What happens to targets
CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    action_name VARCHAR(50) UNIQUE NOT NULL,
    action_type action_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Abilities table - The core ability definitions
CREATE TABLE IF NOT EXISTS abilities (
    id SERIAL PRIMARY KEY,
    ability_name VARCHAR(100) NOT NULL,
    trigger_id INTEGER NOT NULL REFERENCES triggers(id),
    effects JSONB NOT NULL, -- Array of effect objects with EffectID, SelectorID, ActionID, filters
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Cards table - The core card database
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(100) UNIQUE NOT NULL,
    trophic_level INTEGER, -- Can be null for parasites/mutualists
    trophic_category_id INTEGER REFERENCES trophic_categories(id),
    cost JSONB, -- Cost requirements as JSON object
    victory_points INTEGER DEFAULT 0,
    
    -- Biological data from species files
    common_name VARCHAR(200),
    scientific_name VARCHAR(200),
    taxonomy JSONB, -- Full taxonomy object
    
    -- Physical characteristics
    mass_kg DECIMAL(10,4),
    lifespan_max_days INTEGER,
    
    -- Sensory capabilities
    vision_range_m DECIMAL(8,2),
    smell_range_m DECIMAL(8,2),
    hearing_range_m DECIMAL(8,2),
    
    -- Movement capabilities  
    walk_speed_m_per_hr DECIMAL(10,2),
    run_speed_m_per_hr DECIMAL(10,2),
    swim_speed_m_per_hr DECIMAL(10,2),
    fly_speed_m_per_hr DECIMAL(10,2),
    
    -- Reproduction
    offspring_count INTEGER,
    gestation_days INTEGER,
    
    -- Game metadata
    artwork_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Card Keywords table - Many-to-many relationship
CREATE TABLE IF NOT EXISTS card_keywords (
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, keyword_id)
);

-- 10. Card Abilities table - Many-to-many relationship  
CREATE TABLE IF NOT EXISTS card_abilities (
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    ability_id INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, ability_id)
);

-- 11. Localization table - For multi-language support
CREATE TABLE IF NOT EXISTS localizations (
    id SERIAL PRIMARY KEY,
    language_code VARCHAR(5) NOT NULL DEFAULT 'en', -- e.g., 'en', 'es', 'fr'
    object_type VARCHAR(50) NOT NULL, -- 'card', 'ability', 'keyword', etc.
    object_id INTEGER NOT NULL,
    field_name VARCHAR(50) NOT NULL, -- 'name', 'description', 'ability_text'
    localized_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(language_code, object_type, object_id, field_name)
);

-- Update existing user_cards table to reference the new cards table
ALTER TABLE user_cards 
ADD COLUMN IF NOT EXISTS card_id INTEGER REFERENCES cards(id),
ADD COLUMN IF NOT EXISTS migrated_from_species BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_trophic_level ON cards(trophic_level);
CREATE INDEX IF NOT EXISTS idx_cards_trophic_category ON cards(trophic_category_id);
CREATE INDEX IF NOT EXISTS idx_cards_common_name ON cards(common_name);
CREATE INDEX IF NOT EXISTS idx_cards_scientific_name ON cards(scientific_name);

CREATE INDEX IF NOT EXISTS idx_card_keywords_card_id ON card_keywords(card_id);
CREATE INDEX IF NOT EXISTS idx_card_keywords_keyword_id ON card_keywords(keyword_id);

CREATE INDEX IF NOT EXISTS idx_card_abilities_card_id ON card_abilities(card_id);
CREATE INDEX IF NOT EXISTS idx_card_abilities_ability_id ON card_abilities(ability_id);

CREATE INDEX IF NOT EXISTS idx_abilities_trigger_id ON abilities(trigger_id);

CREATE INDEX IF NOT EXISTS idx_localizations_lookup ON localizations(language_code, object_type, object_id, field_name);

-- Insert initial data for the engine components
INSERT INTO triggers (trigger_name, trigger_type, description) VALUES
('ON_ACTIVATE', 'ON_ACTIVATE', 'Triggered when the ability is manually activated'),
('PERSISTENT_ATTACHED', 'PERSISTENT_ATTACHED', 'Continuous effect while attached to host'),
('ON_ENTER_PLAY', 'ON_ENTER_PLAY', 'Triggered when card enters play'),
('ON_LEAVE_PLAY', 'ON_LEAVE_PLAY', 'Triggered when card leaves play'),
('START_OF_TURN', 'START_OF_TURN', 'Triggered at the start of each turn'),
('END_OF_TURN', 'END_OF_TURN', 'Triggered at the end of each turn')
ON CONFLICT (trigger_name) DO NOTHING;

INSERT INTO effects (effect_name, effect_type, description) VALUES
('TARGET', 'TARGET', 'Select a target for the ability'),
('TAKE_CARD', 'TAKE_CARD', 'Take a card from a zone'),
('APPLY_STATUS', 'APPLY_STATUS', 'Apply a status effect to target'),
('MOVE_CARD', 'MOVE_CARD', 'Move a card to a different zone'),
('EXHAUST_TARGET', 'EXHAUST_TARGET', 'Exhaust the target card'),
('READY_TARGET', 'READY_TARGET', 'Ready the target card'),
('DESTROY_TARGET', 'DESTROY_TARGET', 'Destroy the target card'),
('GAIN_ENERGY', 'GAIN_ENERGY', 'Gain energy or resources'),
('LOSE_ENERGY', 'LOSE_ENERGY', 'Lose energy or resources')
ON CONFLICT (effect_name) DO NOTHING;

INSERT INTO selectors (selector_name, selector_type, description) VALUES
('ADJACENT', 'ADJACENT', 'Select adjacent cards'),
('ADJACENT_TO_SHARED_AMPHIBIOUS', 'ADJACENT_TO_SHARED_AMPHIBIOUS', 'Select cards adjacent to shared amphibious cards'),
('CARD_IN_DETRITUS_ZONE', 'CARD_IN_DETRITUS_ZONE', 'Select cards in the detritus zone'),
('SELF_HOST', 'SELF_HOST', 'Select the host of this card'),
('ALL_CARDS', 'ALL_CARDS', 'Select all cards matching criteria'),
('RANDOM_CARD', 'RANDOM_CARD', 'Select a random card matching criteria'),
('TARGET_PLAYER', 'TARGET_PLAYER', 'Select a target player')
ON CONFLICT (selector_name) DO NOTHING;

INSERT INTO actions (action_name, action_type, description) VALUES
('EXHAUST_TARGET', 'EXHAUST_TARGET', 'Exhaust the target'),
('READY_TARGET', 'READY_TARGET', 'Ready the target'),
('MOVE_TO_HAND', 'MOVE_TO_HAND', 'Move target to hand'),
('MOVE_TO_DETRITUS', 'MOVE_TO_DETRITUS', 'Move target to detritus zone'),
('PREVENT_READY', 'PREVENT_READY', 'Prevent target from readying'),
('GAIN_VP', 'GAIN_VP', 'Gain victory points'),
('DRAW_CARD', 'DRAW_CARD', 'Draw a card'),
('DISCARD_CARD', 'DISCARD_CARD', 'Discard a card')
ON CONFLICT (action_name) DO NOTHING;

INSERT INTO trophic_categories (name, category_type, description) VALUES
('Photoautotroph', 'PHOTOAUTOTROPH', 'Organisms that produce energy through photosynthesis'),
('Chemoautotroph', 'CHEMOAUTOTROPH', 'Organisms that produce energy through chemosynthesis'),
('Herbivore', 'HERBIVORE', 'Primary consumers that eat plants'),
('Omnivore', 'OMNIVORE', 'Organisms that eat both plants and animals'),
('Carnivore', 'CARNIVORE', 'Secondary/tertiary consumers that eat other animals'),
('Saprotroph', 'SAPROTROPH', 'Decomposers that break down dead organic matter'),
('Parasite', 'PARASITE', 'Organisms that live on or in a host'),
('Mutualist', 'MUTUALIST', 'Organisms in mutually beneficial relationships')
ON CONFLICT (name) DO NOTHING;

-- Insert initial keywords based on the BioMaster Engine specification
INSERT INTO keywords (keyword_name, keyword_type, description) VALUES
-- Domain Keywords (Mandatory for Connection)
('TERRESTRIAL', 'DOMAIN', 'Lives on land'),
('AQUATIC', 'DOMAIN', 'Lives in water'),
('AMPHIBIOUS', 'DOMAIN', 'Can live in both terrestrial and aquatic environments'),
('FRESHWATER', 'DOMAIN', 'Lives in freshwater environments'),
('MARINE', 'DOMAIN', 'Lives in saltwater environments'),
('EURYHALINE', 'DOMAIN', 'Can tolerate wide range of salinity'),

-- Terrain Keywords
('FOREST', 'TERRAIN', 'Forest habitat'),
('GRASSLAND', 'TERRAIN', 'Grassland habitat'),
('DESERT', 'TERRAIN', 'Desert habitat'),
('MOUNTAIN', 'TERRAIN', 'Mountain habitat'),
('CORAL_REEF', 'TERRAIN', 'Coral reef habitat'),
('WETLAND', 'TERRAIN', 'Wetland habitat'),
('TUNDRA', 'TERRAIN', 'Tundra habitat'),
('SAVANNA', 'TERRAIN', 'Savanna habitat'),

-- Climate Keywords
('ARCTIC', 'CLIMATE', 'Arctic climate'),
('TEMPERATE', 'CLIMATE', 'Temperate climate'),
('TROPICAL', 'CLIMATE', 'Tropical climate'),
('ARID', 'CLIMATE', 'Arid climate'),
('SUBTROPICAL', 'CLIMATE', 'Subtropical climate'),

-- Feeding/Energy Strategy Keywords
('SCAVENGE', 'FEEDING', 'Feeds on dead organisms'),
('FILTER_FEEDER', 'FEEDING', 'Filters food from water'),
('FRUGIVORE', 'FEEDING', 'Feeds primarily on fruit'),
('INSECTIVORE', 'FEEDING', 'Feeds primarily on insects'),
('KLEPTOPARASITISM', 'FEEDING', 'Steals food from other organisms'),
('PACK_HUNTER', 'FEEDING', 'Hunts in coordinated groups'),
('VENOMOUS', 'FEEDING', 'Uses venom to subdue prey'),
('APEX_PREDATOR', 'FEEDING', 'Top predator in food chain'),
('WATERSHED_PREDATOR', 'FEEDING', 'Predator that hunts across water boundaries'),
('HYPERCARNIVORE', 'FEEDING', 'Diet consists of >70% meat'),
('RECYCLER', 'FEEDING', 'Processes decomposing matter'),
('PARASITIC_DRAIN', 'FEEDING', 'Drains energy from host'),

-- Special Ability Keywords
('METAMORPHOSIS', 'ABILITY', 'Can transform into different life stage'),
('PHOTOSYNTHESIS', 'ABILITY', 'Produces energy from sunlight'),
('CHEMOSYNTHESIS', 'ABILITY', 'Produces energy from chemical reactions'),
('BIOLUMINESCENCE', 'ABILITY', 'Produces light'),
('ECHOLOCATION', 'ABILITY', 'Uses sound for navigation'),
('MIGRATION', 'ABILITY', 'Seasonal movement patterns'),
('HIBERNATION', 'ABILITY', 'Dormancy during harsh conditions'),
('CAMOUFLAGE', 'ABILITY', 'Blends with environment'),
('MIMICRY', 'ABILITY', 'Imitates other organisms'),

-- Size/Scale Keywords
('MICROSCOPIC', 'SCALE', 'Microscopic organisms'),
('SMALL', 'SCALE', 'Small organisms'),
('MEDIUM', 'SCALE', 'Medium-sized organisms'),
('LARGE', 'SCALE', 'Large organisms'),
('MEGAFAUNA', 'SCALE', 'Very large organisms'),

-- Conservation Status Keywords
('EXTINCT', 'CONSERVATION', 'No longer exists'),
('CRITICALLY_ENDANGERED', 'CONSERVATION', 'Extremely high risk of extinction'),
('ENDANGERED', 'CONSERVATION', 'High risk of extinction'),
('VULNERABLE', 'CONSERVATION', 'Moderate risk of extinction'),
('NEAR_THREATENED', 'CONSERVATION', 'Close to qualifying for threatened category'),
('LEAST_CONCERN', 'CONSERVATION', 'Lowest risk category'),
('DATA_DEFICIENT', 'CONSERVATION', 'Insufficient data for assessment'),

-- Behavioral Keywords
('SOCIAL', 'BEHAVIOR', 'Lives in groups'),
('SOLITARY', 'BEHAVIOR', 'Lives alone'),
('TERRITORIAL', 'BEHAVIOR', 'Defends territory'),
('NOMADIC', 'BEHAVIOR', 'No fixed territory'),
('NOCTURNAL', 'BEHAVIOR', 'Active at night'),
('DIURNAL', 'BEHAVIOR', 'Active during day'),
('CREPUSCULAR', 'BEHAVIOR', 'Active at dawn/dusk')
ON CONFLICT (keyword_name) DO NOTHING;
