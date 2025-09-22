/**
 * Hybrid Game Store
 * Best practice state management for cross-platform TCG
 * Combines Zustand (offline state) + React Query (server state)
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import { offlineSecurityService, OfflineCollection } from '../services/offlineSecurityService';
import { starterPackService } from '../services/starterPackService';
import { syncService, SyncResult } from '../services/syncService';
import { getGameSocket } from '../services/gameSocket';
import { initializeCardMapping } from '@kelseyabreu/shared';

import { BoosterPackSystem, PackOpeningResult } from '../utils/boosterPackSystem';
import { RatingUpdate } from '../services/UnifiedGameService';
import { Card, transformCardDataToCard } from '../types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { tokenManager } from '../services/tokenStorage';
import { createUserScopedIndexedDBStorage, clearUserData } from '../utils/userScopedStorage';
import { guestApi, gameApi } from '../services/apiClient';
import { unifiedGameService } from '../services/UnifiedGameService';
import { GameMode } from '@kelseyabreu/shared';
import { gameStateManager } from '../services/GameStateManager';
import { PhyloGameState as SharedPhyloGameState, CardData, sharedDataLoader } from '@kelseyabreu/shared';
import type { ClientGameState } from '../types/ClientGameTypes';
import { nameIdToCardId } from '@kelseyabreu/shared';

// Import unified user types
import type {
  AuthenticatedUser
} from '@kelseyabreu/shared';
import { SyncStatus, UserType } from '@kelseyabreu/shared';

// Global reference to store for user ID access
let storeRef: any = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if quest is completed based on progress and target
 */
function checkQuestCompletion(progress: any, target: any): boolean {
  if (!progress || !target) return false;

  // Simple count-based completion check
  if (typeof target.count === 'number' && typeof progress.count === 'number') {
    return progress.count >= target.count;
  }

  // Add more complex completion logic as needed
  return false;
}

// Helper function to get current user ID for storage scoping
const getCurrentUserId = (): string | null => {
  if (!storeRef) return null;
  const state = storeRef.getState();
  return state.userId || state.guestId || null;
};

// Battle State Interfaces
export interface Position {
  x: number;
  y: number;
}

// UI-enhanced game states that extend shared types with UI-specific properties

export interface TCGGameState extends ClientGameState {
  // Additional properties specific to the store
  isInitialized?: boolean;
  // Add other TCG-specific state properties as needed
}

export interface PhyloGameState extends SharedPhyloGameState {
  // Additional properties specific to the store
  levelId?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  currentTurn?: 'player' | 'ai' | null;

  // Turn State Management
  currentTurnState?: {
    playerId: string;
    actionsRemaining: number;
    maxActions: number;
    hasDrawnCard: boolean;
    canEndTurn: boolean;
  } | null;

  isInitialized?: boolean;
  battlePhase?: string;
}

export interface BattleSlice {
  // Game Mode and State
  gameMode: 'TCG' | 'Phylo' | null;
  tcgGameState: TCGGameState | null;
  phyloGameState: PhyloGameState | null;

  // Connection State
  isOnline: boolean;
  isLoading: boolean; // For async actions and AI turns
  error: string | null;

  // Animation State
  lastDrawnCards: string[]; // For card drawing animation

  // UI-specific state (separated from game logic)
  uiState: {
    selectedHandCardId: string | null;
    selectedBoardCardId: string | null;
    highlightedPositions: Position[];
    showValidMoves: boolean;
    isCardDragging: boolean;

    // Opposition Hand UI State
    oppositionHand: {
      isVisible: boolean;
      isExpanded: boolean;
      selectedOpponentId: string | null; // Which opponent to view
      showCardDetails: boolean; // Toggle between card backs and generic fronts
    };
  };

  // Battle Actions
  actions: {
    // TCG Actions
    startTCGGame: (gameId: string, players: any[], settings?: any) => Promise<void>;
    playCard: (cardId: string, position: Position) => Promise<void>;
    dropAndDrawThree: (cardIdToDiscard: string) => Promise<any>;
    passTurn: () => Promise<void>;
    playerReady: () => Promise<void>;

    // Phylo Actions
    startCampaignLevel: (payload: { levelId: string; difficulty: 'easy' | 'medium' | 'hard'; playerDeck: any[] }) => Promise<void>;
    playPhyloCard: (payload: { cardId: string; position: Position; playerId: string }) => Promise<void>;
    handleAITurn: (payload: { currentState: any }) => Promise<void>;
    endTurn: (payload: { playerId: string }) => Promise<void>;
    calculateValidMoves: (cardId?: string) => Promise<void>;

    // UI Actions
    selectHandCard: (cardId: string | null) => void;
    selectBoardCard: (cardId: string | null) => void;
    setHighlightedPositions: (positions: Position[]) => void;
    clearUIState: () => void;

    // Opposition Hand Actions
    toggleOppositionHandVisibility: () => void;
    toggleOppositionHandExpansion: () => void;
    selectOpponent: (opponentId: string | null) => void;
    toggleOppositionCardDetails: () => void;

    // Mode Switching
    switchToTCGMode: () => void;
    switchToPhyloMode: () => void;
    goOnline: () => Promise<void>;
    goOffline: () => void;
  };
}

// ============================================================================
// ONLINE MULTIPLAYER INTERFACES
// ============================================================================

/**
 * Matchmaking state interface
 */
export interface MatchmakingState {
  isSearching: boolean;
  queueTime: number;
  gameMode: string | null;
  preferences: any;
  lastSearchAttempt: number;
}

/**
 * Rating and competitive state interface
 */
export interface RatingState {
  current: number;
  peak: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  winStreak: number;
  rank: string;
  season: string;
}

/**
 * Quest progress interface
 */
export interface QuestState {
  dailyQuests: {
    [questType: string]: {
      progress: any;
      target: any;
      isCompleted: boolean;
      isClaimed: boolean;
      rewards: any;
    };
  };
  questStreak: number;
  lastQuestReset: string;
  totalQuestsCompleted: number;
}

/**
 * Online multiplayer slice - extends existing store architecture
 */
export interface OnlineSlice {
  // Matchmaking state
  matchmaking: MatchmakingState;

  // Rating and competitive state
  rating: RatingState;

  // Quest and progression state
  quests: QuestState;

  // Leaderboard cache
  leaderboard: {
    data: any[];
    lastUpdated: number;
    gameMode: string | null;
  };

  // Online actions that integrate with existing patterns
  onlineActions: {
    // Matchmaking actions
    findMatch: (gameMode: string, preferences?: any) => Promise<void>;
    cancelMatchmaking: () => Promise<void>;
    acceptMatch: (sessionId: string) => Promise<void>;

    // Rating actions
    updateRating: (ratingUpdate: RatingUpdate) => Promise<void>;
    refreshRating: () => Promise<void>;

    // Quest actions
    updateQuestProgress: (questType: string, progress: any) => Promise<void>;
    claimQuestReward: (questType: string) => Promise<void>;
    refreshDailyQuests: () => Promise<void>;

    // Leaderboard actions
    refreshLeaderboard: (gameMode: string) => Promise<void>;
  };
}

export interface HybridGameState {
  // Battle State Slice
  battle: BattleSlice;

  // Online Multiplayer Slice
  online: OnlineSlice;

  // Offline State
  offlineCollection: OfflineCollection | null;
  hasStarterPack: boolean;
  isFirstLaunch: boolean;

  // Species Data
  allSpeciesCards: Card[];
  speciesLoaded: boolean;
  packSystem: BoosterPackSystem | null;

  // Online State
  isOnline: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  firebaseUser: User | null;

  // Guest Account State (Lazy Registration)
  isGuestMode: boolean;
  guestId: string | null;
  guestSecret: string | null;
  guestToken: string | null;
  needsRegistration: boolean;

  // User Profile Information (using unified types)
  userProfile: AuthenticatedUser | null;
  
  // Sync State
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: number;
  syncError: string | null;
  pendingActions: number;

  // Stateless sync service state
  syncServiceState: {
    isSyncing: boolean;
    lastSyncAttempt: number;
  };
  
  // UI State
  showSyncConflicts: boolean;
  syncConflicts: any[];
  hasPausedGame: boolean;
  pausedGameMetadata: any;

  // Store hydration state
  isHydrated: boolean;

  // Actions
  initializeOfflineCollection: () => void;
  loadOfflineCollection: () => Promise<void>;
  saveOfflineCollection: (collection: OfflineCollection) => void;
  recoverActiveGame: () => Promise<void>;
  resumePausedGame: () => void;

  // User Profile Actions
  updateUserProfile: (profile: Partial<AuthenticatedUser>) => void;
  generateGuestUsername: () => string;
  clearUserProfile: () => void;

  // Collection Management
  refreshCollectionState: () => void;

  // Species Data Actions
  loadSpeciesData: () => Promise<void>;

  // Firebase Auth Actions
  initializeAuth: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOutUser: () => Promise<void>;
  handleNewUser: () => Promise<void>;
  initializeOfflineKey: () => Promise<void>;
  loginExistingGuest: () => Promise<void>;
  registerGuestWithServer: () => Promise<void>;
  recoverAuthenticationState: () => Promise<void>;
  
  // Starter Pack Actions
  openStarterPack: () => Promise<number[]>;
  
  // Card Actions
  addCardToCollection: (cardId: number, quantity: number, acquiredVia: string) => Promise<void>;
  openPack: (packType: string) => Promise<number[]>;
  
  // Deck Actions
  createDeck: (name: string, cards: { cardId: number; quantity: number }[]) => Promise<string>;
  updateDeck: (deckId: string, name: string, cards: { cardId: number; quantity: number }[]) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  setActiveDeck: (deckId: string) => void;
  loadDeck: (deckId: string) => any;
  
  // Sync Actions
  syncCollection: (conflictResolutions?: Record<string, 'server_wins' | 'user_wins' | 'merge'>) => Promise<SyncResult>;
  setOnlineStatus: (online: boolean) => void;
  setAuthenticationStatus: (authenticated: boolean, userId?: string) => void;

  // Conflict Resolution
  resolveSyncConflicts: (conflicts: any[]) => void;
  dismissSyncConflicts: () => void;

  // WebSocket Connection Management
  initializeWebSocket: () => void;
  disconnectWebSocket: () => void;

  // Online Multiplayer Actions
  findMatch: (gameMode: string, preferences?: any) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  acceptMatch: (sessionId: string) => Promise<void>;
  updateRating: (ratingUpdate: RatingUpdate) => Promise<void>;
  refreshRating: () => Promise<void>;
  updateQuestProgress: (questType: string, progress: any) => Promise<void>;
  claimQuestReward: (questType: string) => Promise<void>;
  refreshDailyQuests: () => Promise<void>;
  refreshLeaderboard: (gameMode: string) => Promise<void>;
  trackGameCompletion: (gameResult: { winner: string | null; gameMode: string; playerId: string }) => Promise<void>;

  // Active battle tracking
  activeBattle: {
    sessionId: string | null;
    gameMode: 'campaign' | 'online' | 'scenarios' | 'tutorial' | null;
    levelId: string | null;
    isActive: boolean;
  };
  setActiveBattle: (battle: {
    sessionId: string | null;
    gameMode: 'campaign' | 'online' | 'scenarios' | 'tutorial' | null;
    levelId: string | null;
    isActive: boolean;
  }) => void;
  clearActiveBattle: () => void;

  // Test helper method
  setAuthenticatedUser: (userData: {
    userId: string;
    firebaseUser: any;
    userProfile: any;
  }) => void;
}

export const useHybridGameStore = create<HybridGameState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Battle State Slice
        battle: {
          gameMode: null,
          tcgGameState: null,
          phyloGameState: null,
          isOnline: false,
          isLoading: false,
          error: null,
          lastDrawnCards: [],
          uiState: {
            selectedHandCardId: null,
            selectedBoardCardId: null,
            highlightedPositions: [],
            showValidMoves: false,
            isCardDragging: false,

            // Opposition Hand UI State
            oppositionHand: {
              isVisible: false,
              isExpanded: false,
              selectedOpponentId: null,
              showCardDetails: false,
            },
          },
          actions: {
            // TCG Actions
            startTCGGame: async (gameId: string, players: any[], settings?: any) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null,
                  gameMode: 'TCG'
                }
              }));

              try {
                const currentState = get().battle;
                const result = await unifiedGameService.createGame({
                  gameId,
                  players,
                  mode: GameMode.TCG,
                  settings,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to start TCG game'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to start TCG game'
                  }
                }));
              }
            },

            playCard: async (cardId: string, position: Position) => {
              const state = get();

              // Don't set loading state for card play - it should be immediate
              set((state) => ({
                battle: {
                  ...state.battle,
                  error: null
                }
              }));

              try {
                const currentState = state.battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'PLAY_CARD' as any,
                    playerId: 'human', // Use the hardcoded player ID from game creation
                    payload: { cardId, position }
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      error: null,
                      uiState: {
                        ...state.battle.uiState,
                        selectedHandCardId: null,
                        highlightedPositions: []
                      }
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      error: result.errorMessage || 'Failed to play card'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    error: error.message || 'Failed to play card'
                  }
                }));
              }
            },

            dropAndDrawThree: async (cardIdToDiscard: string) => {
              const state = get();

              // Don't set loading state for immediate action
              set((state) => ({
                battle: {
                  ...state.battle,
                  error: null
                }
              }));

              try {
                const currentState = state.battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'DROP_AND_DRAW_THREE' as any,
                    playerId: 'human',
                    payload: { cardIdToDiscard }
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  console.log('🃏 [Store] Drop and draw result:', {
                    isValid: result.isValid,
                    hasNewState: !!result.newState,
                    drawnCards: (result as any).drawnCards,
                    resultKeys: Object.keys(result)
                  });

                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      error: null,
                      uiState: {
                        ...state.battle.uiState,
                        selectedHandCardId: null,
                        highlightedPositions: []
                      },
                      // Store drawn cards for animation
                      lastDrawnCards: (result as any).drawnCards || []
                    }
                  }));

                  // Return the result so UI can access drawn cards immediately
                  return result;
                } else {
                  // Handle specific error cases more gracefully
                  const errorMessage = result.errorMessage || 'Failed to drop and draw';
                  console.warn('🚨 [Store] Drop and draw failed:', errorMessage);

                  // Clear drawn cards on failure
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      lastDrawnCards: []
                    }
                  }));

                  // Don't show harsh error modal for user input errors
                  if (errorMessage.includes('Card not in hand') ||
                      errorMessage.includes('No actions remaining') ||
                      errorMessage.includes('Not enough cards in deck')) {
                    // Just log these - they're user input issues, not system failures
                    console.log('ℹ️ [Store] User action blocked:', errorMessage);
                  } else {
                    // Only show error modal for actual system errors
                    set((state) => ({
                      battle: {
                        ...state.battle,
                        error: errorMessage
                      }
                    }));
                  }

                  // Return the failed result
                  return result;
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    error: error.message || 'Failed to drop and draw'
                  }
                }));

                // Return error result
                return { isValid: false, errorMessage: error.message || 'Failed to drop and draw' };
              }
            },

            passTurn: async () => {
              const state = get();

              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = state.battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'PASS_TURN' as any,
                    playerId: 'human', // Use the hardcoded player ID from game creation
                    payload: {}
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to pass turn'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to pass turn'
                  }
                }));
              }
            },

            playerReady: async () => {
              const state = get();

              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = state.battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'PLAYER_READY' as any,
                    playerId: 'human', // Use the hardcoded player ID from game creation
                    payload: {}
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to mark player as ready'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to mark player as ready'
                  }
                }));
              }
            },

            // Phylo Actions
            startCampaignLevel: async (payload: { levelId: string; difficulty: 'easy' | 'medium' | 'hard'; playerDeck: any[] }) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null,
                  gameMode: 'Phylo'
                }
              }));

              try {
                const currentState = get().battle;
                const result = await unifiedGameService.createGame({
                  gameId: payload.levelId || `campaign-${Date.now()}`,
                  players: [{ id: 'player1', name: 'Player' }],
                  mode: GameMode.PHYLO,
                  settings: {
                    maxPlayers: 1,
                    gridWidth: 9,
                    gridHeight: 10,
                    turnTimeLimit: 300,
                    aiDifficulty: payload.difficulty as any
                  },
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      phyloGameState: result.newState as unknown as PhyloGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to start campaign level'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to start campaign level'
                  }
                }));
              }
            },

            playPhyloCard: async (payload: { cardId: string; position: Position; playerId: string }) => {
              const state = get();

              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = state.battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'PLAY_CARD' as any,
                    playerId: payload.playerId || 'player1',
                    payload: payload
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      phyloGameState: result.newState as unknown as PhyloGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to play Phylo card'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to play Phylo card'
                  }
                }));
              }
            },

            handleAITurn: async () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = get().battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'AI_TURN' as any,
                    playerId: 'ai',
                    payload: { currentState }
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      phyloGameState: result.newState as unknown as PhyloGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'AI turn failed'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'AI turn failed'
                  }
                }));
              }
            },

            endTurn: async (payload: { playerId: string }) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = get().battle;
                const result = await unifiedGameService.executeAction({
                  action: {
                    type: 'END_TURN' as any,
                    playerId: payload.playerId || 'player1',
                    payload: payload
                  },
                  currentState,
                  isOnline: currentState.isOnline
                });

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      phyloGameState: result.newState as unknown as PhyloGameState,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to end turn'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to end turn'
                  }
                }));
              }
            },

            calculateValidMoves: async (cardId?: string) => {
              try {
                const currentState = get().battle;
                const result = await unifiedGameService.getValidMoves(
                  currentState.phyloGameState?.gameId || 'current-game',
                  'human',
                  cardId
                );

                if (result.isValid && result.newState) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      uiState: {
                        ...state.battle.uiState,
                        highlightedPositions: result.newState?.positions || []
                      }
                    }
                  }));
                }
              } catch (error: any) {
                console.error('Failed to calculate valid moves:', error);
              }
            },

            // UI Actions (synchronous, no service calls needed)
            selectHandCard: (cardId: string | null) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    selectedHandCardId: cardId,
                    selectedBoardCardId: null
                  }
                }
              }));
            },

            selectBoardCard: (cardId: string | null) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    selectedBoardCardId: cardId,
                    selectedHandCardId: null
                  }
                }
              }));
            },

            setHighlightedPositions: (positions: Position[]) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    highlightedPositions: positions
                  }
                }
              }));
            },

            clearUIState: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    selectedHandCardId: null,
                    selectedBoardCardId: null,
                    highlightedPositions: [],
                    showValidMoves: false,
                    isCardDragging: false,

                    // Reset opposition hand UI state
                    oppositionHand: {
                      isVisible: false,
                      isExpanded: false,
                      selectedOpponentId: null,
                      showCardDetails: false,
                    },
                  }
                }
              }));
            },

            // Opposition Hand Actions
            toggleOppositionHandVisibility: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    oppositionHand: {
                      ...state.battle.uiState.oppositionHand,
                      isVisible: !state.battle.uiState.oppositionHand.isVisible,
                    },
                  },
                },
              }));
            },

            toggleOppositionHandExpansion: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    oppositionHand: {
                      ...state.battle.uiState.oppositionHand,
                      isExpanded: !state.battle.uiState.oppositionHand.isExpanded,
                    },
                  },
                },
              }));
            },

            selectOpponent: (opponentId: string | null) => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    oppositionHand: {
                      ...state.battle.uiState.oppositionHand,
                      selectedOpponentId: opponentId,
                      isVisible: opponentId !== null, // Show when selecting an opponent
                    },
                  },
                },
              }));
            },

            toggleOppositionCardDetails: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  uiState: {
                    ...state.battle.uiState,
                    oppositionHand: {
                      ...state.battle.uiState.oppositionHand,
                      showCardDetails: !state.battle.uiState.oppositionHand.showCardDetails,
                    },
                  },
                },
              }));
            },

            // Mode Switching Actions
            switchToTCGMode: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  gameMode: 'TCG',
                  phyloGameState: null,
                  error: null
                }
              }));
            },

            switchToPhyloMode: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  gameMode: 'Phylo',
                  tcgGameState: null,
                  error: null
                }
              }));
            },

            goOnline: async () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: true,
                  error: null
                }
              }));

              try {
                const currentState = get().battle;
                // Sync functionality will be implemented in unified service later
                const result = { isValid: true, newState: currentState.tcgGameState, errorMessage: undefined };

                if (result.isValid) {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isOnline: true,
                      isLoading: false,
                      error: null
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      isLoading: false,
                      error: result.errorMessage || 'Failed to go online'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    isLoading: false,
                    error: error.message || 'Failed to go online'
                  }
                }));
              }
            },

            goOffline: () => {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isOnline: false,
                  error: null
                }
              }));
            }
          }
        },

        // Initial State
        offlineCollection: null,
        hasStarterPack: false,
        isFirstLaunch: true,

        // Active battle state (legacy - will be replaced by battle slice)
        activeBattle: {
          sessionId: null,
          gameMode: null,
          levelId: null,
          isActive: false
        },

        // Species Data
        allSpeciesCards: [],
        speciesLoaded: false,
        packSystem: null,

        // Online Multiplayer State
        online: {
          matchmaking: {
            isSearching: false,
            queueTime: 0,
            gameMode: null,
            preferences: {},
            lastSearchAttempt: 0
          },
          rating: {
            current: 1000,
            peak: 1000,
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: 0,
            winStreak: 0,
            rank: 'Bronze',
            season: 'season_1'
          },
          quests: {
            dailyQuests: {},
            questStreak: 0,
            lastQuestReset: new Date().toISOString().split('T')[0],
            totalQuestsCompleted: 0
          },
          leaderboard: {
            data: [],
            lastUpdated: 0,
            gameMode: null
          },
          onlineActions: {
            // These will be replaced with actual implementations in the store actions
            findMatch: async (gameMode: string, preferences?: any) => get().findMatch(gameMode, preferences),
            cancelMatchmaking: async () => get().cancelMatchmaking(),
            acceptMatch: async (sessionId: string) => get().acceptMatch(sessionId),
            updateRating: async (ratingUpdate: RatingUpdate) => get().updateRating(ratingUpdate),
            refreshRating: async () => get().refreshRating(),
            updateQuestProgress: async (questType: string, progress: any) => get().updateQuestProgress(questType, progress),
            claimQuestReward: async (questType: string) => get().claimQuestReward(questType),
            refreshDailyQuests: async () => get().refreshDailyQuests(),
            refreshLeaderboard: async (gameMode: string) => get().refreshLeaderboard(gameMode)
          }
        },

        isOnline: navigator.onLine,
        isAuthenticated: false,
        userId: null,
        firebaseUser: null,

        // Guest Account State
        isGuestMode: false,
        guestId: null,
        guestSecret: null,
        guestToken: null,
        needsRegistration: false,

        // User Profile State
        userProfile: null,
        syncStatus: 'idle',
        lastSyncTime: 0,
        syncError: null,
        pendingActions: 0,
        showSyncConflicts: false,
        syncConflicts: [],
        hasPausedGame: false,
        pausedGameMetadata: null,

        // Store hydration state
        isHydrated: false,

        // Stateless sync service state
        syncServiceState: {
          isSyncing: false,
          lastSyncAttempt: 0
        },

        // Initialize offline collection
        initializeOfflineCollection: () => {
          const state = get();
          const userId = state.userId || state.guestId;

          console.log('🔄 Initializing collection for user:', { userId, hasExisting: !!state.offlineCollection });

          if (!state.offlineCollection) {
            const newCollection = offlineSecurityService.createInitialCollection(userId);
            set({
              offlineCollection: newCollection,
              isFirstLaunch: false
            });
            offlineSecurityService.saveOfflineCollection(newCollection, userId);
            console.log('✅ New collection initialized and saved');
          }

          // Also load species data if not already loaded
          if (!state.speciesLoaded) {
            get().loadSpeciesData().catch(console.error);
          }

          // Initialize Firebase auth if not already done
          if (!state.firebaseUser && !state.isGuestMode) {
            get().initializeAuth().catch(console.error);
          }
        },

        // Load offline collection from storage
        loadOfflineCollection: async () => {
          const state = get();
          const userId = state.userId || state.guestId;

          console.log('📦 [LoadCollection] Starting collection load...', {
            userId,
            hasUserId: !!userId,
            isAuthenticated: state.isAuthenticated,
            isGuestMode: state.isGuestMode,
            hasExistingCollection: !!state.offlineCollection,
            isHydrated: state.isHydrated
          });

          // If collection already loaded, skip
          if (state.offlineCollection) {
            console.log('📦 Collection already loaded, skipping');
            return;
          }

          // If no userId yet, try to load from any available storage
          let stored: OfflineCollection | null = null;

          if (userId) {
            // Load for specific user
            stored = offlineSecurityService.loadOfflineCollection(userId);
          } else {
            // Fallback: try to load from default storage (for page refresh scenarios)
            console.log('📦 No userId available, trying default storage...');
            stored = offlineSecurityService.loadOfflineCollection(null);

            // Also check for any stored collections in localStorage
            if (!stored) {
              const allKeys = Object.keys(localStorage);
              const collectionKeys = allKeys.filter(key => key.includes('biomasters_offline_collection'));
              console.log('📦 Found collection keys in localStorage:', collectionKeys);

              if (collectionKeys.length > 0) {
                // Try to load the most recent collection
                try {
                  const collectionData = localStorage.getItem(collectionKeys[0]);
                  if (collectionData) {
                    stored = JSON.parse(collectionData);
                    console.log('📦 Loaded collection from fallback key:', collectionKeys[0]);
                  }
                } catch (error) {
                  console.warn('⚠️ Failed to parse fallback collection:', error);
                }
              }
            }
          }

          if (stored) {
            // Handle migration from old species_owned to new cards_owned format
            let migratedCollection = stored;
            if ('species_owned' in stored && !('cards_owned' in stored)) {
              console.log('🔄 Migrating collection from species_name to CardId format...');
              const oldStoredCollection = stored as any;

              // Simple migration: reset collection to empty since old format is incompatible
              const newCardsOwned: Record<number, any> = {};
              migratedCollection = {
                user_id: oldStoredCollection.user_id,
                device_id: oldStoredCollection.device_id,
                eco_credits: oldStoredCollection.eco_credits,
                xp_points: oldStoredCollection.xp_points,
                action_queue: oldStoredCollection.action_queue,
                collection_hash: oldStoredCollection.collection_hash,
                last_sync: oldStoredCollection.last_sync,
                signing_key_version: oldStoredCollection.signing_key_version,
                activeDeck: oldStoredCollection.activeDeck,
                savedDecks: oldStoredCollection.savedDecks,
                cards_owned: newCardsOwned
              };
              // Save migrated collection
              offlineSecurityService.saveOfflineCollection(migratedCollection, userId);
            }

            const hasCards = Object.keys(migratedCollection.cards_owned || {}).length > 0;
            set({
              offlineCollection: migratedCollection,
              hasStarterPack: hasCards,
              pendingActions: migratedCollection.action_queue.length
            });
            console.log('📦 Collection loaded from storage:', {
              cards_count: Object.keys(migratedCollection.cards_owned || {}).length,
              credits: migratedCollection.eco_credits,
              pending_actions: migratedCollection.action_queue.length,
              has_starter_pack: hasCards,
              user_id: migratedCollection.user_id
            });
          } else {
            console.log('📦 No stored collection found');
            // Don't initialize immediately if we don't have a userId yet
            if (userId) {
              console.log('📦 Initializing new collection for user:', userId);
              get().initializeOfflineCollection();
            } else {
              console.log('📦 Waiting for authentication before initializing collection...');
            }
          }
        },

        // Save offline collection to storage
        saveOfflineCollection: (collection: OfflineCollection) => {
          const state = get();
          const userId = state.userId || state.guestId;
          offlineSecurityService.saveOfflineCollection(collection, userId);
          set({
            offlineCollection: collection,
            pendingActions: collection.action_queue.length
          });
        },

        // Load species data and initialize pack system
        loadSpeciesData: async () => {
          const state = get();
          if (state.speciesLoaded) return; // Already loaded

          try {
            console.log('🔄 Loading species data...');

            // Use sharedDataLoader for data loading from static files
            const result = await sharedDataLoader.loadCards();
            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to load card data');
            }



            // Transform shared CardData to frontend Card format
            const allCards: Card[] = result.data.map((cardData: CardData) => transformCardDataToCard(cardData));

            console.log(`✅ Loaded ${allCards.length} species cards`);
            console.log('🔍 Sample cards:', allCards.slice(0, 3).map(card => ({
              cardId: card.cardId,
              nameId: card.nameId,
              trophicRole: card.trophicRole,
              conservationStatus: card.conservationStatus
            })));

            // Debug: Log conservation status distribution
            const conservationCounts = allCards.reduce((acc, card) => {
              acc[card.conservationStatus] = (acc[card.conservationStatus] || 0) + 1;
              return acc;
            }, {} as Record<number, number>);
            console.log('🔍 Conservation status distribution:', conservationCounts);

            // Initialize card mapping for nameId <-> cardId conversions
            initializeCardMapping(allCards.map(card => ({ cardId: card.cardId, nameId: card.nameId })));

            const packSystem = new BoosterPackSystem(allCards);

            set({
              allSpeciesCards: allCards,
              speciesLoaded: true,
              packSystem: packSystem
            });
          } catch (error) {
            console.error('❌ Failed to load species data:', error);
            throw error;
          }
        },

        // Initialize Firebase auth listener
        initializeAuth: async () => {
          console.log('🔥 Initializing Firebase auth...');

          // Wait for store hydration to complete before attempting recovery
          console.log('⏳ Waiting for store hydration...');
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          while (!get().isHydrated && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (!get().isHydrated) {
            console.warn('⚠️ Store hydration timeout, proceeding anyway');
          } else {
            console.log('✅ Store hydration completed');
          }

          // Set up Firebase auth state listener first
          // Firebase onAuthStateChanged will fire immediately if user was persisted
          // Thanks to browserLocalPersistence, this handles authentication restoration automatically
          onAuthStateChanged(auth, async (user) => {
            console.log('🔥 [AUTH-FLOW] Auth state changed:', user ? `User: ${user.uid}` : 'No user');

            const previousUser = get().firebaseUser;
            const currentState = get();

            console.log('🔍 [AUTH-FLOW] Current store state before processing:', {
              isAuthenticated: currentState.isAuthenticated,
              userId: currentState.userId,
              isGuestMode: currentState.isGuestMode,
              hasFirebaseUser: !!currentState.firebaseUser,
              hasGuestToken: !!currentState.guestToken,
              hasUserProfile: !!currentState.userProfile
            });

            if (user) {
              // Firebase user is signed in (new or restored from persistence)
              console.log('✅ [AUTH-FLOW] Firebase user authenticated:', {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: user.displayName
              });

              // Don't override guest mode if we're in the middle of guest conversion
              if (currentState.isGuestMode && !previousUser) {
                console.log('🔄 Guest conversion in progress, updating Firebase user');
              }

              set({
                firebaseUser: user,
                isAuthenticated: true,
                isGuestMode: false, // Firebase user overrides guest mode
                userId: user.uid,
                userProfile: {
                  id: user.uid,
                  username: user.displayName || user.email?.split('@')[0] || 'User',
                  display_name: user.displayName || undefined,
                  user_type: UserType.REGISTERED,
                  is_guest: false,
                  created_at: new Date(),
                  firebase_uid: user.uid,
                  email: user.email || undefined,
                  last_login: new Date(),
                  isOnline: true,
                  syncStatus: SyncStatus.SYNCED,
                  lastSyncTime: new Date()
                }
              });

              console.log('🔍 [AUTH-FLOW] Store state updated with Firebase user:', {
                isAuthenticated: get().isAuthenticated,
                userId: get().userId,
                isGuestMode: get().isGuestMode,
                hasUserProfile: !!get().userProfile,
                userProfileId: get().userProfile?.id
              });

              // Clear any guest credentials since we have a Firebase user
              await tokenManager.clearGuestCredentials();

              // CRITICAL: Set the current user ID in the offline security service
              console.log('🔑 [AUTH-FLOW] Setting current user ID in offline security service for Firebase user...');
              offlineSecurityService.setCurrentUserId(user.uid);
              console.log('✅ [AUTH-FLOW] Offline security service user ID set successfully');

              // Handle user authentication (new or returning)
              if (!previousUser) {
                console.log('👤 [AUTH-FLOW] Firebase user authenticated - setting up new user...');
                try {
                  // Setup new user first (this includes backend registration)
                  console.log('🔄 [AUTH-FLOW] Starting handleNewUser...');
                  await get().handleNewUser();
                  console.log('✅ [AUTH-FLOW] handleNewUser completed successfully');

                  // IMPORTANT: Initialize device registration AFTER backend registration is complete
                  // This ensures the backend knows about the user before device registration
                  console.log('🔑 [AUTH-FLOW] Backend setup complete, now initializing device registration...');
                  await get().initializeOfflineKey();
                  console.log('✅ [AUTH-FLOW] initializeOfflineKey completed successfully');

                  console.log('🔍 [AUTH-FLOW] New user setup completed, final state:', {
                    isAuthenticated: get().isAuthenticated,
                    userId: get().userId,
                    isGuestMode: get().isGuestMode,
                    hasUserProfile: !!get().userProfile
                  });
                } catch (error) {
                  console.error('❌ [AUTH-FLOW] Failed to setup authenticated user:', error);
                }
              } else {
                console.log('👤 [AUTH-FLOW] Returning Firebase user, skipping new user setup');
              }

              // Ensure collection is loaded for Firebase user
              if (!get().offlineCollection) {
                console.log('📦 Loading collection for Firebase user...');
                get().loadOfflineCollection().catch(console.error);
              }

              // If user signs in and we have offline data, prepare for sync
              if (get().offlineCollection) {
                console.log('👤 Firebase user authenticated with offline data - ready for sync');
                // Auto-sync when coming online
                if (navigator.onLine) {
                  setTimeout(() => get().syncCollection(), 1000);
                }
              }

            } else {
              // No Firebase user - try to recover authentication state from local storage
              console.log('🔍 [AUTH-FLOW] No Firebase user, attempting to recover authentication state...');

              // Only try to recover if we haven't already tried
              if (!currentState.isAuthenticated && !currentState.isGuestMode) {
                console.log('🔄 [AUTH-FLOW] Calling recoverAuthenticationState...');
                await get().recoverAuthenticationState();

                // Check if recovery was successful
                const recoveredState = get();
                console.log('🔍 [AUTH-FLOW] Recovery completed, new state:', {
                  isAuthenticated: recoveredState.isAuthenticated,
                  isGuestMode: recoveredState.isGuestMode,
                  userId: recoveredState.userId
                });

                // If still not authenticated, check for guest credentials
                if (!recoveredState.isAuthenticated) {
                  console.log('🔍 [AUTH-FLOW] No authentication recovered, checking for guest credentials...');
                  const guestCredentials = await tokenManager.getGuestCredentials();

                  if (guestCredentials) {
                    console.log('🔄 [AUTH-FLOW] Found guest credentials, attempting to restore guest session...', {
                      hasGuestId: !!guestCredentials.guestId,
                      hasGuestSecret: !!guestCredentials.guestSecret,
                      hasGuestToken: !!guestCredentials.guestToken
                    });
                  try {
                    // Restore guest state
                    set({
                      isAuthenticated: true,
                      isGuestMode: true,
                      guestId: guestCredentials.guestId,
                      guestSecret: guestCredentials.guestSecret,
                      guestToken: guestCredentials.guestToken || null,
                      userId: guestCredentials.guestId,
                      firebaseUser: null,
                      userProfile: {
                        id: guestCredentials.guestId,
                        username: `Guest-${guestCredentials.guestId.slice(-6).toUpperCase()}`,
                        display_name: `Guest-${guestCredentials.guestId.slice(-6).toUpperCase()}`,
                        user_type: UserType.GUEST,
                        is_guest: true,
                        created_at: new Date(),
                        email: undefined,
                        isOnline: true,
                        syncStatus: SyncStatus.PENDING,
                        lastSyncTime: new Date()
                      }
                    });
                    console.log('✅ Guest session restored from secure storage');
                  } catch (error) {
                    console.warn('⚠️ Failed to restore guest session:', error);
                    await tokenManager.clearGuestCredentials();
                  }
                } else {
                  // No authentication at all - clear state
                  console.log('ℹ️ No authentication found');
                  if (previousUser) {
                    console.log('👤 User signed out - clearing state...');
                    set({
                      firebaseUser: null,
                      isAuthenticated: false,
                      isGuestMode: false,
                      userId: null,
                      userProfile: null,
                      offlineCollection: null,
                      hasStarterPack: false,
                      syncStatus: 'idle',
                      lastSyncTime: 0,
                      syncError: null,
                      pendingActions: 0,
                      showSyncConflicts: false,
                      syncConflicts: [],
                      syncServiceState: {
                        isSyncing: false,
                        lastSyncAttempt: 0
                      }
                    });
                    await tokenManager.clearAllAuthData();
                  }
                  }
                }
              } else {
                // Already in guest mode, preserve state
                console.log('🔥 Preserving existing guest mode authentication');
                set({ firebaseUser: null });
              }
            }
          });

          // Listen for online/offline events
          const handleOnline = () => {
            console.log('🌐 Device came online');
            set({ isOnline: true });

            // Auto-sync when coming online if authenticated (including guest registration)
            const state = get();
            if (state.isAuthenticated && state.offlineCollection) {
              if (state.isGuestMode && state.needsRegistration) {
                // Guest needs registration - trigger sync which will handle registration
                setTimeout(() => state.syncCollection(), 2000);
              } else if (!state.isGuestMode) {
                // Regular user sync
                setTimeout(() => state.syncCollection(), 2000);
              }
            }
          };

          const handleOffline = () => {
            console.log('📴 Device went offline');
            set({ isOnline: false });
          };

          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
        },

        // Sign in as guest (lazy registration system)
        signInAsGuest: async () => {
          console.log('👤 Starting guest sign-in (offline-first)...');

          const state = get();

          // First check secure storage for existing guest credentials
          const storedCredentials = await tokenManager.getGuestCredentials();

          if (storedCredentials) {
            console.log('👤 Found existing guest credentials in secure storage, attempting login...');
            try {
              // Update state with stored credentials
              set({
                guestId: storedCredentials.guestId,
                guestSecret: storedCredentials.guestSecret,
                guestToken: storedCredentials.guestToken || null
              });

              await get().loginExistingGuest();
              return;
            } catch (error) {
              console.warn('⚠️ Existing guest login failed, creating new guest:', error);
              // Clear invalid credentials and fall through to create new guest
              await tokenManager.clearGuestCredentials();
            }
          } else if (state.guestId && state.guestSecret) {
            // Fallback: check Zustand persisted state
            console.log('👤 Found guest credentials in store, attempting login...');
            try {
              await get().loginExistingGuest();
              return;
            } catch (error) {
              console.warn('⚠️ Existing guest login failed, creating new guest:', error);
              // Fall through to create new guest
            }
          }

          // Generate new guest identity (client-authoritative)
          const guestId = crypto.randomUUID();
          console.log('👤 Generated new guest ID:', guestId);

          // Set initial guest state (works offline immediately)
          const guestUsername = `Guest-${guestId.slice(-6).toUpperCase()}`;

          set({
            isAuthenticated: true,
            isGuestMode: true,
            guestId,
            guestSecret: null, // Will be set after server registration
            guestToken: null,
            needsRegistration: true,
            userId: guestId, // Use guestId as userId initially
            firebaseUser: null,
            userProfile: {
              id: guestId,
              username: guestUsername,
              display_name: guestUsername,
              user_type: UserType.GUEST,
              is_guest: true,
              created_at: new Date(),
              email: undefined,
              isOnline: true,
              syncStatus: SyncStatus.PENDING,
              lastSyncTime: new Date()
            }
          });

          // CRITICAL: Set the current user ID in the offline security service
          console.log('🔑 Setting current user ID in offline security service for new guest...');
          offlineSecurityService.setCurrentUserId(guestId);

          // Store guest ID immediately (secret will be stored after server registration)
          await tokenManager.storeGuestCredentials({
            guestId,
            guestSecret: '', // Placeholder until server registration
            guestToken: undefined
          });

          // Initialize offline collection immediately
          get().initializeOfflineCollection();

          // Setup new guest user (including starter pack)
          await get().handleNewUser();

          console.log('✅ Guest mode activated (offline-first):', guestId);

          // Try lazy registration if online
          if (navigator.onLine) {
            try {
              await get().registerGuestWithServer();
            } catch (error) {
              console.warn('⚠️ Server registration failed, continuing offline:', error);
              // Continue in offline mode - registration will happen on next sync
            }
          }
        },

        // Login existing guest account
        loginExistingGuest: async () => {
          const state = get();
          if (!state.guestId || !state.guestSecret) {
            throw new Error('No guest credentials found');
          }

          console.log('👤 Logging in existing guest...');

          try {
            const response = await guestApi.login({
              guestId: state.guestId,
              guestSecret: state.guestSecret
            });

            const data = response.data;

            set({
              isAuthenticated: true,
              isGuestMode: true,
              guestToken: data.auth?.token || '',
              userId: data.user?.id || '',
              needsRegistration: false
            });

            // Update secure storage with fresh token
            if (data.auth?.token) {
              await tokenManager.updateGuestToken(data.auth.token);
            }
          } catch (error: any) {
            console.error('❌ Guest login failed:', error);
            throw new Error(error.message || 'Guest login failed');
          }

          console.log('✅ Guest login successful');
        },

        // Register guest with server (lazy registration)
        registerGuestWithServer: async () => {
          const state = get();
          if (!state.guestId || !state.needsRegistration) {
            return; // Already registered or no guest ID
          }

          console.log('👤 Registering guest with server...');

          // Collect offline action queue
          const actionQueue = state.offlineCollection?.action_queue || [];

          try {
            const response = await guestApi.registerAndSync({
              guestId: state.guestId,
              actionQueue: actionQueue.map(action => ({
                action: action.action,
                cardId: action.cardId,
                quantity: action.quantity,
                pack_type: action.pack_type,
                deck_id: action.deck_id,
                deck_data: action.deck_data,
                signature: action.signature,
                timestamp: action.timestamp
              })),
              deviceId: offlineSecurityService.getDeviceId()
            });

            const data = response.data;

            // Update state with server credentials
            set({
              guestSecret: data.auth?.guestSecret || '',
              guestToken: data.auth?.token || '',
              userId: data.user?.id || '',
              needsRegistration: false
            });

            // Store credentials securely
            if (data.auth?.guestSecret && data.auth?.token) {
              await tokenManager.storeGuestCredentials({
                guestId: state.guestId!,
                guestSecret: data.auth.guestSecret,
                guestToken: data.auth.token
              });
            }

            // Clear processed actions from local queue
            if (state.offlineCollection) {
              const updatedCollection = {
                ...state.offlineCollection,
                action_queue: [] // Clear processed actions
              };
              get().saveOfflineCollection(updatedCollection);
            }

            console.log('✅ Guest registered with server successfully');
          } catch (error: any) {
            console.error('❌ Guest registration failed:', error);
            throw new Error(error.message || 'Guest registration failed');
          }
        },

        // Recover authentication state after page refresh
        recoverAuthenticationState: async () => {
          const state = get();

          console.log('🔄 Attempting to recover authentication state...');
          console.log('🔍 Current state:', {
            isAuthenticated: state.isAuthenticated,
            isGuestMode: state.isGuestMode,
            hasGuestId: !!state.guestId,
            hasGuestSecret: !!state.guestSecret,
            hasGuestToken: !!state.guestToken,
            hasOfflineCollection: !!state.offlineCollection,
            isHydrated: state.isHydrated
          });

          // If already authenticated, ensure collection is loaded
          if (state.isAuthenticated) {
            console.log('✅ Already authenticated, checking collection...');
            if (!state.offlineCollection) {
              console.log('📦 Loading collection for authenticated user...');
              await get().loadOfflineCollection();
            }
            return;
          }

          // Check if Firebase has a persisted user (for registered users)
          console.log('🔍 Checking Firebase auth persistence...');
          const currentFirebaseUser = auth.currentUser;
          if (currentFirebaseUser) {
            console.log('✅ Found persisted Firebase user:', currentFirebaseUser.uid);
            // Restore Firebase user authentication state
            set({
              firebaseUser: currentFirebaseUser,
              isAuthenticated: true,
              isGuestMode: false,
              userId: currentFirebaseUser.uid,
              userProfile: {
                id: currentFirebaseUser.uid,
                username: currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'User',
                display_name: currentFirebaseUser.displayName || undefined,
                user_type: UserType.REGISTERED,
                is_guest: false,
                created_at: new Date(),
                firebase_uid: currentFirebaseUser.uid,
                email: currentFirebaseUser.email || undefined,
                last_login: new Date(),
                isOnline: true,
              }
            });

            // Load collection for restored Firebase user
            console.log('📦 Loading collection for restored Firebase user...');
            await get().loadOfflineCollection();
            return;
          }

          // Try to recover guest credentials from secure storage
          console.log('🔍 Checking secure storage for guest credentials...');
          const storedCredentials = await tokenManager.getGuestCredentials();
          console.log('🔍 Retrieved credentials from storage:', {
            hasCredentials: !!storedCredentials,
            hasGuestId: !!storedCredentials?.guestId,
            hasGuestSecret: !!storedCredentials?.guestSecret,
            hasGuestToken: !!storedCredentials?.guestToken
          });

          if (storedCredentials) {
            console.log('🔄 Found guest credentials in secure storage, restoring session...');
            console.log('🔍 Stored credentials:', {
              hasGuestId: !!storedCredentials.guestId,
              hasGuestSecret: !!storedCredentials.guestSecret,
              hasGuestToken: !!storedCredentials.guestToken
            });

            // Update state with stored credentials FIRST
            const guestUsername = `Guest-${storedCredentials.guestId.slice(-6).toUpperCase()}`;
            set({
              guestId: storedCredentials.guestId,
              guestSecret: storedCredentials.guestSecret,
              guestToken: storedCredentials.guestToken || null,
              isAuthenticated: true,
              isGuestMode: true,
              userId: storedCredentials.guestId,
              needsRegistration: !storedCredentials.guestSecret || storedCredentials.guestSecret === '', // Need registration if no secret
              userProfile: {
                id: storedCredentials.guestId,
                username: guestUsername,
                display_name: guestUsername,
                user_type: UserType.GUEST,
                is_guest: true,
                created_at: new Date(),
                email: undefined,
                isOnline: navigator.onLine,
                syncStatus: SyncStatus.PENDING,
                lastSyncTime: new Date()
              }
            });

            // CRITICAL: Set the current user ID in the offline security service
            console.log('🔑 Setting current user ID in offline security service...');
            offlineSecurityService.setCurrentUserId(storedCredentials.guestId);

            // Now load the user's offline collection with the correct userId
            console.log('📦 Loading collection for recovered guest user...');
            // Add a small delay to ensure state is fully updated
            setTimeout(async () => {
              await get().loadOfflineCollection();
            }, 100);

            console.log('✅ Guest authentication state recovered successfully');
            return;
          }

          // No stored credentials found, try to load any existing collection as fallback
          console.log('ℹ️ No stored authentication found, trying fallback collection load...');
          await get().loadOfflineCollection();
        },

        // Sign out user
        signOutUser: async () => {
          try {
            console.log('🔓 [SignOut] Starting sign-out process...');

            const state = get();
            const currentUserId = state.userId || state.guestId;
            console.log('🔓 [SignOut] Current state:', {
              isAuthenticated: state.isAuthenticated,
              isGuestMode: state.isGuestMode,
              userId: state.userId,
              guestId: state.guestId,
              firebaseUser: state.firebaseUser?.email
            });

            if (state.isGuestMode) {
              // For guest mode, clear local state and secure storage
              console.log('🔓 [SignOut] Signing out guest user...');

              // Clear secure storage first
              console.log('🔓 [SignOut] Clearing guest credentials...');
              await tokenManager.clearGuestCredentials();

              // Clear user-scoped data for this guest
              if (currentUserId) {
                console.log('🔓 [SignOut] Clearing user-scoped data for guest:', currentUserId);
                await clearUserData(currentUserId);
                console.log(`🧹 [SignOut] Cleared user-scoped data for guest: ${currentUserId}`);
              }

              console.log('🔓 [SignOut] Setting guest state to signed out...');
              set({
                isAuthenticated: false,
                userId: null,
                firebaseUser: null,
                isGuestMode: false,
                guestId: null,
                guestSecret: null,
                guestToken: null,
                needsRegistration: false,
                offlineCollection: null,
                hasStarterPack: false,
                syncStatus: 'idle',
                lastSyncTime: 0,
                syncError: null,
                pendingActions: 0,
                showSyncConflicts: false,
                syncConflicts: [],
                syncServiceState: {
                  isSyncing: false,
                  lastSyncAttempt: 0
                },
                userProfile: null
              });
              console.log('✅ [SignOut] Guest state cleared');
            } else {
              // For Firebase users, clear user-scoped data before signing out
              console.log('🔓 [SignOut] Signing out Firebase user...');

              if (currentUserId) {
                console.log('🔓 [SignOut] Clearing user-scoped data for Firebase user:', currentUserId);
                await clearUserData(currentUserId);
                console.log(`🧹 [SignOut] Cleared user-scoped data for user: ${currentUserId}`);
              }

              // Clear offline collection state immediately
              console.log('🔓 [SignOut] Clearing offline collection state...');
              set({
                offlineCollection: null,
                hasStarterPack: false,
                syncStatus: 'idle',
                lastSyncTime: 0,
                syncError: null,
                pendingActions: 0,
                showSyncConflicts: false,
                syncConflicts: [],
                syncServiceState: {
                  isSyncing: false,
                  lastSyncAttempt: 0
                }
              });

              // Sign out through Firebase
              console.log('🔓 [SignOut] Calling Firebase signOut...');
              await signOut(auth);
              console.log('✅ [SignOut] Firebase signOut completed');

              // Firebase auth state change will handle clearing state
              // Also clear any backup token storage
              console.log('🔓 [SignOut] Clearing Firebase token...');
              await tokenManager.clearFirebaseToken();
              console.log('✅ [SignOut] Firebase token cleared');
            }

            console.log('✅ [SignOut] Sign-out process completed successfully');

            // Log final state
            const finalState = get();
            console.log('🔓 [SignOut] Final state:', {
              isAuthenticated: finalState.isAuthenticated,
              isGuestMode: finalState.isGuestMode,
              userId: finalState.userId,
              guestId: finalState.guestId,
              firebaseUser: finalState.firebaseUser?.email
            });

            // Navigate to home page after successful sign-out
            console.log('🏠 [SignOut] Navigating to home page...');
            if (typeof window !== 'undefined' && window.location) {
              // Use window.location for a full page refresh to ensure clean state
              window.location.href = '/home';
            }
          } catch (error) {
            console.error('❌ [SignOut] Sign-out failed:', error);
            throw error;
          }
        },

        // Initialize offline signing key from server (with local fallback)
        initializeOfflineKey: async () => {
          const state = get();

          if (!state.isAuthenticated || !state.userId) {
            throw new Error('User must be authenticated to initialize offline key');
          }

          try {
            console.log('🔑 [DEVICE_REG] Starting offline key initialization...');
            const deviceId = offlineSecurityService.getDeviceId();
            console.log('🔑 [DEVICE_REG] Device ID:', deviceId, 'User ID:', state.userId);

            // Try to get signing key from server first (skip for guest mode)
            if (!state.isGuestMode) {
              try {
                // Get Firebase ID token for server authentication
                console.log('🔑 [DEVICE_REG] Getting Firebase ID token...');
                const idToken = await auth.currentUser?.getIdToken();
                if (!idToken) {
                  throw new Error('Failed to get authentication token');
                }

                // Call the server to register device and get signing key
                console.log('🔑 [DEVICE_REG] Requesting offline signing key from server...');
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/offline-key`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({ device_id: deviceId })
                });

                console.log('🔑 [DEVICE_REG] Server response status:', response.status);

                if (!response.ok) {
                  const errorData = await response.json();
                  console.error('🔑 [DEVICE_REG] Server registration failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                  });
                  throw new Error(`Failed to get offline key: ${errorData.message || response.statusText}`);
                }

                const { signing_key, signing_key_version, expires_at, existing_action_chain } = await response.json();
                console.log('🔑 [DEVICE_REG] Received signing key from server, initializing...', {
                  hasKey: !!signing_key,
                  keyVersion: signing_key_version,
                  expiresAt: expires_at,
                  existingActionsCount: existing_action_chain?.length || 0
                });

                // Calculate expiry timestamp
                const expiresAtTimestamp = new Date(expires_at).getTime();

                // Update signing key with version and expiry
                offlineSecurityService.updateSigningKey(signing_key, signing_key_version || 1, expiresAtTimestamp);
                console.log('🔑 [DEVICE_REG] ✅ Offline signing key initialized from server');

                // Handle existing action chain from server
                if (existing_action_chain && existing_action_chain.length > 0) {
                  console.log('🔗 [DEVICE_REG] Server provided existing action chain:', {
                    actionCount: existing_action_chain.length,
                    actionIds: existing_action_chain.map((a: any) => a.action_id)
                  });

                  // Update the offline security service with the count of server-processed actions
                  // This ensures correct nonce calculation for new actions
                  offlineSecurityService.updateServerProcessedActionsCount(existing_action_chain.length);
                  console.log('🔗 [DEVICE_REG] Updated server processed actions count for correct nonce calculation');
                }

              } catch (serverError) {
                console.warn('🔑 [DEVICE_REG] ⚠️ Server unavailable, using local fallback key:', serverError);

                // Use the built-in fallback mechanism (no session key = derive from user ID)
                await offlineSecurityService.initializeSigningKey(state.userId!);
                console.log('🔑 [DEVICE_REG] ✅ Local fallback signing key initialized');
              }
            } else {
              // Guest mode - always use local key
              console.log('🔑 [DEVICE_REG] Guest mode - using local signing key');
              await offlineSecurityService.initializeSigningKey(state.userId!);
              console.log('🔑 [DEVICE_REG] ✅ Guest local signing key initialized');
            }

            // Verify initialization was successful
            if (offlineSecurityService.isInitialized()) {
              console.log('🔑 [DEVICE_REG] ✅ Device registration completed successfully');
            } else {
              throw new Error('Device registration verification failed - offline security service not initialized');
            }

          } catch (error) {
            console.error('🔑 [DEVICE_REG] ❌ Failed to initialize offline key:', error);
            throw error;
          }
        },

        // Handle new user setup
        handleNewUser: async () => {
          const state = get();

          try {
            console.log('🆕 Setting up new user...');

            // Initialize collection first (offline-first)
            if (!state.offlineCollection) {
              get().initializeOfflineCollection();
            }

            // For Firebase users, ensure backend registration before device registration
            if (!state.isGuestMode && state.firebaseUser) {
              console.log('🔄 [NEW_USER] Ensuring backend registration for Firebase user...', {
                uid: state.firebaseUser.uid,
                email: state.firebaseUser.email,
                isAnonymous: state.firebaseUser.isAnonymous,
                deviceId: offlineSecurityService.getDeviceId(),
                hasOfflineKey: offlineSecurityService.isInitialized()
              });

              try {
                // Call the backend registration endpoint
                const idToken = await auth.currentUser?.getIdToken();
                if (!idToken) {
                  throw new Error('Failed to get Firebase ID token');
                }

                console.log('🔍 [NEW_USER] Making backend registration request...', {
                  endpoint: '/api/auth/register',
                  hasIdToken: !!idToken,
                  tokenLength: idToken?.length || 0,
                  username: state.firebaseUser.displayName || state.firebaseUser.email?.split('@')[0] || 'User'
                });

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/register`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({
                    username: state.firebaseUser.displayName || state.firebaseUser.email?.split('@')[0] || 'User'
                  })
                });

                console.log('🔍 [NEW_USER] Backend registration response:', {
                  status: response.status,
                  statusText: response.statusText,
                  ok: response.ok
                });

                if (response.ok) {
                  const responseData = await response.json();
                  console.log('🔄 [NEW_USER] ✅ Backend registration completed:', {
                    userId: responseData.user?.id,
                    username: responseData.user?.username,
                    credits: responseData.user?.credits
                  });

                  // Now initialize device registration
                  console.log('🔄 [NEW_USER] Initializing device registration...');
                  await get().initializeOfflineKey();
                  console.log('🔄 [NEW_USER] ✅ Device registration completed:', {
                    deviceId: offlineSecurityService.getDeviceId(),
                    hasOfflineKey: offlineSecurityService.isInitialized()
                  });

                } else if (response.status === 409) {
                  console.log('🔄 [NEW_USER] ℹ️ User already registered, initializing device...');
                  await get().initializeOfflineKey();
                  console.log('🔄 [NEW_USER] ✅ Device registration for existing user:', {
                    deviceId: offlineSecurityService.getDeviceId(),
                    hasOfflineKey: offlineSecurityService.isInitialized()
                  });
                } else {
                  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                  console.error('❌ [NEW_USER] Backend registration failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                  });
                  throw new Error(`Backend registration failed: ${errorData.message || response.statusText}`);
                }

              } catch (error: any) {
                console.warn('🔄 [NEW_USER] ⚠️ Backend registration failed, continuing offline:', error.message);
                // Still try device registration with local fallback
                try {
                  await get().initializeOfflineKey();
                } catch (deviceError) {
                  console.warn('🔄 [NEW_USER] ⚠️ Device registration also failed:', deviceError);
                }
              }
            }

            // Check if user already has starter pack by looking at actual collection
            const currentState = get();
            const hasAnyCards = currentState.offlineCollection &&
              Object.keys(currentState.offlineCollection.cards_owned).length > 0;

            console.log('🔍 Checking starter pack status:', {
              hasStarterPack: currentState.hasStarterPack,
              hasAnyCards,
              cardsCount: currentState.offlineCollection ? Object.keys(currentState.offlineCollection.cards_owned).length : 0
            });

            if (!hasAnyCards) {
              console.log('🎁 Opening starter pack for new user...');
              await get().openStarterPack();
              console.log('✅ Starter pack opened successfully');
            } else {
              console.log('ℹ️ User already has species, skipping starter pack');
            }

            // Give new user some initial credits
            const collection = get().offlineCollection;
            if (collection && collection.eco_credits < 100) {
              const updatedCollection = {
                ...collection,
                eco_credits: Math.max(collection.eco_credits, 150) // Ensure at least 150 credits
              };
              get().saveOfflineCollection(updatedCollection);
              console.log('💰 Initial credits granted');
            }

            console.log('✅ New user setup complete');

          } catch (error) {
            console.error('❌ New user setup failed:', error);
            throw error;
          }
        },

        // Open starter pack
        openStarterPack: async (): Promise<number[]> => {
          const state = get();

          // Check if collection exists
          if (!state.offlineCollection) {
            throw new Error('No collection initialized');
          }

          // Check if user already has any cards (indicating starter pack was opened)
          const hasAnyCards = Object.keys(state.offlineCollection.cards_owned).length > 0;
          if (hasAnyCards) {
            throw new Error('Starter pack already opened');
          }

          try {
            // Ensure signing key is initialized before creating actions
            if (!offlineSecurityService.isInitialized()) {
              console.log('🔑 Signing key not initialized, initializing now...');
              await get().initializeOfflineKey();
            }

            // Create starter pack action
            const action = offlineSecurityService.createAction('starter_pack_opened', {
              pack_type: 'starter'
            });

            // Add starter cards to collection
            const starterCards = starterPackService.createStarterCollection();
            const starterCardIds = Object.keys(starterCards).map(id => parseInt(id));

            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              cards_owned: {
                ...state.offlineCollection.cards_owned,
                ...starterCards
              },
              action_queue: [...state.offlineCollection.action_queue, action]
            };

            // Update collection hash
            updatedCollection.collection_hash = offlineSecurityService.calculateCollectionHash(updatedCollection);

            get().saveOfflineCollection(updatedCollection);
            set({ hasStarterPack: true });

            // Return CardIds directly (no more backward compatibility needed)
            return starterCardIds;

          } catch (error) {
            console.error('Failed to open starter pack:', error);
            throw error;
          }
        },

        // Add card to collection using CardId
        addCardToCollection: async (cardId: number, quantity: number, acquiredVia: string) => {
          const state = get();
          if (!state.offlineCollection) {
            throw new Error('No collection initialized');
          }

          try {
            // Validate CardId
            if (!cardId || cardId <= 0) {
              throw new Error(`Invalid CardId: ${cardId}`);
            }

            // Create card acquisition action
            const action = offlineSecurityService.createAction('card_acquired', {
              cardId,
              quantity
            });

            // Update collection
            const existingCard = state.offlineCollection.cards_owned[cardId];
            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              cards_owned: {
                ...state.offlineCollection.cards_owned,
                [cardId]: {
                  quantity: (existingCard?.quantity || 0) + quantity,
                  acquired_via: existingCard?.acquired_via || acquiredVia,
                  first_acquired: existingCard?.first_acquired || Date.now(),
                  last_acquired: Date.now()
                }
              },
              action_queue: [...state.offlineCollection.action_queue, action]
            };

            // Update collection hash
            updatedCollection.collection_hash = offlineSecurityService.calculateCollectionHash(updatedCollection);

            get().saveOfflineCollection(updatedCollection);

          } catch (error) {
            console.error('Failed to add card to collection:', error);
            throw error;
          }
        },

        // Open pack with proper rarity system
        openPack: async (packType: string): Promise<number[]> => {
          console.log('🎁 [HybridGameStore] openPack called with packType:', packType);
          const state = get();
          console.log('🎁 [HybridGameStore] Current state:', {
            isAuthenticated: state.isAuthenticated,
            isGuestMode: state.isGuestMode,
            hasOfflineCollection: !!state.offlineCollection,
            collectionSize: Object.keys(state.offlineCollection?.cards_owned || {}).length
          });
          console.log('🎁 [HybridGameStore] localStorage before pack opening:', {
            userCollection: localStorage.getItem('userCollection'),
            userPacks: localStorage.getItem('userPacks'),
            syncQueue: localStorage.getItem('syncQueue')
          });

          if (!state.offlineCollection) {
            throw new Error('No collection initialized');
          }

          // Ensure species data is loaded
          if (!state.speciesLoaded || !state.packSystem) {
            await get().loadSpeciesData();
          }

          const packSystem = get().packSystem;
          if (!packSystem) {
            throw new Error('Pack system not initialized');
          }

          // Pack costs and card counts
          const packConfigs = {
            basic: { cost: 50, cards: 3 },
            premium: { cost: 100, cards: 5 },
            legendary: { cost: 200, cards: 7 }
          };
          const config = packConfigs[packType as keyof typeof packConfigs] || packConfigs.basic;

          console.log(`🎁 Opening ${packType} pack - Cost: ${config.cost}, Current credits: ${state.offlineCollection.eco_credits}, Pending actions: ${state.offlineCollection.action_queue.length}`);

          // Check for recent duplicate pack opening actions (within 1.5 seconds)
          const recentPackActions = state.offlineCollection.action_queue.filter(
            action => action.action === 'pack_opened' &&
                     action.pack_type === packType &&
                     (Date.now() - action.timestamp) < 1500
          );

          if (recentPackActions.length > 0) {
            console.log('🚫 Duplicate pack opening detected, preventing duplicate action');
            throw new Error('Pack opening already in progress. Please wait.');
          }

          if (state.offlineCollection.eco_credits < config.cost) {
            throw new Error(`Insufficient credits. Need ${config.cost}, have ${state.offlineCollection.eco_credits}`);
          }

          try {
            // Ensure signing key is initialized before creating actions
            if (!offlineSecurityService.isInitialized()) {
              console.log('🔑 Signing key not initialized, initializing now...');
              await get().initializeOfflineKey();
            }

            // Create pack opening action
            const action = offlineSecurityService.createAction('pack_opened', {
              pack_type: packType
            });

            console.log(`📝 Created pack opening action:`, {
              action_id: action.id,
              pack_type: packType,
              timestamp: action.timestamp
            });

            // Open pack using proper rarity system with correct card count
            const pack = packSystem.generateBoosterPack(`${packType} pack`, config.cards);
            const packResult: PackOpeningResult = packSystem.generatePackStats(pack);
            const newNameIds: string[] = packResult.pack.cards.map(card => card.nameId);

            console.log(`🎁 Pack generated with ${pack.cards.length} cards:`, pack.cards.map(c => c.nameId));
            // Convert nameIds to CardIds and update collection
            const newCardIds: number[] = [];
            const updatedCards = { ...state.offlineCollection.cards_owned };

            newNameIds.forEach(nameId => {
              const cardId = nameIdToCardId(nameId);
              if (cardId !== null) {
                newCardIds.push(cardId);
                const existing = updatedCards[cardId];
                updatedCards[cardId] = {
                  quantity: (existing?.quantity || 0) + 1,
                  acquired_via: existing?.acquired_via || 'pack',
                  first_acquired: existing?.first_acquired || Date.now(),
                  last_acquired: Date.now()
                };
              } else {
                console.warn(`⚠️ Failed to convert nameId to cardId: ${nameId}`);
              }
            });

            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              cards_owned: updatedCards,
              eco_credits: state.offlineCollection.eco_credits - config.cost,
              action_queue: [...state.offlineCollection.action_queue, action]
            };

            // Update collection hash
            updatedCollection.collection_hash = offlineSecurityService.calculateCollectionHash(updatedCollection);

            get().saveOfflineCollection(updatedCollection);

            console.log('🎁 [HybridGameStore] Pack opening completed successfully');
            console.log('🎁 [HybridGameStore] New card IDs:', newCardIds);
            console.log('🎁 [HybridGameStore] Updated collection size:', Object.keys(updatedCollection.cards_owned).length);
            console.log('🎁 [HybridGameStore] Remaining credits:', updatedCollection.eco_credits);
            console.log('🎁 [HybridGameStore] Action queue size:', updatedCollection.action_queue.length);
            console.log('🎁 [HybridGameStore] localStorage after pack opening:', {
              userCollection: localStorage.getItem('userCollection'),
              userPacks: localStorage.getItem('userPacks'),
              syncQueue: localStorage.getItem('syncQueue')
            });

            return newCardIds;

          } catch (error) {
            console.error('Failed to open pack:', error);
            throw error;
          }
        },

        // Create deck
        createDeck: async (name: string, cards: { cardId: number; quantity: number }[]): Promise<string> => {
          const state = get();
          if (!state.offlineCollection) {
            throw new Error('No collection available');
          }

          // Check deck limit (maximum 5 decks)
          const currentDecks = state.offlineCollection.savedDecks || [];
          if (currentDecks.length >= 5) {
            throw new Error('Maximum of 5 decks allowed. Please delete a deck first.');
          }

          // Check for duplicate names
          if (currentDecks.some(deck => deck.name.toLowerCase() === name.toLowerCase())) {
            throw new Error('A deck with this name already exists.');
          }

          const deckId = `deck_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          const action = offlineSecurityService.createAction('deck_created', {
            deck_id: deckId,
            deck_data: { name, cards }
          });

          // Create the deck object
          const newDeck = {
            id: deckId,
            name,
            cards,
            created: Date.now(),
            lastModified: Date.now()
          };

          // Update collection with new deck as active deck
          const updatedCollection = {
            ...offlineSecurityService.addActionToQueue(state.offlineCollection, action),
            activeDeck: newDeck,
            savedDecks: [...currentDecks, newDeck]
          };

          get().saveOfflineCollection(updatedCollection);
          console.log('✅ Deck created and set as active:', newDeck);

          return deckId;
        },

        // Update deck
        updateDeck: async (deckId: string, name: string, cards: { cardId: number; quantity: number }[]): Promise<void> => {
          const action = offlineSecurityService.createAction('deck_updated', {
            deck_id: deckId,
            deck_data: { name, cards }
          });

          const state = get();
          if (state.offlineCollection) {
            // Update the deck in saved decks and active deck if it matches
            const updatedDeck = {
              id: deckId,
              name,
              cards,
              created: state.offlineCollection.activeDeck?.created || Date.now(),
              lastModified: Date.now()
            };

            const updatedSavedDecks = (state.offlineCollection.savedDecks || []).map(deck =>
              deck.id === deckId ? updatedDeck : deck
            );

            const updatedCollection = {
              ...offlineSecurityService.addActionToQueue(state.offlineCollection, action),
              activeDeck: state.offlineCollection.activeDeck?.id === deckId ? updatedDeck : state.offlineCollection.activeDeck,
              savedDecks: updatedSavedDecks
            };

            get().saveOfflineCollection(updatedCollection);
          }
        },

        // Delete deck
        deleteDeck: async (deckId: string): Promise<void> => {
          const state = get();
          if (!state.offlineCollection) {
            throw new Error('No collection available');
          }

          const action = offlineSecurityService.createAction('deck_deleted', {
            deck_id: deckId,
            deck_data: null
          });

          const currentDecks = state.offlineCollection.savedDecks || [];
          const updatedDecks = currentDecks.filter(deck => deck.id !== deckId);

          // If the deleted deck was active, clear active deck or set to first remaining deck
          let newActiveDeck = state.offlineCollection.activeDeck;
          if (newActiveDeck?.id === deckId) {
            newActiveDeck = updatedDecks.length > 0 ? updatedDecks[0] : undefined;
          }

          const updatedCollection = {
            ...offlineSecurityService.addActionToQueue(state.offlineCollection, action),
            activeDeck: newActiveDeck,
            savedDecks: updatedDecks
          };

          get().saveOfflineCollection(updatedCollection);
          console.log('✅ Deck deleted:', deckId);
        },

        // Set active deck
        setActiveDeck: (deckId: string) => {
          const state = get();
          if (state.offlineCollection) {
            const deck = state.offlineCollection.savedDecks?.find(d => d.id === deckId);
            if (deck) {
              const updatedCollection = {
                ...state.offlineCollection,
                activeDeck: deck
              };
              get().saveOfflineCollection(updatedCollection);
              console.log('✅ Active deck set:', deck);
            }
          }
        },

        // Load deck into deck builder (for editing)
        loadDeck: (deckId: string) => {
          const state = get();
          if (state.offlineCollection) {
            const deck = state.offlineCollection.savedDecks?.find(d => d.id === deckId);
            if (deck) {
              console.log('✅ Deck loaded for editing:', deck);
              return deck;
            }
          }
          return null;
        },

        // Sync with server - Enhanced with comprehensive edge case handling
        syncCollection: async (conflictResolutions?: Record<string, 'server_wins' | 'user_wins' | 'merge'>): Promise<SyncResult> => {
          const state = get();

          console.log('🔄 [SYNC] Starting sync with conflict resolutions:', {
            hasResolutions: !!conflictResolutions,
            resolutionCount: conflictResolutions ? Object.keys(conflictResolutions).length : 0,
            resolutions: conflictResolutions,
            timestamp: new Date().toISOString()
          });

          // Pre-sync validation
          if (!state.offlineCollection) {
            throw new Error('Cannot sync: no offline collection available');
          }

          if (!state.isOnline) {
            throw new Error('Cannot sync: device is offline');
          }

          if (!state.isAuthenticated) {
            throw new Error('Cannot sync: user not authenticated');
          }

          // Check if sync is already in progress
          if (state.syncStatus === 'syncing') {
            console.warn('⚠️ Sync already in progress, skipping duplicate request');
            throw new Error('Sync already in progress');
          }

          // Validate collection integrity before sync
          const validationResult = syncService.validateCollectionForSync(state.offlineCollection);
          if (!validationResult.isValid) {
            console.error('❌ Collection validation failed:', validationResult.errors);
            set({
              syncStatus: 'error',
              syncError: `Collection integrity check failed: ${validationResult.errors.join(', ')}`
            });
            throw new Error('Collection validation failed');
          }

          // Handle guest registration first if needed
          if (state.isGuestMode && state.needsRegistration) {
            console.log('🔄 Guest needs registration, performing lazy registration...');
            try {
              await get().registerGuestWithServer();
              console.log('✅ Guest registration completed during sync');
            } catch (error) {
              console.error('❌ Guest registration failed during sync:', error);
              set({
                syncStatus: 'error',
                syncError: 'Guest registration failed. Please try again or contact support.'
              });
              throw error;
            }
          }

          console.log('🔄 [SYNC] Starting sync process...', {
            userId: state.userId,
            isAuthenticated: state.isAuthenticated,
            isOnline: state.isOnline,
            pendingActions: state.pendingActions,
            hasCollection: !!state.offlineCollection,
            currentSyncStatus: state.syncStatus
          });

          set({ syncStatus: 'syncing', syncError: null });

          console.log('🔄 [SYNC] State updated to syncing, HTML should reflect this change');

          try {
            // Get authentication token with retry logic
            let authToken: string | null = null;
            let tokenRetries = 0;
            const maxTokenRetries = 3;

            console.log('🔑 [SYNC] Getting authentication token...', {
              isGuestMode: state.isGuestMode,
              hasGuestToken: !!state.guestToken,
              hasFirebaseUser: !!auth.currentUser,
              firebaseUserUid: auth.currentUser?.uid
            });

            while (!authToken && tokenRetries < maxTokenRetries) {
              try {
                if (state.isGuestMode) {
                  authToken = state.guestToken;
                  if (!authToken) {
                    console.error('❌ [SYNC] Guest token not available');
                    throw new Error('Guest token not available');
                  }
                  console.log('✅ [SYNC] Using guest token');
                } else {
                  const currentUser = auth.currentUser;
                  if (!currentUser) {
                    console.error('❌ [SYNC] Firebase user not available');
                    throw new Error('Firebase user not available');
                  }
                  console.log('🔑 [SYNC] Getting Firebase token (force refresh)...', {
                    uid: currentUser.uid,
                    email: currentUser.email
                  });
                  authToken = await currentUser.getIdToken(true); // Force refresh
                  console.log('✅ [SYNC] Firebase token obtained successfully');
                }
              } catch (tokenError) {
                tokenRetries++;
                console.warn(`⚠️ [SYNC] Token retrieval attempt ${tokenRetries} failed:`, tokenError);

                if (tokenRetries >= maxTokenRetries) {
                  console.error('❌ [SYNC] Failed to get authentication token after multiple attempts');
                  throw new Error(`Failed to get authentication token after ${maxTokenRetries} attempts`);
                }

                // Wait before retry
                console.log(`⏳ [SYNC] Waiting ${1000 * tokenRetries}ms before token retry...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * tokenRetries));
              }
            }

            if (!authToken) {
              console.error('❌ [SYNC] No authentication token available after retries');
              throw new Error('No authentication token available after retries');
            }

            console.log('✅ [SYNC] Authentication token ready, proceeding with sync...');

            // Perform sync with comprehensive error handling
            const result = await syncService.syncWithServer(
              state.offlineCollection,
              authToken,
              state.syncServiceState,
              conflictResolutions
            );

            if (result.success) {
              console.log('✅ [SYNC] Sync completed successfully, processing result...', {
                conflicts: result.conflicts?.length || 0,
                discardedActions: result.discarded_actions?.length || 0,
                hasUpdatedCollection: !!result.updated_collection,
                newCredits: result.updated_collection?.eco_credits,
                newXP: result.updated_collection?.xp_points
              });

              // Validate the updated collection before applying
              if (!result.updated_collection) {
                console.error('❌ [SYNC] No updated collection received from server');
                throw new Error('Sync succeeded but no updated collection received');
              }

              // Verify collection integrity after sync
              const postSyncValidation = syncService.validateCollectionForSync(result.updated_collection);
              if (!postSyncValidation.isValid) {
                console.error('❌ [SYNC] Post-sync collection validation failed:', postSyncValidation.errors);
                throw new Error('Received invalid collection from server');
              }

              console.log('✅ [SYNC] Collection validation passed, updating local data...');

              // Update the collection and ensure pending actions are cleared
              const updatedCollection = {
                ...result.updated_collection,
                action_queue: [], // Clear the action queue after successful sync
                last_sync: Date.now() // Update sync timestamp
              };

              // Save collection with error handling
              try {
                get().saveOfflineCollection(updatedCollection);
                console.log('✅ [SYNC] Collection saved locally successfully');
              } catch (saveError) {
                console.error('❌ [SYNC] Failed to save synced collection:', saveError);
                throw new Error('Failed to save synced data locally');
              }

              console.log('🔄 [SYNC] Updating state to success...');

              // Update state with success
              const newState = {
                syncStatus: 'success' as const,
                lastSyncTime: Date.now(),
                syncConflicts: result.conflicts || [],
                showSyncConflicts: (result.conflicts || []).length > 0,
                pendingActions: 0, // Explicitly set pending actions to 0
                syncServiceState: result.newSyncState, // Update sync service state
                syncError: null // Clear any previous errors
              };

              console.log('🔄 [SYNC] Setting new state:', newState);
              set(newState);

              console.log('✅ [SYNC] State updated to success, HTML should reflect this change');

              // Force refresh the collection state to ensure UI updates
              setTimeout(() => {
                try {
                  get().refreshCollectionState();
                } catch (refreshError) {
                  console.warn('⚠️ Failed to refresh collection state after sync:', refreshError);
                }
              }, 100);

              console.log('✅ Sync completed successfully:', {
                conflictsResolved: (result.conflicts || []).length,
                actionsProcessed: state.offlineCollection.action_queue.length,
                newCredits: updatedCollection.eco_credits,
                newXP: updatedCollection.xp_points
              });

            } else {
              // Handle sync failure with detailed error information
              const errorMessage = result.error || 'Sync failed for unknown reason';
              console.error('❌ [SYNC] Sync failed:', {
                error: errorMessage,
                conflicts: result.conflicts?.length || 0,
                hasCollection: !!result.updated_collection,
                syncServiceState: result.newSyncState
              });

              console.log('🔄 [SYNC] Setting state to error...');

              const errorState = {
                syncStatus: 'error' as const,
                syncError: errorMessage,
                syncServiceState: result.newSyncState, // Update sync service state even on error
                syncConflicts: result.conflicts || [],
                showSyncConflicts: (result.conflicts || []).length > 0
              };

              console.log('🔄 [SYNC] Setting error state:', errorState);
              set(errorState);

              console.log('❌ [SYNC] State updated to error, HTML should reflect this change');
            }

            return result;

          } catch (error) {
            // Comprehensive error handling and recovery
            const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
            console.error('❌ [SYNC] Sync failed with exception:', {
              error: errorMessage,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
              stack: error instanceof Error ? error.stack : undefined
            });

            // Categorize error types for better user experience
            let userFriendlyMessage = errorMessage;
            let shouldRetry = false;

            if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
              userFriendlyMessage = 'Network error. Please check your connection and try again.';
              shouldRetry = true;
            } else if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
              userFriendlyMessage = 'Authentication expired. Please sign in again.';
              shouldRetry = false;

              // Clear authentication state for token errors
              if (state.isGuestMode) {
                console.log('🔄 Guest token expired, clearing guest state');
                set({
                  guestToken: null,
                  needsRegistration: true
                });
              }
            } else if (errorMessage.includes('validation') || errorMessage.includes('integrity')) {
              userFriendlyMessage = 'Data validation failed. Your local data may be corrupted.';
              shouldRetry = false;
            } else if (errorMessage.includes('already in progress')) {
              userFriendlyMessage = 'Sync is already running. Please wait for it to complete.';
              shouldRetry = false;
            } else if (errorMessage.includes('offline')) {
              userFriendlyMessage = 'Device is offline. Sync will resume when connection is restored.';
              shouldRetry = true;
            }

            // Update state with error information
            // Don't block the UI for sync conflicts - they're normal
            const syncErrorMessage = error instanceof Error ? error.message : String(error);
            const isConflictError = syncErrorMessage.includes('409') || syncErrorMessage.includes('conflict');

            set({
              syncStatus: isConflictError ? 'idle' : 'error',
              syncError: isConflictError ? null : userFriendlyMessage,
              // Preserve sync service state if available
              syncServiceState: state.syncServiceState ? {
                isSyncing: false,
                lastSyncAttempt: Date.now()
              } : state.syncServiceState
            });

            // Log error details for debugging
            console.error('🔍 Sync error details:', {
              originalError: errorMessage,
              userMessage: userFriendlyMessage,
              shouldRetry,
              isGuestMode: state.isGuestMode,
              hasCollection: !!state.offlineCollection,
              pendingActions: state.offlineCollection?.action_queue?.length || 0,
              isOnline: state.isOnline,
              isAuthenticated: state.isAuthenticated
            });

            // Schedule automatic retry for network errors if appropriate
            if (shouldRetry && state.isOnline && state.isAuthenticated) {
              console.log('🔄 Scheduling automatic sync retry in 30 seconds...');
              setTimeout(() => {
                const currentState = get();
                if (currentState.isOnline && currentState.isAuthenticated && currentState.syncStatus === 'error') {
                  console.log('🔄 Attempting automatic sync retry...');
                  currentState.syncCollection().catch(retryError => {
                    console.warn('⚠️ Automatic sync retry failed:', retryError);
                  });
                }
              }, 30000); // 30 second delay
            }

            throw error;
          }
        },

        // Set online status
        setOnlineStatus: (online: boolean) => {
          set({ isOnline: online });
          
          // Auto-sync when coming online
          if (online && get().isAuthenticated && get().pendingActions > 0) {
            setTimeout(() => {
              get().syncCollection().catch(console.error);
            }, 1000);
          }
        },

        // Set authentication status
        setAuthenticationStatus: (authenticated: boolean, userId?: string) => {
          set({ isAuthenticated: authenticated, userId: userId || null });
          
          // Update collection user ID
          const state = get();
          if (state.offlineCollection && userId) {
            const updatedCollection = {
              ...state.offlineCollection,
              user_id: userId
            };
            get().saveOfflineCollection(updatedCollection);
          }
        },

        // Resolve sync conflicts
        resolveSyncConflicts: (conflicts: any[]) => {
          // Implementation for manual conflict resolution
          set({ syncConflicts: conflicts });
        },

        // Dismiss sync conflicts
        dismissSyncConflicts: () => {
          set({ showSyncConflicts: false, syncConflicts: [] });
        },

        // Recover active game from storage
        recoverActiveGame: async () => {
          try {
            console.log('🔄 [Store] Checking for saved game state...');

            const savedGame = await gameStateManager.loadActiveGame();
            if (savedGame) {
              console.log('📂 [Store] Found saved game:', {
                gameId: savedGame.gameState.gameId,
                gameMode: savedGame.gameMode,
                turnNumber: savedGame.gameState.turnNumber
              });

              // Get metadata for UI
              const metadata = await gameStateManager.getActiveGameMetadata();

              // Set the paused game state
              set({
                hasPausedGame: true,
                pausedGameMetadata: metadata,
                battle: {
                  ...get().battle,
                  gameMode: savedGame.gameMode,
                  tcgGameState: savedGame.gameMode === 'TCG' ? savedGame.gameState : null,
                  phyloGameState: savedGame.gameMode === 'Phylo' ? savedGame.gameState as any : null
                }
              });

              console.log('✅ [Store] Game state recovered and ready for resume prompt');
            } else {
              console.log('📂 [Store] No saved game state found');
              set({ hasPausedGame: false, pausedGameMetadata: null });
            }
          } catch (error) {
            console.error('❌ [Store] Failed to recover active game:', error);
            set({ hasPausedGame: false, pausedGameMetadata: null });
          }
        },

        // Resume paused game
        resumePausedGame: () => {
          const state = get();
          const pausedMetadata = state.pausedGameMetadata;

          if (pausedMetadata && state.hasPausedGame) {
            console.log('🎮 [Store] Resuming paused game:', pausedMetadata.gameId);

            // The actual game state should be loaded by the battle screen
            // Here we just clear the pause state and set the game mode
            set({
              hasPausedGame: false,
              pausedGameMetadata: null,
              battle: {
                ...state.battle,
                gameMode: pausedMetadata.gameMode,
                isLoading: true // Battle screen will load the actual state
              }
            });
          }
        },

        // User Profile Management
        updateUserProfile: (profileUpdate) => {
          const currentProfile = get().userProfile;
          if (!currentProfile) return;
          set({
            userProfile: {
              ...currentProfile,
              ...profileUpdate
            }
          });
        },

        generateGuestUsername: () => {
          const guestId = get().guestId;
          if (!guestId) return 'Guest User';
          const shortId = guestId.slice(-6).toUpperCase();
          return `Guest-${shortId}`;
        },

        clearUserProfile: () => {
          set({ userProfile: null });
        },

        // Force refresh collection state from storage
        refreshCollectionState: () => {
          const state = get();
          const userId = state.userId || state.guestId;
          console.log('🔄 Refreshing collection state for user:', userId);

          const stored = offlineSecurityService.loadOfflineCollection(userId);
          if (stored) {
            const hasCards = Object.keys(stored.cards_owned).length > 0;
            set({
              offlineCollection: stored,
              hasStarterPack: hasCards,
              pendingActions: stored.action_queue.length
            });
            console.log('🔄 Collection state refreshed:', {
              user_id: stored.user_id,
              cards_count: Object.keys(stored.cards_owned).length,
              credits: stored.eco_credits,
              pending_actions: stored.action_queue.length
            });
          } else {
            console.log('🔄 No collection found during refresh');
            // Try fallback loading
            get().loadOfflineCollection().catch(console.error);
          }
        },

        // Active battle management
        setActiveBattle: (battle) => {
          console.log('🎮 Setting active battle:', battle);
          set({ activeBattle: battle });
        },

        clearActiveBattle: () => {
          console.log('🚪 Clearing active battle');
          set({
            activeBattle: {
              sessionId: null,
              gameMode: null,
              levelId: null,
              isActive: false
            }
          });
        },

        // Battle Actions Implementation
        // TCG Actions
        startTCGGame: async (gameId: string, players: any[], settings?: any) => {
          set((state) => ({
            battle: {
              ...state.battle,
              isLoading: true,
              error: null,
              gameMode: 'TCG'
            }
          }));

          try {
            const currentState = get().battle;
            const result = await unifiedGameService.createGame({
              gameId,
              players,
              mode: GameMode.TCG,
              settings,
              isOnline: currentState.isOnline
            });

            if (result.isValid && result.newState) {
              set((state) => ({
                battle: {
                  ...state.battle,
                  tcgGameState: result.newState as unknown as TCGGameState,
                  isLoading: false,
                  error: null
                }
              }));
            } else {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: false,
                  error: result.errorMessage || 'Failed to start TCG game'
                }
              }));
            }
          } catch (error: any) {
            set((state) => ({
              battle: {
                ...state.battle,
                isLoading: false,
                error: error.message || 'Failed to start TCG game'
              }
            }));
          }
        },

        playCard: async (cardId: string, position: Position) => {
          const state = get();

          // Don't set loading state for card play - it should be immediate
          set((state) => ({
            battle: {
              ...state.battle,
              error: null
            }
          }));

          try {
            const currentState = state.battle;
            const result = await unifiedGameService.executeAction({
              action: {
                type: 'PLAY_CARD' as any,
                playerId: 'human', // Use the hardcoded player ID from game creation
                payload: { cardId, position }
              },
              currentState,
              isOnline: currentState.isOnline
            });

            if (result.isValid && result.newState) {
              set((state) => ({
                battle: {
                  ...state.battle,
                  tcgGameState: result.newState as unknown as TCGGameState,
                  error: null,
                  uiState: {
                    ...state.battle.uiState,
                    selectedHandCardId: null,
                    highlightedPositions: []
                  }
                }
              }));
            } else {
              set((state) => ({
                battle: {
                  ...state.battle,
                  error: result.errorMessage || 'Failed to play card'
                }
              }));
            }
          } catch (error: any) {
            set((state) => ({
              battle: {
                ...state.battle,
                error: error.message || 'Failed to play card'
              }
            }));
          }
        },

        passTurn: async () => {
          const state = get();

          set((state) => ({
            battle: {
              ...state.battle,
              isLoading: true,
              error: null
            }
          }));

          try {
            const currentState = state.battle;
            const result = await unifiedGameService.executeAction({
              action: {
                type: 'PASS_TURN' as any,
                playerId: state.userId || state.guestId || 'player1',
                payload: {}
              },
              currentState,
              isOnline: currentState.isOnline
            });

            if (result.isValid && result.newState) {
              set((state) => ({
                battle: {
                  ...state.battle,
                  tcgGameState: result.newState as unknown as TCGGameState,
                  isLoading: false,
                  error: null
                }
              }));
            } else {
              set((state) => ({
                battle: {
                  ...state.battle,
                  isLoading: false,
                  error: result.errorMessage || 'Failed to pass turn'
                }
              }));
            }
          } catch (error: any) {
            set((state) => ({
              battle: {
                ...state.battle,
                isLoading: false,
                error: error.message || 'Failed to pass turn'
              }
            }));
          }
        },

        // Test helper method for setting authenticated user state
        setAuthenticatedUser: (userData: {
          userId: string;
          firebaseUser: any;
          userProfile: any;
        }) => {
          console.log(`🧪 Setting authenticated user for testing: ${userData.userId}`);
          set({
            isAuthenticated: true,
            userId: userData.userId,
            firebaseUser: userData.firebaseUser,
            userProfile: userData.userProfile,
            isGuestMode: false,
            guestId: null,
            guestSecret: null,
            guestToken: null,
            needsRegistration: false
          });
        },

        // ============================================================================
        // ONLINE MULTIPLAYER ACTIONS IMPLEMENTATION
        // ============================================================================

        // WebSocket Connection Management
        initializeWebSocket: () => {
          const state = get();

          if (!state.isAuthenticated || !state.isOnline) {
            console.warn('⚠️ Cannot initialize WebSocket: not authenticated or offline');
            return;
          }

          console.log('🔌 Initializing WebSocket connection...');
          const gameSocket = getGameSocket();

          // Connect to WebSocket
          gameSocket.connect();

          // Set up event listeners for match events
          const handleMatchFound = (data: any) => {
            console.log('🎯 Match found via WebSocket:', data);

            // Stop searching state
            set((state) => ({
              online: {
                ...state.online,
                matchmaking: {
                  ...state.online.matchmaking,
                  isSearching: false
                }
              }
            }));

            // Trigger match found event (handled by UI components)
          };

          const handleMatchAccepted = (data: any) => {
            console.log('✅ Match accepted via WebSocket:', data);

            // Update active battle state
            set(() => ({
              activeBattle: {
                sessionId: data.sessionId,
                gameMode: 'online',
                levelId: null,
                isActive: true
              }
            }));
          };

          // Add event listeners
          gameSocket.on('match_found', handleMatchFound);
          gameSocket.on('match_accepted', handleMatchAccepted);

          console.log('✅ WebSocket connection initialized');
        },

        disconnectWebSocket: () => {
          console.log('🔌 Disconnecting WebSocket...');
          const gameSocket = getGameSocket();
          gameSocket.disconnect();
        },

        // Matchmaking Actions
        findMatch: async (gameMode: string, preferences?: any) => {
          const state = get();

          if (!state.isAuthenticated) {
            console.error('❌ Cannot find match: user not authenticated');
            return;
          }

          if (state.online.matchmaking.isSearching) {
            console.warn('⚠️ Already searching for match');
            return;
          }

          console.log(`🔍 Starting matchmaking for ${gameMode}`);

          // Initialize WebSocket if not already connected
          get().initializeWebSocket();

          set((state) => ({
            online: {
              ...state.online,
              matchmaking: {
                ...state.online.matchmaking,
                isSearching: true,
                gameMode,
                preferences: preferences || {},
                lastSearchAttempt: Date.now(),
                queueTime: 0
              }
            }
          }));

          try {
            // Use WebSocket-based matchmaking
            const gameSocket = getGameSocket();
            gameSocket.joinMatchmaking(gameMode, preferences);

            console.log('✅ Matchmaking request sent via WebSocket');
          } catch (error: any) {
            console.error('❌ Matchmaking error:', error);
            set((state) => ({
              online: {
                ...state.online,
                matchmaking: {
                  ...state.online.matchmaking,
                  isSearching: false
                }
              }
            }));
          }
        },

        cancelMatchmaking: async () => {
          const state = get();

          if (!state.online.matchmaking.isSearching) {
            console.warn('⚠️ Not currently searching for match');
            return;
          }

          console.log('🚫 Cancelling matchmaking');

          try {
            // Use WebSocket to cancel matchmaking
            const gameSocket = getGameSocket();
            gameSocket.cancelMatchmaking();

            set((state) => ({
              online: {
                ...state.online,
                matchmaking: {
                  ...state.online.matchmaking,
                  isSearching: false,
                  gameMode: null,
                  queueTime: 0
                }
              }
            }));

            console.log('✅ Matchmaking cancelled via WebSocket');
          } catch (error: any) {
            console.error('❌ Failed to cancel matchmaking:', error);
          }
        },

        acceptMatch: async (sessionId: string) => {
          console.log(`✅ Accepting match: ${sessionId}`);

          try {
            // Use WebSocket to accept match
            const gameSocket = getGameSocket();
            gameSocket.acceptMatch(sessionId);

            // Update active battle state using existing pattern
            set((state) => ({
              activeBattle: {
                sessionId,
                gameMode: 'online',
                levelId: null,
                isActive: true
              },
              online: {
                ...state.online,
                matchmaking: {
                  ...state.online.matchmaking,
                  isSearching: false,
                  gameMode: null
                }
              }
            }));

            console.log('✅ Match accepted via WebSocket');
          } catch (error: any) {
            console.error('❌ Failed to accept match:', error);
          }
        },

        // Rating Actions
        updateRating: async (ratingUpdate: RatingUpdate) => {
          console.log(`📈 Updating rating:`, ratingUpdate);

          try {
            const result = await unifiedGameService.updatePlayerRating(ratingUpdate);

            if (result.isValid) {
              set((state) => ({
                online: {
                  ...state.online,
                  rating: {
                    ...state.online.rating,
                    current: ratingUpdate.newRating,
                    peak: Math.max(state.online.rating.peak, ratingUpdate.newRating),
                    gamesPlayed: state.online.rating.gamesPlayed + 1,
                    gamesWon: ratingUpdate.ratingChange > 0 ? state.online.rating.gamesWon + 1 : state.online.rating.gamesWon,
                    winStreak: ratingUpdate.ratingChange > 0 ? state.online.rating.winStreak + 1 : 0
                  }
                }
              }));

              // Update win rate
              const state = get();
              const winRate = state.online.rating.gamesPlayed > 0
                ? (state.online.rating.gamesWon / state.online.rating.gamesPlayed) * 100
                : 0;

              set((state) => ({
                online: {
                  ...state.online,
                  rating: {
                    ...state.online.rating,
                    winRate: Math.round(winRate * 100) / 100
                  }
                }
              }));

              console.log('✅ Rating updated successfully');
            }
          } catch (error: any) {
            console.error('❌ Failed to update rating:', error);
          }
        },

        refreshRating: async () => {
          const state = get();

          if (!state.isAuthenticated || !state.userId) {
            console.warn('⚠️ Cannot refresh rating: user not authenticated');
            return;
          }

          try {
            // Get current user rating from server
            const ratings = await unifiedGameService.getPlayerRatings([{ id: state.userId, name: state.userProfile?.username || 'Player' }]);
            const userRating = ratings[state.userId] || 1000;

            set((state) => ({
              online: {
                ...state.online,
                rating: {
                  ...state.online.rating,
                  current: userRating
                }
              }
            }));

            console.log('✅ Rating refreshed:', userRating);
          } catch (error: any) {
            console.error('❌ Failed to refresh rating:', error);
          }
        },

        // Quest Actions
        updateQuestProgress: async (questType: string, progress: any) => {
          console.log(`📋 Updating quest progress: ${questType}`, progress);

          const state = get();
          const currentQuest = state.online.quests.dailyQuests[questType];

          if (!currentQuest) {
            console.warn(`⚠️ Quest not found: ${questType}`);
            return;
          }

          // Update local progress
          const updatedProgress = { ...currentQuest.progress, ...progress };
          const isCompleted = checkQuestCompletion(updatedProgress, currentQuest.target);

          set((state) => ({
            online: {
              ...state.online,
              quests: {
                ...state.online.quests,
                dailyQuests: {
                  ...state.online.quests.dailyQuests,
                  [questType]: {
                    ...currentQuest,
                    progress: updatedProgress,
                    isCompleted
                  }
                }
              }
            }
          }));

          // Send to server
          try {
            if (state.isOnline && state.isAuthenticated) {
              await gameApi.updateQuestProgress({
                questType,
                progress: updatedProgress
              });
            }
          } catch (error: any) {
            console.error('❌ Failed to update quest progress on server:', error);
          }
        },

        // Automatic quest progress tracking
        trackGameCompletion: async (gameResult: { winner: string | null; gameMode: string; playerId: string }) => {
          console.log(`🎮 Tracking game completion for quest progress:`, gameResult);

          const state = get();
          if (!state.isAuthenticated || !state.isOnline) {
            console.log('⚠️ Not tracking quest progress - user not authenticated or offline');
            return;
          }

          // Track "play games" quest
          const playGamesQuest = state.online.quests.dailyQuests['play_games'];
          if (playGamesQuest && !playGamesQuest.isCompleted) {
            const currentCount = playGamesQuest.progress?.count || 0;
            await get().updateQuestProgress('play_games', { count: currentCount + 1 });
            console.log(`📋 Updated play_games quest: ${currentCount + 1}/${playGamesQuest.target?.count || 3}`);
          }

          // Track "win matches" quest if player won
          if (gameResult.winner === gameResult.playerId) {
            const winMatchesQuest = state.online.quests.dailyQuests['win_matches'];
            if (winMatchesQuest && !winMatchesQuest.isCompleted) {
              const currentCount = winMatchesQuest.progress?.count || 0;
              await get().updateQuestProgress('win_matches', { count: currentCount + 1 });
              console.log(`📋 Updated win_matches quest: ${currentCount + 1}/${winMatchesQuest.target?.count || 2}`);
            }
          }
        },

        claimQuestReward: async (questType: string) => {
          const state = get();
          const quest = state.online.quests.dailyQuests[questType];

          if (!quest || !quest.isCompleted || quest.isClaimed) {
            console.warn(`⚠️ Cannot claim quest reward: ${questType}`);
            return;
          }

          console.log(`🎁 Claiming quest reward: ${questType}`);

          try {
            // Mark as claimed locally
            set((state) => ({
              online: {
                ...state.online,
                quests: {
                  ...state.online.quests,
                  dailyQuests: {
                    ...state.online.quests.dailyQuests,
                    [questType]: {
                      ...quest,
                      isClaimed: true
                    }
                  },
                  totalQuestsCompleted: state.online.quests.totalQuestsCompleted + 1
                }
              }
            }));

            // Apply rewards (eco_credits, xp_points, etc.)
            if (quest.rewards.eco_credits) {
              // This would integrate with existing collection system
              console.log(`💰 Awarded ${quest.rewards.eco_credits} eco credits`);
            }

            if (quest.rewards.xp_points) {
              console.log(`⭐ Awarded ${quest.rewards.xp_points} XP`);
            }

            // TODO: Create reward claim action for sync
            // Reward sync will be implemented when server endpoints are ready
            if (state.isOnline && state.isAuthenticated) {
              console.log('🎁 Quest reward claimed (sync pending server implementation)');
            }

            console.log('✅ Quest reward claimed successfully');
          } catch (error: any) {
            console.error('❌ Failed to claim quest reward:', error);
          }
        },

        // Daily Quest and Leaderboard Actions
        refreshDailyQuests: async () => {
          const state = get();

          if (!state.isAuthenticated) {
            console.warn('⚠️ Cannot refresh quests: user not authenticated');
            return;
          }

          console.log('🔄 Refreshing daily quests');

          try {
            // This would call the quest API when implemented
            // For now, create sample daily quests
            const sampleQuests = {
              'play_games': {
                progress: { count: 0 },
                target: { count: 3 },
                isCompleted: false,
                isClaimed: false,
                rewards: { eco_credits: 50, xp_points: 25 }
              },
              'win_matches': {
                progress: { count: 0 },
                target: { count: 2 },
                isCompleted: false,
                isClaimed: false,
                rewards: { eco_credits: 100, xp_points: 50 }
              }
            };

            set((state) => ({
              online: {
                ...state.online,
                quests: {
                  ...state.online.quests,
                  dailyQuests: sampleQuests
                }
              }
            }));

            console.log('✅ Daily quests refreshed');
          } catch (error: any) {
            console.error('❌ Failed to refresh daily quests:', error);
          }
        },

        refreshLeaderboard: async (gameMode: string) => {
          console.log(`🏆 Refreshing leaderboard for ${gameMode}`);

          try {
            const result = await unifiedGameService.getLeaderboard(gameMode, 100);

            if (result.isValid && result.newState) {
              set((state) => ({
                online: {
                  ...state.online,
                  leaderboard: {
                    data: result.newState,
                    lastUpdated: Date.now(),
                    gameMode
                  }
                }
              }));

              console.log('✅ Leaderboard refreshed');
            }
          } catch (error: any) {
            console.error('❌ Failed to refresh leaderboard:', error);
          }
        }
      }),
      {
        name: 'biomasters-hybrid-game-store',
        storage: createJSONStorage(() =>
          createUserScopedIndexedDBStorage({
            getUserId: getCurrentUserId
          })
        ),
        onRehydrateStorage: () => (state) => {
          console.log('🔄 Store hydration completed');
          if (state) {
            state.isHydrated = true;
          }
        },
        partialize: (state) => ({
          // Only persist offline state, not UI state
          hasStarterPack: state.hasStarterPack,
          isFirstLaunch: state.isFirstLaunch,
          lastSyncTime: state.lastSyncTime,
          userId: state.userId,
          isAuthenticated: state.isAuthenticated,
          // Persist guest authentication state
          isGuestMode: state.isGuestMode,
          guestId: state.guestId,
          guestSecret: state.guestSecret,
          guestToken: state.guestToken,
          needsRegistration: state.needsRegistration,
          // Persist user profile information
          userProfile: state.userProfile,
          // Persist collection state indicators to help with recovery
          pendingActions: state.pendingActions,
          syncStatus: state.syncStatus,
          syncError: state.syncError
        })
      }
    )
  )
);

// Set store reference for user ID access
storeRef = useHybridGameStore;

// Auto-sync when online status changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useHybridGameStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useHybridGameStore.getState().setOnlineStatus(false);
  });
}

export default useHybridGameStore;