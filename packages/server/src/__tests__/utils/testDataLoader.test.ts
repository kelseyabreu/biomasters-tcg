/**
 * Test Data Loader Tests
 * Verify that the test data loader works correctly
 */

import { loadTestGameData } from './testDataLoader';

describe('Test Data Loader', () => {
  test('should load test game data successfully', async () => {
    const gameData = await loadTestGameData();
    
    expect(gameData).toBeDefined();
    expect(gameData.cards).toBeDefined();
    expect(gameData.abilities).toBeDefined();
    expect(gameData.keywords).toBeDefined();
    expect(gameData.localizationManager).toBeDefined();
    
    // Verify we have some cards
    expect(gameData.cards.size).toBeGreaterThan(0);
    
    console.log(`Loaded ${gameData.cards.size} cards for testing`);
  });
});
