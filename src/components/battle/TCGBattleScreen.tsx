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
  time
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
import '../ui/PlayerStatsDisplay.css';
import '../ui/EndGameModal.css';

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

  // Theme
  const { currentTheme } = useTheme();

  // Local UI state (non-game related)
  const [showForfeitAlert, setShowForfeitAlert] = React.useState(false);
  const [showEndGameModal, setShowEndGameModal] = React.useState(false);
  const [endGameData, setEndGameData] = React.useState<any>(null);

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
    console.log(`🔍 [TCG] AI useEffect triggered - gameState exists: ${!!gameState}`);

    if (gameState) {
      console.log(`🔍 [TCG] Game phase: ${gameState.gamePhase}, currentPlayerIndex: ${gameState.currentPlayerIndex}`);
    }

    if (gameState &&
        gameState.gamePhase === GamePhase.PLAYING &&
        gameState.currentPlayerIndex !== undefined) {

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      console.log(`🔍 [TCG] Current player: ${currentPlayer?.name} (${currentPlayer?.id})`);
      console.log(`🔍 [TCG] Player properties:`, Object.keys(currentPlayer || {}));
      console.log(`🔍 [TCG] player.actionsRemaining: ${(currentPlayer as any)?.actionsRemaining}`);
      console.log(`🔍 [TCG] gameState.actionsRemaining: ${(gameState as any)?.actionsRemaining}`);
      console.log(`🔍 [TCG] actions: ${(currentPlayer as any)?.actions}`);
      console.log(`🔍 [TCG] Full player object:`, currentPlayer);

      // Check the raw game state from engine
      console.log(`🔍 [TCG] Raw gameState:`, gameState);
      console.log(`🔍 [TCG] Raw gameState players:`, gameState.players);

      if (currentPlayer && currentPlayer.id !== 'human' && (gameState as any).actionsRemaining > 0) {
        console.log(`🤖 [TCG] AI turn detected for player: ${currentPlayer.name}`);

        // Create AI strategy (for now, always use EASY - will be configurable later)
        const aiStrategy = AIStrategyFactory.createStrategy(AIDifficulty.EASY);
        const thinkingDelay = aiStrategy.getThinkingDelay();

        console.log(`🤖 [TCG] AI will think for ${Math.round(thinkingDelay)}ms`);

        setTimeout(async () => {
          try {
            // Check if AI should pass turn
            if (aiStrategy.shouldPassTurn(currentPlayer.hand, (gameState as any).actionsRemaining, gameState as any, currentPlayer.id)) {
              console.log(`🤖 [TCG] AI decided to pass turn`);

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
                console.log(`✅ [TCG] AI successfully passed turn`);
              } else {
                console.error(`❌ [TCG] AI failed to pass turn:`, result.errorMessage);
              }
              return;
            }

            // AI has no cards, must pass
            if (currentPlayer.hand.length === 0) {
              console.log(`🤖 [TCG] AI has no cards, passing turn`);

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
    if (!gameState || !selectedHandCardId) return;

    await dropAndDrawThree(selectedHandCardId);
  }, [gameState, selectedHandCardId, dropAndDrawThree]);



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

  console.log('🎮 [TCG] Card data debug:', {
    allSpeciesCardsCount: allSpeciesCards?.length || 0,
    allSpeciesCardsLoaded: !!allSpeciesCards,
    speciesLoaded,
    sampleCards: allSpeciesCards?.slice(0, 3)?.map(card => ({ cardId: card.cardId, nameId: card.nameId })) || []
  });

  // Helper function to get card data from the store (no hooks inside)
  const getCardData = (instanceId: string): any => {
    // Extract card ID from instance ID (e.g., "1" from "1_0" or just "1")
    const cardId = parseInt(instanceId.split('_')[0]);

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
    if (!cardData?.nameId) return 'Unknown';
    // Use localization system to get proper card name
    return localization.getCardName(cardData.nameId as any);
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

  // Render loading or error state
  console.log('🎮 [TCG] Render check - isLoading:', isLoading, 'gameState:', !!gameState, 'error:', error);

  // Show error state if there's an error
  if (error) {
    console.log('🎮 [TCG] Rendering error state');
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
    console.log('🎮 [TCG] Rendering loading state');
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

  console.log('🎮 [TCG] Rendering main UI with:', {
    currentPlayer: currentPlayer?.id,
    isPlayerTurn,
    gamePhase: gameState.gamePhase,
    turnPhase: gameState.turnPhase,
    gridSize: gameState.grid?.size || 0,
    gridWidth: gameState.gameSettings?.gridWidth,
    gridHeight: gameState.gameSettings?.gridHeight,
    gridContents: gameState.grid && gameState.grid.entries ? Array.from(gameState.grid.entries()) : []
  });

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
            console.log(`🔍 [TCG] Engine found:`, !!engine, `getGameProgress available:`, engine && typeof engine.getGameProgress === 'function');

            if (engine && typeof engine.getGameProgress === 'function') {
              console.log(`🎯 [TCG] Getting game progress for enhanced stats display`);
              const gameProgress = engine.getGameProgress();
              console.log(`📊 [TCG] Game progress retrieved:`, gameProgress);

              return (
                <div className="enhanced-game-status">
                  {/* Player Stats Cards - Side by Side */}
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
                            className={playerStats.isCurrentPlayer ? 'current-player-stats' : ''}
                          />
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                </div>
              );
            } else {
              console.warn('🔍 [TCG] Engine or getGameProgress not available, using fallback');
            }
          } catch (error) {
            console.warn('🔍 [TCG] Could not get enhanced stats, using fallback:', error);
          }

          // Fallback to simple message if enhanced stats not available
          console.log('🔄 [TCG] Using fallback status display');
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
        {/* Game Grid */}
        {(gameState.gamePhase === GamePhase.SETUP || gameState.gamePhase === GamePhase.PLAYING) && gameState.gameSettings && (
          <IonCard className="game-grid-card">
            <IonCardHeader>
              <IonCardTitle>Ecosystem Grid ({gameState.gameSettings.gridWidth}x{gameState.gameSettings.gridHeight})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>

              <div
                className="ecosystem-board"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gameState.gameSettings.gridWidth}, 60px)`,
                  gridTemplateRows: `repeat(${gameState.gameSettings.gridHeight}, 60px)`,
                  gap: '1px',
                  margin: '0 auto',
                  maxWidth: '90vw',
                  maxHeight: '60vh',
                  justifyContent: 'center'
                }}
              >

                {Array.from({ length: gameState.gameSettings.gridHeight }, (_, y) =>
                  Array.from({ length: gameState.gameSettings.gridWidth }, (_, x) => {
                    const positionKey = `${x},${y}`;
                    const card = gameState.grid && gameState.grid.get ? gameState.grid.get(positionKey) : null;
                    const isValidPosition = highlightedPositions.some((pos: any) => pos.x === x && pos.y === y);
                    const isHomePosition = card?.isHOME;



                    return (
                      <div
                        key={positionKey}
                        className={`grid-cell ${card ? 'occupied' : 'empty'} ${isValidPosition ? 'highlighted' : ''} ${isHomePosition ? 'home-position' : ''}`}
                        onClick={() => handleGridPositionClick(x, y)}
                        style={{
                          width: '60px',
                          height: '60px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          backdropFilter: 'blur(5px)',
                          position: 'relative'
                        }}
                      >
                        {card && (
                          <div className={`ecosystem-card ${card.isHOME ? 'home-card' : ''}`}>
                            {card.isHOME ? (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                borderRadius: '12px'
                              }}>
                                🏠
                              </div>
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                background: card.ownerId === 'human'
                                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white',
                                borderRadius: '12px',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '8px',
                                textAlign: 'center'
                              }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                  {getLocalizedCardName(getCardData(card.instanceId))?.slice(0, 6) || 'Card'}
                                </div>
                                <div style={{ fontSize: '6px', opacity: 0.8 }}>
                                  VP: {getCardData(card.instanceId)?.VictoryPoints || 0}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isValidPosition && (
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--ion-color-success)',
                            border: '1px solid white'
                          }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Player Hand */}
        {gameState.gamePhase === GamePhase.PLAYING && currentPlayer && (
          <IonCard className="player-hand-card">
            <IonCardHeader>
              <IonCardTitle>Your Hand ({currentPlayer.hand.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="hand-cards" style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '8px 0'
              }}>
                {currentPlayer.hand.map((cardInstanceId: any) => {
                  const cardData = getCardData(cardInstanceId);
                  const isSelected = selectedHandCardId === cardInstanceId;

                  return (
                    <div
                      key={cardInstanceId}
                      className={`hand-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleCardSelect(cardInstanceId)}
                      style={{
                        minWidth: '80px',
                        width: '80px',
                        height: '100px',
                        border: isSelected
                          ? '2px solid var(--ion-color-primary)'
                          : '1px solid var(--ion-color-medium)',
                        borderRadius: '8px',
                        padding: '4px',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--ion-color-primary-tint)'
                          : 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '9px' }}>
                        {getLocalizedCardName(cardData) || 'Unknown'}
                      </div>

                      {/* Organism Visual */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        margin: '2px 0',
                        border: '1px solid var(--ion-color-light)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <OrganismRenderer
                          card={cardData}
                          size={40}
                          className="battle-card-organism"
                        />
                      </div>

                      <div style={{
                        fontSize: '8px',
                        color: 'var(--ion-color-medium)',
                        fontStyle: 'italic'
                      }}>
                        {getLocalizedScientificName(cardData) || ''}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        fontSize: '8px'
                      }}>
                        <IonBadge color="success" style={{ fontSize: '8px' }}>
                          VP: {cardData?.VictoryPoints || 0}
                        </IonBadge>
                        <IonBadge color="primary" style={{ fontSize: '8px' }}>
                          T{cardData?.TrophicLevel || 0}
                        </IonBadge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </IonCardContent>
          </IonCard>
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
