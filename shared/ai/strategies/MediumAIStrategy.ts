/**
 * Medium AI Strategy - Strategic decisions with some game awareness
 * Currently uses Easy AI implementation - will be enhanced later
 */

import { GameState, Position } from '../../types';
import { BaseAIStrategy, AIDifficulty } from '../AIStrategy';

/**
 * Medium AI Strategy Implementation
 * TODO: Implement strategic behaviors:
 * - Prefer high-value cards
 * - Consider adjacent cards for placement
 * - Pass turn more strategically
 * - Moderate thinking time (1.5-2.5 seconds)
 */
export class MediumAIStrategy extends BaseAIStrategy {
  constructor() {
    super(AIDifficulty.MEDIUM);
  }

  /**
   * Medium AI: For now, uses random selection like Easy AI
   * TODO: Implement strategic card selection
   */
  selectCard(hand: string[], gameState: GameState, playerId: string): string {
    console.log(`🤖 [MEDIUM] AI selecting card (currently using random selection)`);
    
    // For now, use base class random selection
    // TODO: Add strategic selection logic
    return super.selectCard(hand, gameState, playerId);
  }

  /**
   * Medium AI: For now, uses random position like Easy AI
   * TODO: Implement strategic position selection
   */
  selectPosition(validPositions: Position[], gameState: GameState, cardId: string, playerId: string): Position {
    console.log(`🤖 [MEDIUM] AI selecting position (currently using random selection)`);
    
    // For now, use base class random selection
    // TODO: Add strategic position logic
    return super.selectPosition(validPositions, gameState, cardId, playerId);
  }

  /**
   * Medium AI: Uses base class pass logic (15% chance)
   * TODO: Add strategic passing logic
   */
  shouldPassTurn(hand: string[], actionsRemaining: number, gameState: GameState, playerId: string): boolean {
    console.log(`🤖 [MEDIUM] AI considering pass turn (currently using base logic)`);
    
    // Uses base class logic with 15% pass chance
    // TODO: Add strategic passing considerations
    return super.shouldPassTurn(hand, actionsRemaining, gameState, playerId);
  }

  /**
   * Medium AI: Moderate thinking time (1.5-2.5 seconds)
   */
  getThinkingDelay(): number {
    const delay = super.getThinkingDelay();
    console.log(`🤖 [MEDIUM] AI thinking for ${Math.round(delay)}ms`);
    return delay;
  }
}
