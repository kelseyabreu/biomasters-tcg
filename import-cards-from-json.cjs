const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function importCardsFromJSON() {
  const client = new Client({
    connectionString: 'postgresql://postgres:QZOlYJcxSYezlaeOGjOPPeZqDEWGhSDJ@shuttle.proxy.rlwy.net:27035/railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Load cards from frontend JSON
    const cardsPath = path.join(__dirname, 'public/data/game-config/cards.json');
    console.log('📚 Loading cards from:', cardsPath);
    
    const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    console.log(`📊 Found ${cardsData.length} cards in JSON file\n`);

    // Check current cards in database
    const existingCards = await client.query('SELECT card_id, card_name FROM cards ORDER BY card_id');
    console.log(`🔍 Current cards in database: ${existingCards.rows.length}`);
    existingCards.rows.forEach(card => {
      console.log(`  ${card.card_id}: ${card.card_name}`);
    });
    console.log('');

    // Import missing cards
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🚀 Starting card import...\n');

    for (const card of cardsData) {
      try {
        // Check if card exists
        const existingCard = await client.query(
          'SELECT id FROM cards WHERE card_id = $1',
          [card.cardId]
        );

        const cardData = {
          card_id: card.cardId,
          card_name: card.nameId.replace('CARD_', '').replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()),
          common_name: card.nameId.replace('CARD_', '').replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()),
          scientific_name: card.scientificNameId ? card.scientificNameId.replace('SCIENTIFIC_', '').replace(/_/g, ' ') : null,
          trophic_level: card.trophicLevel || null,
          trophic_category_id: card.trophicCategory || null,
          conservation_status_id: card.conservationStatus || null,
          victory_points: card.victoryPoints || 1,
          cost: card.cost ? JSON.stringify(card.cost) : null,
          mass_kg: card.mass_kg || null,
          lifespan_max_days: card.lifespan_max_days || null,
          vision_range_m: card.vision_range_m || null,
          smell_range_m: card.smell_range_m || null,
          hearing_range_m: card.hearing_range_m || null,
          walk_speed_m_per_hr: card.walk_speed_m_per_hr || null,
          run_speed_m_per_hr: card.run_speed_m_per_hr || null,
          swim_speed_m_per_hr: card.swim_speed_m_per_hr || null,
          fly_speed_m_per_hr: card.fly_speed_m_per_hr || null,
          offspring_count: card.offspring_count || null,
          gestation_days: card.gestation_days || null,
          taxo_domain: card.taxoDomain || null,
          taxo_kingdom: card.taxoKingdom || null,
          taxo_phylum: card.taxoPhylum || null,
          taxo_class: card.taxoClass || null,
          taxo_order: card.taxoOrder || null,
          taxo_family: card.taxoFamily || null,
          taxo_genus: card.taxoGenus || null,
          taxo_species: card.taxoSpecies || null
        };

        if (existingCard.rows.length > 0) {
          // Update existing card
          await client.query(`
            UPDATE cards SET 
              card_name = $2,
              common_name = $3,
              scientific_name = $4,
              trophic_level = $5,
              trophic_category_id = $6,
              conservation_status_id = $7,
              victory_points = $8,
              cost = $9,
              mass_kg = $10,
              lifespan_max_days = $11,
              vision_range_m = $12,
              smell_range_m = $13,
              hearing_range_m = $14,
              walk_speed_m_per_hr = $15,
              run_speed_m_per_hr = $16,
              swim_speed_m_per_hr = $17,
              fly_speed_m_per_hr = $18,
              offspring_count = $19,
              gestation_days = $20,
              taxo_domain = $21,
              taxo_kingdom = $22,
              taxo_phylum = $23,
              taxo_class = $24,
              taxo_order = $25,
              taxo_family = $26,
              taxo_genus = $27,
              taxo_species = $28,
              updated_at = NOW()
            WHERE card_id = $1
          `, [
            cardData.card_id, cardData.card_name, cardData.common_name, cardData.scientific_name,
            cardData.trophic_level, cardData.trophic_category_id, cardData.conservation_status_id,
            cardData.victory_points, cardData.cost, cardData.mass_kg, cardData.lifespan_max_days,
            cardData.vision_range_m, cardData.smell_range_m, cardData.hearing_range_m,
            cardData.walk_speed_m_per_hr, cardData.run_speed_m_per_hr, cardData.swim_speed_m_per_hr,
            cardData.fly_speed_m_per_hr, cardData.offspring_count, cardData.gestation_days,
            cardData.taxo_domain, cardData.taxo_kingdom, cardData.taxo_phylum, cardData.taxo_class,
            cardData.taxo_order, cardData.taxo_family, cardData.taxo_genus, cardData.taxo_species
          ]);
          updatedCount++;
          console.log(`✅ Updated card ${card.cardId}: ${cardData.card_name}`);
        } else {
          // Insert new card
          await client.query(`
            INSERT INTO cards (
              card_id, card_name, common_name, scientific_name, trophic_level, trophic_category_id,
              conservation_status_id, victory_points, cost, mass_kg, lifespan_max_days,
              vision_range_m, smell_range_m, hearing_range_m, walk_speed_m_per_hr,
              run_speed_m_per_hr, swim_speed_m_per_hr, fly_speed_m_per_hr,
              offspring_count, gestation_days, taxo_domain, taxo_kingdom, taxo_phylum,
              taxo_class, taxo_order, taxo_family, taxo_genus, taxo_species
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            )
          `, [
            cardData.card_id, cardData.card_name, cardData.common_name, cardData.scientific_name,
            cardData.trophic_level, cardData.trophic_category_id, cardData.conservation_status_id,
            cardData.victory_points, cardData.cost, cardData.mass_kg, cardData.lifespan_max_days,
            cardData.vision_range_m, cardData.smell_range_m, cardData.hearing_range_m,
            cardData.walk_speed_m_per_hr, cardData.run_speed_m_per_hr, cardData.swim_speed_m_per_hr,
            cardData.fly_speed_m_per_hr, cardData.offspring_count, cardData.gestation_days,
            cardData.taxo_domain, cardData.taxo_kingdom, cardData.taxo_phylum, cardData.taxo_class,
            cardData.taxo_order, cardData.taxo_family, cardData.taxo_genus, cardData.taxo_species
          ]);
          importedCount++;
          console.log(`➕ Imported card ${card.cardId}: ${cardData.card_name}`);
        }

      } catch (error) {
        console.error(`❌ Error processing card ${card.cardId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`  ➕ Imported: ${importedCount} cards`);
    console.log(`  ✅ Updated: ${updatedCount} cards`);
    console.log(`  ❌ Errors: ${errorCount} cards`);

    // Check final count
    const finalCount = await client.query('SELECT COUNT(*) as total FROM cards');
    console.log(`  📋 Total cards in database: ${finalCount.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

importCardsFromJSON().catch(console.error);
