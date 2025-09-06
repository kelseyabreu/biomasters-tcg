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
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonAlert,
  IonChip,
  IonProgressBar,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import {
  flash,
  shield,
  heart,
  arrowBack,
  trophy,
  globe,
  star,
  play,
  people,
  book,
  rocket
} from 'ionicons/icons';

// Import the battle store instead of game engine
import useHybridGameStore from '../../state/hybridGameStore';
import { CommonName, SPECIES_DISPLAY_NAMES, GamePhase } from '../../../shared/enums';
import { useLocalization } from '../../contexts/LocalizationContext';
import { getLocalizedCardData } from '../../utils/cardLocalizationMapping';
import OrganismRenderer from '../OrganismRenderer';
import { TCGGameService } from '../../services/TCGGameService';

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
  // Create TCG game service instance
  const [tcgGameService] = React.useState(() => new TCGGameService());

  // Localization
  const localization = useLocalization();

  // Get all state from the battle store
  const gameState = useHybridGameStore(state => state.battle.tcgGameState);
  const isLoading = useHybridGameStore(state => state.battle.isLoading);
  const error = useHybridGameStore(state => state.battle.error);
  const selectedHandCardId = useHybridGameStore(state => state.battle.uiState.selectedHandCardId);
  const selectedBoardCardId = useHybridGameStore(state => state.battle.uiState.selectedBoardCardId);
  const highlightedPositions = useHybridGameStore(state => state.battle.uiState.highlightedPositions);

  // Get battle actions from the store
  const startTCGGame = useHybridGameStore(state => state.battle.actions.startTCGGame);
  const playCard = useHybridGameStore(state => state.battle.actions.playCard);
  const passTurn = useHybridGameStore(state => state.battle.actions.passTurn);
  const selectHandCard = useHybridGameStore(state => state.battle.actions.selectHandCard);
  const setHighlightedPositions = useHybridGameStore(state => state.battle.actions.setHighlightedPositions);
  const clearUIState = useHybridGameStore(state => state.battle.actions.clearUIState);

  // Local UI state (non-game related)
  const [showForfeitAlert, setShowForfeitAlert] = React.useState(false);

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

    // Only initialize if we don't have a game state yet
    if (!gameState && !isLoading) {
      initializeGame();
    }
  }, [gameState, isLoading, startTCGGame]);

  // Handle card selection from hand
  const handleCardSelect = useCallback((cardInstanceId: string) => {
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

      // Calculate valid positions using the game service
      try {
        // Extract card ID from instance ID (e.g., "1" from "1_0")
        const cardId = parseInt(cardInstanceId.split('_')[0]);
        const validPositions = tcgGameService.getValidPositions(cardId, currentPlayer.id);

        console.log(`🎯 Valid positions for card ${cardInstanceId}:`, validPositions);
        setHighlightedPositions(validPositions);
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

  // Helper function to extract card ID from instance ID
  const extractCardIdFromInstance = (instanceId: string): string => {
    // For now, return the instanceId as-is since we're using string IDs
    const match = instanceId.match(/card-instance-(\d+)-/);
    return match ? match[1] : instanceId;
  };

  // Helper function to get card data (simplified for now)
  const getCardData = (instanceId: string): any => {
    // TODO: Get card data from store or game state
    // For now, return a placeholder object
    return {
      CommonName: 'Card',
      ScientificName: 'Species name',
      VictoryPoints: 1,
      TrophicLevel: 1
    };
  };

  // Helper function to get localized card names for battle screen
  const getLocalizedCardName = (cardData: any): string => {
    if (!cardData?.CommonName) return 'Unknown';

    const mockCard = {
      commonName: cardData.CommonName,
      scientificName: cardData.ScientificName || ''
    };

    const localizedCard = getLocalizedCardData(mockCard, localization);
    return localizedCard.displayName;
  };

  const getLocalizedScientificName = (cardData: any): string => {
    if (!cardData?.ScientificName) return '';

    const mockCard = {
      commonName: cardData.CommonName || '',
      scientificName: cardData.ScientificName
    };

    const localizedCard = getLocalizedCardData(mockCard, localization);
    return localizedCard.displayScientificName;
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

  // Render loading state
  console.log('🎮 [TCG] Render check - isLoading:', isLoading, 'gameState:', !!gameState, 'error:', error);

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
            <p>{isLoading ? 'Loading game data and setting up battle...' : 'Loading game...'}</p>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
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
    gridContents: gameState.grid ? Array.from(gameState.grid.entries()) : []
  });

  return (
    <IonPage className="tcg-battle-screen">
      <IonHeader>
        <IonToolbar>
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
        {/* Game Status Bar */}
        <IonCard className="game-status-card">
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={people} />
                    <span>Turn {gameState.turnNumber || 1}</span>
                  </div>
                </IonCol>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={star} />
                    <span>Phase: {gameState.turnPhase || 'ACTION'}</span>
                  </div>
                </IonCol>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={flash} />
                    <span>Actions: {gameState.actionsRemaining || 1}</span>
                  </div>
                </IonCol>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={trophy} />
                    <span>{isPlayerTurn ? 'Your Turn' : 'AI Turn'}</span>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>



        {/* Game Setup Phase */}
        {gameState.gamePhase === GamePhase.SETUP && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Game Setup</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Game is being set up. Please wait...</p>
              <IonProgressBar type="indeterminate" />
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
                  position: 'relative',
                  width: `${gameState.gameSettings.gridWidth * 60}px`,
                  height: `${gameState.gameSettings.gridHeight * 60}px`,
                  margin: '0 auto',
                  maxWidth: '90vw',
                  maxHeight: '60vh'
                }}
              >

                {Array.from({ length: gameState.gameSettings.gridHeight }, (_, y) =>
                  Array.from({ length: gameState.gameSettings.gridWidth }, (_, x) => {
                    const positionKey = `${x},${y}`;
                    const card = gameState.grid.get(positionKey);
                    const isValidPosition = highlightedPositions.some((pos: any) => pos.x === x && pos.y === y);
                    const isHomePosition = card?.isHOME;



                    return (
                      <div
                        key={positionKey}
                        className={`grid-cell ${card ? 'occupied' : 'empty'} ${isValidPosition ? 'highlighted' : ''} ${isHomePosition ? 'home-position' : ''}`}
                        onClick={() => handleGridPositionClick(x, y)}
                        style={{
                          position: 'absolute',
                          left: x * 60,
                          top: y * 60,
                          width: 60,
                          height: 60,
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          backdropFilter: 'blur(5px)'
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
      </IonContent>
    </IonPage>
  );
};

export default TCGBattleScreen;
