/**
 * Easy AI Strategy - Random decisions with basic game awareness
 */

import { GameState, Position } from '../../types';
import { BaseAIStrategy, AIDifficulty } from '../AIStrategy';

/**
 * Easy AI Strategy Implementation
 * - Selects cards randomly
 * - Places cards at random valid positions
 * - Passes turn randomly (30% chance)
 * - Quick thinking time (1-2 seconds)
 */
export class EasyAIStrategy extends BaseAIStrategy {
  constructor() {
    super(AIDifficulty.EASY);
  }

  /**
   * Override to use actual game engine validation
   */
  protected override canMakeAnyMove(hand: string[], _gameState: any, _playerId: string): boolean {
    // For Easy AI, we'll implement a simple check
    // In a real implementation, this would use the game engine's validation
    console.log(`🤖 [EASY] Checking if AI can make moves with ${hand.length} cards`);

    // Simple check: if hand is empty, no moves possible
    if (hand.length === 0) {
      console.log(`🤖 [EASY] No moves possible - hand is empty`);
      return false;
    }

    // For now, assume moves are possible if hand has cards
    // TODO: Integrate with actual game engine validation
    console.log(`🤖 [EASY] Moves available - hand has ${hand.length} cards`);
    return true;
  }

  /**
   * Easy AI: Select card completely randomly
   * No strategic considerations
   */
  override selectCard(hand: string[], gameState: GameState, playerId: string): string {
    console.log(`🤖 [EASY] AI has ${hand.length} cards in hand`);
    
    // Use base class random selection
    const selectedCard = super.selectCard(hand, gameState, playerId);
    
    console.log(`🤖 [EASY] AI selected card: ${selectedCard}`);
    return selectedCard;
  }

  /**
   * Easy AI: Select position completely randomly
   * No strategic placement considerations
   */
  override selectPosition(validPositions: Position[], gameState: GameState, cardId: string, playerId: string): Position {
    console.log(`🤖 [EASY] AI has ${validPositions.length} valid positions for card ${cardId}`);
    
    // Use base class random selection
    const selectedPosition = super.selectPosition(validPositions, gameState, cardId, playerId);
    
    console.log(`🤖 [EASY] AI selected position: (${selectedPosition.x}, ${selectedPosition.y})`);
    return selectedPosition;
  }

  /**
   * Easy AI: Pass turn randomly with 30% chance
   * No strategic passing considerations
   */
  override shouldPassTurn(hand: string[], actionsRemaining: number, gameState: GameState, playerId: string): boolean {
    // Easy AI might pass even when it has cards and actions
    const shouldPass = super.shouldPassTurn(hand, actionsRemaining, gameState, playerId);
    
    if (shouldPass) {
      console.log(`🤖 [EASY] AI decided to pass turn randomly`);
    } else {
      console.log(`🤖 [EASY] AI decided to continue playing`);
    }
    
    return shouldPass;
  }

  /**
   * Easy AI: Quick thinking time
   * 1-2 seconds to make it feel natural but not slow
   */
  override getThinkingDelay(): number {
    const delay = super.getThinkingDelay();
    console.log(`🤖 [EASY] AI thinking for ${Math.round(delay)}ms`);
    return delay;
  }
}
