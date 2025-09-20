/**
 * Base Game Engine Implementation
 * Provides common functionality for all game engines
 * Implements shared logic to reduce duplication
 */

import {
  IGameEngine,
  GameMode,
  UnifiedGameSettings,
  UnifiedGameAction,
  UnifiedActionResult,
  GameEngineData
} from './IGameEngine';
import { GamePhase } from '../enums';
import { GameState, Position } from '../types';
import { ILocalizationManager } from '../localization-manager';

/**
 * Abstract base class for all game engines
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseGameEngine implements IGameEngine {
  // Protected properties accessible to subclasses
  protected gameState: GameState | null = null;
  protected readonly cardDatabase: Map<number, any>;
  protected readonly abilityDatabase: Map<number, any>;
  protected readonly keywordDatabase: Map<number, string>;
  protected readonly localizationManager: ILocalizationManager;

  constructor(data: GameEngineData) {
    this.cardDatabase = data.cardDatabase;
    this.abilityDatabase = data.abilityDatabase;
    this.keywordDatabase = data.keywordDatabase;
    this.localizationManager = data.localizationManager;
    
    console.log(`🎮 Game Engine initialized with data: ${this.cardDatabase.size} cards, ${this.abilityDatabase.size} abilities, ${this.keywordDatabase.size} keywords`);
  }

  // Abstract properties that must be implemented by subclasses
  abstract readonly mode: GameMode;

  // Concrete implementations of common functionality
  get isInitialized(): boolean {
    return this.gameState !== null;
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  loadState(state: GameState): void {
    this.gameState = { ...state };
    console.log(`🔄 ${this.mode} Engine state loaded: ${state.gameId}`);
  }

  getCardData(cardId: number): any {
    return this.cardDatabase.get(cardId);
  }

  getAbilityData(abilityId: number): any {
    return this.abilityDatabase.get(abilityId);
  }

  // Localization methods
  getCardName(cardData: any): string {
    return this.localizationManager.getCardName(cardData.nameId);
  }

  getScientificName(cardData: any): string {
    return this.localizationManager.getScientificName(cardData.scientificNameId);
  }

  getCardDescription(cardData: any): string {
    return this.localizationManager.getCardDescription(cardData.descriptionId);
  }

  // Common validation logic
  validateAction(action: UnifiedGameAction): boolean {
    if (!this.gameState) {
      console.warn(`❌ ${this.mode} Engine: Cannot validate action - no game state`);
      return false;
    }

    if (!action.playerId || !action.type) {
      console.warn(`❌ ${this.mode} Engine: Invalid action - missing required fields`);
      return false;
    }

    return this.validateModeSpecificAction(action);
  }

  // Common state queries
  getCurrentPlayer(): any {
    if (!this.gameState) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  isGameEnded(): boolean {
    return this.gameState?.gamePhase === GamePhase.FINAL_TURN || (this.gameState as any)?.gamePhase === 'ended' || (this.gameState as any)?.gamePhase === 'game_over';
  }

  // Protected helper methods for subclasses
  protected ensureGameInitialized(): GameState {
    if (!this.gameState) {
      throw new Error(`${this.mode} Engine: Game not initialized`);
    }
    return this.gameState;
  }

  protected createActionResult(
    isValid: boolean,
    newState?: GameState,
    errorMessage?: string,
    metadata?: any
  ): UnifiedActionResult {
    const result: UnifiedActionResult = {
      isValid
    };

    if (newState || this.gameState) {
      result.newState = newState || this.gameState!;
    }

    if (errorMessage) {
      result.errorMessage = errorMessage;
    }

    if (metadata) {
      result.metadata = metadata;
    }

    return result;
  }

  // Abstract methods that must be implemented by subclasses
  abstract initializeNewGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: UnifiedGameSettings
  ): GameState;

  abstract processAction(action: UnifiedGameAction): UnifiedActionResult;
  abstract getValidMoves(playerId: string, cardId?: string): Position[];
  abstract getWinCondition(): any;
  
  // Protected abstract methods for mode-specific validation
  protected abstract validateModeSpecificAction(action: UnifiedGameAction): boolean;
}
