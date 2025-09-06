/**
 * BioMasters TCG - Localization System Demo
 * 
 * This file demonstrates how to use the new localization system
 * with the updated BioMastersEngine.
 */

import { createBioMastersEngine } from '../shared/game-data-loader';
import { LocalizationManager, JSONFileDataLoader } from '../shared/localization-manager';
import { SupportedLanguage } from '../shared/text-ids';
import { CardId } from '../shared/enums';

/**
 * Demo function showing how to create and use the localized game engine
 */
async function demonstrateLocalizationSystem() {
  console.log('🌍 BioMasters TCG Localization System Demo');
  console.log('==========================================');

  try {
    // Create English engine
    console.log('\n📚 Creating English game engine...');
    const englishEngine = await createBioMastersEngine(SupportedLanguage.ENGLISH);

    // Create Spanish engine
    console.log('📚 Creating Spanish game engine...');
    const spanishEngine = await createBioMastersEngine(SupportedLanguage.SPANISH);

    // Demonstrate card name localization
    console.log('\n🃏 Card Name Localization Demo:');
    console.log('-------------------------------');
    
    // Get the Oak Tree card from the database
    const cardId = CardId.OAK_TREE;
    const cardData = englishEngine.cardDatabase.get(cardId);
    
    if (cardData) {
      const englishName = englishEngine.getCardName(cardData);
      const spanishName = spanishEngine.getCardName(cardData);
      const scientificName = englishEngine.getScientificName(cardData);
      
      console.log(`Card ID: ${cardId}`);
      console.log(`English: ${englishName}`);
      console.log(`Spanish: ${spanishName}`);
      console.log(`Scientific: ${scientificName}`);
      console.log(`Description (EN): ${englishEngine.getCardDescription(cardData)}`);
      console.log(`Description (ES): ${spanishEngine.getCardDescription(cardData)}`);
    }

    // Demonstrate ability localization
    console.log('\n⚡ Ability Localization Demo:');
    console.log('-----------------------------');
    
    const abilityId = 1; // Watershed Predator
    const abilityData = englishEngine.abilityDatabase.get(abilityId);
    
    if (abilityData) {
      const englishAbilityName = englishEngine.getAbilityName(abilityData);
      const spanishAbilityName = spanishEngine.getAbilityName(abilityData);
      
      console.log(`Ability ID: ${abilityId}`);
      console.log(`English: ${englishAbilityName}`);
      console.log(`Spanish: ${spanishAbilityName}`);
      console.log(`Description (EN): ${englishEngine.getAbilityDescription(abilityData)}`);
      console.log(`Description (ES): ${spanishEngine.getAbilityDescription(abilityData)}`);
    }

    // Demonstrate UI text localization
    console.log('\n🖥️ UI Text Localization Demo:');
    console.log('-----------------------------');
    
    const uiTexts = [
      'UI_PLAY_CARD',
      'UI_ATTACK',
      'UI_END_TURN',
      'UI_YOUR_TURN',
      'UI_ENERGY'
    ];
    
    for (const textId of uiTexts) {
      const englishText = englishEngine.localizationManager.getUIText(textId as any);
      const spanishText = spanishEngine.localizationManager.getUIText(textId as any);
      console.log(`${textId}: EN="${englishText}" | ES="${spanishText}"`);
    }

    // Demonstrate language switching
    console.log('\n🔄 Language Switching Demo:');
    console.log('---------------------------');
    
    const localizationManager = new LocalizationManager(
      new JSONFileDataLoader('/data/localization')
    );
    
    // Load English first
    await localizationManager.loadLanguage('en');
    console.log(`Current language: ${localizationManager.getCurrentLanguage()}`);
    console.log(`Play Card: ${localizationManager.getUIText('UI_PLAY_CARD' as any)}`);
    
    // Switch to Spanish
    await localizationManager.loadLanguage('es');
    console.log(`Current language: ${localizationManager.getCurrentLanguage()}`);
    console.log(`Play Card: ${localizationManager.getUIText('UI_PLAY_CARD' as any)}`);

    // Show available languages
    const availableLanguages = await localizationManager.getAvailableLanguages();
    console.log(`Available languages: ${availableLanguages.join(', ')}`);

    console.log('\n✅ Localization demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in localization demo:', error);
  }
}

/**
 * Demo function showing how to create a game with language selection
 */
async function demonstrateLanguageSelection() {
  console.log('\n🎮 Language Selection Demo');
  console.log('==========================');

  // Simulate user language preference
  const userLanguagePreference = SupportedLanguage.SPANISH;

  console.log(`User selected language: ${userLanguagePreference}`);

  // Create game engine with user's preferred language
  const gameEngine = await createBioMastersEngine(userLanguagePreference);
  
  // Initialize a new game
  const gameState = gameEngine.initializeGame(['player1', 'player2']);
  
  if (gameState) {
    console.log('🎯 Game initialized with localized content');
    console.log(`Current phase: ${gameState.currentPhase}`);
    console.log(`Current player: ${gameState.currentPlayerId}`);
    
    // Show localized UI elements that would appear in the game
    const uiElements = {
      playCard: gameEngine.localizationManager.getUIText('UI_PLAY_CARD' as any),
      yourTurn: gameEngine.localizationManager.getUIText('UI_YOUR_TURN' as any),
      energy: gameEngine.localizationManager.getUIText('UI_ENERGY' as any),
      hand: gameEngine.localizationManager.getUIText('UI_HAND' as any)
    };
    
    console.log('🖥️ Localized UI elements:');
    Object.entries(uiElements).forEach(([key, value]) => {
      console.log(`  ${key}: "${value}"`);
    });
  }
}

/**
 * Run the demo
 */
async function runDemo() {
  await demonstrateLocalizationSystem();
  await demonstrateLanguageSelection();
}

// Export for use in other files
export {
  demonstrateLocalizationSystem,
  demonstrateLanguageSelection,
  runDemo
};

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}
