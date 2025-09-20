/**
 * Enum Verification Test
 * Simple test to verify enum imports work correctly
 */

describe('Enum Verification', () => {
  test('should import and access GamePhase enum correctly', () => {
    // Use dynamic import to test enum loading
    const enums = require('../../../../shared/enums');
    
    console.log('Enums object:', Object.keys(enums));
    console.log('GamePhase:', enums.GamePhase);
    console.log('GamePhase keys:', Object.keys(enums.GamePhase || {}));
    console.log('GamePhase values:', Object.values(enums.GamePhase || {}));
    
    // Test that GamePhase exists
    expect(enums.GamePhase).toBeDefined();
    
    // Test individual values
    expect(enums.GamePhase.SETUP).toBe('setup');
    expect(enums.GamePhase.PLAYING).toBe('playing');
    expect(enums.GamePhase.ENDED).toBe('ended');
    
    // Test FINAL_TURN specifically
    console.log('FINAL_TURN value:', enums.GamePhase.FINAL_TURN);
    expect(enums.GamePhase.FINAL_TURN).toBeDefined();
    expect(enums.GamePhase.FINAL_TURN).toBe('final_turn');
  });

  test('should import using ES6 syntax', () => {
    // Test ES6 import
    const { GamePhase } = require('../../../../shared/enums');
    
    console.log('ES6 GamePhase:', GamePhase);
    console.log('ES6 FINAL_TURN:', GamePhase?.FINAL_TURN);
    
    expect(GamePhase).toBeDefined();
    expect(GamePhase.FINAL_TURN).toBe('final_turn');
  });
});
