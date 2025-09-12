/**
 * AI Strategy Interface and Base Implementation for BioMasters TCG
 */

import { GameState, Position } from '../types';

/**
 * AI Difficulty levels
 */
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

/**
 * AI Strategy Interface - defines all AI decision-making methods
 */
export interface AIStrategy {
  /**
   * Select a card from the AI's hand to play
   */
  selectCard(hand: string[], gameState: GameState, playerId: string): string;

  /**
   * Select a position from valid positions to place the card
   */
  selectPosition(validPositions: Position[], gameState: GameState, cardId: string, playerId: string): Position;

  /**
   * Decide whether to pass the turn instead of playing a card
   */
  shouldPassTurn(hand: string[], actionsRemaining: number, gameState: GameState, playerId: string): boolean;

  /**
   * Get the thinking delay before making a move (for UX)
   */
  getThinkingDelay(): number;

  /**
   * Get the difficulty level of this strategy
   */
  getDifficulty(): AIDifficulty;
}

/**
 * Base AI Strategy - provides default implementations that can be overridden
 */
export abstract class BaseAIStrategy implements AIStrategy {
  protected difficulty: AIDifficulty;

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
  }

  /**
   * Default card selection - random choice
   * Override in subclasses for smarter selection
   */
  selectCard(hand: string[], gameState: GameState, playerId: string): string {
    if (hand.length === 0) {
      throw new Error('Cannot select card from empty hand');
    }
    
    console.log(`🤖 [${this.difficulty.toUpperCase()}] AI selecting random card from ${hand.length} cards`);
    return hand[Math.floor(Math.random() * hand.length)];
  }

  /**
   * Default position selection - random choice
   * Override in subclasses for strategic placement
   */
  selectPosition(validPositions: Position[], gameState: GameState, cardId: string, playerId: string): Position {
    if (validPositions.length === 0) {
      throw new Error('Cannot select position from empty valid positions');
    }
    
    console.log(`🤖 [${this.difficulty.toUpperCase()}] AI selecting random position from ${validPositions.length} options`);
    return validPositions[Math.floor(Math.random() * validPositions.length)];
  }

  /**
   * Default pass turn logic - random chance based on difficulty
   * Override in subclasses for strategic passing
   */
  shouldPassTurn(hand: string[], actionsRemaining: number, gameState: GameState, playerId: string): boolean {
    // First check: If no actions remaining, must pass
    if (actionsRemaining <= 0) {
      console.log(`🤖 [${this.difficulty.toUpperCase()}] AI must pass - no actions remaining`);
      return true;
    }

    // Second check: If no valid moves available, must pass
    if (!this.canMakeAnyMove(hand, gameState, playerId)) {
      console.log(`🤖 [${this.difficulty.toUpperCase()}] AI must pass - no valid moves available`);
      return true;
    }

    // Third check: Random chance based on difficulty (only if moves are available)
    const passChance = this.getBasePassChance();
    const shouldPass = Math.random() < passChance;

    console.log(`🤖 [${this.difficulty.toUpperCase()}] AI pass turn check: ${shouldPass} (chance: ${passChance})`);
    return shouldPass;
  }

  /**
   * Check if AI can make any valid moves with current hand
   * Override in subclasses for game-specific logic
   */
  protected canMakeAnyMove(hand: string[], gameState: GameState, playerId: string): boolean {
    // Base implementation: assume moves are available if hand is not empty
    // Subclasses should implement actual move validation
    return hand.length > 0;
  }

  /**
   * Default thinking delay - varies by difficulty
   * Override in subclasses for different timing
   */
  getThinkingDelay(): number {
    const baseDelay = this.getBaseThinkingDelay();
    const randomVariation = Math.random() * 1000; // 0-1 second variation
    return baseDelay + randomVariation;
  }

  /**
   * Get the difficulty level
   */
  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  /**
   * Protected helper: Get base pass chance for this difficulty
   */
  protected getBasePassChance(): number {
    switch (this.difficulty) {
      case AIDifficulty.EASY: return 0.3;   // 30% chance to pass randomly
      case AIDifficulty.MEDIUM: return 0.15; // 15% chance to pass randomly  
      case AIDifficulty.HARD: return 0.05;   // 5% chance to pass randomly
      default: return 0.2;
    }
  }

  /**
   * Protected helper: Get base thinking delay for this difficulty
   */
  protected getBaseThinkingDelay(): number {
    switch (this.difficulty) {
      case AIDifficulty.EASY: return 1000;   // 1-2 seconds
      case AIDifficulty.MEDIUM: return 1500; // 1.5-2.5 seconds
      case AIDifficulty.HARD: return 2000;   // 2-3 seconds
      default: return 1500;
    }
  }

  /**
   * Protected helper: Get card data from game state
   */
  protected getCardData(cardId: string, gameState: GameState): any {
    // Helper method for subclasses to access card data
    // Implementation depends on how card data is stored in gameState
    return null; // Placeholder - implement based on actual game state structure
  }

  /**
   * Protected helper: Evaluate position strategic value
   */
  protected evaluatePositionValue(position: Position, cardId: string, gameState: GameState): number {
    // Base implementation returns random value
    // Override in subclasses for actual strategic evaluation
    return Math.random();
  }

  /**
   * Protected helper: Check if card can form trophic chains
   */
  protected canFormTrophicChain(cardId: string, position: Position, gameState: GameState): boolean {
    // Base implementation returns false
    // Override in subclasses for actual trophic chain detection
    return false;
  }
}
