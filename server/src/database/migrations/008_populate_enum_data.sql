-- Populate database with enum data from shared module
-- This migration syncs the database with the TypeScript enums

-- First, let's add conservation status to cards table
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS conservation_status_id INTEGER;

-- Create conservation status table
CREATE TABLE IF NOT EXISTS conservation_statuses (
    id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL,
    iucn_code VARCHAR(10) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    pack_rarity INTEGER NOT NULL, -- per 1000 packs
    description TEXT,
    color VARCHAR(7), -- hex color
    emoji VARCHAR(10),
    rarity_name VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert IUCN conservation statuses with real data
INSERT INTO conservation_statuses (id, status_name, iucn_code, percentage, pack_rarity, description, color, emoji, rarity_name) VALUES
(1, 'EXTINCT', 'EX', 0.54, 5, 'No known individuals remaining', '#000000', '🖤', 'Ultra Rare'),
(2, 'EXTINCT_IN_WILD', 'EW', 0.02, 1, 'Only survives in captivity', '#4A0E4E', '💜', 'Legendary'),
(3, 'CRITICALLY_ENDANGERED', 'CR', 8.96, 90, 'Extremely high risk of extinction', '#D2001C', '❤️', 'Epic'),
(4, 'ENDANGERED', 'EN', 15.86, 159, 'High risk of extinction', '#FF6600', '🧡', 'Rare'),
(5, 'VULNERABLE', 'VU', 14.48, 145, 'Moderate risk of extinction', '#FFCC00', '💛', 'Uncommon'),
(6, 'NEAR_THREATENED', 'NT', 5.37, 54, 'Close to qualifying for threatened category', '#CCE226', '💚', 'Common'),
(7, 'LEAST_CONCERN', 'LC', 54.77, 548, 'Lowest risk category', '#60C659', '💚', 'Common'),
(8, 'DATA_DEFICIENT', 'DD', 0.00, 0, 'Insufficient data for assessment', '#999999', '🤍', 'Special')
ON CONFLICT (status_name) DO NOTHING;

-- Add foreign key constraint
ALTER TABLE cards 
ADD CONSTRAINT fk_cards_conservation_status 
FOREIGN KEY (conservation_status_id) REFERENCES conservation_statuses(id);

-- Clear existing keywords and repopulate with enum data
DELETE FROM card_keywords;
DELETE FROM keywords WHERE id > 0;

-- Reset keyword sequence
ALTER SEQUENCE keywords_id_seq RESTART WITH 1;

-- Insert keywords matching the shared enum exactly
INSERT INTO keywords (id, keyword_name, keyword_type, description) VALUES
-- Domain Keywords (1-6)
(1, 'TERRESTRIAL', 'DOMAIN', 'Lives on land'),
(2, 'AQUATIC', 'DOMAIN', 'Lives in water'),
(3, 'AMPHIBIOUS', 'DOMAIN', 'Can live in both terrestrial and aquatic environments'),
(4, 'FRESHWATER', 'DOMAIN', 'Lives in freshwater environments'),
(5, 'MARINE', 'DOMAIN', 'Lives in saltwater environments'),
(6, 'EURYHALINE', 'DOMAIN', 'Can tolerate wide range of salinity'),

-- Habitat Keywords (7-20)
(7, 'FOREST', 'HABITAT', 'Forest habitat'),
(8, 'GRASSLAND', 'HABITAT', 'Grassland habitat'),
(9, 'DESERT', 'HABITAT', 'Desert habitat'),
(10, 'MOUNTAIN', 'HABITAT', 'Mountain habitat'),
(11, 'CORAL_REEF', 'HABITAT', 'Coral reef habitat'),
(12, 'WETLAND', 'HABITAT', 'Wetland habitat'),
(13, 'TUNDRA', 'HABITAT', 'Tundra habitat'),
(14, 'SAVANNA', 'HABITAT', 'Savanna habitat'),
(15, 'RIVER', 'HABITAT', 'River habitat'),
(16, 'LAKE', 'HABITAT', 'Lake habitat'),
(17, 'OCEAN', 'HABITAT', 'Ocean habitat'),
(18, 'ESTUARY', 'HABITAT', 'Estuary habitat'),
(19, 'MANGROVE', 'HABITAT', 'Mangrove habitat'),
(20, 'CAVE', 'HABITAT', 'Cave habitat'),

-- Taxonomy Keywords (21-40)
(21, 'PLANT', 'TAXONOMY', 'Plant kingdom'),
(22, 'ANIMAL', 'TAXONOMY', 'Animal kingdom'),
(23, 'FUNGI', 'TAXONOMY', 'Fungi kingdom'),
(24, 'BACTERIA', 'TAXONOMY', 'Bacteria domain'),
(25, 'ARCHAEA', 'TAXONOMY', 'Archaea domain'),
(26, 'PROTIST', 'TAXONOMY', 'Protist kingdom'),
(27, 'MAMMAL', 'TAXONOMY', 'Mammalian class'),
(28, 'BIRD', 'TAXONOMY', 'Avian class'),
(29, 'REPTILE', 'TAXONOMY', 'Reptilian class'),
(30, 'AMPHIBIAN', 'TAXONOMY', 'Amphibian class'),
(31, 'FISH', 'TAXONOMY', 'Fish class'),
(32, 'INSECT', 'TAXONOMY', 'Insect class'),
(33, 'ARACHNID', 'TAXONOMY', 'Arachnid class'),
(34, 'CRUSTACEAN', 'TAXONOMY', 'Crustacean class'),
(35, 'MOLLUSK', 'TAXONOMY', 'Mollusk phylum'),
(36, 'CNIDARIAN', 'TAXONOMY', 'Cnidarian phylum'),
(37, 'ECHINODERM', 'TAXONOMY', 'Echinoderm phylum'),
(38, 'ANNELID', 'TAXONOMY', 'Annelid phylum'),
(39, 'NEMATODE', 'TAXONOMY', 'Nematode phylum'),
(40, 'ARTHROPOD', 'TAXONOMY', 'Arthropod phylum'),

-- Behavior Keywords (41-60)
(41, 'SOCIAL', 'BEHAVIOR', 'Lives in groups'),
(42, 'SOLITARY', 'BEHAVIOR', 'Lives alone'),
(43, 'TERRITORIAL', 'BEHAVIOR', 'Defends territory'),
(44, 'NOMADIC', 'BEHAVIOR', 'No fixed territory'),
(45, 'NOCTURNAL', 'BEHAVIOR', 'Active at night'),
(46, 'DIURNAL', 'BEHAVIOR', 'Active during day'),
(47, 'CREPUSCULAR', 'BEHAVIOR', 'Active at dawn/dusk'),
(48, 'MIGRATORY', 'BEHAVIOR', 'Seasonal movement patterns'),
(49, 'HIBERNATING', 'BEHAVIOR', 'Dormancy during harsh conditions'),
(50, 'PACK_HUNTER', 'BEHAVIOR', 'Hunts in coordinated groups'),
(51, 'AMBUSH_PREDATOR', 'BEHAVIOR', 'Waits to ambush prey'),
(52, 'PURSUIT_PREDATOR', 'BEHAVIOR', 'Chases down prey'),
(53, 'SCAVENGER', 'BEHAVIOR', 'Feeds on dead organisms'),
(54, 'FILTER_FEEDER', 'BEHAVIOR', 'Filters food from water'),
(55, 'GRAZER', 'BEHAVIOR', 'Feeds on vegetation'),
(56, 'BROWSER', 'BEHAVIOR', 'Feeds on leaves and shoots'),
(57, 'FRUGIVORE', 'BEHAVIOR', 'Feeds primarily on fruit'),
(58, 'INSECTIVORE', 'BEHAVIOR', 'Feeds primarily on insects'),
(59, 'NECTARIVORE', 'BEHAVIOR', 'Feeds on nectar'),
(60, 'PISCIVORE', 'BEHAVIOR', 'Feeds primarily on fish'),

-- Ability Keywords (61-80)
(61, 'VENOMOUS', 'ABILITY', 'Uses venom to subdue prey'),
(62, 'POISONOUS', 'ABILITY', 'Toxic when consumed'),
(63, 'BIOLUMINESCENT', 'ABILITY', 'Produces light'),
(64, 'ECHOLOCATION', 'ABILITY', 'Uses sound for navigation'),
(65, 'ELECTRIC', 'ABILITY', 'Generates electrical fields'),
(66, 'CAMOUFLAGE', 'ABILITY', 'Blends with environment'),
(67, 'MIMICRY', 'ABILITY', 'Imitates other organisms'),
(68, 'REGENERATION', 'ABILITY', 'Can regrow lost body parts'),
(69, 'METAMORPHOSIS', 'ABILITY', 'Can transform into different life stage'),
(70, 'PHOTOSYNTHESIS', 'ABILITY', 'Produces energy from sunlight'),
(71, 'CHEMOSYNTHESIS', 'ABILITY', 'Produces energy from chemical reactions'),
(72, 'SYMBIOTIC', 'ABILITY', 'Lives in close association with other species'),
(73, 'PARASITIC', 'ABILITY', 'Lives on or in a host organism'),
(74, 'MUTUALISTIC', 'ABILITY', 'Mutually beneficial relationship'),
(75, 'DECOMPOSER', 'ABILITY', 'Breaks down dead organic matter'),
(76, 'NITROGEN_FIXING', 'ABILITY', 'Converts atmospheric nitrogen'),
(77, 'POLLINATOR', 'ABILITY', 'Transfers pollen between plants'),
(78, 'SEED_DISPERSER', 'ABILITY', 'Spreads plant seeds'),
(79, 'KEYSTONE_SPECIES', 'ABILITY', 'Disproportionate impact on ecosystem'),
(80, 'INVASIVE', 'ABILITY', 'Non-native species that spreads rapidly'),

-- Size Keywords (81-87)
(81, 'MICROSCOPIC', 'SIZE', 'Microscopic organisms'),
(82, 'TINY', 'SIZE', 'Very small organisms'),
(83, 'SMALL', 'SIZE', 'Small organisms'),
(84, 'MEDIUM', 'SIZE', 'Medium-sized organisms'),
(85, 'LARGE', 'SIZE', 'Large organisms'),
(86, 'HUGE', 'SIZE', 'Very large organisms'),
(87, 'MEGAFAUNA', 'SIZE', 'Extremely large organisms')
ON CONFLICT (keyword_name) DO NOTHING;

-- Update sequence to match our explicit IDs
SELECT setval('keywords_id_seq', 87, true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conservation_statuses_status_name ON conservation_statuses(status_name);
CREATE INDEX IF NOT EXISTS idx_cards_conservation_status ON cards(conservation_status_id);
