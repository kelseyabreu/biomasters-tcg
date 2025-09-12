/**
 * TCG Game Engine Implementation
 * Adapts the existing BioMastersEngine to the unified interface
 * Maintains all existing TCG functionality while providing consistent API
 */

import { BaseGameEngine } from './BaseGameEngine';
import { 
  GameMode, 
  UnifiedGameSettings, 
  UnifiedGameAction, 
  UnifiedActionResult 
} from './IGameEngine';
import { BioMastersEngine } from './BioMastersEngine';
import { GameState, Position } from '../types';
import { GameActionType } from '../enums';

/**
 * TCG Engine - Unified interface adapter for BioMastersEngine
 */
export class TCGEngine extends BaseGameEngine {
  readonly mode = GameMode.TCG;
  private coreEngine: BioMastersEngine;

  constructor(data: any) {
    super(data);

    console.log(`🏗️ TCG Engine: Constructor called with data:`, {
      cardDatabase: !!data.cardDatabase,
      cardCount: data.cardDatabase?.size || 0,
      abilityDatabase: !!data.abilityDatabase,
      abilityCount: data.abilityDatabase?.size || 0,
      keywordDatabase: !!data.keywordDatabase,
      keywordCount: data.keywordDatabase?.size || 0,
      localizationManager: !!data.localizationManager
    });

    // Initialize the existing BioMastersEngine with the same data
    this.coreEngine = new BioMastersEngine(
      data.cardDatabase,
      data.abilityDatabase,
      data.keywordDatabase,
      data.localizationManager
    );

    console.log(`✅ TCG Engine: Core engine initialized successfully`);
  }

  initializeNewGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: UnifiedGameSettings
  ): GameState {
    console.log(`🎯 TCG Engine: Initializing game ${gameId} with ${players.length} players`);
    console.log(`🎯 TCG Engine: Players:`, players.map(p => ({ id: p.id, name: p.name })));
    console.log(`🎯 TCG Engine: Settings:`, settings);

    // Convert unified settings to TCG-specific settings
    const tcgSettings = {
      maxPlayers: settings.maxPlayers,
      gridWidth: settings.gridWidth,
      gridHeight: settings.gridHeight,
      startingHandSize: settings.startingHandSize || 5,
      maxHandSize: settings.maxHandSize || 7,
      startingEnergy: settings.startingEnergy || 3,
      turnTimeLimit: settings.turnTimeLimit || 300
    };

    console.log(`🎯 TCG Engine: Converted TCG settings:`, tcgSettings);

    // Use the existing BioMastersEngine initialization
    const newState = this.coreEngine.initializeNewGame(gameId, players, tcgSettings);
    this.gameState = newState;

    console.log(`✅ TCG Engine: Game initialized successfully. Players:`, newState.players.map(p => ({
      id: p.id,
      name: p.name,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      energy: p.energy,
      isReady: p.isReady
    })));

    return newState;
  }

  processAction(action: UnifiedGameAction): UnifiedActionResult {
    if (!this.validateAction(action)) {
      return this.createActionResult(false, undefined, 'Invalid action');
    }

    try {
      // Convert unified action to BioMastersEngine format
      const tcgAction = {
        type: action.type,
        playerId: action.playerId,
        payload: action.payload
      };

      // Process through existing engine
      const result = this.coreEngine.processAction(tcgAction);
      
      // Update our state reference
      if (result.isValid && result.newState) {
        this.gameState = result.newState;
      }

      // Convert result to unified format
      return this.createActionResult(
        result.isValid,
        result.newState,
        result.errorMessage,
        {
          gameEnded: this.isGameEnded(),
          nextPlayer: this.getCurrentPlayer()?.id
        }
      );

    } catch (error: any) {
      console.error(`❌ TCG Engine: Action processing failed:`, error);
      return this.createActionResult(false, undefined, error.message);
    }
  }

  getValidMoves(playerId: string, cardId?: string): Position[] {
    console.log(`🎯 TCGEngine: Getting valid moves for playerId: ${playerId}, cardId: ${cardId}`);

    if (!this.gameState) {
      console.error(`❌ TCGEngine: No game state available`);
      return [];
    }

    try {
      // If no cardId provided, return empty array
      if (!cardId) {
        console.log(`⚠️ TCGEngine: No cardId provided, returning empty array`);
        return [];
      }

      // Find the player
      const player = this.gameState.players.find(p => p.id === playerId);
      if (!player) {
        console.error(`❌ TCGEngine: Player ${playerId} not found`);
        return [];
      }

      // Check if the card is in the player's hand
      if (!player.hand.includes(cardId)) {
        console.error(`❌ TCGEngine: Card ${cardId} not in player ${playerId}'s hand`);
        console.log(`🔍 Player hand:`, player.hand);
        return [];
      }

      console.log(`✅ TCGEngine: Card ${cardId} found in player ${playerId}'s hand`);

      // Use the core engine to calculate valid positions
      const validPositions: Position[] = [];
      const gridWidth = this.gameState.gameSettings.gridWidth;
      const gridHeight = this.gameState.gameSettings.gridHeight;

      console.log(`🔍 TCGEngine: Checking grid ${gridWidth}x${gridHeight} for valid positions`);

      // Check each position on the grid
      for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
          const position = { x, y };

          // Use the core engine's validateCardPlay method to check if this position is valid
          const validation = this.coreEngine.validateCardPlay(cardId, position, playerId);
          if (validation.isValid) {
            validPositions.push(position);
            console.log(`✅ TCGEngine: Valid position found: (${x}, ${y})`);
          } else {
            console.log(`❌ TCGEngine: Invalid position (${x}, ${y}): ${validation.errorMessage}`);
          }
        }
      }

      console.log(`🎯 TCGEngine: Found ${validPositions.length} valid positions:`, validPositions);
      return validPositions;

    } catch (error) {
      console.error(`❌ TCG Engine: Failed to get valid moves:`, error);
      return [];
    }
  }

  getWinCondition(): any {
    if (!this.isGameEnded()) return null;
    
    try {
      // Use existing BioMastersEngine win condition logic
      return this.coreEngine.getGameResult();
    } catch (error) {
      console.error(`❌ TCG Engine: Failed to get win condition:`, error);
      return null;
    }
  }

  protected validateModeSpecificAction(action: UnifiedGameAction): boolean {
    // TCG-specific validation logic
    switch (action.type) {
      case GameActionType.PLAY_CARD:
        return !!(action.payload.cardId && action.payload.position);

      case GameActionType.DROP_AND_DRAW_THREE:
        return !!(action.payload.cardIdToDiscard);

      case GameActionType.PASS_TURN:
        return true;

      case GameActionType.PLAYER_READY:
        return true;

      default:
        console.warn(`⚠️ TCG Engine: Unknown action type: ${action.type}`);
        return false;
    }
  }

  // Additional TCG-specific methods that maintain compatibility
  getCardDatabase(): Map<number, any> {
    return this.cardDatabase;
  }

  getAbilityDatabase(): Map<number, any> {
    return this.abilityDatabase;
  }

  // Load state into both engines
  override loadState(state: GameState): void {
    super.loadState(state);
    // Update the core engine's internal state
    (this.coreEngine as any).gameState = state;
    console.log(`🔄 TCG Engine: State loaded for game ${state.gameId}`);
  }

  /**
   * Get current game progress information - delegates to core engine
   */
  getGameProgress(): {
    currentTurn: number;
    currentPhase: string;
    currentPlayerId: string;
    currentPlayerName: string;
    gamePhase: string;
    actionsRemaining: number;
    allPlayerStats: any[];
    winner?: string;
    finalScores?: any[];
    isGameEnded: boolean;
  } {
    console.log(`🎯 TCG Engine: Getting game progress`);

    if (!this.coreEngine || typeof this.coreEngine.getGameProgress !== 'function') {
      console.error(`❌ TCG Engine: Core engine or getGameProgress method not available`);
      throw new Error('Core engine not properly initialized');
    }

    const progress = this.coreEngine.getGameProgress();
    console.log(`📊 TCG Engine: Game progress retrieved:`, {
      currentTurn: progress.currentTurn,
      currentPhase: progress.currentPhase,
      currentPlayerName: progress.currentPlayerName,
      actionsRemaining: progress.actionsRemaining,
      playerCount: progress.allPlayerStats.length,
      playerStats: progress.allPlayerStats.map(p => ({
        name: p.name,
        deckCount: p.deckCount,
        handCount: p.handCount,
        energy: p.energy,
        victoryPoints: p.victoryPoints
      }))
    });

    return progress;
  }

  /**
   * Get player statistics - delegates to core engine
   */
  getPlayerStats(playerId: string): {
    playerId: string;
    name: string;
    deckCount: number;
    handCount: number;
    energy: number;
    victoryPoints: number;
    actionsRemaining: number;
    isCurrentPlayer: boolean;
  } {
    console.log(`🎯 TCG Engine: Getting player stats for ${playerId}`);

    if (!this.coreEngine || typeof this.coreEngine.getPlayerStats !== 'function') {
      console.error(`❌ TCG Engine: Core engine or getPlayerStats method not available`);
      throw new Error('Core engine not properly initialized');
    }

    const stats = this.coreEngine.getPlayerStats(playerId);
    console.log(`📊 TCG Engine: Player stats for ${stats.name}:`, {
      deckCount: stats.deckCount,
      handCount: stats.handCount,
      energy: stats.energy,
      victoryPoints: stats.victoryPoints,
      actionsRemaining: stats.actionsRemaining,
      isCurrentPlayer: stats.isCurrentPlayer
    });

    return stats;
  }
}
