/**
 * TCG Battle Screen
 * BioMasters Trading Card Game battle interface using ClientGameEngine
 */

import React, { useEffect, useCallback } from 'react';
import './TCGBattleScreen.css';
import '../game/EcosystemBoard.css';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonAlert,
  IonProgressBar
} from '@ionic/react';
import { motion } from 'framer-motion';
import {
  arrowBack,
  checkmarkCircle,
  time,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';

// Import the battle store instead of game engine
import useHybridGameStore from '../../state/hybridGameStore';
import { GamePhase } from '../../../shared/enums';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useTheme } from '../../theme/ThemeProvider';
import OrganismRenderer from '../OrganismRenderer';

import { unifiedGameService } from '../../services/UnifiedGameService';
import { AIDifficulty } from '../../../shared/ai/AIStrategy';
import { AIStrategyFactory } from '../../../shared/ai/AIStrategyFactory';
import PlayerStatsDisplay from '../ui/PlayerStatsDisplay';
import EndGameModal from '../ui/EndGameModal';
import EcosystemGrid from '../game/EcosystemGrid';
import PlayerHandDisplay from './PlayerHandDisplay';
import PlayerCard from './PlayerCard';
import '../ui/PlayerStatsDisplay.css';
import '../ui/EndGameModal.css';
import './PlayerHandDisplay.css';
import './PlayerCard.css';

interface TCGBattleScreenProps {
  onExit?: () => void;
}

interface TCGGameSettings {
  gameMode: 'practice' | 'ranked' | 'tutorial';
  difficulty: 'easy' | 'medium' | 'hard';
  playerCount: 2 | 4;
  timeLimit?: number;
}

export const TCGBattleScreen: React.FC<TCGBattleScreenProps> = ({ onExit }) => {

  // Localization
  const localization = useLocalization();

  // Get all state from the battle store
  const gameState = useHybridGameStore(state => state.battle.tcgGameState);
  const isLoading = useHybridGameStore(state => state.battle.isLoading);
  const error = useHybridGameStore(state => state.battle.error);
  const selectedHandCardId = useHybridGameStore(state => state.battle.uiState.selectedHandCardId);

  const highlightedPositions = useHybridGameStore(state => state.battle.uiState.highlightedPositions);

  // Get battle actions from the store
  const startTCGGame = useHybridGameStore(state => state.battle.actions.startTCGGame);
  const playCard = useHybridGameStore(state => state.battle.actions.playCard);
  const dropAndDrawThree = useHybridGameStore(state => state.battle.actions.dropAndDrawThree);
  const passTurn = useHybridGameStore(state => state.battle.actions.passTurn);
  const playerReady = useHybridGameStore(state => state.battle.actions.playerReady);
  const selectHandCard = useHybridGameStore(state => state.battle.actions.selectHandCard);
  const setHighlightedPositions = useHybridGameStore(state => state.battle.actions.setHighlightedPositions);
  const clearUIState = useHybridGameStore(state => state.battle.actions.clearUIState);

  // Opposition hand state and actions
  const oppositionHandState = useHybridGameStore(state => state.battle.uiState.oppositionHand);
  const toggleOppositionHandVisibility = useHybridGameStore(state => state.battle.actions.toggleOppositionHandVisibility);
  const toggleOppositionHandExpansion = useHybridGameStore(state => state.battle.actions.toggleOppositionHandExpansion);
  const selectOpponent = useHybridGameStore(state => state.battle.actions.selectOpponent);
  const toggleOppositionCardDetails = useHybridGameStore(state => state.battle.actions.toggleOppositionCardDetails);

  // Theme
  const { currentTheme } = useTheme();

  // Local UI state (non-game related)
  const [showForfeitAlert, setShowForfeitAlert] = React.useState(false);
  const [showEndGameModal, setShowEndGameModal] = React.useState(false);
  const [endGameData, setEndGameData] = React.useState<any>(null);

  // Card drawing animation state
  const [isDrawingCards, setIsDrawingCards] = React.useState(false);
  const [drawnCards, setDrawnCards] = React.useState<string[]>([]);

  // Player cards navigation state (moved to top level to follow Rules of Hooks)
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Get last drawn cards from store for animation
  const lastDrawnCards = useHybridGameStore((state) => state.battle.lastDrawnCards);

  // Game settings (could be moved to store if needed)
  const gameSettings: TCGGameSettings = {
    gameMode: 'practice',
    difficulty: 'easy',
    playerCount: 2
  };

  // Initialize TCG game using store action
  useEffect(() => {
    const initializeGame = async () => {
      console.log('🎮 [TCG] Initializing TCG Battle...');
      console.log('🎮 [TCG] Game settings:', gameSettings);

      // Create players based on game settings
      const players = [];
      console.log('🎮 [TCG] Creating players for count:', gameSettings.playerCount);

      if (gameSettings.playerCount === 2) {
        players.push(
          { id: 'human', name: 'Player' },
          { id: 'ai', name: 'AI Opponent' }
        );
      } else if (gameSettings.playerCount === 4) {
        players.push(
          { id: 'human', name: 'Player' },
          { id: 'ai1', name: 'AI Opponent 1' },
          { id: 'ai2', name: 'AI Opponent 2' },
          { id: 'ai3', name: 'AI Opponent 3' }
        );
      }

      console.log('🎮 [TCG] Players created:', players);

      // Use store action to start the game
      await startTCGGame('tcg-battle', players, {
        startingHandSize: 5,
        maxHandSize: 10
      });

      console.log('✅ [TCG] TCG Battle initialization requested');
    };

    // Only initialize if we don't have a game state yet and there's no error
    if (!gameState && !isLoading && !error) {
      initializeGame();
    }
  }, [gameState, isLoading, error, startTCGGame]);

  // Auto-ready AI players when game is in setup phase
  useEffect(() => {
    if (gameState && gameState.gamePhase === GamePhase.SETUP) {
      const aiPlayers = gameState.players.filter(p => p.id !== 'human' && !p.isReady);

      if (aiPlayers.length > 0) {
        console.log('🤖 [TCG] Auto-readying AI players:', aiPlayers.map(p => p.name));

        // Auto-ready AI players after a short delay
        setTimeout(async () => {
          for (const aiPlayer of aiPlayers) {
            try {
              console.log(`🤖 [TCG] Auto-readying AI player: ${aiPlayer.name}`);

              // Get the current battle state from the store
              const currentBattleState = useHybridGameStore.getState().battle;

              if (!currentBattleState.tcgGameState) {
                console.error(`❌ [TCG] No game state available for AI player ${aiPlayer.name}`);
                continue;
              }

              // Call the service directly for AI players using the battle state (same as human player)
              const result = await unifiedGameService.executeAction({
                action: {
                  type: 'PLAYER_READY' as any,
                  playerId: aiPlayer.id,
                  payload: {}
                },
                currentState: currentBattleState, // Pass the battle state, not just the game state
                isOnline: false
              });

              if (result.isValid && result.newState) {
                console.log(`✅ [TCG] AI player ${aiPlayer.name} marked as ready`);

                // Update the store immediately with the new state
                useHybridGameStore.setState((state) => ({
                  battle: {
                    ...state.battle,
                    tcgGameState: result.newState as any
                  }
                }));
              } else {
                console.error(`❌ [TCG] Failed to ready AI player ${aiPlayer.name}:`, result.errorMessage);
              }
            } catch (error) {
              console.error(`❌ [TCG] Exception auto-readying AI player ${aiPlayer.name}:`, error);
            }
          }
        }, 1000); // 1 second delay to make it feel natural
      }
    }
  }, [gameState?.gamePhase, gameState?.players]);

  // Auto-play AI moves when it's AI's turn using AI Strategy
  useEffect(() => {
    if (gameState &&
        gameState.gamePhase === GamePhase.PLAYING &&
        gameState.currentPlayerIndex !== undefined) {

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      if (currentPlayer && currentPlayer.id !== 'human' && (gameState as any).actionsRemaining > 0) {
        // Create AI strategy (for now, always use EASY - will be configurable later)
        const aiStrategy = AIStrategyFactory.createStrategy(AIDifficulty.EASY);
        const thinkingDelay = aiStrategy.getThinkingDelay();

        setTimeout(async () => {
          try {
            // Check if AI should pass turn
            if (aiStrategy.shouldPassTurn(currentPlayer.hand, (gameState as any).actionsRemaining, gameState as any, currentPlayer.id)) {

              // AI needs to pass turn with its own player ID
              const currentBattleState = useHybridGameStore.getState().battle;
              const result = await unifiedGameService.executeAction({
                action: {
                  type: 'PASS_TURN' as any,
                  playerId: currentPlayer.id, // Use AI player ID
                  payload: {}
                },
                currentState: currentBattleState,
                isOnline: false
              });

              if (result.isValid && result.newState) {
                useHybridGameStore.setState((state) => ({
                  battle: {
                    ...state.battle,
                    tcgGameState: result.newState as any
                  }
                }));
              } else {
                console.error(`❌ [TCG] AI failed to pass turn:`, result.errorMessage);
              }
              return;
            }

            // AI has no cards, must pass
            if (currentPlayer.hand.length === 0) {

              // AI needs to pass turn with its own player ID
              const currentBattleState = useHybridGameStore.getState().battle;
              const result = await unifiedGameService.executeAction({
                action: {
                  type: 'PASS_TURN' as any,
                  playerId: currentPlayer.id, // Use AI player ID
                  payload: {}
                },
                currentState: currentBattleState,
                isOnline: false
              });

              if (result.isValid && result.newState) {
                useHybridGameStore.setState((state) => ({
                  battle: {
                    ...state.battle,
                    tcgGameState: result.newState as any
                  }
                }));
                console.log(`✅ [TCG] AI successfully passed turn (no cards)`);
              } else {
                console.error(`❌ [TCG] AI failed to pass turn (no cards):`, result.errorMessage);
              }
              return;
            }

            // Use AI strategy to select card
            const selectedCardId = aiStrategy.selectCard(currentPlayer.hand, gameState as any, currentPlayer.id);
            console.log(`🤖 [TCG] AI selected card: ${selectedCardId}`);

            // Get valid positions for this card
            const validMovesResult = await unifiedGameService.getValidMoves(gameState.gameId, currentPlayer.id, selectedCardId);

            if (validMovesResult.isValid && validMovesResult.newState?.positions && validMovesResult.newState.positions.length > 0) {
              // Use AI strategy to select position
              const selectedPosition = aiStrategy.selectPosition(validMovesResult.newState.positions, gameState as any, selectedCardId, currentPlayer.id);
              console.log(`🤖 [TCG] AI selected position: (${selectedPosition.x}, ${selectedPosition.y})`);

              // Play the card
              const currentBattleState = useHybridGameStore.getState().battle;
              const result = await unifiedGameService.executeAction({
                action: {
                  type: 'PLAY_CARD' as any,
                  playerId: currentPlayer.id,
                  payload: { cardId: selectedCardId, position: selectedPosition }
                },
                currentState: currentBattleState,
                isOnline: false
              });

              if (result.isValid && result.newState) {
                useHybridGameStore.setState((state) => ({
                  battle: {
                    ...state.battle,
                    tcgGameState: result.newState as any
                  }
                }));
                console.log(`✅ [TCG] AI successfully played card ${selectedCardId}`);
              } else {
                console.error(`❌ [TCG] AI failed to play card:`, result.errorMessage);
                // If can't play card, pass turn with AI player ID
                const currentBattleState = useHybridGameStore.getState().battle;
                const passResult = await unifiedGameService.executeAction({
                  action: {
                    type: 'PASS_TURN' as any,
                    playerId: currentPlayer.id, // Use AI player ID
                    payload: {}
                  },
                  currentState: currentBattleState,
                  isOnline: false
                });

                if (passResult.isValid && passResult.newState) {
                  useHybridGameStore.setState((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: passResult.newState as any
                    }
                  }));
                  console.log(`✅ [TCG] AI passed turn after failed card play`);
                }
              }
            } else {
              console.log(`🤖 [TCG] AI has no valid moves, passing turn`);

              // AI needs to pass turn with its own player ID
              const currentBattleState = useHybridGameStore.getState().battle;
              const result = await unifiedGameService.executeAction({
                action: {
                  type: 'PASS_TURN' as any,
                  playerId: currentPlayer.id, // Use AI player ID
                  payload: {}
                },
                currentState: currentBattleState,
                isOnline: false
              });

              if (result.isValid && result.newState) {
                useHybridGameStore.setState((state) => ({
                  battle: {
                    ...state.battle,
                    tcgGameState: result.newState as any
                  }
                }));
                console.log(`✅ [TCG] AI successfully passed turn (no valid moves)`);
              } else {
                console.error(`❌ [TCG] AI failed to pass turn (no valid moves):`, result.errorMessage);
              }
            }
          } catch (error) {
            console.error(`❌ [TCG] Error during AI turn:`, error);

            // AI needs to pass turn with its own player ID
            const currentBattleState = useHybridGameStore.getState().battle;
            const result = await unifiedGameService.executeAction({
              action: {
                type: 'PASS_TURN' as any,
                playerId: currentPlayer.id, // Use AI player ID
                payload: {}
              },
              currentState: currentBattleState,
              isOnline: false
            });

            if (result.isValid && result.newState) {
              useHybridGameStore.setState((state) => ({
                battle: {
                  ...state.battle,
                  tcgGameState: result.newState as any
                }
              }));
              console.log(`✅ [TCG] AI passed turn after error`);
            }
          }
        }, thinkingDelay);
      }
    }
  }, [gameState?.currentPlayerIndex, gameState?.players, gameState?.gamePhase, passTurn]);

  // Auto-pass turn when player has no actions remaining
  useEffect(() => {
    if (gameState &&
        gameState.gamePhase === GamePhase.PLAYING &&
        gameState.currentPlayerIndex !== undefined) {

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      const actionsRemaining = (gameState as any)?.actionsRemaining || 0;
      console.log(`🔍 [TCG] Auto-pass check - Player: ${currentPlayer?.name}, actionsRemaining: ${actionsRemaining}`);

      if (currentPlayer && actionsRemaining <= 0) {
        console.log(`🔄 [TCG] Player ${currentPlayer.name} has no actions remaining, auto-passing turn`);

        setTimeout(async () => {
          // Use the correct player ID for pass turn
          const currentBattleState = useHybridGameStore.getState().battle;
          const result = await unifiedGameService.executeAction({
            action: {
              type: 'PASS_TURN' as any,
              playerId: currentPlayer.id, // Use current player's ID (human or AI)
              payload: {}
            },
            currentState: currentBattleState,
            isOnline: false
          });

          if (result.isValid && result.newState) {
            useHybridGameStore.setState((state) => ({
              battle: {
                ...state.battle,
                tcgGameState: result.newState as any
              }
            }));
            console.log(`✅ [TCG] Auto-passed turn for ${currentPlayer.name}`);
          } else {
            console.error(`❌ [TCG] Failed to auto-pass turn for ${currentPlayer.name}:`, result.errorMessage);
          }
        }, 1000); // 1 second delay before auto-pass
      }
    }
  }, [gameState?.currentPlayerIndex, gameState?.players, gameState?.gamePhase, passTurn]);

  // End game detection
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'ended') {
      console.log('🏁 [TCG] Game ended, checking for end game data');

      try {
        const engine = unifiedGameService.getEngine(gameState.gameId);
        if (engine && typeof engine.getEndGameData === 'function') {
          const endData = engine.getEndGameData();
          console.log('🏁 [TCG] End game data:', endData);

          if (endData.isGameEnded) {
            setEndGameData(endData);
            setShowEndGameModal(true);
          }
        } else {
          // Fallback: show modal with basic data
          console.log('🏁 [TCG] Using fallback end game data');
          setEndGameData({
            isGameEnded: true,
            winner: 'Unknown',
            gameStats: {
              totalTurns: gameState.turnNumber || 1,
              endReason: 'Game Complete'
            }
          });
          setShowEndGameModal(true);
        }
      } catch (error) {
        console.error('❌ [TCG] Error getting end game data:', error);
        // Still show modal with minimal data
        setEndGameData({
          isGameEnded: true,
          winner: 'Unknown',
          gameStats: {
            totalTurns: gameState.turnNumber || 1,
            endReason: 'Game Complete'
          }
        });
        setShowEndGameModal(true);
      }
    }

    // Additional check for final turn completion - check engine state directly
    if (gameState && gameState.gamePhase === 'final_turn') {
      console.log('🏁 [TCG] Game is in final turn phase, checking engine state');

      try {
        const engine = unifiedGameService.getEngine(gameState.gameId);
        if (engine && typeof engine.getGameState === 'function') {
          const engineState = engine.getGameState();
          if (engineState) {
            console.log('🏁 [TCG] Engine state check:', {
              gamePhase: engineState.gamePhase,
              finalTurnPlayersRemaining: engineState.finalTurnPlayersRemaining
            });

            // Check if final turn is complete in the engine
            if (engineState.gamePhase === 'ended' ||
                (engineState.finalTurnPlayersRemaining && engineState.finalTurnPlayersRemaining.length === 0)) {
            console.log('🏁 [TCG] Final turn complete or game ended, checking end game data');

            if (typeof engine.getEndGameData === 'function') {
              const endData = engine.getEndGameData();
              console.log('🏁 [TCG] End game data from engine:', endData);

              if (endData.isGameEnded) {
                setEndGameData(endData);
                setShowEndGameModal(true);
              }
            }
            }
          }
        }
      } catch (error) {
        console.error('❌ [TCG] Error in final turn check:', error);
      }
    }
  }, [gameState?.gamePhase, gameState?.gameId, gameState?.turnNumber]);

  // Handle card selection from hand
  const handleCardSelect = useCallback(async (cardInstanceId: string) => {
    if (!gameState) return;

    // Check if this card is in the current player's hand
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.hand.includes(cardInstanceId)) {
      return;
    }

    if (selectedHandCardId === cardInstanceId) {
      // Deselect
      selectHandCard(null);
      setHighlightedPositions([]);
    } else {
      // Select card and show valid positions
      selectHandCard(cardInstanceId);

      // Calculate valid positions using the unified game service
      try {
        // Extract card ID from instance ID (e.g., "1" from "1_0")
        const cardId = parseInt(cardInstanceId.split('_')[0]);
        const result = await unifiedGameService.getValidMoves(gameState.gameId, currentPlayer.id, cardId.toString());

        if (result.isValid && result.newState) {
          console.log(`🎯 Valid positions for card ${cardInstanceId}:`, result.newState.positions);
          setHighlightedPositions(result.newState.positions);
        } else {
          console.warn('❌ Failed to get valid positions:', result.errorMessage);
          setHighlightedPositions([]);
        }
      } catch (error) {
        console.error('❌ Error calculating valid positions:', error);
        // Fallback to empty positions
        setHighlightedPositions([]);
      }
    }
  }, [gameState, selectedHandCardId, selectHandCard, setHighlightedPositions]);

  // Handle card placement on grid
  const handleGridPositionClick = useCallback(async (x: number, y: number) => {
    if (!gameState || !selectedHandCardId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    // Check if position is valid
    const isValidPosition = highlightedPositions.some(pos => pos.x === x && pos.y === y);
    if (!isValidPosition) {
      console.log('❌ Invalid position for this card');
      return;
    }

    // Use the selected card ID directly (it should already be the card ID)
    // Use store action to play the card
    await playCard(selectedHandCardId, { x, y });

    console.log('✅ Card placement requested');
  }, [gameState, selectedHandCardId, highlightedPositions, playCard]);

  // Handle pass turn
  const handlePassTurn = useCallback(async () => {
    if (!gameState) return;

    // Use store action to pass turn
    await passTurn();

    console.log('✅ Pass turn requested');
  }, [gameState, passTurn]);

  // Handle drop and draw three
  const handleDropAndDraw = useCallback(async () => {
    if (!gameState || !selectedHandCardId) {
      console.log('🚨 [UI] Drop and draw blocked: no card selected');
      return;
    }

    // Double-check that the selected card is still in hand
    const currentPlayer = gameState.players.find(p => p.id === 'human');
    if (!currentPlayer || !currentPlayer.hand.includes(selectedHandCardId)) {
      console.log('🚨 [UI] Drop and draw blocked: selected card not in hand');
      return;
    }

    // Execute the action and get the drawn cards directly
    const result = await dropAndDrawThree(selectedHandCardId);

    // Clear the selected card since it's been discarded
    selectHandCard(null);
    setHighlightedPositions([]);

    // Get drawn cards from the result or fallback to store
    const actualDrawnCards = (result as any)?.drawnCards || lastDrawnCards;
    console.log('🃏 [Animation] Using drawn cards from action result:', actualDrawnCards);

    // Only run animation if we actually drew cards
    if (actualDrawnCards && actualDrawnCards.length > 0) {
      // Start drawing animation
      setIsDrawingCards(true);
      setDrawnCards([]);

      // Animate cards being drawn one by one with actual card data
      setTimeout(() => setDrawnCards([actualDrawnCards[0]]), 200);
      if (actualDrawnCards.length > 1) {
        setTimeout(() => setDrawnCards([actualDrawnCards[0], actualDrawnCards[1]]), 400);
      }
      if (actualDrawnCards.length > 2) {
        setTimeout(() => setDrawnCards([actualDrawnCards[0], actualDrawnCards[1], actualDrawnCards[2]]), 600);
      }

      setTimeout(() => {
        setIsDrawingCards(false);
        setDrawnCards([]);
      }, 1200);
    } else {
      console.log('🚨 [Animation] No cards drawn, skipping animation');
    }
  }, [gameState, selectedHandCardId, dropAndDrawThree, lastDrawnCards]);



  // End game modal handlers
  const handleCloseEndGameModal = useCallback(() => {
    setShowEndGameModal(false);
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setShowEndGameModal(false);
    setEndGameData(null);

    // Reset the game with same players
    const gamePlayers = [
      { id: 'human', name: 'Player' },
      { id: 'ai', name: 'AI Opponent' }
    ];

    try {
      await startTCGGame('tcg-battle', gamePlayers, gameSettings);
      console.log('🔄 [TCG] Starting new game');
    } catch (error) {
      console.error('❌ [TCG] Error starting new game:', error);
    }
  }, [startTCGGame, gameSettings]);

  const handleReturnHome = useCallback(() => {
    setShowEndGameModal(false);
    setEndGameData(null);

    // Call the onExit prop to return to main menu
    if (onExit) {
      onExit();
    }
  }, [onExit]);



  // Get all species cards from store at component level (following Rules of Hooks)
  const allSpeciesCards = useHybridGameStore(state => state.allSpeciesCards);
  const speciesLoaded = useHybridGameStore(state => state.speciesLoaded);
  const loadSpeciesData = useHybridGameStore(state => state.loadSpeciesData);

  // Load species data if not already loaded
  useEffect(() => {
    if (!speciesLoaded) {
      console.log('🔄 [TCG] Loading species data for battle screen...');
      loadSpeciesData();
    }
  }, [speciesLoaded, loadSpeciesData]);



  // Helper function to get card data from the store (no hooks inside)
  const getCardData = (instanceId: string): any => {
    // Extract card ID from instance ID - handle different formats:
    // Format 1: Simple numbers like "89", "56" (from hand cards)
    // Format 2: Complex instance IDs like "instance_1757687714762_nfettv6aa" (from grid cards)
    let cardId: number = NaN;

    if (instanceId.startsWith('instance_')) {
      // For grid cards with complex instance IDs, we need to find the card differently
      // Try to find the card in the game state grid by instance ID
      if (gameState?.grid) {
        for (const [_positionKey, gridCard] of gameState.grid.entries()) {
          if (gridCard?.instanceId === instanceId) {
            // Extract the actual card ID from the grid card data
            if (gridCard.cardId) {
              cardId = parseInt(gridCard.cardId.toString());
              break;
            }
          }
        }
      }

      if (!cardId || isNaN(cardId)) {
        cardId = NaN;
      }
    } else {
      // Simple format: extract from "1_0" or just "1"
      cardId = parseInt(instanceId.split('_')[0]);
    }

    // Find card data from the already-retrieved species cards
    const cardData = allSpeciesCards.find(card => card.cardId === cardId);

    if (cardData) {
      const result = {
        nameId: cardData.nameId,
        scientificNameId: cardData.scientificNameId,
        victoryPoints: cardData.victoryPoints || 1, // Use actual victory points
        VictoryPoints: cardData.victoryPoints || 1, // Capital V for UI compatibility
        trophicLevel: cardData.trophicLevel || 0, // Use original numeric trophic level
        TrophicLevel: cardData.trophicLevel || 0, // Numeric trophic level for UI display
        trophicRole: cardData.trophicRole || 'Unknown', // String trophic role for organism renderer
        power: cardData.power || 0,
        health: cardData.health || 1,
        cardId: cardData.cardId // Add cardId for organism renderer
      };

      return result;
    }
    // Fallback for unknown cards
    return {
      nameId: 'CARD_UNKNOWN',
      scientificNameId: 'SCIENTIFIC_UNKNOWN',
      victoryPoints: 1,
      VictoryPoints: 1, // Capital V for UI compatibility
      trophicLevel: 'Unknown',
      TrophicLevel: 0, // Numeric trophic level for UI display
      trophicRole: 'Unknown', // For organism renderer
      power: 0,
      health: 1,
      cardId: 0
    };
  };

  // Helper function to get localized card names for battle screen
  const getLocalizedCardName = (cardData: any): string => {
    if (!cardData?.nameId) {
      return 'Unknown';
    }

    try {
      // Check if localization is available
      if (!localization || typeof localization.getCardName !== 'function') {
        const fallback = cardData.nameId
          .replace('CARD_', '')
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        return fallback;
      }

      const localizedName = localization.getCardName(cardData.nameId as any);

      // Check if localization failed (returns nameId or bracketed value)
      if (!localizedName || localizedName.startsWith('[') || localizedName === cardData.nameId) {
        // Create a readable fallback from nameId
        const fallback = cardData.nameId
          .replace('CARD_', '')
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        return fallback;
      }

      return localizedName;
    } catch (error) {
      console.error('🔍 [Localization] Error getting card name:', error);
      // Create a readable fallback from nameId
      const fallback = cardData.nameId
        .replace('CARD_', '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
      return fallback;
    }
  };

  const getLocalizedScientificName = (cardData: any): string => {
    if (!cardData?.scientificNameId) return '';
    // Use localization system to get proper scientific name
    return localization.getScientificName(cardData.scientificNameId as any);
  };

  // Handle forfeit/quit match
  const handleForfeit = () => {
    console.log('🏳️ Player forfeiting TCG match');
    setShowForfeitAlert(false);

    // Clear UI state
    clearUIState();

    // Call onExit to return to mode selector
    if (onExit) {
      onExit();
    }

    console.log('✅ Match forfeited, returning to mode selection');
  };

  // Show error state if there's an error
  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>BioMasters TCG</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={onExit}>
                <IonIcon icon={arrowBack} />
                Back
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column'
          }}>
            <h2>❌ Failed to Initialize Game</h2>
            <p style={{ color: 'red', textAlign: 'center', maxWidth: '400px' }}>
              {error}
            </p>
            <IonButton
              onClick={() => {
                // Force re-initialization by reloading the page
                window.location.reload();
              }}
              color="primary"
            >
              Try Again
            </IonButton>
            <IonButton
              onClick={onExit}
              fill="outline"
              color="medium"
            >
              Back to Menu
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Show loading state
  if (isLoading || !gameState) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>BioMasters TCG</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column'
          }}>
            <h2>🧬 Initializing BioMasters TCG...</h2>
            <IonProgressBar type="indeterminate" />
            <p>Loading game data and setting up battle...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isPlayerTurn = currentPlayer?.id === 'human';
  // TODO: Get available actions from game state or calculate them



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ height: '100%' }}
    >
      <IonPage
        className="tcg-battle-screen"
        style={{
          '--background': currentTheme.colors.backgroundPrimary,
          '--color': currentTheme.colors.textPrimary,
          '--ion-background-color': currentTheme.colors.backgroundPrimary,
          '--ion-text-color': currentTheme.colors.textPrimary,
        } as React.CSSProperties}
      >
        <IonHeader>
          <IonToolbar
            style={{
              '--background': currentTheme.colors.primary,
              '--color': currentTheme.colors.textPrimary,
            } as React.CSSProperties}
          >
          <IonButton
            fill="clear"
            slot="start"
            onClick={onExit}
          >
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>BioMasters TCG Battle</IonTitle>
          <IonButton
            fill="clear"
            slot="end"
            color="danger"
            onClick={() => {
              console.log('🏳️ Forfeit button clicked - showing alert');
              setShowForfeitAlert(true);
            }}
          >
            Forfeit
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Enhanced Player Stats Display */}
        {(() => {
          try {
            // Get engine instance to access new methods
            const engine = unifiedGameService.getEngine(gameState.gameId);
            if (engine && typeof engine.getGameProgress === 'function') {
              const gameProgress = engine.getGameProgress();

              return (
                <div>
                  {/* OLD: Commented out for reference - Player Stats Cards */}
                  {/* <div className="enhanced-game-status">
                    <IonGrid className="player-stats-grid">
                      <IonRow>
                        {gameProgress.allPlayerStats.map((playerStats: any) => (
                          <IonCol
                            key={playerStats.playerId}
                            size="6"
                          >
                            <PlayerStatsDisplay
                              stats={playerStats}
                              compact={false}
                              showActions={true}
                              className={playerStats.isCurrentPlayer ? 'current-player-stats' : 'opponent-stats clickable'}
                              onClick={!playerStats.isCurrentPlayer ? () => {
                                // Show opposition hand when clicking on opponent stats
                                selectOpponent(playerStats.playerId);
                                if (!oppositionHandState.isVisible) {
                                  toggleOppositionHandVisibility();
                                }
                              } : undefined}
                            />
                          </IonCol>
                        ))}
                      </IonRow>
                    </IonGrid>
                  </div> */}

                </div>
              );
            } else {
              console.warn('🔍 [TCG] Engine or getGameProgress not available, using fallback');
            }
          } catch (error) {
            console.warn('🔍 [TCG] Could not get enhanced stats, using fallback:', error);
          }

          // Fallback to simple message if enhanced stats not available
          return (
            <IonCard className="game-status-card">
              <IonCardContent>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Enhanced player stats not available</p>
                  <p>Game is loading...</p>
                </div>
              </IonCardContent>
            </IonCard>
          );
        })()}





        {/* Game Setup Phase */}
        {gameState.gamePhase === GamePhase.SETUP && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Game Setup</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ marginBottom: '16px' }}>
                <h4>Player Status:</h4>
                <IonGrid>
                  <IonRow>
                    {gameState.players.map((player) => (
                      <IonCol key={player.id} size="6">
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          backgroundColor: player.isReady ? 'var(--ion-color-success-tint)' : 'var(--ion-color-warning-tint)',
                          borderRadius: '4px'
                        }}>
                          <IonIcon
                            icon={player.isReady ? checkmarkCircle : time}
                            color={player.isReady ? 'success' : 'warning'}
                            style={{ marginRight: '8px' }}
                          />
                          <span>{player.name}: {player.isReady ? 'Ready' : 'Not Ready'}</span>
                        </div>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
              </div>

              {/* Show ready button for human player if not ready */}
              {(() => {
                const humanPlayer = gameState.players.find(p => p.id === 'human');
                if (humanPlayer && !humanPlayer.isReady) {
                  return (
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={async () => {
                        console.log('🎮 [TCG] Player ready button clicked');
                        await playerReady();
                      }}
                    >
                      <IonIcon icon={checkmarkCircle} slot="start" />
                      Mark as Ready
                    </IonButton>
                  );
                }

                // All players ready - show waiting message
                const allReady = gameState.players.every(p => p.isReady);
                if (allReady) {
                  return (
                    <div style={{ textAlign: 'center' }}>
                      <p>All players are ready! Starting game...</p>
                      <IonProgressBar type="indeterminate" />
                    </div>
                  );
                }

                // Waiting for other players
                return (
                  <div style={{ textAlign: 'center' }}>
                    <p>Waiting for other players to be ready...</p>
                    <IonProgressBar type="indeterminate" />
                  </div>
                );
              })()}
            </IonCardContent>
          </IonCard>
        )}
        {/* Game Grid - NEW COMPONENT VERSION */}
        {(gameState.gamePhase === GamePhase.SETUP || gameState.gamePhase === GamePhase.PLAYING) && gameState.gameSettings && (
          <EcosystemGrid
            gameSettings={gameState.gameSettings}
            grid={gameState.grid}
            allSpeciesCards={allSpeciesCards}
            getCardData={getCardData}
            onGridPositionClick={handleGridPositionClick}
            highlightedPositions={highlightedPositions}
            title="Ecosystem Grid"
            cellSize={60}
            showTitle={true}
            enablePanZoom={true}
          />
        )}





        {/* NEW: Responsive Player Cards with Navigation */}
        {gameState.gamePhase === GamePhase.PLAYING && (() => {
          const allPlayers = gameState.players;

          const scrollToCard = (index: number) => {
            if (containerRef.current) {
              const cardWidth = 320; // Approximate card width + gap
              containerRef.current.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
              });
            }
            setCurrentCardIndex(index);
          };

          const nextCard = () => {
            const nextIndex = (currentCardIndex + 1) % allPlayers.length;
            scrollToCard(nextIndex);
          };

          const prevCard = () => {
            const prevIndex = currentCardIndex === 0 ? allPlayers.length - 1 : currentCardIndex - 1;
            scrollToCard(prevIndex);
          };

          return (
            <div className="player-cards-wrapper">
              {/* Scrollable Cards Container */}
              <motion.div
                ref={containerRef}
                className="player-cards-container responsive"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  overflowX: 'auto',
                  padding: '8px 0'
                }}
              >
                {/* All Player Cards as Siblings */}
                {allPlayers.map((player: any) => {
                  const isCurrentPlayerCard = player.id === 'human';
                  const isPlayerTurnCard = gameState.players[gameState.currentPlayerIndex]?.id === player.id;
                  const playerActionsRemaining = isPlayerTurnCard ? (gameState.actionsRemaining || 0) : 0;

                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      cardVisibilityMode={isCurrentPlayerCard ? 'full' : (oppositionHandState.showCardDetails ? 'full' : 'hidden')}
                      isCurrentPlayer={isCurrentPlayerCard}
                      isPlayerTurn={isPlayerTurnCard}
                      actionsRemaining={playerActionsRemaining}
                      isCollapsible={!isCurrentPlayerCard}
                      isExpanded={isCurrentPlayerCard || oppositionHandState.isExpanded}
                      onToggleExpansion={!isCurrentPlayerCard ? toggleOppositionHandExpansion : undefined}
                      onToggleCardVisibility={!isCurrentPlayerCard ? toggleOppositionCardDetails : undefined}
                      onClick={!isCurrentPlayerCard ? () => {
                        selectOpponent(player.id);
                        if (!oppositionHandState.isVisible) {
                          toggleOppositionHandVisibility();
                        }
                      } : undefined}
                      isInteractive={isCurrentPlayerCard}
                      selectedCardId={isCurrentPlayerCard ? selectedHandCardId : undefined}
                      onCardSelect={isCurrentPlayerCard ? handleCardSelect : undefined}
                      getCardData={getCardData}
                      getLocalizedCardName={getLocalizedCardName}
                      getLocalizedScientificName={getLocalizedScientificName}
                      className={isCurrentPlayerCard ? 'current-player-card' : 'opponent-player-card'}
                    />
                  );
                })}
              </motion.div>

              {/* Navigation Controls */}
              <div className="player-cards-navigation">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={prevCard}
                  disabled={allPlayers.length <= 1}
                >
                  <IonIcon icon={chevronBackOutline} />
                </IonButton>

                <div className="player-indicator">
                  {allPlayers.map((_, index) => (
                    <div
                      key={index}
                      className={`indicator-dot ${index === currentCardIndex ? 'active' : ''}`}
                      onClick={() => scrollToCard(index)}
                    />
                  ))}
                </div>

                <IonButton
                  fill="clear"
                  size="small"
                  onClick={nextCard}
                  disabled={allPlayers.length <= 1}
                >
                  <IonIcon icon={chevronForwardOutline} />
                </IonButton>
              </div>
            </div>
          );
        })()}

        {/* OLD: Commented out for reference - Player Hand */}
        {/* {gameState.gamePhase === GamePhase.PLAYING && currentPlayer && (
          <PlayerHandDisplay
            player={currentPlayer}
            title={`Your Hand (${currentPlayer.hand.length})`}
            visibilityMode="full"
            isInteractive={true}
            selectedCardId={selectedHandCardId}
            onCardSelect={handleCardSelect}
            getCardData={getCardData}
            getLocalizedCardName={getLocalizedCardName}
            getLocalizedScientificName={getLocalizedScientificName}
          />
        )} */}

        {/* OLD: Commented out for reference - Opposition Hand */}
        {/* {gameState.gamePhase === GamePhase.PLAYING && oppositionHandState.isVisible && (() => {
          const opponents = gameState.players.filter((player: any) => player.id !== 'human');
          const selectedOpponent = opponents.find((player: any) =>
            player.id === oppositionHandState.selectedOpponentId
          ) || opponents[0];

          if (!selectedOpponent) return null;

          return (
            <PlayerHandDisplay
              player={selectedOpponent}
              title={`${selectedOpponent.name} Hand (${selectedOpponent.hand.length})`}
              visibilityMode={oppositionHandState.showCardDetails ? 'full' : 'hidden'}
              isCollapsible={true}
              isExpanded={oppositionHandState.isExpanded}
              onToggleExpansion={toggleOppositionHandExpansion}
              onClose={toggleOppositionHandVisibility}
              onToggleVisibility={toggleOppositionCardDetails}
              isInteractive={false}
              getCardData={getCardData}
              getLocalizedCardName={getLocalizedCardName}
              getLocalizedScientificName={getLocalizedScientificName}
              className="opposition-hand"
            />
          );
        })()*/} 

        {/* Card Drawing Animation - Full Screen Overlay */}
        {isDrawingCards && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(5px)'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                background: 'rgba(0, 0, 0, 0.9)',
                padding: '30px',
                borderRadius: '16px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                minWidth: '280px',
                maxWidth: '90vw'
              }}
            >
              <div style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '10px'
              }}>
                Drawing Cards
              </div>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {drawnCards.map((cardId, index) => {
                  const cardData = getCardData(cardId);
                  const cardName = getLocalizedCardName(cardData);

                  return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -30, rotateY: 180 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.4 }}
                    style={{
                      width: '80px',
                      height: '100px',
                      background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                      borderRadius: '8px',
                      border: '3px solid #fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                      padding: '4px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '8px', marginBottom: '4px' }}>
                      {cardName?.slice(0, 8) || 'Card'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {index + 1}
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Action Buttons */}
        {gameState.gamePhase === GamePhase.PLAYING && isPlayerTurn && (
          <IonCard className="action-buttons-card">
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={handlePassTurn}
                    >
                      Pass Turn
                    </IonButton>
                  </IonCol>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      disabled={!selectedHandCardId || highlightedPositions.length === 0}
                    >
                      Play Card
                    </IonButton>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={handleDropAndDraw}
                      disabled={!selectedHandCardId || (gameState as any)?.actionsRemaining <= 0}
                    >
                      Drop & Draw 3
                    </IonButton>
                  </IonCol>
                  <IonCol>
                    {/* Future action button can go here */}
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* Error display */}
        {error && (
          <IonCard color="danger">
            <IonCardContent>
              <p>{error}</p>
            </IonCardContent>
          </IonCard>
        )}

        {/* Forfeit confirmation alert */}
        <IonAlert
          isOpen={showForfeitAlert}
          onDidDismiss={() => setShowForfeitAlert(false)}
          header="Forfeit Match"
          message="Are you sure you want to forfeit this match? You will return to the mode selection screen."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowForfeitAlert(false);
              }
            },
            {
              text: 'Forfeit',
              role: 'destructive',
              handler: handleForfeit
            }
          ]}
        />

        {/* End Game Modal */}
        <EndGameModal
          isOpen={showEndGameModal}
          winner={endGameData?.winner}
          finalScores={endGameData?.finalScores}
          gameStats={endGameData?.gameStats}
          onClose={handleCloseEndGameModal}
          onPlayAgain={handlePlayAgain}
          onReturnHome={handleReturnHome}
        />
      </IonContent>
    </IonPage>
    </motion.div>
  );
};

export default TCGBattleScreen;
