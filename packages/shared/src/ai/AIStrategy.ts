/**
 * AI Strategy Interface and Base Implementation for BioMasters TCG
 */

import { GameState, Position } from '../types';

/**
 * Notification callback for AI actions
 */
export type AINotificationCallback = (message: string, type: 'success' | 'secondary' | 'primary', icon?: string) => void;

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
   * Set notification callback for AI actions
   */
  setNotificationCallback(callback: AINotificationCallback | null): void;

  /**
   * Set card data and localization functions
   */
  setCardDataFunctions(getCardData: CardDataLookup, getCardName: CardNameLookup): void;

  /**
   * Notify when AI passes turn
   */
  notifyPassTurn(gameState: GameState, playerId: string): void;

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
 * Card data lookup function type
 */
export type CardDataLookup = (cardId: string) => any;

/**
 * Card name lookup function type
 */
export type CardNameLookup = (cardData: any) => string;

/**
 * Base AI Strategy - provides default implementations that can be overridden
 */
export abstract class BaseAIStrategy implements AIStrategy {
  protected difficulty: AIDifficulty;
  protected notificationCallback: AINotificationCallback | null = null;
  protected getCardData: CardDataLookup | null = null;
  protected getCardName: CardNameLookup | null = null;

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
  }

  /**
   * Set card data and localization functions
   */
  setCardDataFunctions(getCardData: CardDataLookup, getCardName: CardNameLookup): void {
    this.getCardData = getCardData;
    this.getCardName = getCardName;
  }

  /**
   * Set notification callback for AI actions
   */
  setNotificationCallback(callback: AINotificationCallback | null): void {
    this.notificationCallback = callback;
  }

  /**
   * Helper method to send notifications
   */
  protected notify(message: string, type: 'success' | 'secondary' | 'primary' = 'secondary', icon?: string): void {
    if (this.notificationCallback) {
      this.notificationCallback(message, type, icon);
    }
  }

  /**
   * Notify when AI passes turn
   */
  notifyPassTurn(gameState: GameState, playerId: string): void {
    const aiPlayer = gameState.players?.find(p => p.id === playerId);
    if (aiPlayer) {
      this.notify(`${aiPlayer.name} passed turn`, 'secondary', 'checkmark-outline');
    }
  }

  /**
   * Default card selection - random choice
   * Override in subclasses for smarter selection
   */
  selectCard(hand: string[], _gameState: GameState, _playerId: string): string {
    if (hand.length === 0) {
      throw new Error('Cannot select card from empty hand');
    }

    console.log(`🤖 [${this.difficulty.toUpperCase()}] AI selecting random card from ${hand.length} cards`);
    const randomIndex = Math.floor(Math.random() * hand.length);
    return hand[randomIndex]!; // Safe because we check for empty hand above
  }

  /**
   * Default position selection - random choice
   * Override in subclasses for strategic placement
   */
  selectPosition(validPositions: Position[], _gameState: GameState, _cardId: string, _playerId: string): Position {
    if (validPositions.length === 0) {
      throw new Error('Cannot select position from empty valid positions');
    }

    console.log(`🤖 [${this.difficulty.toUpperCase()}] AI selecting random position from ${validPositions.length} options`);
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex]!; // Safe because we check for empty positions above
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
  protected canMakeAnyMove(hand: string[], _gameState: GameState, _playerId: string): boolean {
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
   * Protected helper: Get card data using injected lookup function
   */
  protected getCardDataById(cardId: string): any {
    if (!this.getCardData) {
      console.warn('Card data lookup function not set in AI strategy');
      return null;
    }
    return this.getCardData(cardId);
  }

  /**
   * Protected helper: Get localized card name using injected lookup function
   */
  protected getLocalizedCardName(cardData: any): string {
    if (!this.getCardName) {
      console.warn('Card name lookup function not set in AI strategy');
      return 'Unknown Card';
    }
    return this.getCardName(cardData);
  }

  /**
   * Protected helper: Evaluate position strategic value
   */
  protected evaluatePositionValue(_position: Position, _cardId: string, _gameState: GameState): number {
    // Base implementation returns random value
    // Override in subclasses for actual strategic evaluation
    return Math.random();
  }

  /**
   * Protected helper: Check if card can form trophic chains
   */
  protected canFormTrophicChain(_cardId: string, _position: Position, _gameState: GameState): boolean {
    // Base implementation returns false
    // Override in subclasses for actual trophic chain detection
    return false;
  }
}
