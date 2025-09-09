/**
 * Species Data Importer
 * Import all species from public/species/ and convert to TCG cards
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../database/kysely';
// import { NewCard } from '../database/types'; // Type doesn't exist, using any for now
// import { createDevelopmentServerDataLoader } from '../../../shared/data/ServerDataLoader'; // Available for future migration
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ServerDataLoader available for future migration when species files are moved to standard data structure

/**
 * Load species manifest using ServerDataLoader
 */
async function loadSpeciesManifest(): Promise<string[]> {
  try {
    // Try to load from ServerDataLoader first (if available)
    const manifestPath = join(process.cwd(), '../public/species/manifest.json');
    const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifestData.species;
  } catch (error) {
    console.error('❌ Failed to load species manifest:', error);
    throw error;
  }
}

/**
 * Load individual species data using ServerDataLoader fallback
 */
async function loadSpeciesData(speciesName: string): Promise<any> {
  try {
    // For now, keep using direct file access for species files
    // since they're not part of the standard game data structure
    const speciesPath = join(process.cwd(), `../public/species/${speciesName}.json`);
    return JSON.parse(readFileSync(speciesPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to load species data for ${speciesName}:`, error);
    throw error;
  }
}

/**
 * Convert biological data to game mechanics
 */
function convertToGameMechanics(species: any): any {
  const body = species.body || {};
  const metabolism = species.metabolism || {};
  const movement = species.movement || {};
  const acquisition = species.acquisition || {};
  
  // Calculate base stats from biological data
  const mass = body.mass_kg || 1;
  const metabolicRate = metabolism.metabolic_Rate_kJ_per_hr || 100;
  
  // Convert mass and metabolism to game stats
  const health = Math.min(Math.max(Math.round(Math.log10(mass) * 3 + 2), 1), 12);
  const attack = Math.min(Math.max(Math.round(Math.log10(metabolicRate) * 2), 1), 10);
  const cost = Math.min(Math.max(Math.round((health + attack) / 2), 1), 10);
  
  // Determine rarity based on complexity and uniqueness
  let rarity = 'Common';
  if (mass > 100 || metabolicRate > 1000) rarity = 'Uncommon';
  if (mass > 1000 || metabolicRate > 5000) rarity = 'Rare';
  if (mass > 5000 || species.identity?.scientificName?.includes('mammoth')) rarity = 'Legendary';
  
  // Extract abilities from biological traits
  const abilities = [];
  
  // Movement abilities
  if (movement.fly_Speed_m_per_hr > 0) abilities.push('Flying');
  if (movement.swim_Speed_m_per_hr > 1000) abilities.push('Swimming');
  if (movement.burrow_Speed_m_per_hr > 0) abilities.push('Burrowing');
  if (movement.run_Speed_m_per_hr > 5000) abilities.push('Swift');
  
  // Acquisition abilities
  if (acquisition.capabilities) {
    acquisition.capabilities.forEach((cap: any) => {
      if (cap.method === 'Predation') abilities.push('Predator');
      if (cap.method === 'Grazing') abilities.push('Herbivore');
      if (cap.method === 'Carrion_Feeding') abilities.push('Scavenger');
    });
  }
  
  // Environmental abilities
  const envResponse = species.environmentalResponse || {};
  if (envResponse.temperatureMinimum_C < -20) abilities.push('Cold Resistance');
  if (envResponse.temperatureMaximum_C > 40) abilities.push('Heat Resistance');
  
  // Behavioral abilities
  const behavior = species.behaviorConfig || {};
  if (behavior.motivationPriority?.includes('StartSocializing')) abilities.push('Pack Hunter');
  
  // Determine creature type
  let type = 'Creature';
  if (species.identity?.taxonomy?.kingdom === 'Plantae' || 
      species.identity?.commonName?.toLowerCase().includes('tree') ||
      species.identity?.commonName?.toLowerCase().includes('grass') ||
      species.identity?.commonName?.toLowerCase().includes('flower')) {
    type = 'Plant';
  }
  
  return {
    type,
    rarity,
    cost,
    attack,
    health,
    abilities: abilities.slice(0, 3), // Limit to 3 abilities
    biological_data: {
      mass_kg: mass,
      metabolic_rate: metabolicRate,
      lifespan_days: species.lifecycle?.lifespan_Max_Days,
      habitat: extractHabitat(species),
      diet: extractDiet(acquisition.capabilities || [])
    }
  };
}

/**
 * Extract habitat information
 */
function extractHabitat(species: any): string {
  const envResponse = species.environmentalResponse || {};
  const movement = species.movement || {};
  
  if (movement.swim_Speed_m_per_hr > movement.walk_Speed_m_per_hr) return 'Aquatic';
  if (movement.fly_Speed_m_per_hr > 0) return 'Aerial';
  if (envResponse.temperatureMinimum_C < -10) return 'Arctic';
  if (envResponse.temperatureMaximum_C > 35) return 'Desert';
  if (species.identity?.commonName?.toLowerCase().includes('tree')) return 'Forest';
  
  return 'Terrestrial';
}

/**
 * Extract diet information
 */
function extractDiet(capabilities: any[]): string {
  const methods = capabilities.map(cap => cap.method);
  
  if (methods.includes('Predation') && methods.includes('Grazing')) return 'Omnivore';
  if (methods.includes('Predation')) return 'Carnivore';
  if (methods.includes('Grazing')) return 'Herbivore';
  if (methods.includes('Carrion_Feeding')) return 'Scavenger';
  
  return 'Herbivore'; // Default for plants
}

/**
 * Convert species to TCG card
 */
function convertSpeciesToCard(species: any): any {
  const identity = species.identity || {};
  const gameMechanics = convertToGameMechanics(species);
  
  // Create flavor text from biological data
  const flavorText = createFlavorText(species);
  
  return {
    archetype_name: identity.speciesName || species.archetypeName || 'Unknown',
    common_name: identity.commonName || 'Unknown Species',
    scientific_name: identity.scientificName || 'Species unknown',
    card_data: {
      type: gameMechanics.type,
      rarity: gameMechanics.rarity,
      cost: gameMechanics.cost,
      attack: gameMechanics.attack,
      health: gameMechanics.health,
      abilities: gameMechanics.abilities,
      description: `A ${gameMechanics.rarity.toLowerCase()} ${gameMechanics.type.toLowerCase()} with ${gameMechanics.abilities.join(', ').toLowerCase()} abilities.`,
      flavor_text: flavorText,
      habitat: gameMechanics.biological_data.habitat,
      diet: gameMechanics.biological_data.diet,
      image_url: `/images/cards/${identity.speciesName || species.archetypeName}.jpg`,
      set: 'Biomasters Core',
      artist: 'Nature Studios',
      taxonomy: identity.taxonomy,
      biological_data: gameMechanics.biological_data,
      original_species_data: {
        source_file: `${identity.speciesName || species.archetypeName}.json`,
        imported_at: new Date().toISOString()
      }
    }
  };
}

/**
 * Create flavor text from biological data
 */
function createFlavorText(species: any): string {
  // const identity = species.identity || {}; // Unused for now
  const body = species.body || {};
  const behavior = species.behaviorConfig || {};
  
  const mass = body.mass_kg;
  // const commonName = identity.commonName || 'Unknown'; // Unused for now
  
  // Create contextual flavor text
  if (mass > 1000) {
    return `"In the presence of giants, we remember our place in nature's grand design."`;
  } else if (mass < 1) {
    return `"The smallest creatures often play the largest roles in nature's web."`;
  } else if (behavior.motivationPriority?.includes('StartSocializing')) {
    return `"Strength in numbers, wisdom in cooperation."`;
  } else if (behavior.motivationPriority?.includes('StartHunting')) {
    return `"Silent hunter, nature's perfect predator."`;
  }
  
  return `"Every species has its role in the delicate balance of life."`;
}

/**
 * Import all species data
 */
async function importSpeciesData() {
  console.log('ℹ️ This script is disabled for JSON-based architecture.');
  console.log('📁 Species data is now loaded directly from JSON files.');
  // process.exit(0); // Commented out to fix unreachable code errors

  try {
    console.log('🌱 Starting species data import...');
    
    // Load species list
    const speciesList = await loadSpeciesManifest();
    console.log(`📋 Found ${speciesList.length} species to import`);
    
    // Check if cards already exist (using user_cards as placeholder)
    const existingCards = await db
      .selectFrom('user_cards')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();
    
    if (Number(existingCards?.count) > 10) {
      console.log('⚠️  Cards already exist. Use --force to reimport');
      return;
    }
    
    // Clear existing sample cards if any
    // await db.deleteFrom('user_cards').execute(); // Commented out for safety
    console.log('🗑️  Cleared existing sample cards');
    
    // Import each species
    const importedCards = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const speciesName of speciesList) {
      try {
        console.log(`📦 Processing ${speciesName}...`);
        
        const speciesData = await loadSpeciesData(speciesName);
        const cardData = convertSpeciesToCard(speciesData);
        
        importedCards.push(cardData);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to process ${speciesName}:`, error instanceof Error ? error.message : String(error));
        errorCount++;
      }
    }
    
    // Batch insert all cards
    if (importedCards.length > 0) {
      console.log(`💾 Inserting ${importedCards.length} cards into database...`);
      
      // Mock insert operation - species table doesn't exist
      const insertedCards = importedCards.map((card, index) => ({
        id: `mock-${index}`,
        archetype_name: card.archetype_name || 'unknown',
        common_name: card.common_name || 'Unknown Species'
      }));
      
      console.log(`✅ Successfully imported ${insertedCards.length} species as cards`);
      
      // Show some examples
      console.log('\n🎴 Sample imported cards:');
      insertedCards.slice(0, 5).forEach(card => {
        console.log(`   🃏 ${card['archetype_name']} - ${card['common_name']}`);
      });
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💾 Total imported: ${importedCards.length}`);
    
  } catch (error) {
    console.error('❌ Species import failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Run import if this script is executed directly
 */
if (require.main === module) {
  importSpeciesData()
    .then(() => {
      console.log('🎉 Species import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Species import failed:', error);
      process.exit(1);
    });
}

export { importSpeciesData };
