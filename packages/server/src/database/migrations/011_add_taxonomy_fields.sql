-- Migration 011: Add Taxonomy Fields to Cards Table
-- This migration adds the new taxonomy enum fields to support the hybrid taxonomy system
-- Uses numeric enums for performance with string-based localization

-- Step 1: Add taxonomy fields to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_domain INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_kingdom INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_phylum INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_class INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_order INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_family INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_genus INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS taxo_species INTEGER;

-- Step 2: Add constraints to ensure valid taxonomy values
ALTER TABLE cards ADD CONSTRAINT chk_taxo_domain CHECK (taxo_domain > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_kingdom CHECK (taxo_kingdom > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_phylum CHECK (taxo_phylum > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_class CHECK (taxo_class > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_order CHECK (taxo_order > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_family CHECK (taxo_family > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_genus CHECK (taxo_genus > 0);
ALTER TABLE cards ADD CONSTRAINT chk_taxo_species CHECK (taxo_species > 0);

-- Step 3: Create indexes for taxonomy-based queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_cards_taxo_domain ON cards(taxo_domain);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_kingdom ON cards(taxo_kingdom);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_phylum ON cards(taxo_phylum);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_class ON cards(taxo_class);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_order ON cards(taxo_order);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_family ON cards(taxo_family);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_genus ON cards(taxo_genus);
CREATE INDEX IF NOT EXISTS idx_cards_taxo_species ON cards(taxo_species);

-- Step 4: Create composite indexes for common taxonomy queries
CREATE INDEX IF NOT EXISTS idx_cards_kingdom_phylum ON cards(taxo_kingdom, taxo_phylum);
CREATE INDEX IF NOT EXISTS idx_cards_phylum_class ON cards(taxo_phylum, taxo_class);
CREATE INDEX IF NOT EXISTS idx_cards_class_order ON cards(taxo_class, taxo_order);
CREATE INDEX IF NOT EXISTS idx_cards_family_genus ON cards(taxo_family, taxo_genus);
CREATE INDEX IF NOT EXISTS idx_cards_genus_species ON cards(taxo_genus, taxo_species);

-- Step 5: Populate taxonomy data for existing cards
-- Oak Tree (Card ID 1)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 2,   -- PLANTAE
    taxo_phylum = 5,    -- TRACHEOPHYTA
    taxo_class = 8,     -- MAGNOLIOPSIDA
    taxo_order = 6,     -- FAGALES
    taxo_family = 6,    -- FAGACEAE
    taxo_genus = 5,     -- QUERCUS
    taxo_species = 5    -- QUERCUS_ROBUR
WHERE id = 1;

-- Giant Kelp (Card ID 2)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 7,   -- CHROMISTA
    taxo_phylum = 11,   -- OCHROPHYTA
    taxo_class = 13,    -- PHAEOPHYCEAE
    taxo_order = 12,    -- LAMINARIALES
    taxo_family = 12,   -- LAMINARIACEAE
    taxo_genus = 11,    -- MACROCYSTIS
    taxo_species = 11   -- MACROCYSTIS_PYRIFERA
WHERE id = 2;

-- Mountain Gorilla (Card ID 57)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 1,   -- ANIMALIA
    taxo_phylum = 1,    -- CHORDATA
    taxo_class = 1,     -- MAMMALIA
    taxo_order = 1,     -- PRIMATES
    taxo_family = 1,    -- HOMINIDAE
    taxo_genus = 1,     -- GORILLA
    taxo_species = 1    -- GORILLA_BERINGEI_BERINGEI
WHERE id = 57;

-- African Lion (Card ID 68)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 1,   -- ANIMALIA
    taxo_phylum = 1,    -- CHORDATA
    taxo_class = 1,     -- MAMMALIA
    taxo_order = 2,     -- CARNIVORA
    taxo_family = 2,    -- FELIDAE
    taxo_genus = 2,     -- PANTHERA
    taxo_species = 2    -- PANTHERA_LEO
WHERE id = 68;

-- Gray Wolf (Card ID 96)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 1,   -- ANIMALIA
    taxo_phylum = 1,    -- CHORDATA
    taxo_class = 1,     -- MAMMALIA
    taxo_order = 2,     -- CARNIVORA
    taxo_family = 3,    -- CANIDAE
    taxo_genus = 3,     -- CANIS
    taxo_species = 3    -- CANIS_LUPUS
WHERE id = 96;

-- American Black Bear (Card ID 6)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 1,   -- ANIMALIA
    taxo_phylum = 1,    -- CHORDATA
    taxo_class = 1,     -- MAMMALIA
    taxo_order = 2,     -- CARNIVORA
    taxo_family = 4,    -- URSIDAE
    taxo_genus = 4,     -- URSUS
    taxo_species = 4    -- URSUS_AMERICANUS
WHERE id = 6;

-- Button Mushroom (Card ID 8 - assuming Mycena Mushroom maps to Agaricus)
UPDATE cards SET 
    taxo_domain = 1,    -- EUKARYOTA
    taxo_kingdom = 3,   -- FUNGI
    taxo_phylum = 7,    -- BASIDIOMYCOTA
    taxo_class = 10,    -- AGARICOMYCETES
    taxo_order = 9,     -- AGARICALES
    taxo_family = 9,    -- AGARICACEAE
    taxo_genus = 8,     -- AGARICUS
    taxo_species = 8    -- AGARICUS_BISPORUS
WHERE id = 8;

-- Nitrogen-fixing Bacteria (Card ID 18)
UPDATE cards SET 
    taxo_domain = 2,    -- BACTERIA
    taxo_kingdom = 5,   -- BACTERIA
    taxo_phylum = 9,    -- PROTEOBACTERIA
    taxo_class = 11,    -- ALPHAPROTEOBACTERIA
    taxo_order = 10,    -- RHIZOBIALES
    taxo_family = 10,   -- RHIZOBIACEAE
    taxo_genus = 9,     -- RHIZOBIUM
    taxo_species = 9    -- RHIZOBIUM_LEGUMINOSARUM
WHERE id = 18;

-- Soil Bacteria (Card ID 13)
UPDATE cards SET 
    taxo_domain = 2,    -- BACTERIA
    taxo_kingdom = 5,   -- BACTERIA
    taxo_phylum = 10,   -- FIRMICUTES
    taxo_class = 12,    -- BACILLI
    taxo_order = 11,    -- BACILLALES
    taxo_family = 11,   -- BACILLACEAE
    taxo_genus = 10,    -- BACILLUS
    taxo_species = 10   -- BACILLUS_SUBTILIS
WHERE id = 13;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN cards.taxo_domain IS 'Taxonomic domain (1=Eukaryota, 2=Bacteria, 3=Archaea)';
COMMENT ON COLUMN cards.taxo_kingdom IS 'Taxonomic kingdom (1=Animalia, 2=Plantae, 3=Fungi, etc.)';
COMMENT ON COLUMN cards.taxo_phylum IS 'Taxonomic phylum (1=Chordata, 2=Arthropoda, etc.)';
COMMENT ON COLUMN cards.taxo_class IS 'Taxonomic class (1=Mammalia, 2=Aves, etc.)';
COMMENT ON COLUMN cards.taxo_order IS 'Taxonomic order (1=Primates, 2=Carnivora, etc.)';
COMMENT ON COLUMN cards.taxo_family IS 'Taxonomic family (1=Hominidae, 2=Felidae, etc.)';
COMMENT ON COLUMN cards.taxo_genus IS 'Taxonomic genus (1=Gorilla, 2=Panthera, etc.)';
COMMENT ON COLUMN cards.taxo_species IS 'Taxonomic species (1=beringei beringei, 2=leo, etc.)';

-- Step 7: Create a view for taxonomy-enriched card data
CREATE OR REPLACE VIEW cards_with_taxonomy AS
SELECT 
    c.*,
    -- Add computed fields for common taxonomy queries
    CASE 
        WHEN c.taxo_domain = 1 THEN 'Eukaryota'
        WHEN c.taxo_domain = 2 THEN 'Bacteria'
        WHEN c.taxo_domain = 3 THEN 'Archaea'
        ELSE 'Unknown'
    END as domain_name,
    
    CASE 
        WHEN c.taxo_kingdom = 1 THEN 'Animalia'
        WHEN c.taxo_kingdom = 2 THEN 'Plantae'
        WHEN c.taxo_kingdom = 3 THEN 'Fungi'
        WHEN c.taxo_kingdom = 4 THEN 'Protista'
        WHEN c.taxo_kingdom = 5 THEN 'Bacteria'
        WHEN c.taxo_kingdom = 6 THEN 'Archaea'
        WHEN c.taxo_kingdom = 7 THEN 'Chromista'
        ELSE 'Unknown'
    END as kingdom_name
    
FROM cards c;

COMMENT ON VIEW cards_with_taxonomy IS 'Cards table with taxonomy enum values and computed display names';

-- Step 8: Create functions for taxonomy-based queries
CREATE OR REPLACE FUNCTION get_cards_by_taxonomy_level(
    level_name TEXT,
    level_value INTEGER
) RETURNS TABLE(
    id INTEGER,
    name_id VARCHAR(100),
    scientific_name_id VARCHAR(100)
) AS $$
BEGIN
    CASE level_name
        WHEN 'domain' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_domain = level_value;
        WHEN 'kingdom' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_kingdom = level_value;
        WHEN 'phylum' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_phylum = level_value;
        WHEN 'class' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_class = level_value;
        WHEN 'order' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_order = level_value;
        WHEN 'family' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_family = level_value;
        WHEN 'genus' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_genus = level_value;
        WHEN 'species' THEN
            RETURN QUERY SELECT c.id, c.name_id, c.scientific_name_id 
                        FROM cards c WHERE c.taxo_species = level_value;
        ELSE
            RAISE EXCEPTION 'Invalid taxonomy level: %', level_name;
    END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cards_by_taxonomy_level IS 'Get cards filtered by specific taxonomy level and value';

-- Step 9: Create function to get taxonomic relationships
CREATE OR REPLACE FUNCTION get_taxonomic_distance(card1_id INTEGER, card2_id INTEGER) 
RETURNS INTEGER AS $$
DECLARE
    c1 RECORD;
    c2 RECORD;
BEGIN
    SELECT taxo_domain, taxo_kingdom, taxo_phylum, taxo_class, 
           taxo_order, taxo_family, taxo_genus, taxo_species
    INTO c1 FROM cards WHERE id = card1_id;
    
    SELECT taxo_domain, taxo_kingdom, taxo_phylum, taxo_class, 
           taxo_order, taxo_family, taxo_genus, taxo_species
    INTO c2 FROM cards WHERE id = card2_id;
    
    IF c1.taxo_species = c2.taxo_species THEN RETURN 0; END IF;
    IF c1.taxo_genus = c2.taxo_genus THEN RETURN 1; END IF;
    IF c1.taxo_family = c2.taxo_family THEN RETURN 2; END IF;
    IF c1.taxo_order = c2.taxo_order THEN RETURN 3; END IF;
    IF c1.taxo_class = c2.taxo_class THEN RETURN 4; END IF;
    IF c1.taxo_phylum = c2.taxo_phylum THEN RETURN 5; END IF;
    IF c1.taxo_kingdom = c2.taxo_kingdom THEN RETURN 6; END IF;
    IF c1.taxo_domain = c2.taxo_domain THEN RETURN 7; END IF;
    RETURN 8; -- Different domains
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_taxonomic_distance IS 'Calculate taxonomic distance between two cards (0=same species, 8=different domains)';

-- Step 10: Add migration tracking
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('011_add_taxonomy_fields', NOW())
ON CONFLICT (version) DO NOTHING;
