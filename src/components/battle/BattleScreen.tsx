import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonProgressBar,
  IonChip
} from '@ionic/react';
import {
  flash,
  shield,
  heart,
  arrowBack,
  trophy,
  globe,
  school,
  star,
  play,
  people,
  book,
  rocket
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { EcosystemBoard } from '../game/EcosystemBoard';
import { EventEffects } from '../game/EventEffects';
import { TutorialSystem } from '../tutorial/TutorialSystem';
import EnhancedHandCard from '../cards/EnhancedHandCard';
import { calculatePlacementHighlights, calculateMovementHighlights, convertHighlightsToPositions } from '../../game-logic/positionHighlighting';
import { calculateEventTargets, convertEventHighlightsToPositions, getEventAction } from '../../game-logic/eventTargeting';
import { TurnActionType, createTurnState, updateTurnState, validateTurnAction, getAvailableActions, handleStartOfTurnDraw, type TurnState } from '../../game-logic/turnActions';
import {
  createGameState,
  executeTurnAction,
  startGame,
  setPlayerReady,
  getGameStatus,
  getValidActions,
  GameState as PhyloGameState,
  Player,
  TurnAction
} from '../../game-logic/gameStateManager';
import { createAIDeck, makeAIDecision, AIDifficulty, makePhyloAIDecision } from '../../game-logic/aiOpponent';
import { Card } from '../../types';

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
  const {
    offlineCollection,
    setActiveBattle,
    clearActiveBattle,
    createDeck,
    setActiveDeck
  } = useHybridGameStore();

  // Game mode and phase management
  const [selectedMode, setSelectedMode] = useState<GameMode>('campaign');
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('mode_selection');

  // Phylo game state
  const [gameState, setGameState] = useState<PhyloGameState | null>(null);
  const [allCards, setAllCards] = useState<Map<string, Card>>(new Map());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedBoardCardId, setSelectedBoardCardId] = useState<string | null>(null); // For movement
  const [highlightedPositions, setHighlightedPositions] = useState<Array<{ x: number; y: number; type?: 'valid' | 'invalid' }>>([]);
  const [currentTurnState, setCurrentTurnState] = useState<TurnState | null>(null);
  const [actionMode, setActionMode] = useState<'place' | 'move'>('place');

  // Campaign system
  const [campaignLevels, setCampaignLevels] = useState<CampaignLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<CampaignLevel | null>(null);

  // Tutorial system
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialLesson, setCurrentTutorialLesson] = useState<any>(null);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  // UI state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForfeitAlert, setShowForfeitAlert] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Memoized highlighting calculation to prevent unnecessary recalculations
  const highlightedPositionsForCard = useMemo(() => {
    if (!selectedCardId || !gameState) {
      return [];
    }

    console.log('🧮 Calculating highlights for card:', selectedCardId);

    // Extract base species name from suffixed card ID
    const baseSpeciesName = selectedCardId.split('_')[0];
    const selectedCard = allCards.get(baseSpeciesName);

    if (!selectedCard) {
      return [];
    }

    // Check if this is an event card
    const isEventCard = selectedCard.phyloAttributes?.specialKeywords?.includes('EVENT') ||
                       selectedCard.commonName.toLowerCase().includes('event');

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
  }, [selectedCardId, gameState, allCards]);

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

    return gameState.players[0].hand.map(cardId => {
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
        isSelected: selectedCardId === cardId
      };
    }).filter((item): item is { cardId: string; handCard: any; isSelected: boolean } => item !== null);
  }, [gameState?.players?.[0]?.hand, allCards, selectedCardId]);

  // Memoized card selection handler to prevent function recreation
  const handleCardSelectMemoized = useCallback((cardId: string) => {
    handleCardSelect(cardId === selectedCardId ? null : cardId);
  }, [selectedCardId]);

  // Memoized game state calculations to prevent expensive recalculations
  const gameStatus = useMemo(() => {
    if (!gameState) return null;
    console.log('🧮 Calculating game status (memoized)');
    return getGameStatus(gameState);
  }, [gameState]);

  const validActions = useMemo(() => {
    if (!gameState) return null;
    console.log('🧮 Calculating valid actions (memoized)');
    return getValidActions(gameState, 'human');
  }, [gameState]);

  const availableActions = useMemo(() => {
    if (!currentTurnState || !gameState) return null;
    console.log('🧮 Calculating available actions (memoized)');
    return getAvailableActions(
      currentTurnState,
      gameState.gameBoard,
      gameState.players[0].hand,
      gameState.players[0].deck,
      allCards
    );
  }, [currentTurnState, gameState?.gameBoard, gameState?.players?.[0]?.hand, gameState?.players?.[0]?.deck, allCards]);

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
        name: 'Forest Ecosystem Basics',
        description: 'Learn the fundamentals of ecosystem building in a temperate forest.',
        difficulty: AIDifficulty.EASY,
        unlocked: true,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: ['Forest Starter Pack', '50 Eco Credits']
      },
      {
        id: 'ocean_depths',
        name: 'Ocean Depths Challenge',
        description: 'Explore marine ecosystems and food webs in the deep ocean.',
        difficulty: AIDifficulty.EASY,
        unlocked: true,
        completed: false,
        stars: 0,
        maxStars: 3,
        rewards: ['Ocean Starter Pack', '75 Eco Credits']
      },
      {
        id: 'grassland_balance',
        name: 'Grassland Balance',
        description: 'Master the delicate balance of predator and prey relationships.',
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
      console.log('🎮 Species owned:', Object.keys(offlineCollection.species_owned));
      console.log('🎮 Active deck:', offlineCollection.activeDeck);
      console.log('🎮 Saved decks:', offlineCollection.savedDecks);
      // Convert collection to Card objects
      Object.keys(offlineCollection.species_owned).forEach(speciesName => {
        // perfect if things fail or are wrong make sure to correct the root cause or fix the test or ask questions if you are unsure. we want everything working correctly and as how the rules say
        // Create mock card data - in real implementation, load from JSON files
        const card: Card = {
          id: speciesName,
          speciesName,
          commonName: speciesName.charAt(0).toUpperCase() + speciesName.slice(1),
          scientificName: `${speciesName} scientificus`,
          trophicRole: Math.random() > 0.5 ? 'herbivore' : 'carnivore' as any,
          habitat: 'temperate' as any,
          power: Math.floor(Math.random() * 10) + 1,
          health: Math.floor(Math.random() * 20) + 10,
          maxHealth: Math.floor(Math.random() * 20) + 10,
          speed: Math.floor(Math.random() * 10) + 1,
          senses: Math.floor(Math.random() * 100) + 50,
          energyCost: Math.floor(Math.random() * 5) + 1,
          abilities: [],
          conservationStatus: 'least_concern' as any,
          artwork: '',
          description: `A ${speciesName} species`,
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
            compatibilityNotes: `Compatible with similar ${speciesName} species`
          }
        };
        cardMap.set(speciesName, card);
      });
      console.log('🎮 Created card map with', cardMap.size, 'cards');
      setAllCards(cardMap);
    } else {
      console.log('🎮 No offline collection available');
    }
  }, [offlineCollection]);

  // Start a campaign level
  const startCampaignLevel = (level: CampaignLevel) => {
    console.log('🎮 Starting campaign level:', level);

    if (!level.unlocked) {
      console.log('❌ Level not unlocked');
      setAlertMessage('This level is not yet unlocked!');
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

  // Initialize Phylo domino-style game
  const initializePhyloGame = async (aiDifficulty: AIDifficulty = AIDifficulty.EASY) => {
    console.log('🎮 ===== STARTING INITIALIZE PHYLO GAME =====');
    console.log('🎮 AI Difficulty:', aiDifficulty);
    console.log('🎮 Current battle phase:', battlePhase);
    console.log('🎮 Is loading:', isLoading);
    console.log('🎮 Starting initializePhyloGame with', allCards.size, 'cards available');
    console.log('🎮 Available cards:', Array.from(allCards.keys()));

    // Clear the active battle indicator since we're now in the actual battle
    clearActiveBattle();

    if (allCards.size === 0) {
      console.log('❌ No cards available');
      setAlertMessage('No cards available! Please collect some cards first.');
      setShowAlert(true);
      return;
    }

    // Check if we have a valid deck saved
    console.log('🔍 Checking for active deck...');
    console.log('🔍 offlineCollection exists:', !!offlineCollection);
    console.log('🔍 offlineCollection.activeDeck:', offlineCollection?.activeDeck);
    console.log('🔍 offlineCollection.savedDecks:', offlineCollection?.savedDecks);

    if (!offlineCollection?.activeDeck) {
      console.log('❌ No active deck saved');

      // Check if there are any saved decks we can use
      if (offlineCollection?.savedDecks && offlineCollection.savedDecks.length > 0) {
        console.log('🔍 Found saved decks, but no active deck set');
        setAlertMessage('No active deck selected! Please go to Deck Builder and set a deck as active.');
        setShowAlert(true);
        return;
      } else {
        console.log('🔍 No saved decks found - attempting to create default deck');

        setAlertMessage('No deck found! Please build and save a deck first (20-30 cards required).');
        setShowAlert(true);
        return;
      }
    }

    // Check if the active deck is valid (20-30 cards)
    console.log('🔍 Validating deck card count...');
    console.log('🔍 Active deck cards:', offlineCollection.activeDeck.cards);

    const deckCardCount = offlineCollection.activeDeck.cards.reduce((sum: number, card: any) => sum + card.quantity, 0);
    console.log(`🔍 Total deck card count: ${deckCardCount}`);

    if (deckCardCount < 20 || deckCardCount > 30) {
      console.log(`❌ Invalid deck size: ${deckCardCount} cards (needs 20-30)`);
      setAlertMessage(`Invalid deck! Your deck has ${deckCardCount} cards but needs 20-30 cards. Please update your deck.`);
      setShowAlert(true);
      return;
    }

    console.log(`✅ Valid deck found with ${deckCardCount} cards`);

    setIsLoading(true);
    console.log('🔄 Setting loading to true');

    try {
      console.log('🎯 Creating players...');
      // Create players
      const humanPlayer = {
        id: 'human',
        name: 'Player'
      };

      const aiPlayer = {
        id: 'ai',
        name: `AI (${aiDifficulty})`
      };

      console.log('🎯 Creating game state...');

      // Create a deck-specific card map for the game
      const deckCards = new Map<string, Card>();
      offlineCollection.activeDeck.cards.forEach((deckCard: any) => {
        const card = allCards.get(deckCard.speciesName);
        if (card) {
          // Add multiple copies based on quantity
          for (let i = 0; i < deckCard.quantity; i++) {
            const cardId = `${deckCard.speciesName}_${i}`;
            deckCards.set(cardId, { ...card, id: cardId });
          }
        }
      });

      console.log('🎯 Created deck with', deckCards.size, 'cards');

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
      console.log('✅ Game state created:', newGameState);

      console.log('🎯 Setting players as ready...');
      // Set players as ready
      let readyGameState = setPlayerReady(newGameState, 'human', true);
      readyGameState = setPlayerReady(readyGameState, 'ai', true);
      console.log('✅ Players set as ready');

      console.log('🎯 Starting game...');
      // Start the game
      const startedGameState = startGame(readyGameState);
      console.log('✅ Game started:', startedGameState);

      console.log('🎯 Setting final state...');
      console.log('🎮 Player 1 hand:', startedGameState.players[0].hand);
      console.log('🎮 Player 2 hand:', startedGameState.players[1].hand);
      console.log('🎮 Current player index:', startedGameState.currentPlayerIndex);

      console.log('🎯 About to set game state...');
      setGameState(startedGameState);
      console.log('🎯 Game state set, creating turn state...');
      setCurrentTurnState(createTurnState('human')); // Start with human player's turn
      console.log('🎯 Turn state set, changing battle phase to playing...');
      setBattlePhase('playing');
      console.log('🎯 Battle phase set to playing, setting loading to false...');
      setIsLoading(false);
      console.log('✅ Game initialization complete! Battle phase should now be: playing');
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      setAlertMessage(`Failed to start game: ${error instanceof Error ? error.message : String(error)}`);
      setShowAlert(true);
      setIsLoading(false);
    }
  };

  // Handle player actions
  const handlePlayerAction = (action: TurnAction) => {
    if (!gameState) return;

    const result = executeTurnAction(gameState, 'human', action);

    if (result.success) {
      setGameState(result.gameState);

      if (result.gameEnded) {
        setBattlePhase('game_over');
      } else if (result.nextPlayer === 'ai') {
        // AI turn
        setTimeout(() => {
          handleAITurn(result.gameState);
        }, 1000);
      }
    } else {
      setAlertMessage(result.errorMessage || 'Invalid action');
      setShowAlert(true);
    }
  };

  // Handle AI turn
  const handleAITurn = (currentGameState: PhyloGameState) => {
    // Use Phylo AI decision making
    const aiDecision = makePhyloAIDecision(currentGameState, selectedLevel?.difficulty || AIDifficulty.EASY);

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

    const result = executeTurnAction(currentGameState, 'ai', aiAction);

    if (result.success) {
      setGameState(result.gameState);

      if (result.gameEnded) {
        setBattlePhase('game_over');
      }
    }
  };

  // Handle card selection with highlighting
  const handleCardSelect = (cardId: string | null) => {
    console.log('🃏 BattleScreen handleCardSelect called:', {
      cardId,
      actionMode,
      isMobile,
      currentSelectedCard: selectedCardId,
      gameState: !!gameState,
      battlePhase
    });

    // Always allow card selection for placement (default behavior)
    if (actionMode === 'place' || !isMobile) {
      setSelectedCardId(cardId);
      setSelectedBoardCardId(null); // Clear board selection when selecting hand card

      // Ensure we're in place mode when selecting a hand card
      if (cardId && actionMode !== 'place') {
        setActionMode('place');
      }

      // Use memoized highlighting calculation - no need to recalculate here
      console.log('🎯 Using memoized highlights for card:', cardId);
    }
  };

  // Handle board card selection for movement
  const handleBoardCardSelect = (cardId: string, position: { x: number; y: number }) => {
    if (actionMode !== 'move') return;

    console.log('🎯 Board card selected for movement:', cardId, 'at', position);
    setSelectedBoardCardId(cardId);
    setSelectedCardId(null); // Clear hand selection when selecting board card

    if (gameState) {
      // Extract base species name and get card data
      const baseSpeciesName = cardId.split('_')[0];
      const selectedCard = allCards.get(baseSpeciesName);

      if (selectedCard) {
        console.log('🚶 Processing movement highlighting for:', selectedCard.commonName);
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

  // Handle turn progression
  const handleEndTurn = () => {
    if (!gameState || !currentTurnState) return;

    console.log('🔄 Ending player turn, starting AI turn');

    // Start AI turn
    setTimeout(() => {
      handleAITurn(gameState);

      // After AI turn, start new player turn
      setTimeout(() => {
        console.log('🔄 Starting new player turn');
        const newTurnState = createTurnState('human');
        const turnStateWithDraw = handleStartOfTurnDraw(newTurnState);
        setCurrentTurnState(turnStateWithDraw);

        // Draw a card for the player (this would be handled by game state manager)
        console.log('🃏 Player draws 1 card at start of turn');
      }, 1000);
    }, 500);
  };

  const handlePassTurn = () => {
    if (!currentTurnState) return;

    console.log('🔄 Player passes turn');
    handleEndTurn();
  };

  const handleDropAndDraw = (cardId: string) => {
    if (!currentTurnState || !gameState) return;

    const turnAction = {
      type: TurnActionType.DROP_AND_DRAW,
      cardId
    };

    const validation = validateTurnAction(
      turnAction,
      currentTurnState,
      gameState.gameBoard,
      gameState.players[0].hand,
      gameState.players[0].deck,
      allCards
    );

    if (!validation.isValid) {
      setAlertMessage(validation.errorMessage || 'Cannot drop and draw');
      setShowAlert(true);
      return;
    }

    console.log('🃏 Player drops card and draws 3 new cards');

    // Execute the action
    handlePlayerAction({
      type: 'drop_and_draw',
      cardId
    });

    // Update turn state
    const newTurnState = updateTurnState(currentTurnState, turnAction, validation.cost);
    setCurrentTurnState(newTurnState);

    // Check if turn should end
    if (newTurnState.actionsRemaining <= 0) {
      handleEndTurn();
    }
  };

  // Handle card placement
  const handleCardPlace = (position: { x: number; y: number }, cardId: string) => {
    if (!currentTurnState || !gameState) return;

    // Validate the action using turn system
    const turnAction = {
      type: TurnActionType.PLAY_CARD,
      cardId,
      position
    };

    const validation = validateTurnAction(
      turnAction,
      currentTurnState,
      gameState.gameBoard,
      gameState.players[0].hand,
      gameState.players[0].deck,
      allCards
    );

    if (!validation.isValid) {
      setAlertMessage(validation.errorMessage || 'Invalid action');
      setShowAlert(true);
      return;
    }

    // Execute the action
    handlePlayerAction({
      type: 'place_card',
      cardId,
      position
    });

    // Update turn state
    const newTurnState = updateTurnState(currentTurnState, turnAction, validation.cost);
    setCurrentTurnState(newTurnState);

    // Check if turn should end
    if (newTurnState.actionsRemaining <= 0) {
      console.log('🔄 Turn ended - switching to AI');
      handleEndTurn();
    }
  };

  // Handle card movement
  const handleCardMove = (cardId: string, newPosition: { x: number; y: number }) => {
    handlePlayerAction({
      type: 'move_card',
      cardId,
      targetPosition: newPosition
    });
  };

  // Return to mode selection
  const returnToModeSelection = () => {
    setBattlePhase('mode_selection');
    setGameState(null);
    setSelectedLevel(null);
    setSelectedCardId(null);
    setHighlightedPositions([]);
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

    setAlertMessage(`Tutorial completed! You scored ${score} points.`);
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
    setGameState(null);
    setSelectedLevel(null);
    setSelectedCardId(null);
    setSelectedBoardCardId(null);
    setHighlightedPositions([]);
    setCurrentTurnState(null);
    setActionMode('place');
    clearActiveBattle();

    // Call onExit to return to BattleModeSelector
    if (onExit) {
      onExit();
    }

    // Show confirmation message
    setTimeout(() => {
      console.log('🏳️ Showing forfeit confirmation message');
      setAlertMessage('Match forfeited. Returning to mode selection.');
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

        <IonContent className="ion-padding">
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
                        <h3>Campaign</h3>
                        <p>Story mode with progressive challenges</p>
                        <IonChip color="success">
                          <IonLabel>Single Player</IonLabel>
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
                        <h3>Tutorial</h3>
                        <p>Learn the basics of Phylo</p>
                        <IonChip color="primary">
                          <IonLabel>Interactive</IonLabel>
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
            <IonTitle>Campaign Levels</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Ecosystem Mastery Campaign</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Progress through increasingly challenging ecosystems to become a master ecologist!</p>

              {offlineCollection && Object.keys(offlineCollection.species_owned).length < 5 ? (
                <IonCard color="warning">
                  <IonCardContent>
                    <p>⚠️ You need at least 5 species to play campaign mode.</p>
                    <IonButton expand="block" routerLink="/collection" fill="outline">
                      View Collection
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ) : (
                <IonList>
                  {campaignLevels.map((level, index) => (
                    <IonItem
                      key={level.id}
                      button={level.unlocked}
                      onClick={() => level.unlocked && startCampaignLevel(level)}
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

        <IonContent className="ion-padding">
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
        selectedCardId,
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
      const cardAtPosition = gameState.gameBoard.positions.get(positionKey);

      if (actionMode === 'move' && cardAtPosition && !selectedBoardCardId) {
        // Select card for movement
        handleBoardCardSelect(cardAtPosition.cardId, position);
        return;
      }

      // Handle placement or movement action
      if (actionMode === 'place' && selectedCardId) {
        // Check if position is valid for placement
        const highlight = highlightedPositions.find(h => h.x === position.x && h.y === position.y);
        console.log('🎯 Placement highlight status:', highlight);

        if (!highlight) {
          console.log('❌ Position not highlighted for placement');
          setAlertMessage('This position is not available for placement');
          setShowAlert(true);
          return;
        }

        if (highlight.type !== 'valid') {
          console.log('❌ Position highlighted as invalid for placement');
          setAlertMessage('Cannot place card here - check compatibility requirements');
          setShowAlert(true);
          return;
        }

        console.log('✅ Valid position - placing card');
        handleCardPlace(position, selectedCardId);
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

        if (highlight.type !== 'valid') {
          console.log('❌ Position highlighted as invalid for movement');
          setAlertMessage('Cannot move card here - check movement rules');
          setShowAlert(true);
          return;
        }

        console.log('✅ Valid position - moving card');
        handleCardMove(selectedBoardCardId, position);
        setSelectedBoardCardId(null);
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
              {selectedLevel?.name || 'Phylo Battle'} - Turn {gameStatus.turnNumber}
              {currentTurnState && (
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  Actions: {currentTurnState.actionsRemaining}/{currentTurnState.maxActions}
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
              Forfeit
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
                      {gameStatus.scores.map(score => (
                        <div key={score.playerId}>
                          <IonBadge color={score.playerId === 'human' ? 'primary' : 'secondary'}>
                            {score.playerId === 'human' ? 'You' : 'AI'}: {score.score}
                          </IonBadge>
                        </div>
                      ))}
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
                  {memoizedHandCards.map(({ cardId, handCard, isSelected }) => (
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
          <EcosystemBoard
            gameBoard={gameState.gameBoard}
            cards={allCards}
            onCardPlace={handleCardPlace}
            onCardMove={handleCardMove}
            isInteractive={isPlayerTurn}
            highlightedPositions={highlightedPositions}
            gridSize={isMobile ? 80 : 100}
            selectedCard={selectedCardId ? allCards.get(selectedCardId.split('_')[0]) : null}
            onPositionClick={handlePositionClick}
            isMobile={isMobile}
            selectedBoardCardId={selectedBoardCardId}
            actionMode={actionMode}
          />

          {/* Action Buttons - For All Devices (Unified Interface) */}
          {isPlayerTurn && currentTurnState && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  Turn Actions ({currentTurnState.actionsRemaining}/{currentTurnState.maxActions} remaining)
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
                        disabled={currentTurnState.actionsRemaining <= 0}
                      >
                        Pass Turn
                      </IonButton>
                    </IonCol>
                    <IonCol size="6">
                      <IonButton
                        expand="block"
                        fill="outline"
                        onClick={() => {
                          if (selectedCardId) {
                            handleDropAndDraw(selectedCardId);
                          } else {
                            setAlertMessage('Select a card to drop first');
                            setShowAlert(true);
                          }
                        }}
                        disabled={currentTurnState.actionsRemaining <= 0 || !selectedCardId}
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
                          setSelectedBoardCardId(null);
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
                          setSelectedCardId(null);
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
                        {!currentTurnState.hasDrawnCard && ' • Draw 1 card at start of turn'}
                        {currentTurnState.actionsRemaining === 0 && ' • Turn ending...'}
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
            header="Forfeit Match"
            message="Are you sure you want to forfeit this match? Your progress will be lost."
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
                handler: () => {
                  console.log('🏳️ Forfeit cancelled');
                  setShowForfeitAlert(false);
                }
              },
              {
                text: 'Forfeit',
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
    const gameStatus = getGameStatus(gameState);
    const winner = gameStatus.scores[0];
    const isPlayerWinner = winner.playerId === 'human';

    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Game Complete</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
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
                {gameStatus.scores.map(score => (
                  <div key={score.playerId} style={{ margin: '8px 0' }}>
                    <IonChip
                      color={score.playerId === 'human' ? 'primary' : 'secondary'}

                    >
                      <IonLabel>
                        {score.playerId === 'human' ? 'You' : 'AI'}: {score.score} points
                      </IonLabel>
                    </IonChip>
                  </div>
                ))}
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

      <IonContent className="ion-padding">
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
