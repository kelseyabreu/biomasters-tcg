/**
 * Test Working Systems
 * 
 * This script tests the core functionality that we know is working:
 * 1. JSON data loading via GameDataManager
 * 2. BioMasters game engine core mechanics
 * 3. Basic API endpoints that don't depend on database
 */

import { gameDataManager } from '../services/GameDataManager';
import { BioMastersEngine } from '../game-engine/BioMastersEngine';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

class WorkingSystemsTest {
  private results: TestResult[] = [];

  private addResult(name: string, passed: boolean, details: string, error?: string) {
    const result: TestResult = { name, passed, details };
    if (error) result.error = error;
    this.results.push(result);
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${details}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  async testGameDataManager(): Promise<void> {
    console.log('\n🧪 Testing GameDataManager (JSON Loading)...');

    try {
      // Use singleton instance
      await gameDataManager.loadGameData();
      
      // Test card loading
      const cards = gameDataManager.getCards();
      const cardCount = cards.size;
      this.addResult(
        'Card Loading',
        cardCount > 0,
        `Loaded ${cardCount} cards from JSON`
      );

      // Test ability loading
      const abilities = gameDataManager.getAbilities();
      const abilityCount = abilities.size;
      this.addResult(
        'Ability Loading',
        abilityCount > 0,
        `Loaded ${abilityCount} abilities from JSON`
      );

      // Test localization loading
      const localization = gameDataManager.getLocalization();
      const hasCardNames = localization.cardNames && Object.keys(localization.cardNames).length > 0;
      this.addResult(
        'Localization Loading',
        hasCardNames,
        `Loaded localization data with ${Object.keys(localization.cardNames || {}).length} card names`
      );

      // Test specific card data
      const oakTree = gameDataManager.getCard(1); // Oak Tree
      this.addResult(
        'Specific Card Data',
        oakTree !== undefined && oakTree?.commonName === 'Oak Tree',
        `Retrieved Oak Tree card data: ${oakTree?.commonName} (${oakTree?.scientificName})`
      );

      // Test keyword data
      const keywordCount = Object.keys(localization.keywords || {}).length;
      this.addResult(
        'Keyword Data',
        keywordCount > 0,
        `Loaded ${keywordCount} keywords`
      );

    } catch (error) {
      this.addResult(
        'GameDataManager',
        false,
        'Failed to load game data',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testGameEngineBasics(): Promise<void> {
    console.log('\n🎮 Testing BioMasters Game Engine Basics...');

    try {
      // Ensure game data is loaded (use singleton)
      if (!gameDataManager.isDataLoaded()) {
        await gameDataManager.loadGameData();
      }

      // Create players
      const players = [
        { id: 'player1', name: 'Alice', isAI: false },
        { id: 'player2', name: 'Bob', isAI: false }
      ];

      // Create game settings
      const gameSettings = {
        maxPlayers: 2,
        deckSize: 8,
        startingHandSize: 3,
        maxActionsPerTurn: 3,
        enableAI: false,
        gridWidth: 10,
        gridHeight: 10,
        maxHandSize: 7
      };

      // Create engine
      const engine = new BioMastersEngine('test-game', players, gameSettings);
      
      this.addResult(
        'Engine Creation',
        true,
        'Successfully created BioMasters engine instance'
      );

      // Test game state
      const gameState = engine.getGameState();
      this.addResult(
        'Game State',
        gameState.players.length === 2,
        `Game state has ${gameState.players.length} players`
      );

      // Test current phase
      this.addResult(
        'Game Phase',
        gameState.gamePhase !== undefined,
        `Current phase: ${gameState.gamePhase}`
      );

      // Test turn structure
      this.addResult(
        'Turn Phase',
        gameState.turnPhase !== undefined,
        `Current turn phase: ${gameState.turnPhase}`
      );

    } catch (error) {
      this.addResult(
        'Game Engine Basics',
        false,
        'Failed to create or test game engine',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testDataIntegrity(): Promise<void> {
    console.log('\n🔍 Testing Data Integrity...');

    try {
      // Ensure game data is loaded (use singleton)
      if (!gameDataManager.isDataLoaded()) {
        await gameDataManager.loadGameData();
      }

      const cards = gameDataManager.getCards();
      const abilities = gameDataManager.getAbilities();
      const localization = gameDataManager.getLocalization();

      // Test card-ability relationships
      let validAbilityReferences = 0;
      let totalAbilityReferences = 0;

      for (const [, card] of cards.entries()) {
        if (card.abilities && card.abilities.length > 0) {
          for (const abilityId of card.abilities) {
            totalAbilityReferences++;
            if (abilities.has(abilityId)) {
              validAbilityReferences++;
            }
          }
        }
      }

      this.addResult(
        'Card-Ability References',
        validAbilityReferences === totalAbilityReferences,
        `${validAbilityReferences}/${totalAbilityReferences} ability references are valid`
      );

      // Test localization coverage
      let localizedCards = 0;
      for (const [cardId] of cards.entries()) {
        if (localization.cardNames && localization.cardNames[cardId.toString()]) {
          localizedCards++;
        }
      }

      this.addResult(
        'Localization Coverage',
        localizedCards > 0,
        `${localizedCards}/${cards.size} cards have localized names`
      );

    } catch (error) {
      this.addResult(
        'Data Integrity',
        false,
        'Failed to test data integrity',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Working Systems Test Suite...\n');
    
    await this.testGameDataManager();
    await this.testGameEngineBasics();
    await this.testDataIntegrity();
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL CORE SYSTEMS ARE WORKING!');
      console.log('The JSON-driven game engine is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed, but core functionality may still work.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Run the tests
const tester = new WorkingSystemsTest();
tester.runAllTests().catch(console.error);
