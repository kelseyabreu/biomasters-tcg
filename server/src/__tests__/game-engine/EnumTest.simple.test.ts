/**
 * Simple Enum Test
 * Tests that enums are properly accessible
 */

import { GamePhase, TurnPhase } from '../../../../shared/enums';

describe('Enum Access Tests', () => {
  test('should be able to import and access enums', () => {
    console.log('GamePhase object:', GamePhase);
    console.log('Available GamePhase values:', Object.keys(GamePhase));
    console.log('GamePhase.SETUP:', GamePhase.SETUP);
    console.log('GamePhase.PLAYING:', GamePhase.PLAYING);
    console.log('GamePhase.FINAL_TURN:', GamePhase.FINAL_TURN);
    console.log('GamePhase.ENDED:', GamePhase.ENDED);

    expect(GamePhase.SETUP).toBe('setup');
    expect(GamePhase.PLAYING).toBe('playing');
    expect(GamePhase.ENDED).toBe('ended');

    // Test if FINAL_TURN exists
    expect(GamePhase.FINAL_TURN).toBeDefined();
    expect(GamePhase.FINAL_TURN).toBe('final_turn');
  });

  test('should demonstrate final turn enum usage', () => {
    // Test enum comparison
    const currentPhase = GamePhase.FINAL_TURN;
    expect(currentPhase).toBe('final_turn');

    // Test enum in conditional
    if (currentPhase === GamePhase.FINAL_TURN) {
      console.log('✅ Final turn phase detected correctly');
      expect(true).toBe(true);
    } else {
      fail('Final turn phase not detected');
    }
  });

  test('should have all turn phases', () => {
    expect(TurnPhase.READY).toBe('ready');
    expect(TurnPhase.DRAW).toBe('draw');
    expect(TurnPhase.ACTION).toBe('action');
    expect(TurnPhase.END).toBe('end');

    console.log('✅ All turn phases verified');
  });
});
