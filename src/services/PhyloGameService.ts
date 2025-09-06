/**
 * Phylo Game Service
 * High-level orchestration service for Phylo game mode
 * Handles campaign levels, AI opponents, and Phylo-specific game logic
 */

import {
  createGameState,
  setPlayerReady,
  startGame,
  executeTurnAction,
  type TurnAction
} from '../game-logic/gameStateManager';
import {
  createTurnState,
  handleStartOfTurnDraw
} from '../game-logic/turnActions';
import { makePhyloAIDecision } from '../game-logic/aiOpponent';
import type { Card } from '../types';

// Use the GameState from gameStateManager as PhyloGameState
import type { GameState as PhyloGameState } from '../game-logic/gameStateManager';

// Define AIDifficulty enum locally since it's not exported from types
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Service result interface - standardized across all game services
export interface ServiceResult<T = any> {
  isValid: boolean;
  newState?: T;
  errorMessage?: string;
}

// Action payload interfaces for Phylo mode
export interface StartCampaignLevelPayload {
  levelId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  playerDeck?: any[];
}

export interface PlayPhyloCardPayload {
  cardId: string;
  position?: { x: number; y: number };
  playerId: string;
}

export interface AITurnPayload {
  currentState: any;
}

export interface SelectCardPayload {
  cardId: string;
  playerId: string;
}

/**
 * Phylo Game Service
 * Stateless service for Phylo game mode operations
 * Currently offline-only, but follows same pattern as TCG service
 */
export class PhyloGameService {
  
  /**
   * Initialize a new campaign level
   */
  async startCampaignLevel(
    payload: StartCampaignLevelPayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      // Validate that we have cards available
      if (!payload.playerDeck || payload.playerDeck.length === 0) {
        return Promise.resolve({
          isValid: false,
          errorMessage: 'No deck found! Please build and save a deck first (20-30 cards required).'
        });
      }

      // Validate deck size
      const deckCardCount = payload.playerDeck.reduce((sum: number, card: any) => sum + (card.quantity || 1), 0);
      if (deckCardCount < 20 || deckCardCount > 30) {
        return Promise.resolve({
          isValid: false,
          errorMessage: `Invalid deck! Your deck has ${deckCardCount} cards but needs 20-30 cards. Please update your deck.`
        });
      }

      // Create players
      const humanPlayer = {
        id: 'human',
        name: 'Player'
      };

      const aiPlayer = {
        id: 'ai',
        name: `AI (${payload.difficulty})`
      };

      // Create a deck-specific card map for the game
      const deckCards = new Map<string, Card>();
      payload.playerDeck.forEach((deckCard: any) => {
        // Add multiple copies based on quantity
        for (let i = 0; i < (deckCard.quantity || 1); i++) {
          const cardId = `${deckCard.speciesName || deckCard.id}_${i}`;
          deckCards.set(cardId, { ...deckCard, id: cardId });
        }
      });

      // Game settings
      const gameSettings = {
        maxPlayers: 2,
        eventFrequency: 0.1,
        allowChallenges: true,
        startingHandSize: 7,
        deckSize: Math.floor(deckCards.size * 0.7) // Use 70% of deck as starting deck
      };

      // Create game state
      const newGameState = createGameState(
        `game_${Date.now()}`,
        [humanPlayer, aiPlayer],
        deckCards,
        gameSettings
      );

      // Set players as ready
      let readyGameState = setPlayerReady(newGameState, 'human', true);
      readyGameState = setPlayerReady(readyGameState, 'ai', true);

      // Start the game
      const startedGameState = startGame(readyGameState);

      return Promise.resolve({
        isValid: true,
        newState: {
          ...startedGameState,
          levelId: payload.levelId,
          difficulty: payload.difficulty,
          currentTurnState: createTurnState('human'), // Start with human player's turn
          battlePhase: 'playing'
        }
      });
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'Failed to start campaign level'
      });
    }
  }

  /**
   * Play a card in Phylo mode
   */
  async playCard(
    payload: PlayPhyloCardPayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const gameState = currentState.phyloGameState;

      if (!gameState) {
        return Promise.resolve({
          isValid: false,
          errorMessage: 'No game state available'
        });
      }

      // Create the turn action for placing a card
      const turnAction: TurnAction = {
        type: 'place_card',
        cardId: payload.cardId,
        position: payload.position || { x: 0, y: 0 }
      };

      // Execute the turn action
      const result = executeTurnAction(gameState, payload.playerId, turnAction);

      if (result.success) {
        const newState = {
          ...currentState,
          phyloGameState: result.gameState
        };

        // Check if game ended or if it's AI's turn
        if (result.gameEnded) {
          newState.battlePhase = 'game_over';
        } else if (result.nextPlayer === 'ai') {
          // AI turn will be handled by a separate action call
          newState.nextPlayer = 'ai';
        }

        return Promise.resolve({
          isValid: true,
          newState
        });
      } else {
        return Promise.resolve({
          isValid: false,
          errorMessage: result.errorMessage || 'Invalid move'
        });
      }
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'Failed to play card'
      });
    }
  }

  /**
   * Handle AI opponent turn
   */
  async handleAITurn(
    payload: AITurnPayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const gameState = payload.currentState || currentState.phyloGameState;

      if (!gameState) {
        return Promise.resolve({
          isValid: false,
          errorMessage: 'No game state available for AI turn'
        });
      }

      // Use Phylo AI decision making
      const difficulty = currentState.difficulty || AIDifficulty.EASY;
      const aiDecision = makePhyloAIDecision(gameState, difficulty);

      let aiAction: TurnAction;

      switch (aiDecision.type) {
        case 'place_card':
          aiAction = {
            type: 'place_card',
            cardId: aiDecision.cardId,
            position: aiDecision.position || { x: 0, y: 0 }
          };
          break;
        case 'move_card':
          aiAction = {
            type: 'move_card',
            cardId: aiDecision.cardId,
            targetPosition: aiDecision.targetPosition || { x: 1, y: 1 }
          };
          break;
        case 'challenge':
          aiAction = {
            type: 'challenge',
            challengeData: aiDecision.challengeData ? {
              ...aiDecision.challengeData,
              claimType: aiDecision.challengeData.claimType as 'habitat' | 'diet' | 'scale' | 'behavior' | 'conservation_status'
            } : undefined
          };
          break;
        default:
          aiAction = {
            type: 'pass_turn'
          };
      }

      // Execute the AI action
      const result = executeTurnAction(gameState, 'ai', aiAction);

      if (result.success) {
        return Promise.resolve({
          isValid: true,
          newState: {
            ...currentState,
            phyloGameState: result.gameState,
            battlePhase: result.gameEnded ? 'game_over' : currentState.battlePhase
          }
        });
      } else {
        return Promise.resolve({
          isValid: false,
          errorMessage: result.errorMessage || 'AI action failed'
        });
      }
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'AI turn failed'
      });
    }
  }

  /**
   * Select a card (for UI highlighting)
   */
  async selectCard(
    payload: SelectCardPayload, 
    currentState: any
  ): Promise<ServiceResult> {
    try {
      // This is a UI-only action, so it just updates selection state
      return Promise.resolve({
        isValid: true,
        newState: {
          ...currentState,
          selectedCardId: payload.cardId
        }
      });
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'Failed to select card'
      });
    }
  }

  /**
   * Calculate valid moves for current state
   */
  async calculateValidMoves(
    payload: { cardId?: string; playerId: string },
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const gameState = currentState.phyloGameState;

      if (!gameState) {
        return Promise.resolve({
          isValid: false,
          errorMessage: 'No game state available'
        });
      }

      // TODO: Implement actual valid move calculation logic
      // This would involve checking the game rules for where cards can be placed
      // For now, return empty valid positions
      const validPositions: { x: number; y: number }[] = [];

      return Promise.resolve({
        isValid: true,
        newState: {
          ...currentState,
          validPositions
        }
      });
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'Failed to calculate valid moves'
      });
    }
  }

  /**
   * End turn in Phylo mode
   */
  async endTurn(
    payload: { playerId: string },
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const gameState = currentState.phyloGameState;

      if (!gameState) {
        return Promise.resolve({
          isValid: false,
          errorMessage: 'No game state available'
        });
      }

      // Create a pass turn action
      const turnAction: TurnAction = {
        type: 'pass_turn'
      };

      // Execute the turn action
      const result = executeTurnAction(gameState, payload.playerId, turnAction);

      if (result.success) {
        const newState = {
          ...currentState,
          phyloGameState: result.gameState
        };

        // Check if game ended or if it's AI's turn
        if (result.gameEnded) {
          newState.battlePhase = 'game_over';
        } else if (result.nextPlayer === 'ai') {
          // Create new turn state for AI
          newState.currentTurnState = createTurnState('ai');
        } else {
          // Create new turn state for human with card draw
          const newTurnState = createTurnState('human');
          newState.currentTurnState = handleStartOfTurnDraw(newTurnState);
        }

        return Promise.resolve({
          isValid: true,
          newState
        });
      } else {
        return Promise.resolve({
          isValid: false,
          errorMessage: result.errorMessage || 'Failed to end turn'
        });
      }
    } catch (error: any) {
      return Promise.resolve({
        isValid: false,
        errorMessage: error.message || 'Failed to end turn'
      });
    }
  }
}

// Export singleton instance
export const phyloGameService = new PhyloGameService();
