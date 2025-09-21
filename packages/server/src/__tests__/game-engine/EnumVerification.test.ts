/**
 * Enum Verification Test
 * Simple test to verify enum imports work correctly
 */

import { GamePhase } from '@kelseyabreu/shared';

describe('Enum Verification', () => {
  test('should import and access GamePhase enum correctly', () => {
    // Test that GamePhase exists
    expect(GamePhase).toBeDefined();

    // Test individual values
    expect(GamePhase.SETUP).toBe('setup');
    expect(GamePhase.PLAYING).toBe('playing');
    expect(GamePhase.ENDED).toBe('ended');

    // Test FINAL_TURN specifically
    console.log('FINAL_TURN value:', GamePhase.FINAL_TURN);
    expect(GamePhase.FINAL_TURN).toBeDefined();
    expect(GamePhase.FINAL_TURN).toBe('final_turn');

    console.log('✅ GamePhase enum imported and verified successfully');
  });

  test('should import using ES6 syntax', () => {
    // Test ES6 import (already done at top of file)
    console.log('ES6 GamePhase:', GamePhase);
    console.log('ES6 FINAL_TURN:', GamePhase?.FINAL_TURN);

    expect(GamePhase).toBeDefined();
    expect(GamePhase.FINAL_TURN).toBe('final_turn');

    console.log('✅ ES6 import syntax verified successfully');
  });
});
