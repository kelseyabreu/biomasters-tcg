/**
 * Unified Battle Interface
 * Reusable battle component that works for both online and offline games
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
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
  IonProgressBar
} from '@ionic/react';
import { motion } from 'framer-motion';
import {
  arrowBack,
  checkmarkCircle,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import { GamePhase } from '../../../shared/enums';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useTheme } from '../../theme/ThemeProvider';
import EcosystemGrid from '../game/EcosystemGrid';
import PlayerCard from './PlayerCard';
import DeckSelectionComponent from './DeckSelectionComponent';
import EndGameModal from '../ui/EndGameModal';

// Import CSS files
import './TCGBattleScreen.css';
import '../game/EcosystemBoard.css';
import '../ui/PlayerStatsDisplay.css';
import '../ui/EndGameModal.css';
import './PlayerHandDisplay.css';
import './PlayerCard.css';

export interface UnifiedBattleInterfaceProps {
  // Game state
  gameState: any;
  isLoading: boolean;
  error: string | null;
  
  // UI state
  selectedHandCardId: string | null;
  highlightedPositions: any[];
  
  // Callbacks
  onExit?: () => void;
  onPlayerReady?: () => Promise<void>;
  onGridPositionClick?: (x: number, y: number) => void;
  onHandCardSelect?: (cardId: string) => void;
  onDropAndDraw?: () => void;
  onPassTurn?: () => void;
  
  // Data
  allSpeciesCards: any[];
  getCardData: (cardId: string) => any;
  
  // Mode
  isOnlineMode?: boolean;
  title?: string;
  sessionId?: string;
  userId?: string;
}

export const UnifiedBattleInterface: React.FC<UnifiedBattleInterfaceProps> = ({
  gameState,
  isLoading,
  error,
  selectedHandCardId,
  highlightedPositions,
  onExit,
  onPlayerReady,
  onGridPositionClick,
  onHandCardSelect,
  onDropAndDraw,
  onPassTurn,
  allSpeciesCards,
  getCardData,
  isOnlineMode = false,
  title = 'Battle',
  sessionId,
  userId
}) => {
  const localization = useLocalization();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Timer state for deck selection countdown
  const [timeRemaining, setTimeRemaining] = useState<number>(60);

  // Countdown timer effect for deck selection
  useEffect(() => {
    if (gameState.gamePhase === GamePhase.SETUP && isOnlineMode) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.gamePhase, isOnlineMode]);

  // Loading state
  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            {onExit && (
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={onExit}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
            )}
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2>Initializing BioMasters TCG</h2>
            <p>Loading game data and setting up battle...</p>
            <IonProgressBar type="indeterminate" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            {onExit && (
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={onExit}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
            )}
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2>Error Loading Battle</h2>
            <p>{error}</p>
            {onExit && (
              <IonButton onClick={onExit} color="primary">
                Go Back
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // No game state
  if (!gameState) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            {onExit && (
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={onExit}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
            )}
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2>No Game Data</h2>
            <p>Game state not available</p>
            {onExit && (
              <IonButton onClick={onExit} color="primary">
                Go Back
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Debug: Log the actual game state structure
  console.log('🔍 [UnifiedBattleInterface] Game state structure:', {
    gamePhase: gameState.gamePhase,
    hasGameSettings: !!gameState.gameSettings,
    hasGrid: !!(gameState.grid || gameState.engineState?.grid),
    hasPlayers: !!gameState.players,
    playersCount: gameState.players?.length,
    hasEngineState: !!gameState.engineState,
    engineInitialized: gameState.engineInitialized,
    deckSelectionCompleted: gameState.deckSelectionCompleted,
    gameStateKeys: Object.keys(gameState),
    engineStateKeys: gameState.engineState ? Object.keys(gameState.engineState) : []
  });

  // 🏠 DEBUG: HOME CARDS ANALYSIS
  console.log('🏠 [GRID LOCATION DEBUG] Checking grid locations:', {
    hasDirectGrid: !!gameState.grid,
    hasEngineState: !!gameState.engineState,
    hasEngineGrid: !!(gameState.engineState?.grid),
    directGridType: gameState.grid ? typeof gameState.grid : 'undefined',
    engineGridType: gameState.engineState?.grid ? typeof gameState.engineState.grid : 'undefined',
    directGridKeys: gameState.grid && typeof gameState.grid === 'object' ? Object.keys(gameState.grid) : 'N/A',
    engineGridKeys: gameState.engineState?.grid && typeof gameState.engineState.grid === 'object' ? Object.keys(gameState.engineState.grid) : 'N/A'
  });

  const grid = gameState.grid || gameState.engineState?.grid;
  if (grid) {
    console.log('🏠 [HOME CARDS DEBUG] Grid analysis:', {
      gridSize: grid.size,
      gridType: grid.constructor.name,
      hasEntries: grid.size > 0,
      isMap: grid instanceof Map,
      isObject: typeof grid === 'object',
      objectKeys: typeof grid === 'object' && !(grid instanceof Map) ? Object.keys(grid) : 'N/A'
    });

    // Handle both Map and Object formats
    let gridEntries: [string, any][] = [];

    if (grid instanceof Map) {
      // Grid is a proper Map
      gridEntries = Array.from(grid.entries()) as [string, any][];
    } else if (typeof grid === 'object' && grid !== null) {
      // Grid is a plain object (serialized from server)
      gridEntries = Object.entries(grid);
    }

    console.log('🏠 [HOME CARDS DEBUG] All grid entries:', gridEntries.map(([key, card]) => ({
      position: key,
      cardId: card.cardId,
      instanceId: card.instanceId,
      ownerId: card.ownerId,
      isHOME: card.isHOME,
      cardType: card.isHOME ? 'HOME' : 'REGULAR'
    })));

    // Specifically look for HOME cards
    const homeCards = gridEntries.filter(([_, card]) => card.isHOME || card.cardId === 0);
    console.log('🏠 [HOME CARDS DEBUG] HOME cards found:', homeCards.length, homeCards.map(([key, card]) => ({
      position: key,
      cardId: card.cardId,
      instanceId: card.instanceId,
      ownerId: card.ownerId,
      isHOME: card.isHOME
    })));

    if (homeCards.length === 0) {
      console.error('🚨 [HOME CARDS ERROR] No HOME cards found in grid! This should not happen.');
      console.log('🔍 [HOME CARDS DEBUG] Grid contents:', gridEntries);
    }
  } else {
    console.error('🚨 [HOME CARDS ERROR] No grid found in game state!');
  }

  // 👤 DEBUG: USER IDENTIFICATION ANALYSIS
  console.log('👤 [USER ID DEBUG] User identification analysis:', {
    userIdProp: userId,
    userIdType: typeof userId,
    sessionId: sessionId,
    isOnlineMode: isOnlineMode
  });

  // Debug: Compare regular players vs engine players
  if (gameState.engineState?.players) {
    console.log('🎮 [UnifiedBattleInterface] Engine players:', gameState.engineState.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand?.length || 0,
      deckSize: p.deck?.length || 0,
      energy: p.energy,
      hand: p.hand?.map((card: any) => ({ id: card.id, name: card.name || 'Unknown' }))
    })));
  }

  if (gameState.players) {
    console.log('🎮 [UnifiedBattleInterface] Regular players (full objects):', gameState.players.map((p: any) => ({
      ...p,
      allKeys: Object.keys(p)
    })));
  }

  // If in playing phase but no engine state, show detailed debug
  if (gameState.gamePhase === 'playing' && !gameState.engineState && isOnlineMode) {
    console.log('🚨 [UnifiedBattleInterface] PLAYING phase but no engine state!');
    console.log('🔍 [UnifiedBattleInterface] Full game state:', JSON.stringify(gameState, null, 2));
  }

  // Helper functions
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
    const nextIndex = (currentCardIndex + 1) % gameState.players.length;
    scrollToCard(nextIndex);
  };

  const prevCard = () => {
    const prevIndex = currentCardIndex === 0 ? gameState.players.length - 1 : currentCardIndex - 1;
    scrollToCard(prevIndex);
  };

  // Determine current player and turn state
  const currentPlayer = gameState.players?.find((p: any) => p.id === 'human');
  const isPlayerTurn = gameState.currentPlayerIndex !== undefined && 
    gameState.players[gameState.currentPlayerIndex]?.id === 'human';
  const actionsRemaining = (gameState as any)?.actionsRemaining || 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {onExit && (
            <IonButtons slot="start">
              <IonButton fill="clear" onClick={onExit}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
          )}
          <IonTitle>{title} {isOnlineMode ? '(Online)' : ''}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Debug: Show actual game state for online mode */}
        {isOnlineMode && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>🔧 Debug: Server Game State</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <strong>Game Phase:</strong> {gameState.gamePhase || 'undefined'}<br/>
                <strong>Players:</strong> {gameState.players?.length || 0}<br/>
                <strong>Has Game Settings:</strong> {gameState.gameSettings ? 'Yes' : 'No'}<br/>
                <strong>Has Grid:</strong> {(gameState.grid || gameState.engineState?.grid) ? 'Yes' : 'No'}<br/>
                <strong>Game State Keys:</strong> {Object.keys(gameState).join(', ')}<br/>
              </div>

              {/* Forfeit Button */}
              <div style={{ marginTop: '16px' }}>
                <IonButton
                  color="danger"
                  fill="outline"
                  onClick={onExit}
                >
                  Forfeit Match
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Game Setup Phase - Deck selection for online, ready up for offline */}
        {gameState.gamePhase === GamePhase.SETUP && (() => {
          // Check if this is online mode with deck selection
          const isDeckSelectionPhase = isOnlineMode && (
            gameState.deckSelectionTimeRemaining !== undefined ||
            gameState.players?.some((p: any) => p.hasDeckSelected !== undefined)
          );

          if (isDeckSelectionPhase) {
            // Online: Deck Selection Phase
            return (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Choose Your Deck</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3>Time Remaining: {timeRemaining}s</h3>
                    <IonProgressBar
                      value={(60 - timeRemaining) / 60}
                      color={timeRemaining <= 10 ? "danger" : "primary"}
                    />
                  </div>

                  <DeckSelectionComponent
                    sessionId={sessionId || 'unknown'}
                    onDeckSelected={onPlayerReady}
                    isOnlineMode={isOnlineMode}
                  />

                  <div style={{ marginTop: '16px' }}>
                    <h4>Player Status:</h4>
                    {gameState.players?.map((player: any, index: number) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: player.hasDeckSelected ? '#d4edda' : '#f8d7da',
                        borderRadius: '4px',
                        marginBottom: '4px'
                      }}>
                        <IonIcon
                          icon={checkmarkCircle}
                          color={player.hasDeckSelected ? 'success' : 'medium'}
                          style={{ marginRight: '8px' }}
                        />
                        <span>{player.name} {
                          gameState.gamePhase === GamePhase.PLAYING ? '(Ready)' :
                          player.hasDeckSelected ? '(Deck Selected)' : '(Selecting...)'
                        }</span>
                      </div>
                    ))}
                  </div>

                  {/* Forfeit Button */}
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <IonButton
                      color="danger"
                      fill="outline"
                      onClick={onExit}
                    >
                      Forfeit Match
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            );
          } else {
            // Offline: Regular Setup Phase (existing logic)
            return (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Game Setup</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div>
                    <h4>Player Status:</h4>
                    <IonGrid>
                      <IonRow>
                        {gameState.players.map((player: any) => (
                          <IonCol key={player.id} size="6">
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px',
                              backgroundColor: player.isReady ? '#d4edda' : '#f8d7da',
                              borderRadius: '4px',
                              marginBottom: '4px'
                            }}>
                              <IonIcon
                                icon={checkmarkCircle}
                                color={player.isReady ? 'success' : 'medium'}
                                style={{ marginRight: '8px' }}
                              />
                              <span>{player.name}</span>
                            </div>
                          </IonCol>
                        ))}
                      </IonRow>
                    </IonGrid>
                  </div>

                  {/* Show ready button for human player if not ready */}
                  {(() => {
                    const humanPlayer = gameState.players.find((p: any) => p.id === 'human');
                    if (humanPlayer && !humanPlayer.isReady && onPlayerReady) {
                      return (
                        <IonButton
                          expand="block"
                          color="primary"
                          onClick={onPlayerReady}
                        >
                          <IonIcon icon={checkmarkCircle} slot="start" />
                          Mark as Ready
                        </IonButton>
                      );
                    }

                    // All players ready - show waiting message
                    const allReady = gameState.players.every((p: any) => p.isReady);
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
            );
          }
        })()}

        {/* Debug: Missing Engine State */}
        {gameState.gamePhase === GamePhase.PLAYING && !gameState.gameSettings && isOnlineMode && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>🚨 Debug: Missing Engine State</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ background: '#fff3cd', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <h4>Game is in PLAYING phase but missing BioMasters engine state</h4>
                <p><strong>Issue:</strong> Server transitioned to playing but didn't initialize the game engine.</p>
                <p><strong>Expected:</strong> gameState.gameSettings, gameState.grid, etc.</p>
                <p><strong>Actual:</strong> Basic matchmaking state only</p>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', fontSize: '0.9em' }}>
                <h5>Current Game State Keys:</h5>
                <p>{Object.keys(gameState).join(', ')}</p>

                <h5>Players:</h5>
                {gameState.players?.map((player: any, index: number) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <strong>{player.name || player.username || `Player ${index + 1}`}</strong>
                    <br />
                    <small>
                      ID: {player.id || player.playerId} |
                      Deck Selected: {player.hasDeckSelected ? 'Yes' : 'No'} |
                      Selected Deck: {player.selectedDeckId || 'None'}
                    </small>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <IonButton
                  color="danger"
                  fill="outline"
                  onClick={onExit}
                >
                  Exit Match
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Game Grid */}
        {(gameState.gamePhase === GamePhase.SETUP || gameState.gamePhase === GamePhase.PLAYING) &&
         gameState.gameSettings && (gameState.grid || gameState.engineState?.grid) && (
          <EcosystemGrid
            gameSettings={gameState.gameSettings}
            grid={gameState.grid || gameState.engineState?.grid}
            allSpeciesCards={allSpeciesCards}
            getCardData={getCardData}
            onGridPositionClick={onGridPositionClick || (() => {})}
            highlightedPositions={highlightedPositions}
            title="Ecosystem Grid"
            cellSize={60}
            showTitle={true}
            enablePanZoom={true}
          />
        )}

        {/* Fallback: Show basic player info if we don't have proper game engine state */}
        {isOnlineMode && gameState.players && !gameState.gameSettings && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Players in Match</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {gameState.players.map((player: any, index: number) => (
                <div key={index} style={{
                  background: '#e3f2fd',
                  padding: '12px',
                  margin: '8px 0',
                  borderRadius: '8px'
                }}>
                  <strong>{player.name || `Player ${index + 1}`}</strong><br/>
                  ID: {player.playerId || player.id}<br/>
                  Ready: {player.ready ? 'Yes' : 'No'}
                </div>
              ))}
            </IonCardContent>
          </IonCard>
        )}

        {/* Player Cards */}
        {gameState.gamePhase === GamePhase.PLAYING && (gameState.players || gameState.engineState?.players) && (() => {
          const allPlayers = gameState.engineState?.players || gameState.players;

          return (
            <div className="player-cards-wrapper">
              {/* Navigation Controls */}
              <div className="player-cards-navigation">
                <IonButton fill="clear" onClick={prevCard}>
                  <IonIcon icon={chevronBackOutline} />
                </IonButton>
                <span>{currentCardIndex + 1} / {allPlayers.length}</span>
                <IonButton fill="clear" onClick={nextCard}>
                  <IonIcon icon={chevronForwardOutline} />
                </IonButton>
              </div>

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
                  // 👤 ENHANCED DEBUG: User identification analysis
                  console.log(`👤 [PLAYER ANALYSIS] Analyzing player:`, {
                    playerId: player.id,
                    playerName: player.name,
                    handSize: player.hand?.length || 0,
                    deckSize: player.deck?.length || 0,
                    energy: player.energy,
                    hasCards: !!(player.hand && player.hand.length > 0)
                  });

                  // Find current user in regular players array (which has database IDs)
                  // The session data shows the mapping between Firebase UID and database ID
                  const regularPlayers = gameState.players || [];

                  // Check if we have session data with proper player mapping
                  const sessionData = (window as any).sessionData || {};
                  const sessionPlayers = sessionData.players || [];

                  console.log('👤 [USER MAPPING] Detailed mapping analysis:', {
                    userIdProp: userId,
                    userIdType: typeof userId,
                    sessionPlayersCount: sessionPlayers.length,
                    regularPlayersCount: regularPlayers.length,
                    sessionPlayers: sessionPlayers.map((p: any) => ({
                      id: p.id,
                      playerId: p.playerId,
                      firebaseUid: p.firebaseUid,
                      uid: p.uid,
                      userId: p.userId,
                      user_id: p.user_id,
                      name: p.name,
                      allKeys: Object.keys(p)
                    })),
                    regularPlayers: regularPlayers.map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      allKeys: Object.keys(p)
                    }))
                  });

                  // Try to find the current user by checking session players
                  // Session players should have the Firebase UID mapping
                  let currentUserDatabaseId = null;
                  let identificationMethod = 'none';

                  // Look for a player in session data that matches our Firebase UID
                  const sessionPlayer = sessionPlayers.find((p: any) =>
                    p.firebaseUid === userId || p.uid === userId || p.userId === userId || p.user_id === userId
                  );

                  if (sessionPlayer) {
                    currentUserDatabaseId = sessionPlayer.playerId || sessionPlayer.id;
                    identificationMethod = 'session_data';
                    console.log('👤 [USER MAPPING] ✅ Found via session data:', {
                      sessionPlayer,
                      mappedDatabaseId: currentUserDatabaseId
                    });
                  } else {
                    // Fallback: use the player who has cards (since guest player has no cards)
                    const playerWithCards = allPlayers.find((p: any) => p.hand && p.hand.length > 0);
                    if (playerWithCards) {
                      currentUserDatabaseId = playerWithCards.id;
                      identificationMethod = 'fallback_cards';
                      console.log('👤 [USER MAPPING] ⚠️ Fallback to player with cards:', {
                        playerWithCards: {
                          id: playerWithCards.id,
                          name: playerWithCards.name,
                          handSize: playerWithCards.hand?.length
                        }
                      });
                    }
                  }

                  console.log(`👤 [USER MAPPING] Final mapping result:`, {
                    firebaseUid: userId,
                    databaseId: currentUserDatabaseId,
                    identificationMethod,
                    currentPlayerId: player.id,
                    isMatch: player.id === currentUserDatabaseId
                  });

                  const isCurrentPlayerCard = player.id === currentUserDatabaseId;

                  // Use engine state for turn logic
                  const engineCurrentPlayerIndex = gameState.engineState?.currentPlayerIndex || 0;
                  const enginePlayers = gameState.engineState?.players || [];
                  const isPlayerTurnCard = enginePlayers[engineCurrentPlayerIndex]?.id === player.id;
                  const playerActionsRemaining = isPlayerTurnCard ? (gameState.engineState?.actionsRemaining || 0) : 0;

                  console.log(`🎮 [Player ${player.id}] isCurrentPlayer: ${isCurrentPlayerCard}, isPlayerTurn: ${isPlayerTurnCard}, handSize: ${player.hand?.length || 0}`);

                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      title={`${player.name} (${player.hand?.length || 0})`}
                      cardVisibilityMode={isCurrentPlayerCard ? 'full' : 'hidden'}
                      isCurrentPlayer={isCurrentPlayerCard}
                      isPlayerTurn={isPlayerTurnCard}
                      actionsRemaining={playerActionsRemaining}
                      selectedCardId={isCurrentPlayerCard ? selectedHandCardId : null}
                      onCardSelect={isCurrentPlayerCard ? onHandCardSelect : undefined}
                      isInteractive={isCurrentPlayerCard}
                      getCardData={getCardData}
                      getLocalizedCardName={(cardData: any) => cardData?.name || 'Unknown'}
                      getLocalizedScientificName={(cardData: any) => cardData?.scientificName || ''}
                    />
                  );
                })}
              </motion.div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        {gameState.gamePhase === GamePhase.PLAYING && isPlayerTurn && (
          <IonCard className="action-buttons-card">
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol>
                    <IonButton
                      expand="block"
                      color="secondary"
                      onClick={onPassTurn}
                      disabled={actionsRemaining <= 0}
                    >
                      Pass Turn
                    </IonButton>
                  </IonCol>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={onDropAndDraw}
                      disabled={!selectedHandCardId || actionsRemaining <= 0}
                    >
                      Drop & Draw 3
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* End Game Modal */}
        <EndGameModal isOpen={false} onClose={() => {}} />
      </IonContent>
    </IonPage>
  );
};

export default UnifiedBattleInterface;
