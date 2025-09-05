/**
 * TCG Battle Screen
 * BioMasters Trading Card Game battle interface using ClientGameEngine
 */

import React, { useState, useEffect, useCallback } from 'react';
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

import { ClientGameEngine, ClientGameState, ClientPlayer, ClientGridCard } from '../../services/ClientGameEngine';
import { GameActionType, GamePhase, TurnPhase } from '../../../shared/enums';
import { CommonName, SPECIES_DISPLAY_NAMES } from '../../../shared/enums';
import OrganismRenderer from '../OrganismRenderer';

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
  // Game engine and state
  const [gameEngine] = useState(() => new ClientGameEngine());
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // UI state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [validPositions, setValidPositions] = useState<{ x: number; y: number }[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showForfeitAlert, setShowForfeitAlert] = useState(false);
  const [gameSettings] = useState<TCGGameSettings>({
    gameMode: 'practice',
    difficulty: 'easy',
    playerCount: 2
  });

  // Initialize game engine and create game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        console.log('🎮 [TCG] Initializing TCG Battle...');
        console.log('🎮 [TCG] Game settings:', gameSettings);

        // Initialize the game engine
        console.log('🎮 [TCG] Initializing game engine...');
        await gameEngine.initialize();
        console.log('✅ [TCG] Game engine initialized');

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

        console.log('🎮 [TCG] Creating game...');
        const newGameState = await gameEngine.createGame('tcg-battle', players, {
          startingHandSize: 5,
          maxHandSize: 10
          // Grid dimensions will be set automatically based on player count
        });

        console.log('🎮 [TCG] Game state created:', {
          gameId: newGameState.gameId,
          playerCount: newGameState.players.length,
          gridWidth: newGameState.gameSettings.gridWidth,
          gridHeight: newGameState.gameSettings.gridHeight,
          gamePhase: newGameState.gamePhase,
          turnPhase: newGameState.turnPhase,
          gridSize: newGameState.grid.size
        });

        setGameState(newGameState);
        setIsInitialized(true);

        console.log('✅ [TCG] TCG Battle initialized successfully');
        console.log('✅ [TCG] Component state updated - isInitialized:', true);
      } catch (error) {
        console.error('❌ [TCG] Failed to initialize TCG Battle:', error);
        console.error('❌ [TCG] Error details:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : '');
        setAlertMessage('Failed to initialize game. Please try again.');
        setShowAlert(true);
      }
    };

    console.log('🎮 [TCG] useEffect triggered - starting initialization');
    initializeGame();
  }, [gameEngine]);

  // Handle card selection from hand
  const handleCardSelect = useCallback((cardInstanceId: string) => {
    if (!gameState) return;
    
    const currentPlayer = gameEngine.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.hand.includes(cardInstanceId)) {
      return;
    }

    if (selectedCard === cardInstanceId) {
      // Deselect
      setSelectedCard(null);
      setValidPositions([]);
    } else {
      // Select card and show valid positions
      setSelectedCard(cardInstanceId);
      
      // Extract card ID from instance ID
      const cardId = extractCardIdFromInstance(cardInstanceId);
      const positions = gameEngine.getValidPositions(cardId, currentPlayer.id);
      setValidPositions(positions);
    }
  }, [gameState, selectedCard, gameEngine]);

  // Handle card placement on grid
  const handleGridPositionClick = useCallback((x: number, y: number) => {
    if (!gameState || !selectedCard) return;

    const currentPlayer = gameEngine.getCurrentPlayer();
    if (!currentPlayer) return;

    // Check if position is valid
    const isValidPosition = validPositions.some(pos => pos.x === x && pos.y === y);
    if (!isValidPosition) {
      setAlertMessage('Invalid position for this card');
      setShowAlert(true);
      return;
    }

    // Process play card action
    const action = {
      type: GameActionType.PLAY_CARD,
      playerId: currentPlayer.id,
      payload: {
        cardId: selectedCard,
        position: { x, y }
      }
    };

    const result = gameEngine.processAction(action);
    
    if (result.isValid && result.newState) {
      setGameState(result.newState);
      setSelectedCard(null);
      setValidPositions([]);
      
      // Save game state
      gameEngine.saveToLocalStorage();
    } else {
      setAlertMessage(result.errorMessage || 'Failed to play card');
      setShowAlert(true);
    }
  }, [gameState, selectedCard, validPositions, gameEngine]);

  // Handle pass turn
  const handlePassTurn = useCallback(() => {
    if (!gameState) return;

    const currentPlayer = gameEngine.getCurrentPlayer();
    if (!currentPlayer) return;

    const action = {
      type: GameActionType.PASS_TURN,
      playerId: currentPlayer.id,
      payload: {}
    };

    const result = gameEngine.processAction(action);
    
    if (result.isValid && result.newState) {
      setGameState(result.newState);
      setSelectedCard(null);
      setValidPositions([]);
      
      // Save game state
      gameEngine.saveToLocalStorage();
    }
  }, [gameState, gameEngine]);

  // Handle player ready (for game start)
  const handlePlayerReady = useCallback(() => {
    if (!gameState) return;

    const currentPlayer = gameEngine.getCurrentPlayer();
    if (!currentPlayer) return;

    const action = {
      type: GameActionType.PLAYER_READY,
      playerId: currentPlayer.id,
      payload: {}
    };

    const result = gameEngine.processAction(action);
    
    if (result.isValid && result.newState) {
      setGameState(result.newState);
    }
  }, [gameState, gameEngine]);

  // Helper function to extract card ID from instance ID
  const extractCardIdFromInstance = (instanceId: string): number => {
    const match = instanceId.match(/card-instance-(\d+)-/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Helper function to get card data
  const getCardData = (instanceId: string) => {
    const cardId = extractCardIdFromInstance(instanceId);
    return gameEngine['gameDataManager']?.getCard(cardId);
  };

  // Handle forfeit/quit match
  const handleForfeit = () => {
    console.log('🏳️ Player forfeiting TCG match');
    setShowForfeitAlert(false);

    // Clear game state and exit
    setGameState(null);
    setSelectedCard(null);
    setValidPositions([]);
    setIsInitialized(false);

    // Call onExit to return to mode selector
    if (onExit) {
      onExit();
    }

    // Show confirmation message
    setTimeout(() => {
      setAlertMessage('Match forfeited. Returning to mode selection.');
      setShowAlert(true);
    }, 100);
  };

  // Render loading state
  console.log('🎮 [TCG] Render check - isInitialized:', isInitialized, 'gameState:', !!gameState);

  if (!isInitialized || !gameState) {
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

  const currentPlayer = gameEngine.getCurrentPlayer();
  const isPlayerTurn = currentPlayer?.id === 'human';
  const availableActions = gameEngine.getAvailableActions();

  console.log('🎮 [TCG] Rendering main UI with:', {
    currentPlayer: currentPlayer?.id,
    isPlayerTurn,
    gamePhase: gameState.gamePhase,
    gridWidth: gameState.gameSettings.gridWidth,
    gridHeight: gameState.gameSettings.gridHeight,
    gridCards: gameState.grid.size,
    availableActions
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
                    <span>Turn {gameState.turnNumber}</span>
                  </div>
                </IonCol>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={star} />
                    <span>Phase: {gameState.turnPhase}</span>
                  </div>
                </IonCol>
                <IonCol size="3">
                  <div className="status-item">
                    <IonIcon icon={flash} />
                    <span>Actions: {gameState.actionsRemaining}</span>
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
              <p>Prepare for battle! Click Ready when you're set to begin.</p>
              <IonButton
                expand="block"
                onClick={handlePlayerReady}
                disabled={currentPlayer?.isReady}
              >
                {currentPlayer?.isReady ? 'Ready!' : 'Ready to Battle'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Game Grid */}
        {(gameState.gamePhase === GamePhase.SETUP || gameState.gamePhase === GamePhase.PLAYING) && (
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
                    const isValidPosition = validPositions.some(pos => pos.x === x && pos.y === y);
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
                                  {getCardData(card.instanceId)?.CommonName?.slice(0, 6) || 'Card'}
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
                {currentPlayer.hand.map((cardInstanceId) => {
                  const cardData = getCardData(cardInstanceId);
                  const isSelected = selectedCard === cardInstanceId;

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
                        {cardData?.CommonName || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: '8px',
                        color: 'var(--ion-color-medium)',
                        fontStyle: 'italic'
                      }}>
                        {cardData?.ScientificName || ''}
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
                      disabled={!availableActions.includes('pass_turn')}
                    >
                      Pass Turn
                    </IonButton>
                  </IonCol>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      disabled={!selectedCard || validPositions.length === 0}
                    >
                      Play Card
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* Alert for messages */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Game Message"
          message={alertMessage}
          buttons={['OK']}
        />

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
