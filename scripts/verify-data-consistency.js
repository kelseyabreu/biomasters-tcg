#!/usr/bin/env node

/**
 * Data Consistency Verification Script
 * Verifies that all cards.json entries have matching:
 * - CardID enum entries
 * - CommonName enum entries  
 * - Species files in public/species/
 * - Localization entries in public/data/en.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const CARDS_JSON = path.join(__dirname, '../public/data/cards.json');
const EN_JSON = path.join(__dirname, '../public/data/en.json');
const ENUMS_TS = path.join(__dirname, '../shared/enums.ts');
const SPECIES_DIR = path.join(__dirname, '../public/species');

console.log('🔍 Starting Data Consistency Verification...\n');

// Load data files
let cards, localization, enumsContent;

try {
  cards = JSON.parse(fs.readFileSync(CARDS_JSON, 'utf8'));
  localization = JSON.parse(fs.readFileSync(EN_JSON, 'utf8'));
  enumsContent = fs.readFileSync(ENUMS_TS, 'utf8');
  console.log('✅ Successfully loaded all data files');
} catch (error) {
  console.error('❌ Error loading data files:', error.message);
  process.exit(1);
}

// Get list of species files
let speciesFiles;
try {
  speciesFiles = fs.readdirSync(SPECIES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
  console.log(`✅ Found ${speciesFiles.length} species files`);
} catch (error) {
  console.error('❌ Error reading species directory:', error.message);
  process.exit(1);
}

// Extract CardID enum values
const cardIdMatches = enumsContent.match(/export enum CardId \{([^}]+)\}/s);
const cardIdEnums = [];
if (cardIdMatches) {
  const enumContent = cardIdMatches[1];
  const matches = enumContent.match(/(\w+)\s*=\s*(\d+)/g);
  if (matches) {
    matches.forEach(match => {
      const [, name, id] = match.match(/(\w+)\s*=\s*(\d+)/);
      cardIdEnums.push({ name, id: parseInt(id) });
    });
  }
}

// Extract CommonName enum values
const commonNameMatches = enumsContent.match(/export enum CommonName \{([^}]+)\}/s);
const commonNameEnums = [];
if (commonNameMatches) {
  const enumContent = commonNameMatches[1];
  const matches = enumContent.match(/(\w+)\s*=\s*'([^']+)'/g);
  if (matches) {
    matches.forEach(match => {
      const [, enumName, fileName] = match.match(/(\w+)\s*=\s*'([^']+)'/);
      // Convert filename back to common name for comparison
      const commonName = fileName.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      commonNameEnums.push({ enumName, commonName, fileName });
    });
  }
}

console.log(`✅ Extracted ${cardIdEnums.length} CardID enum entries`);
console.log(`✅ Extracted ${commonNameEnums.length} CommonName enum entries\n`);

// Verification results
const results = {
  totalCards: cards.length,
  missingCardIds: [],
  missingCommonNames: [],
  missingSpeciesFiles: [],
  missingLocalizations: [],
  missingDescriptions: [],
  extraSpeciesFiles: [],
  success: true
};

console.log('🔍 Verifying each card...\n');

// Check each card
cards.forEach(card => {
  const cardId = card.CardID;
  const commonName = card.CommonName;
  
  console.log(`Checking Card ${cardId}: ${commonName}`);
  
  // Check CardID enum
  const cardIdEnum = cardIdEnums.find(e => e.id === cardId);
  if (!cardIdEnum) {
    results.missingCardIds.push({ cardId, commonName });
    console.log(`  ❌ Missing CardID enum for ${cardId}`);
    results.success = false;
  } else {
    console.log(`  ✅ CardID enum: ${cardIdEnum.name}`);
  }
  
  // Check CommonName enum
  const commonNameEnum = commonNameEnums.find(e => e.commonName === commonName);
  if (!commonNameEnum) {
    results.missingCommonNames.push({ cardId, commonName });
    console.log(`  ❌ Missing CommonName enum for "${commonName}"`);
    results.success = false;
  } else {
    console.log(`  ✅ CommonName enum: ${commonNameEnum.enumName}`);
  }
  
  // Check species file
  const speciesFileName = commonName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  if (!speciesFiles.includes(speciesFileName)) {
    results.missingSpeciesFiles.push({ cardId, commonName, expectedFile: speciesFileName });
    console.log(`  ❌ Missing species file: ${speciesFileName}.json`);
    results.success = false;
  } else {
    console.log(`  ✅ Species file: ${speciesFileName}.json`);
  }
  
  // Check localization
  if (!localization.CardNames[cardId.toString()]) {
    results.missingLocalizations.push({ cardId, commonName });
    console.log(`  ❌ Missing localization for card ${cardId}`);
    results.success = false;
  } else {
    console.log(`  ✅ Localization: ${localization.CardNames[cardId.toString()]}`);
  }
  
  // Check description
  if (!localization.CardDescriptions || !localization.CardDescriptions[cardId.toString()]) {
    results.missingDescriptions.push({ cardId, commonName });
    console.log(`  ❌ Missing description for card ${cardId}`);
    results.success = false;
  } else {
    console.log(`  ✅ Description available`);
  }
  
  console.log('');
});

// Check for extra species files
const expectedSpeciesFiles = cards.map(card => 
  card.CommonName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
);

speciesFiles.forEach(file => {
  if (!expectedSpeciesFiles.includes(file)) {
    results.extraSpeciesFiles.push(file);
  }
});

// Print summary
console.log('📊 VERIFICATION SUMMARY');
console.log('========================\n');

if (results.success) {
  console.log('🎉 ALL CHECKS PASSED! Data consistency verified.');
} else {
  console.log('❌ ISSUES FOUND:');
  
  if (results.missingCardIds.length > 0) {
    console.log(`\n📝 Missing CardID enums (${results.missingCardIds.length}):`);
    results.missingCardIds.forEach(item => 
      console.log(`  - Card ${item.cardId}: ${item.commonName}`)
    );
  }
  
  if (results.missingCommonNames.length > 0) {
    console.log(`\n📝 Missing CommonName enums (${results.missingCommonNames.length}):`);
    results.missingCommonNames.forEach(item => 
      console.log(`  - Card ${item.cardId}: "${item.commonName}"`)
    );
  }
  
  if (results.missingSpeciesFiles.length > 0) {
    console.log(`\n📁 Missing species files (${results.missingSpeciesFiles.length}):`);
    results.missingSpeciesFiles.forEach(item => 
      console.log(`  - ${item.expectedFile}.json for "${item.commonName}"`)
    );
  }
  
  if (results.missingLocalizations.length > 0) {
    console.log(`\n🌐 Missing localizations (${results.missingLocalizations.length}):`);
    results.missingLocalizations.forEach(item => 
      console.log(`  - Card ${item.cardId}: ${item.commonName}`)
    );
  }
  
  if (results.missingDescriptions.length > 0) {
    console.log(`\n📖 Missing descriptions (${results.missingDescriptions.length}):`);
    results.missingDescriptions.forEach(item => 
      console.log(`  - Card ${item.cardId}: ${item.commonName}`)
    );
  }
}

if (results.extraSpeciesFiles.length > 0) {
  console.log(`\n📁 Extra species files (${results.extraSpeciesFiles.length}):`);
  results.extraSpeciesFiles.forEach(file => 
    console.log(`  - ${file}.json (no matching card)`)
  );
}

console.log(`\n📈 STATISTICS:`);
console.log(`  Total cards: ${results.totalCards}`);
console.log(`  CardID enums: ${cardIdEnums.length}`);
console.log(`  CommonName enums: ${commonNameEnums.length}`);
console.log(`  Species files: ${speciesFiles.length}`);
console.log(`  Localized names: ${Object.keys(localization.CardNames).length}`);
console.log(`  Card descriptions: ${localization.CardDescriptions ? Object.keys(localization.CardDescriptions).length : 0}`);

process.exit(results.success ? 0 : 1);
