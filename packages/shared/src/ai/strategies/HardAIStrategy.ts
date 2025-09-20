/**
 * Hard AI Strategy - Advanced strategic decisions with deep game awareness
 * Currently uses Easy AI implementation - will be enhanced later
 */

import { GameState, Position } from '../../types';
import { BaseAIStrategy, AIDifficulty } from '../AIStrategy';

/**
 * Hard AI Strategy Implementation
 * TODO: Implement advanced strategic behaviors:
 * - Evaluate trophic chain opportunities
 * - Consider domain compatibility
 * - Plan multiple moves ahead
 * - Optimize energy usage
 * - Strategic passing only when beneficial
 * - Longer thinking time (2-3 seconds)
 */
export class HardAIStrategy extends BaseAIStrategy {
  constructor() {
    super(AIDifficulty.HARD);
  }

  /**
   * Hard AI: For now, uses random selection like Easy AI
   * TODO: Implement advanced strategic card selection
   */
  override selectCard(hand: string[], gameState: GameState, playerId: string): string {
    console.log(`🤖 [HARD] AI selecting card (currently using random selection)`);
    
    // For now, use base class random selection
    // TODO: Add advanced strategic selection logic
    return super.selectCard(hand, gameState, playerId);
  }

  /**
   * Hard AI: For now, uses random position like Easy AI
   * TODO: Implement advanced strategic position selection
   */
  override selectPosition(validPositions: Position[], gameState: GameState, cardId: string, playerId: string): Position {
    console.log(`🤖 [HARD] AI selecting position (currently using random selection)`);
    
    // For now, use base class random selection
    // TODO: Add advanced strategic position logic
    return super.selectPosition(validPositions, gameState, cardId, playerId);
  }

  /**
   * Hard AI: Uses base class pass logic (5% chance)
   * TODO: Add advanced strategic passing logic
   */
  override shouldPassTurn(hand: string[], actionsRemaining: number, gameState: GameState, playerId: string): boolean {
    console.log(`🤖 [HARD] AI considering pass turn (currently using base logic)`);
    
    // Uses base class logic with 5% pass chance
    // TODO: Add advanced strategic passing considerations
    return super.shouldPassTurn(hand, actionsRemaining, gameState, playerId);
  }

  /**
   * Hard AI: Longer thinking time (2-3 seconds)
   */
  override getThinkingDelay(): number {
    const delay = super.getThinkingDelay();
    console.log(`🤖 [HARD] AI thinking for ${Math.round(delay)}ms`);
    return delay;
  }
}
