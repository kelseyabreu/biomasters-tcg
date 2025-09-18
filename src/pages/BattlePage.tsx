/**
 * Battle Page
 * Dedicated page for online battles with session ID from URL
 */

import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert
} from '@ionic/react';
import { arrowBack } from 'ionicons/icons';

import UnifiedBattleInterface from '../components/battle/UnifiedBattleInterface';
import { useHybridGameStore } from '../state/hybridGameStore';
import { gameApi } from '../services/apiClient';
import { TCGGameState, TCGGameSettings } from '@shared/types';
import { ApiStatus } from '@shared/enums';
import { Card } from '../types';
import { getGameSocket } from '../services/gameSocket';
import { useLocalization } from '../contexts/LocalizationContext';
import { instanceIdToCardId, extractSpeciesNameFromInstanceId } from '@shared/utils/cardIdHelpers';

interface BattlePageParams {
  sessionId: string;
}

interface GameSessionData {
  sessionId: string;
  gameMode: string;
  status: string;
  players: Array<{
    playerId: string;
    name?: string;
    rating?: number;
  }>;
  gameState: TCGGameState;
  settings: TCGGameSettings;
}

export const BattlePage: React.FC = () => {
  const { sessionId } = useParams<BattlePageParams>();
  const history = useHistory();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<GameSessionData | null>(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Additional state for unified battle interface
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [highlightedPositions, setHighlightedPositions] = useState<any[]>([]);

  // Get species cards from store
  const allSpeciesCards = useHybridGameStore(state => state.allSpeciesCards);
  const speciesLoaded = useHybridGameStore(state => state.speciesLoaded);
  const loadSpeciesData = useHybridGameStore(state => state.loadSpeciesData);

  // Get auth state from store
  const isAuthenticated = useHybridGameStore(state => state.isAuthenticated);
  const userId = useHybridGameStore(state => state.userId);

  // 👤 DEBUG: Log authentication state
  console.log('👤 [BATTLE PAGE AUTH] Authentication state:', {
    isAuthenticated,
    userId,
    userIdType: typeof userId,
    sessionId,
    sessionIdType: typeof sessionId
  });

  // Localization
  const localization = useLocalization();

  // Define loadGameSession function
  const loadGameSession = async () => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated || !userId) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🎮 [BattlePage] Loading game session:', sessionId);

      // Use the apiClient to fetch session data
      const response = await gameApi.getGameSession(sessionId);

      if (response.data.status === ApiStatus.SUCCESS && response.data.data) {
        setSessionData(response.data.data);
        console.log('✅ [BattlePage] Game session loaded:', response.data.data);

        // 🎮 DEBUG: Detailed session data analysis
        console.log('🎮 [SESSION DATA] Detailed analysis:', {
          sessionId: response.data.data.sessionId,
          gameMode: response.data.data.gameMode,
          status: response.data.data.status,
          playersCount: response.data.data.players?.length,
          players: response.data.data.players?.map((p: any) => ({
            id: p.id,
            playerId: p.playerId,
            name: p.name,
            firebaseUid: p.firebaseUid,
            uid: p.uid,
            userId: p.userId,
            allKeys: Object.keys(p)
          })),
          gameStateKeys: Object.keys(response.data.data.gameState || {}),
          hasGrid: !!(response.data.data.gameState?.grid || response.data.data.gameState?.engineState?.grid),
          gridSize: (response.data.data.gameState?.grid || response.data.data.gameState?.engineState?.grid)?.size || 0
        });

        // Store session data globally for player mapping
        (window as any).sessionData = response.data.data;

        // Update the store with the active battle info
        useHybridGameStore.setState(() => ({
          activeBattle: {
            sessionId: response.data.data.sessionId,
            gameMode: 'online',
            levelId: null,
            isActive: true
          }
        }));
      } else {
        throw new Error(response.data.error || 'Failed to load game session');
      }

    } catch (err: any) {
      console.error('❌ [BattlePage] Error loading game session:', err);

      // Handle API errors properly
      if (err.response?.status === 404) {
        setError('Game session not found');
      } else if (err.response?.status === 403) {
        setError('Access denied to this game session');
      } else {
        setError(err.message || 'Failed to load game session');
      }

      setShowErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!sessionId || !isAuthenticated || !userId) return;

    console.log('🔌 [BattlePage] Setting up WebSocket connection for session:', sessionId);

    const gameSocket = getGameSocket();

    // Connect to the game socket
    gameSocket.connect();

    // Small delay to ensure connection is established
    setTimeout(() => {
      console.log('🔌 [BattlePage] Joining session room:', sessionId);
      console.log('🔌 [BattlePage] Socket connected status:', gameSocket.isConnected());

      if (gameSocket.isConnected()) {
        console.log('🔌 [BattlePage] Socket is connected, joining session...');
        gameSocket.joinSession(sessionId);
      } else {
        console.warn('⚠️ [BattlePage] Socket not connected, retrying in 1 second...');
        setTimeout(() => {
          console.log('🔌 [BattlePage] Retry - Socket connected status:', gameSocket.isConnected());
          if (gameSocket.isConnected()) {
            console.log('🔌 [BattlePage] Retry successful, joining session...');
            gameSocket.joinSession(sessionId);
          } else {
            console.error('❌ [BattlePage] Socket still not connected after retry');
          }
        }, 1000);
      }
    }, 100);

    // Listen for game state updates
    const handleGameStateUpdate = (update: any) => {
      console.log('🔄 [BattlePage] Game state update received:', update);

      // Update session data if it's for our session
      if (update.sessionId === sessionId && update.data?.gameState) {
        console.log('🔄 [BattlePage] Updating local game state:', update.data.gameState);

        setSessionData(prev => {
          if (prev) {
            console.log('🔍 [BattlePage] Full session data for user mapping:', {
              sessionId: prev.sessionId,
              players: prev.players,
              currentUserId: userId,
              gameStateKeys: Object.keys(prev.gameState || {})
            });
          }
          return prev ? {
            ...prev,
            gameState: update.data.gameState
          } : null;
        });
      }
    };

    const handleGameInitialized = (update: any) => {
      console.log('🎮 [BattlePage] Game initialized event received:', update);

      if (update.sessionId === sessionId) {
        console.log('🎮 [BattlePage] Game initialized for our session - updating state');
        setSessionData(prev => prev ? {
          ...prev,
          gameState: update.data.gameState
        } : null);
      }
    };

    const handleDeckSelectionUpdate = (update: any) => {
      console.log('🎴 [BattlePage] Deck selection update received:', update);

      if (update.sessionId === sessionId) {
        console.log('🎴 [BattlePage] Deck selection update for our session');
        // Refresh session data to get latest state
        loadGameSession();
      }
    };

    // Set up event listeners with enhanced logging
    gameSocket.on('game_state_update', (update: any) => {
      console.log('📡 [BattlePage] Received game_state_update:', update);
      handleGameStateUpdate(update);
    });

    gameSocket.on('game_initialized', (update: any) => {
      console.log('📡 [BattlePage] Received game_initialized:', update);
      handleGameInitialized(update);
    });

    gameSocket.on('deck_selection_update', (update: any) => {
      console.log('📡 [BattlePage] Received deck_selection_update:', update);
      handleDeckSelectionUpdate(update);
    });

    // Add debug listeners for connection events
    gameSocket.on('connect', () => {
      console.log('🔌 [BattlePage] WebSocket connected');
    });

    gameSocket.on('disconnect', () => {
      console.log('🔌 [BattlePage] WebSocket disconnected');
    });

    gameSocket.on('error', (error: any) => {
      console.error('❌ [BattlePage] WebSocket error:', error);
    });

    console.log('🔌 [BattlePage] WebSocket event listeners set up');

    // Cleanup on unmount
    return () => {
      console.log('🔌 [BattlePage] Cleaning up WebSocket listeners');
      gameSocket.off('game_state_update', handleGameStateUpdate);
      gameSocket.off('game_initialized', handleGameInitialized);
      gameSocket.off('deck_selection_update', handleDeckSelectionUpdate);
    };
  }, [sessionId, isAuthenticated, userId]);

  // Load species data if not already loaded
  useEffect(() => {
    if (!speciesLoaded) {
      console.log('🔄 [BattlePage] Loading species data for card resolution...');
      loadSpeciesData();
    }
  }, [speciesLoaded, loadSpeciesData]);

  // Load game session on mount and when dependencies change
  useEffect(() => {
    loadGameSession();
  }, [sessionId, isAuthenticated, userId]);

  const handleBackToLobby = () => {
    // Clear active battle state
    useHybridGameStore.setState(() => ({
      activeBattle: {
        sessionId: null,
        gameMode: null,
        levelId: null,
        isActive: false
      }
    }));

    // Navigate back to online multiplayer
    history.push('/online');
  };

  const handleErrorAlertDismiss = () => {
    setShowErrorAlert(false);
    handleBackToLobby();
  };

  // Callback functions for unified battle interface
  const handlePlayerReady = async () => {
    console.log('🎮 [BattlePage] Player ready - online mode');
    // TODO: Send ready status to server via WebSocket
  };

  const handleGridPositionClick = (x: number, y: number) => {
    console.log('🎮 [BattlePage] Grid position clicked:', { x, y });
    // TODO: Send move to server via WebSocket
  };

  const handleHandCardSelect = (cardId: string) => {
    console.log('🎮 [BattlePage] Hand card selected:', cardId);
    setSelectedHandCardId(cardId);
  };

  const handleDropAndDraw = () => {
    console.log('🎮 [BattlePage] Drop and draw action');
    // TODO: Send action to server via WebSocket
  };

  const handlePassTurn = () => {
    console.log('🎮 [BattlePage] Pass turn action');
    // TODO: Send action to server via WebSocket
  };

  // Helper function to get card data
  const getCardData = (cardInput: string | any): any => {
    console.log('🔍 [BattlePage] getCardData called with cardInput:', cardInput, 'type:', typeof cardInput);
    console.log('🔍 [BattlePage] allSpeciesCards length:', allSpeciesCards?.length || 0);
    console.log('🔍 [BattlePage] speciesLoaded:', speciesLoaded);

    // Handle hidden cards from privacy filter
    if (typeof cardInput === 'object' && cardInput?.isHidden) {
      console.log('🔒 [BattlePage] Returning hidden card data');
      return {
        cardId: 0,
        instanceId: cardInput.instanceId || 'hidden-card',
        isHidden: true,
        cardType: 'HIDDEN',
        name: 'Hidden Card',
        scientificName: 'Hidden Card',
        description: 'This card is hidden from opponents',
        domain: 0,
        energy: 0,
        abilities: [],
        keywords: []
      };
    }

    // Handle regular card objects that already have the data
    if (typeof cardInput === 'object' && cardInput?.instanceId) {
      console.log('🔍 [BattlePage] Card input is already an object with instanceId:', cardInput.instanceId);
      const instanceId = cardInput.instanceId;

      // Extract species name and convert to cardId using utility functions
      let cardId: number | null = null;
      let speciesName: string | null = null;

      if (instanceId.startsWith('card-')) {
        // Use utility function to extract species name and convert to cardId
        speciesName = extractSpeciesNameFromInstanceId(instanceId);
        cardId = instanceIdToCardId(instanceId);
      } else {
        // Handle other formats like simple numbers "1", "2", etc.
        const numericId = parseInt(instanceId.split('_')[0]);
        if (!isNaN(numericId)) {
          cardId = numericId;
        }
      }

      console.log('🔍 [BattlePage] Extracted from object - speciesName:', speciesName, 'cardId:', cardId);

      // Return the card object with additional data if needed
      return {
        ...cardInput,
        cardId,
        speciesName
      };
    }

    // Handle string instanceId (legacy format)
    const instanceId = typeof cardInput === 'string' ? cardInput : String(cardInput);

    // Handle HOME cards specifically
    if (instanceId.startsWith('home-')) {
      console.log('🏠 [BattlePage] Processing HOME card:', instanceId);
      return {
        cardId: 0,
        instanceId: instanceId,
        isHOME: true,
        cardType: 'HOME',
        name: 'HOME',
        scientificName: 'HOME Base',
        description: 'Starting position for this player',
        domain: 0,
        energy: 0,
        abilities: [],
        keywords: []
      };
    }

    // Extract species name and convert to cardId using utility functions
    let cardId: number | null = null;
    let speciesName: string | null = null;

    if (instanceId.startsWith('card-')) {
      // Use utility function to extract species name and convert to cardId
      speciesName = extractSpeciesNameFromInstanceId(instanceId);
      cardId = instanceIdToCardId(instanceId);
    } else {
      // Handle other formats like simple numbers "1", "2", etc.
      const numericId = parseInt(instanceId.split('_')[0]);
      if (!isNaN(numericId)) {
        cardId = numericId;
      }
    }

    console.log('🔍 [BattlePage] Extracted speciesName:', speciesName, 'cardId:', cardId);

    // Find card data from the species cards store
    if (cardId && allSpeciesCards && allSpeciesCards.length > 0) {
      const cardData = allSpeciesCards.find(card => card.cardId === cardId);
      if (cardData) {
        // Use localization to get proper names
        const localizedName = localization?.getCardName(cardData.nameId as any) || cardData.nameId || 'Unknown';
        const localizedScientificName = localization?.getScientificName(cardData.scientificNameId as any) || cardData.scientificNameId || '';

        return {
          id: instanceId,
          name: localizedName,
          scientificName: localizedScientificName,
          VictoryPoints: cardData.victoryPoints || 1,
          TrophicLevel: cardData.trophicLevel || 0,
          trophicRole: cardData.trophicLevel === 0 ? 'Producer' :
                      cardData.trophicLevel === 1 ? 'Primary Consumer' :
                      cardData.trophicLevel === 2 ? 'Secondary Consumer' : 'Tertiary Consumer',
          power: cardData.power || 0,
          health: cardData.health || 1,
          cardId: cardData.cardId,
          nameId: cardData.nameId,
          scientificNameId: cardData.scientificNameId
        };
      }
    }

    // Fallback for unknown cards
    const fallbackName = speciesName ?
      speciesName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
      'Unknown Card';

    return {
      id: instanceId,
      name: fallbackName,
      scientificName: '',
      VictoryPoints: 1,
      TrophicLevel: 0,
      trophicRole: 'Unknown',
      power: 0,
      health: 1,
      cardId: 0
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Loading Battle...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center'
          }}>
            <IonSpinner name="crescent" />
            <h2>🧬 Initializing BioMasters TCG...</h2>
            <p>{isConnecting ? 'Connecting to game session...' : 'Loading game data and setting up battle...'}</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButton fill="clear" onClick={handleBackToLobby}>
              <IonIcon icon={arrowBack} />
            </IonButton>
            <IonTitle>Battle Error</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center'
          }}>
            <h2>⚠️ Unable to Load Battle</h2>
            <p>{error}</p>
            <IonButton onClick={handleBackToLobby} color="primary">
              Return to Lobby
            </IonButton>
          </div>

          <IonAlert
            isOpen={showErrorAlert}
            onDidDismiss={handleErrorAlertDismiss}
            header="Battle Error"
            message={error || 'Failed to load game session'}
            buttons={['OK']}
          />
        </IonContent>
      </IonPage>
    );
  }

  // Success state - render the unified battle interface
  return (
    <UnifiedBattleInterface
      gameState={sessionData.gameState}
      isLoading={false}
      error={null}
      selectedHandCardId={selectedHandCardId}
      highlightedPositions={highlightedPositions}
      onExit={handleBackToLobby}
      onPlayerReady={handlePlayerReady}
      onGridPositionClick={handleGridPositionClick}
      onHandCardSelect={handleHandCardSelect}
      onDropAndDraw={handleDropAndDraw}
      onPassTurn={handlePassTurn}
      allSpeciesCards={allSpeciesCards}
      getCardData={getCardData}
      isOnlineMode={true}
      title={`Online Battle - ${sessionData.gameMode}`}
      sessionId={sessionId}
      userId={userId || undefined}
    />
  );
};

export default BattlePage;
