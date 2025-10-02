import React, { useEffect, useMemo, useCallback } from 'react';
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
  IonLabel,
  IonList,
  IonItem,
  IonProgressBar,
  IonChip
} from '@ionic/react';
import {
  shield,
  arrowBack,
  trophy,
  globe,
  school,
  star,
  play,
  rocket
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { getCollectionStats, cardIdToNameId } from '@kelseyabreu/shared';
import { EcosystemBoard } from '../game/EcosystemBoard';
import { TutorialSystem } from '../tutorial/TutorialSystem';
import EnhancedHandCard from '../cards/EnhancedHandCard';
import { calculatePlacementHighlights, calculateMovementHighlights, convertHighlightsToPositions } from '../../game-logic/positionHighlighting';
import { calculateEventTargets, convertEventHighlightsToPositions, getEventAction } from '../../game-logic/eventTargeting';
import { AIDifficulty } from '../../game-logic/aiOpponent';
import { Card, createCardWithDefaults, TrophicRole, Habitat, ConservationStatus } from '../../types';
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

type GameMode = 'campaign' | 'online' | 'scenarios' | 'tutorial';
type BattlePhase = 'mode_selection' | 'lobby' | 'game_setup' | 'playing' | 'game_over';

interface CampaignLevel {
  id: string;
  name: string;
  description: string;
  difficulty: AIDifficulty;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  maxStars: number;
  rewards: string[];
}

interface BattleScreenProps {
  onExit?: () => void;
}

const BattleScreen: React.FC<BattleScreenProps> = ({ onExit }) => {
  // Get all state from the battle store
  const gameState = useHybridGameStore(state => state.battle.phyloGameState);
  const isLoading = useHybridGameStore(state => state.battle.isLoading);
  const error = useHybridGameStore(state => state.battle.error);
  const selectedHandCardId = useHybridGameStore(state => state.battle.uiState.selectedHandCardId);
  const selectedBoardCardId = useHybridGameStore(state => state.battle.uiState.selectedBoardCardId);
  const highlightedPositions = useHybridGameStore(state => state.battle.uiState.highlightedPositions);

  // Get battle actions from the store
  const startCampaignLevel = useHybridGameStore(state => state.battle.actions.startCampaignLevel);
  const playPhyloCard = useHybridGameStore(state => state.battle.actions.playPhyloCard);
  const handleAITurn = useHybridGameStore(state => state.battle.actions.handleAITurn);
  const endTurn = useHybridGameStore(state => state.battle.actions.endTurn);
  const selectHandCard = useHybridGameStore(state => state.battle.actions.selectHandCard);
  const selectBoardCard = useHybridGameStore(state => state.battle.actions.selectBoardCard);
  const setHighlightedPositions = useHybridGameStore(state => state.battle.actions.setHighlightedPositions);
  const clearUIState = useHybridGameStore(state => state.battle.actions.clearUIState);

  // Get collection state
  const {
    offlineCollection,
    setActiveBattle,
    clearActiveBattle,
  } = useHybridGameStore();

  // Get localization
  const { getUIText } = useUILocalization();

  // Local UI state (non-game related)
  const [selectedMode, setSelectedMode] = React.useState<GameMode>('campaign');
  const [battlePhase, setBattlePhase] = React.useState<BattlePhase>('mode_selection');
  const [allCards, setAllCards] = React.useState<Map<string, Card>>(new Map());
  // Local UI state (non-game related)
  const [actionMode, setActionMode] = React.useState<'place' | 'move'>('place');
  const [campaignLevels, setCampaignLevels] = React.useState<CampaignLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = React.useState<CampaignLevel | null>(null);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [currentTutorialLesson, setCurrentTutorialLesson] = React.useState<any>(null);
  const [currentTutorialStep, setCurrentTutorialStep] = React.useState(0);
  const [showForfeitAlert, setShowForfeitAlert] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertMessage, setAlertMessage] = React.useState('');
  const [isMobile, setIsMobile] = React.useState(false);

  // Memoized highlighting calculation to prevent unnecessary recalculations
  const highlightedPositionsForCard = useMemo(() => {
    if (!selectedHandCardId || !gameState || !gameState.gameBoard || !gameState.gameBoard.positions) {
      return [];
    }

    console.log('🧮 Calculating highlights for card:', selectedHandCardId);

    // Extract base species name from suffixed card ID
    const baseSpeciesName = selectedHandCardId.split('_')[0];
    const selectedCard = allCards.get(baseSpeciesName);

    if (!selectedCard) {
      return [];
    }

    // Check if this is an event card
    const isEventCard = selectedCard.phyloAttributes?.specialKeywords?.includes('EVENT') ||
                       selectedCard.nameId.toLowerCase().includes('event');

    if (isEventCard) {
      console.log('🎪 Processing event card highlighting (memoized)');
      const eventAction = getEventAction(selectedCard);
      if (eventAction) {
        const eventHighlights = calculateEventTargets(
          selectedCard,
          eventAction,
          gameState.gameBoard,
          allCards,
          9, // 9 rows
          10 // 10 columns
        );
        const positions = convertEventHighlightsToPositions(eventHighlights);
        console.log('🎪 Event highlights calculated (memoized):', positions.length);
        return positions;
      }
      return [];
    } else {
      console.log('🌱 Processing species card highlighting (memoized)');
      const highlights = calculatePlacementHighlights(
        selectedCard,
        gameState.gameBoard,
        allCards,
        9, // 9 rows
        10 // 10 columns
      );
      const positions = convertHighlightsToPositions(highlights);
      console.log('🌱 Species highlights calculated (memoized):', {
        validPositions: positions.filter((h: any) => h.type === 'valid').length,
        invalidPositions: positions.filter((h: any) => h.type === 'invalid').length,
        totalHighlights: positions.length
      });
      return positions;
    }
  }, [selectedHandCardId, gameState, allCards]);

  // Update highlighted positions when memoized calculation changes
  useEffect(() => {
    setHighlightedPositions(highlightedPositionsForCard);
  }, [highlightedPositionsForCard]);

  // Memoized hand cards to prevent unnecessary re-renders
  const memoizedHandCards = useMemo(() => {
    if (!gameState?.players?.[0]?.hand) {
      return [];
    }

    console.log('🃏 Memoizing hand cards for', gameState.players[0].hand.length, 'cards');

    return gameState.players[0].hand.map((cardId: string) => {
      // Extract base species name from suffixed card ID (e.g., "turtle_2" -> "turtle")
      const baseSpeciesName = cardId.split('_')[0];
      const card = allCards.get(baseSpeciesName);

      if (!card) {
        console.log('❌ Card not found in memoized calculation:', cardId, 'base:', baseSpeciesName);
        return null;
      }

      // Create a hand-specific card with the correct ID
      const handCard = { ...card, id: cardId };

      return {
        cardId,
        handCard,
        isSelected: selectedHandCardId === cardId
      };
    }).filter((item: any): item is { cardId: string; handCard: any; isSelected: boolean } => item !== null);
  }, [gameState?.players?.[0]?.hand, allCards, selectedHandCardId]);

  // Memoized card selection handler to prevent function recreation
  const handleCardSelectMemoized = useCallback((cardId: string) => {
    selectHandCard(cardId === selectedHandCardId ? null : cardId);
  }, [selectedHandCardId, selectHandCard]);

  // Game status and valid actions should come from the store
  // TODO: Add these to the store state if needed
  const gameStatus = gameState ? { currentPlayer: gameState.players[gameState.currentPlayerIndex] } : null;
  const validActions = gameState ? { canPlaceCards: [], canMoveCards: [], canPass: true } : null;

  const availableActions = useMemo(() => {
    if (!gameState?.currentTurnState || !gameState) return null;
    console.log('🧮 Calculating available actions (memoized)');
    // TODO: Calculate available actions based on current turn state
    // For now, return a simple object
    return {
      canPlaceCards: gameState.currentTurnState.actionsRemaining > 0,
      canMoveCards: gameState.currentTurnState.actionsRemaining > 0,
      canPass: gameState.currentTurnState.canEndTurn
    };
  }, [gameState?.currentTurnState, gameState?.gameBoard, gameState?.players?.[0]?.hand, gameState?.players?.[0]?.deck, allCards]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTouchDevice = 'ontouchstart' in window;
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize campaign levels
  useEffect(() => {
    const levels: CampaignLevel[] = [
      {
        id: 'forest_basics',
        name: getUIText(UITextId.UI_FOREST_ECOSYSTEM_BASICS),
        description: getUIText(UITextId.UI_FOREST_DESCRIPTION),
        difficulty: AIDifficulty.EASY,
        unlocked: true,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: [getUIText(UITextId.UI_FOREST_STARTER_PACK), `50 ${getUIText(UITextId.UI_ECO_CREDITS)}`]
      },
      {
        id: 'ocean_depths',
        name: getUIText(UITextId.UI_OCEAN_DEPTHS_CHALLENGE),
        description: getUIText(UITextId.UI_OCEAN_DESCRIPTION),
        difficulty: AIDifficulty.EASY,
        unlocked: true,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: [getUIText(UITextId.UI_OCEAN_STARTER_PACK), `75 ${getUIText(UITextId.UI_ECO_CREDITS)}`]
      },
      {
        id: 'grassland_balance',
        name: getUIText(UITextId.UI_GRASSLAND_BALANCE),
        description: getUIText(UITextId.UI_GRASSLAND_DESCRIPTION),
        difficulty: AIDifficulty.MEDIUM,
        unlocked: false,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: ['Grassland Starter Pack', '100 Eco Credits', 'Rare Species Card']
      },
      {
        id: 'arctic_survival',
        name: 'Arctic Survival',
        description: 'Build resilient ecosystems in harsh arctic conditions.',
        difficulty: AIDifficulty.MEDIUM,
        unlocked: false,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: ['Arctic Starter Pack', '125 Eco Credits']
      },
      {
        id: 'ecosystem_master',
        name: 'Ecosystem Master',
        description: 'The ultimate challenge - build a complex multi-biome ecosystem.',
        difficulty: AIDifficulty.HARD,
        unlocked: false,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: ['Master Pack', '200 Eco Credits', 'Legendary Species Card', 'Master Title']
      }
    ];
    setCampaignLevels(levels);
  }, []);

  // Initialize cards from collection
  useEffect(() => {
    console.log('🎮 Initializing cards from collection:', offlineCollection);
    if (offlineCollection) {
      const cardMap = new Map<string, Card>();
      console.log('🎮 Cards owned:', Object.keys(offlineCollection.cards_owned));
      console.log('🎮 Active deck:', offlineCollection.activeDeck);
      console.log('🎮 Saved decks:', offlineCollection.savedDecks);
      // Convert collection to Card objects
      Object.keys(offlineCollection.cards_owned).forEach(cardIdStr => {
        const cardId = parseInt(cardIdStr);
        const nameId = cardIdToNameId(cardId);
        if (!nameId) return;
        // perfect if things fail or are wrong make sure to correct the root cause or fix the test or ask questions if you are unsure. we want everything working correctly and as how the rules say
        // Create mock card data - in real implementation, load from JSON files
        const card: Card = createCardWithDefaults({
          cardId: cardId,
          nameId: nameId,
          id: nameId,
          descriptionId: `DESC_${nameId.replace('CARD_', '')}`,
          taxonomyId: `TAXONOMY_${nameId.replace('CARD_', '')}`,
          trophicRole: Math.random() > 0.5 ? TrophicRole.HERBIVORE : TrophicRole.CARNIVORE,
          habitat: Habitat.TEMPERATE,
          power: Math.floor(Math.random() * 10) + 1,
          health: Math.floor(Math.random() * 20) + 10,
          maxHealth: Math.floor(Math.random() * 20) + 10,
          speed: Math.floor(Math.random() * 10) + 1,
          senses: Math.floor(Math.random() * 100) + 50,
          energyCost: Math.floor(Math.random() * 5) + 1,
          conservationStatus: ConservationStatus.LEAST_CONCERN,
          description: `A ${nameId.replace('CARD_', '').toLowerCase().replace(/_/g, ' ')} species`,
          phyloAttributes: {
            terrains: ['Forest'],
            climates: ['Cool'],
            foodchainLevel: Math.floor(Math.random() * 3) + 1,
            scale: Math.floor(Math.random() * 8) + 1,
            dietType: Math.random() > 0.5 ? 'Herbivore' : 'Carnivore',
            movementCapability: {
              moveValue: Math.floor(Math.random() * 3),
              canFly: Math.random() > 0.8,
              canSwim: Math.random() > 0.7,
              canBurrow: Math.random() > 0.9
            },
            specialKeywords: [],
            pointValue: Math.floor(Math.random() * 5) + 1,
            conservationStatus: 'Least Concern',
            compatibilityNotes: `Compatible with similar ${nameId.replace('CARD_', '').toLowerCase().replace(/_/g, ' ')} species`
          }
        });
        cardMap.set(nameId, card);
      });
      console.log('🎮 Created card map with', cardMap.size, 'cards');
      setAllCards(cardMap);
    } else {
      console.log('🎮 No offline collection available');
    }
  }, [offlineCollection]);

  // Start a campaign level (local UI handler)
  const startCampaignLevelLocal = (level: CampaignLevel) => {
    console.log('🎮 Starting campaign level:', level);

    if (!level.unlocked) {
      console.log('❌ Level not unlocked');
      setAlertMessage(getUIText(UITextId.UI_LEVEL_NOT_UNLOCKED));
      setShowAlert(true);
      return;
    }

    console.log('🎯 Setting selected level and battle phase...');
    setSelectedLevel(level);
    setBattlePhase('game_setup');

    // Set active battle state
    console.log('🎯 Setting active battle state...');
    setActiveBattle({
      sessionId: `campaign_${level.id}_${Date.now()}`,
      gameMode: 'campaign',
      levelId: level.id,
      isActive: true
    });

    console.log('🎯 Calling initializePhyloGame...');
    console.log('🎯 Current battle phase before init:', battlePhase);
    console.log('🎯 Is loading before init:', isLoading);
    // Add a small delay to ensure state updates have processed
    setTimeout(async () => {
      console.log('🎯 About to call initializePhyloGame...');
      await initializePhyloGame(level.difficulty);
      console.log('🎯 initializePhyloGame completed');
    }, 100);
  };

  // Initialize Phylo domino-style game using store action
  const initializePhyloGame = async (aiDifficulty: AIDifficulty = AIDifficulty.EASY) => {
    console.log('🎮 ===== STARTING INITIALIZE PHYLO GAME =====');
    console.log('🎮 AI Difficulty:', aiDifficulty);
    console.log('🎮 Current battle phase:', battlePhase);

    // Clear the active battle indicator since we're now in the actual battle
    clearActiveBattle();

    if (allCards.size === 0) {
      console.log('❌ No cards available');
      return;
    }

    // Validate deck and start campaign level using store action
    if (!offlineCollection?.activeDeck) {
      console.log('❌ No active deck saved');
      return;
    }

    const playerDeck = offlineCollection.activeDeck.cards;
    const levelId = selectedLevel?.id || 'default-level';

    // Use store action to start the campaign level
    await startCampaignLevel({
      levelId,
      difficulty: aiDifficulty,
      playerDeck
    });

    setBattlePhase('playing');
    console.log('✅ Campaign level initialization requested');
  };

  // Handle player actions - removed, now using store actions directly

  // Handle AI turn using store action
  const handleAITurnLocal = async (currentGameState: any) => {
    await handleAITurn({ currentState: currentGameState });
    console.log('✅ AI turn requested');
  };

  // Handle card selection using store action
  const handleCardSelect = (cardId: string | null) => {
    console.log('🃏 BattleScreen handleCardSelect called:', {
      cardId,
      actionMode,
      isMobile,
      currentSelectedCard: selectedHandCardId,
      gameState: !!gameState,
      battlePhase
    });

    // Always allow card selection for placement (default behavior)
    if (actionMode === 'place' || !isMobile) {
      selectHandCard(cardId);
      selectBoardCard(null); // Clear board selection when selecting hand card

      // Ensure we're in place mode when selecting a hand card
      if (cardId && actionMode !== 'place') {
        setActionMode('place');
      }

      console.log('🎯 Card selection updated via store');
    }
  };

  // Handle board card selection for movement using store action
  const handleBoardCardSelect = (cardId: string, position: { x: number; y: number }) => {
    if (actionMode !== 'move') return;

    console.log('🎯 Board card selected for movement:', cardId, 'at', position);
    selectBoardCard(cardId);
    selectHandCard(null); // Clear hand selection when selecting board card

    if (gameState) {
      // Extract base species name and get card data
      const baseSpeciesName = cardId.split('_')[0];
      const selectedCard = allCards.get(baseSpeciesName);

      if (selectedCard) {
        console.log('🚶 Processing movement highlighting for:', selectedCard.nameId);
        const highlights = calculateMovementHighlights(
          selectedCard,
          position,
          gameState.gameBoard,
          allCards,
          9, // 9 rows
          10 // 10 columns
        );
        const positions = convertHighlightsToPositions(highlights);
        console.log('🚶 Movement highlights:', positions.length, 'valid positions');
        setHighlightedPositions(positions);
      } else {
        console.log('❌ Card not found for movement:', cardId);
        setHighlightedPositions([]);
      }
    }
  };

  // Handle turn progression using store action
  const handleEndTurnLocal = async () => {
    if (!gameState) return;

    console.log('🔄 Ending player turn');
    await endTurn({ playerId: 'human' });

    // Start AI turn after a delay
    setTimeout(async () => {
      await handleAITurnLocal(gameState);
    }, 500);
  };

  const handlePassTurn = async () => {
    console.log('🔄 Player passes turn');
    await handleEndTurnLocal();
  };

  const handleDropAndDraw = (cardId: string) => {
    if (!gameState?.currentTurnState || !gameState) return;

    console.log('🃏 Player drops card and draws 3 new cards');

    // TODO: Implement drop and draw action through store
    // For now, just show a message
    setAlertMessage('Drop and draw functionality will be implemented');
    setShowAlert(true);
  };

  // Handle card placement using store action
  const handleCardPlace = async (position: { x: number; y: number }, cardId: string) => {
    if (!gameState) return;

    console.log('🃏 Playing card:', cardId, 'at position:', position);

    // Use store action to play the card
    await playPhyloCard({
      cardId,
      position,
      playerId: 'human'
    });

    console.log('✅ Card play requested');
  };

  // Handle card movement
  const handleCardMove = async (cardId: string, newPosition: { x: number; y: number }) => {
    // TODO: Implement card movement through store action
    console.log('🚶 Card movement requested:', cardId, 'to', newPosition);
    setAlertMessage('Card movement functionality will be implemented');
    setShowAlert(true);
  };

  // Return to mode selection
  const returnToModeSelection = () => {
    setBattlePhase('mode_selection');
    // Clear UI state using store actions
    clearUIState();
    setSelectedLevel(null);
    setShowTutorial(false);
    setCurrentTutorialLesson(null);
    setCurrentTutorialStep(0);

    // Clear active battle state
    clearActiveBattle();

    // Call onExit to return to BattleModeSelector
    if (onExit) {
      onExit();
    }
  };

  // Tutorial handlers
  const handleStartTutorial = () => {
    setSelectedMode('tutorial');
    setShowTutorial(true);
  };

  const handleTutorialLessonStart = (lessonId: string) => {
    // Start tutorial lesson and initialize game state for tutorial
    setCurrentTutorialLesson({ id: lessonId });
    setCurrentTutorialStep(0);

    // Initialize a tutorial game state
    if (lessonId === 'phylo_basics') {
      initializePhyloGame(AIDifficulty.EASY);
    }
  };

  const handleTutorialStepComplete = (stepId: string) => {
    setCurrentTutorialStep(prev => prev + 1);
  };

  const handleTutorialLessonComplete = (lessonId: string, score: number) => {
    setShowTutorial(false);
    setCurrentTutorialLesson(null);
    setCurrentTutorialStep(0);

    setAlertMessage(getUIText(UITextId.UI_TUTORIAL_COMPLETED).replace('{score}', score.toString()));
    setShowAlert(true);
  };

  // Forfeit/quit match
  const handleForfeit = () => {
    console.log('🏳️ Player forfeiting match - handleForfeit called');

    // First dismiss the forfeit alert
    console.log('🏳️ Dismissing forfeit alert');
    setShowForfeitAlert(false);

    // Clear game state and return to mode selection
    console.log('🏳️ Clearing game state and returning to mode selection');
    console.log('🏳️ Current battle phase before change:', battlePhase);
    setBattlePhase('mode_selection');
    console.log('🏳️ Battle phase set to mode_selection');
    // Clear UI state using store actions
    clearUIState();
    setSelectedLevel(null);
    setActionMode('place');
    clearActiveBattle();

    // Call onExit to return to BattleModeSelector
    if (onExit) {
      onExit();
    }

    // Show confirmation message
    setTimeout(() => {
      console.log('🏳️ Showing forfeit confirmation message');
      setAlertMessage(getUIText(UITextId.UI_FORFEIT_SUCCESS));
      setShowAlert(true);
    }, 100);
  };

  // Legacy attack function removed for Phylo gameplay

  // Mode Selection Screen
  if (battlePhase === 'mode_selection') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Phylo Battle Arena</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Choose Your Adventure</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Select a game mode to begin your ecosystem building journey!</p>

              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonCard
                      button
                      onClick={() => {
                        setSelectedMode('campaign');
                        setBattlePhase('lobby');
                      }}
                      color="primary"
                    >
                      <IonCardContent className="ion-text-center">
                        <IonIcon icon={trophy} size="large" />
                        <h3>{getUIText(UITextId.UI_CAMPAIGN)}</h3>
                        <p>{getUIText(UITextId.UI_STORY_MODE_DESCRIPTION)}</p>
                        <IonChip color="success">
                          <IonLabel>{getUIText(UITextId.UI_SINGLE_PLAYER)}</IonLabel>
                        </IonChip>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="6">
                    <IonCard
                      button
                      onClick={() => {
                        setSelectedMode('online');
                        setBattlePhase('lobby');
                      }}
                      color="secondary"
                    >
                      <IonCardContent className="ion-text-center">
                        <IonIcon icon={globe} size="large" />
                        <h3>Online Mode</h3>
                        <p>Battle other players worldwide</p>
                        <IonChip color="warning">
                          <IonLabel>Coming Soon</IonLabel>
                        </IonChip>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="6">
                    <IonCard
                      button
                      onClick={() => {
                        setSelectedMode('scenarios');
                        setBattlePhase('lobby');
                      }}
                      color="tertiary"
                    >
                      <IonCardContent className="ion-text-center">
                        <IonIcon icon={star} size="large" />
                        <h3>Special Scenarios</h3>
                        <p>Unique challenges and events</p>
                        <IonChip color="warning">
                          <IonLabel>Coming Soon</IonLabel>
                        </IonChip>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="6">
                    <IonCard
                      button
                      onClick={handleStartTutorial}
                      color="success"
                    >
                      <IonCardContent className="ion-text-center">
                        <IonIcon icon={school} size="large" />
                        <h3>{getUIText(UITextId.UI_TUTORIAL)}</h3>
                        <p>{getUIText(UITextId.UI_LEARN_PHYLO_BASICS)}</p>
                        <IonChip color="primary">
                          <IonLabel>{getUIText(UITextId.UI_INTERACTIVE)}</IonLabel>
                        </IonChip>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  // Campaign Lobby Screen
  if (battlePhase === 'lobby' && selectedMode === 'campaign') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButton fill="clear" onClick={returnToModeSelection}>
              <IonIcon icon={arrowBack} />
            </IonButton>
            <IonTitle>{getUIText(UITextId.UI_CAMPAIGN_LEVELS)}</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{getUIText(UITextId.UI_ECOSYSTEM_MASTERY_CAMPAIGN)}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{getUIText(UITextId.UI_PROGRESS_DESCRIPTION)}</p>

              {offlineCollection && getCollectionStats(offlineCollection.cards_owned).ownedSpecies < 5 ? (
                <IonCard color="warning">
                  <IonCardContent>
                    <p>{getUIText(UITextId.UI_NEED_SPECIES_WARNING)}</p>
                    <IonButton expand="block" routerLink="/collection" fill="outline">
                      {getUIText(UITextId.UI_VIEW_COLLECTION)}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ) : (
                <IonList>
                  {campaignLevels.map((level, _index) => (
                    <IonItem
                      key={level.id}
                      button={level.unlocked}
                      onClick={() => level.unlocked && startCampaignLevelLocal(level)}
                      disabled={!level.unlocked}
                    >
                      <IonIcon
                        icon={level.unlocked ? play : shield}
                        slot="start"
                        color={level.unlocked ? 'primary' : 'medium'}
                      />
                      <IonLabel>
                        <h3>{level.name}</h3>
                        <p>{level.description}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <IonChip
                            color={
                              level.difficulty === AIDifficulty.EASY ? 'success' :
                              level.difficulty === AIDifficulty.MEDIUM ? 'warning' : 'danger'
                            }

                          >
                            <IonLabel>{level.difficulty.toUpperCase()}</IonLabel>
                          </IonChip>
                          {level.completed && (
                            <IonChip color="primary">
                              <IonIcon icon={star} />
                              <IonLabel>{level.stars}/{level.maxStars}</IonLabel>
                            </IonChip>
                          )}
                        </div>
                      </IonLabel>
                      {level.unlocked && (
                        <IonButton fill="clear" slot="end">
                          <IonIcon icon={play} />
                        </IonButton>
                      )}
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  // Game Setup Screen
  console.log('🎮 RENDER: Current battle phase:', battlePhase, 'isLoading:', isLoading);
  if (battlePhase === 'game_setup') {
    console.log('🎮 RENDER: Showing game setup screen');
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButton fill="clear" onClick={returnToModeSelection}>
              <IonIcon icon={arrowBack} />
            </IonButton>
            <IonTitle>Preparing Game...</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="">
          <IonCard>
            <IonCardContent className="ion-text-center">
              <IonIcon icon={rocket} size="large" color="primary" />
              <h2>Setting up your ecosystem...</h2>
              <IonProgressBar type="indeterminate" />
              <p>Preparing species cards and game board</p>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  // Main Phylo Game Interface
  if (battlePhase === 'playing' && gameState && gameStatus) {
    console.log('🎮 RENDER: Showing playing interface, gameState exists:', !!gameState);
    const isPlayerTurn = gameStatus.currentPlayer.id === 'human';

    // Handle position click (for click-to-place functionality)
    const handlePositionClick = (position: { x: number; y: number }) => {
      console.log('🎯 BattleScreen handlePositionClick called:', {
        position,
        actionMode,
        selectedCardId: selectedHandCardId,
        selectedBoardCardId,
        gameState: !!gameState,
        highlightedPositions: highlightedPositions.length,
        battlePhase
      });

      if (!gameState || !isPlayerTurn) {
        console.log('❌ Cannot act: no game state or not player turn');
        return;
      }

      // Check if there's a card at this position for movement mode
      const positionKey = `${position.x},${position.y}`;
      const cardAtPosition = gameState.gameBoard?.positions?.get(positionKey);

      if (actionMode === 'move' && cardAtPosition && !selectedBoardCardId) {
        // Select card for movement
        handleBoardCardSelect(cardAtPosition.cardId, position);
        return;
      }

      // Handle placement or movement action
      if (actionMode === 'place' && selectedHandCardId) {
        // Check if position is valid for placement
        const highlight = highlightedPositions.find(h => h.x === position.x && h.y === position.y);
        console.log('🎯 Placement highlight status:', highlight);

        if (!highlight) {
          console.log('❌ Position not highlighted for placement');
          setAlertMessage('This position is not available for placement');
          setShowAlert(true);
          return;
        }

        if ((highlight as any).type !== 'valid') {
          console.log('❌ Position highlighted as invalid for placement');
          setAlertMessage('Cannot place card here - check compatibility requirements');
          setShowAlert(true);
          return;
        }

        console.log('✅ Valid position - placing card');
        handleCardPlace(position, selectedHandCardId);
        handleCardSelect(null);

      } else if (actionMode === 'move' && selectedBoardCardId) {
        // Check if position is valid for movement
        const highlight = highlightedPositions.find(h => h.x === position.x && h.y === position.y);
        console.log('🎯 Movement highlight status:', highlight);

        if (!highlight) {
          console.log('❌ Position not highlighted for movement');
          setAlertMessage('Cannot move card to this position');
          setShowAlert(true);
          return;
        }

        if ((highlight as any).type !== 'valid') {
          console.log('❌ Position highlighted as invalid for movement');
          setAlertMessage('Cannot move card here - check movement rules');
          setShowAlert(true);
          return;
        }

        console.log('✅ Valid position - moving card');
        handleCardMove(selectedBoardCardId, position);
        selectBoardCard(null);
        setHighlightedPositions([]);
      }
    };

    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButton fill="clear" onClick={returnToModeSelection}>
              <IonIcon icon={arrowBack} />
            </IonButton>
            <IonTitle>
              {selectedLevel?.name || 'Phylo Battle'} - Turn {gameState?.turnNumber || 1}
              {gameState?.currentTurnState && (
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  Actions: {gameState.currentTurnState.actionsRemaining}/{gameState.currentTurnState.maxActions}
                </div>
              )}
            </IonTitle>
            <IonButton
              fill="clear"
              slot="end"
              color="danger"
              onClick={() => {
                console.log('🏳️ Forfeit button clicked - showing alert');
                setShowForfeitAlert(true);
              }}
            >
              {getUIText(UITextId.UI_FORFEIT)}
            </IonButton>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {/* Game Status Bar */}
          <IonCard>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="4">
                    <div className="ion-text-center">
                      <h4>Current Player</h4>
                      <IonChip color={isPlayerTurn ? 'primary' : 'secondary'}>
                        <IonLabel>{gameStatus.currentPlayer.name}</IonLabel>
                      </IonChip>
                    </div>
                  </IonCol>
                  <IonCol size="4">
                    <div className="ion-text-center">
                      <h4>Game Phase</h4>
                      <IonChip color="tertiary">
                        <IonLabel>{gameState.gamePhase.toUpperCase()}</IonLabel>
                      </IonChip>
                    </div>
                  </IonCol>
                  <IonCol size="4">
                    <div className="ion-text-center">
                      <h4>Scores</h4>
                      <div>
                        <IonBadge color="primary">
                          You: 0
                        </IonBadge>
                      </div>
                      <div>
                        <IonBadge color="secondary">
                          AI: 0
                        </IonBadge>
                      </div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Player Hand - Desktop and Mobile */}
          {isPlayerTurn && (
            <IonCard className={isMobile ? 'mobile-hand-card' : ''}>
              <IonCardHeader>
                <IonCardTitle>{isMobile ? 'Your Hand (Tap to Select)' : 'Your Hand'}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: isMobile ? 'hidden' : 'auto',
                  overflowY: 'hidden',
                  padding: '8px 0',
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {memoizedHandCards.map(({ cardId, handCard, isSelected }: { cardId: string; handCard: any; isSelected: boolean }) => (
                    <EnhancedHandCard
                      key={cardId}
                      card={handCard}
                      isSelected={isSelected}
                      onSelect={() => handleCardSelectMemoized(cardId)}
                      onDragStart={(draggedCardId: string) => {
                        console.log('Drag started for card:', draggedCardId);
                      }}
                      onDragEnd={(draggedCardId: string, position: { x: number; y: number }) => {
                        if (position && !isMobile) {
                          const boardRect = document.querySelector('.ecosystem-board')?.getBoundingClientRect();
                          if (boardRect) {
                            const gridSize = isMobile ? 80 : 100;
                            const gridX = Math.round((position.x - boardRect.left) / gridSize);
                            const gridY = Math.round((position.y - boardRect.top) / gridSize);
                            handleCardPlace({ x: gridX, y: gridY }, draggedCardId);
                          }
                        }
                        console.log('Drag ended for card:', draggedCardId, 'at position:', position);
                      }}
                      isPlayerTurn={isPlayerTurn}
                      size={isMobile ? "small" : "medium"}
                    />
                  ))}
                </div>

                {isMobile && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--ion-color-medium)',
                    textAlign: 'center',
                    marginTop: '8px'
                  }}>
                    {actionMode === 'place' && '🃏 Select a card, then tap a green position on the board'}
                    {actionMode === 'move' && '🚶 Tap a card on the board, then tap a green position'}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {/* Unified Ecosystem Board - Responsive for All Devices */}
          {gameState.gameBoard && (
            <EcosystemBoard
              gameBoard={gameState.gameBoard}
              cards={allCards}
              onCardPlace={handleCardPlace}
              onCardMove={handleCardMove}
              isInteractive={isPlayerTurn}
              highlightedPositions={highlightedPositions}
              gridSize={isMobile ? 80 : 100}
              selectedCard={selectedHandCardId ? allCards.get(selectedHandCardId.split('_')[0]) : null}
              onPositionClick={handlePositionClick}
              isMobile={isMobile}
              selectedBoardCardId={selectedBoardCardId}
              actionMode={actionMode}
            />
          )}

          {/* Action Buttons - For All Devices (Unified Interface) */}
          {isPlayerTurn && gameState?.currentTurnState && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  Turn Actions ({gameState.currentTurnState.actionsRemaining}/{gameState.currentTurnState.maxActions} remaining)
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill="outline"
                        onClick={handlePassTurn}
                        disabled={gameState.currentTurnState.actionsRemaining <= 0}
                      >
                        Pass Turn
                      </IonButton>
                    </IonCol>
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill="outline"
                        onClick={() => {
                          if (selectedHandCardId) {
                            handleDropAndDraw(selectedHandCardId);
                          } else {
                            setAlertMessage('Select a card to drop first');
                            setShowAlert(true);
                          }
                        }}
                        disabled={!selectedHandCardId}
                      >
                        Drop & Draw 3
                      </IonButton>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill={actionMode === 'place' ? 'solid' : 'outline'}
                        color={actionMode === 'place' ? 'primary' : 'medium'}
                        onClick={() => {
                          setActionMode('place');
                          selectBoardCard(null);
                          setHighlightedPositions([]);
                        }}
                      >
                        Place Cards
                      </IonButton>
                    </IonCol>
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill={actionMode === 'move' ? 'solid' : 'outline'}
                        color={actionMode === 'move' ? 'primary' : 'medium'}
                        onClick={() => {
                          setActionMode('move');
                          selectHandCard(null);
                          setHighlightedPositions([]);
                        }}
                      >
                        Move Cards
                      </IonButton>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol>
                      <div style={{ fontSize: '0.9rem', color: 'var(--ion-color-medium)', textAlign: 'center' }}>
                        {actionMode === 'place' && '🃏 Select a card from your hand, then click a green position'}
                        {actionMode === 'move' && '🚶 Click a card on the board, then click a green position'}
                        {!gameState.currentTurnState.hasDrawnCard && ' • Draw 1 card at start of turn'}
                        {gameState.currentTurnState.actionsRemaining === 0 && ' • Turn ending...'}
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* General Alert */}
          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => setShowAlert(false)}
            header="Notice"
            message={alertMessage}
            buttons={['OK']}
          />

          {/* Forfeit Confirmation Alert */}
          <IonAlert
            isOpen={showForfeitAlert}
            onDidDismiss={() => {
              console.log('🏳️ Forfeit alert dismissed');
              setShowForfeitAlert(false);
            }}
            header={getUIText(UITextId.UI_FORFEIT_MATCH)}
            message={getUIText(UITextId.UI_FORFEIT_CONFIRMATION)}
            buttons={[
              {
                text: getUIText(UITextId.UI_CANCEL),
                role: 'cancel',
                handler: () => {
                  console.log('🏳️ Forfeit cancelled');
                  setShowForfeitAlert(false);
                }
              },
              {
                text: getUIText(UITextId.UI_FORFEIT),
                role: 'destructive',
                handler: () => {
                  console.log('🏳️ Forfeit confirmed - calling handleForfeit');
                  handleForfeit();
                }
              }
            ]}
          />

        </IonContent>
      </IonPage>
    );
  }

  // Game Over Screen
  if (battlePhase === 'game_over' && gameState) {
    // TODO: Get actual game results from game state
    const isPlayerWinner = true; // Placeholder

    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Game Complete</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="">
          <IonCard>
            <IonCardContent className="ion-text-center">
              <IonIcon
                icon={isPlayerWinner ? trophy : shield}
                size="large"
                color={isPlayerWinner ? 'success' : 'medium'}
              />
              <h2>{isPlayerWinner ? 'Victory!' : 'Defeat'}</h2>
              <p>
                {isPlayerWinner
                  ? 'Congratulations! You built a superior ecosystem!'
                  : 'Better luck next time! Study the AI\'s strategy and try again.'
                }
              </p>

              <div style={{ margin: '20px 0' }}>
                <h3>Final Scores</h3>
                <div style={{ margin: '8px 0' }}>
                  <IonChip color="primary">
                    <IonLabel>You: 0 points</IonLabel>
                  </IonChip>
                </div>
                <div style={{ margin: '8px 0' }}>
                  <IonChip color="secondary">
                    <IonLabel>AI: 0 points</IonLabel>
                  </IonChip>
                </div>
              </div>

              <IonGrid>
                <IonRow>
                  <IonCol>
                    <IonButton
                      expand="block"
                      onClick={returnToModeSelection}
                      color="primary"
                    >
                      Play Again
                    </IonButton>
                  </IonCol>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="outline"
                      routerLink="/collection"
                    >
                      View Collection
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  // Loading or error state
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Phylo Battle</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="">
        <IonCard>
          <IonCardContent className="ion-text-center">
            <IonIcon icon={rocket} size="large" />
            <h2>Loading...</h2>
            <IonProgressBar type="indeterminate" />
          </IonCardContent>
        </IonCard>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Notice"
          message={alertMessage}
          buttons={['OK']}
        />


      </IonContent>

      {/* Tutorial System */}
      <TutorialSystem
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onStartLesson={handleTutorialLessonStart}
        currentLesson={currentTutorialLesson}
        currentStepIndex={currentTutorialStep}
        onStepComplete={handleTutorialStepComplete}
        onLessonComplete={handleTutorialLessonComplete}
      />
    </IonPage>
  );
};

export default BattleScreen;
