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
import { initializeCardMapping } from '@shared/utils/cardIdHelpers';

import { BoosterPackSystem, PackOpeningResult } from '../utils/boosterPackSystem';
import { Card, transformCardDataToCard } from '../types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { tokenManager } from '../services/tokenStorage';
import { createUserScopedIndexedDBStorage, clearUserData } from '../utils/userScopedStorage';
import { guestApi } from '../services/apiClient';
import { unifiedGameService } from '../services/UnifiedGameService';
import { GameMode } from '@shared/game-engine/IGameEngine';
import { staticDataManager } from '../services/StaticDataManager';
import { gameStateManager } from '../services/GameStateManager';
import { PhyloGameState as SharedPhyloGameState, CardData } from '@shared/types';
import type { ClientGameState } from '../types/ClientGameTypes';
import { nameIdToCardId } from '@shared/utils/cardIdHelpers';

// Import unified user types
import type {
  AuthenticatedUser
} from '@shared/types';
import { SyncStatus, UserType } from '@shared/enums';

// Global reference to store for user ID access
let storeRef: any = null;

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

  // UI-specific state (separated from game logic)
  uiState: {
    selectedHandCardId: string | null;
    selectedBoardCardId: string | null;
    highlightedPositions: Position[];
    showValidMoves: boolean;
    isCardDragging: boolean;
  };

  // Battle Actions
  actions: {
    // TCG Actions
    startTCGGame: (gameId: string, players: any[], settings?: any) => Promise<void>;
    playCard: (cardId: string, position: Position) => Promise<void>;
    dropAndDrawThree: (cardIdToDiscard: string) => Promise<void>;
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

    // Mode Switching
    switchToTCGMode: () => void;
    switchToPhyloMode: () => void;
    goOnline: () => Promise<void>;
    goOffline: () => void;
  };
}

export interface HybridGameState {
  // Battle State Slice
  battle: BattleSlice;

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

  // Actions
  initializeOfflineCollection: () => void;
  loadOfflineCollection: () => void;
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
  syncCollection: () => Promise<SyncResult>;
  setOnlineStatus: (online: boolean) => void;
  setAuthenticationStatus: (authenticated: boolean, userId?: string) => void;
  
  // Conflict Resolution
  resolveSyncConflicts: (conflicts: any[]) => void;
  dismissSyncConflicts: () => void;

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
          uiState: {
            selectedHandCardId: null,
            selectedBoardCardId: null,
            highlightedPositions: [],
            showValidMoves: false,
            isCardDragging: false,
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
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      tcgGameState: result.newState as unknown as TCGGameState,
                      error: null,
                      uiState: {
                        ...state.battle.uiState,
                        highlightedPositions: []
                      }
                    }
                  }));
                } else {
                  set((state) => ({
                    battle: {
                      ...state.battle,
                      error: result.errorMessage || 'Failed to drop and draw'
                    }
                  }));
                }
              } catch (error: any) {
                set((state) => ({
                  battle: {
                    ...state.battle,
                    error: error.message || 'Failed to drop and draw'
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

            handleAITurn: async (payload: { currentState: any }) => {
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
                    isCardDragging: false
                  }
                }
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

        // Stateless sync service state
        syncServiceState: {
          isSyncing: false,
          lastSyncAttempt: 0
        },

        // Initialize offline collection
        initializeOfflineCollection: async () => {
          const state = get();
          if (!state.offlineCollection) {
            const newCollection = offlineSecurityService.createInitialCollection(state.userId);
            set({
              offlineCollection: newCollection,
              isFirstLaunch: false
            });
            offlineSecurityService.saveOfflineCollection(newCollection);
          }

          // Also load species data if not already loaded
          if (!state.speciesLoaded) {
            await get().loadSpeciesData();
          }

          // Initialize Firebase auth if not already done
          if (!state.firebaseUser) {
            get().initializeAuth().catch(console.error);
          }
        },

        // Load offline collection from storage
        loadOfflineCollection: () => {
          const state = get();
          const userId = state.userId || state.guestId;
          const stored = offlineSecurityService.loadOfflineCollection(userId);
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
              offlineSecurityService.saveOfflineCollection(migratedCollection);
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
              has_starter_pack: hasCards
            });
          } else {
            console.log('📦 No stored collection found, initializing...');
            get().initializeOfflineCollection();
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

            // Use StaticDataManager for data loading with background updates
            const result = await staticDataManager.getDataFile('cards.json');
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

          // First, try to recover authentication state from persisted data
          await get().recoverAuthenticationState();

          // Firebase onAuthStateChanged now fires immediately if user was persisted
          // Thanks to browserLocalPersistence, this handles Scenarios 1 & 2 automatically
          onAuthStateChanged(auth, async (user) => {
            console.log('🔥 Auth state changed:', user ? `User: ${user.uid}` : 'No user');

            const previousUser = get().firebaseUser;
            const currentState = get();

            if (user) {
              // Firebase user is signed in (new or restored from persistence)
              console.log('✅ Firebase user authenticated:', user.uid);

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

              // Clear any guest credentials since we have a Firebase user
              await tokenManager.clearGuestCredentials();

              // Handle user authentication (new or returning)
              if (!previousUser) {
                console.log('👤 Firebase user authenticated - setting up...');
                try {
                  // Always initialize signing key for any authenticated user
                  await get().initializeOfflineKey();

                  // Setup new user if needed
                  await get().handleNewUser();
                } catch (error) {
                  console.error('❌ Failed to setup authenticated user:', error);
                }
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
              // No Firebase user - check for guest authentication
              console.log('🔍 No Firebase user, checking for guest authentication...');

              if (!currentState.isGuestMode) {
                // Try to recover guest authentication from secure storage
                const guestCredentials = await tokenManager.getGuestCredentials();

                if (guestCredentials) {
                  console.log('🔄 Found guest credentials, attempting to restore guest session...');
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

          // Store guest ID immediately (secret will be stored after server registration)
          await tokenManager.storeGuestCredentials({
            guestId,
            guestSecret: '', // Placeholder until server registration
            guestToken: undefined
          });

          // Initialize offline collection immediately
          await get().initializeOfflineCollection();

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
            hasOfflineCollection: !!state.offlineCollection
          });

          // If already authenticated, no need to recover
          if (state.isAuthenticated) {
            console.log('✅ Already authenticated, no recovery needed');
            return;
          }

          // Try to recover guest credentials from secure storage
          console.log('🔍 Checking secure storage for guest credentials...');
          const storedCredentials = await tokenManager.getGuestCredentials();

          if (storedCredentials) {
            console.log('🔄 Found guest credentials in secure storage, restoring session...');
            console.log('🔍 Stored credentials:', {
              hasGuestId: !!storedCredentials.guestId,
              hasGuestSecret: !!storedCredentials.guestSecret,
              hasGuestToken: !!storedCredentials.guestToken
            });

            // Update state with stored credentials
            set({
              guestId: storedCredentials.guestId,
              guestSecret: storedCredentials.guestSecret,
              guestToken: storedCredentials.guestToken || null
            });

            // Load the user's offline collection
            const userCollection = offlineSecurityService.loadOfflineCollection(storedCredentials.guestId);
            if (userCollection) {
              console.log('📦 Loaded user collection from storage');
              set({ offlineCollection: userCollection });
            }

            // Restore authentication state
            const guestUsername = `Guest-${storedCredentials.guestId.slice(-6).toUpperCase()}`;
            set({
              isAuthenticated: true,
              isGuestMode: true,
              userId: storedCredentials.guestId,
              needsRegistration: !storedCredentials.guestSecret, // Need registration if no secret
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

            console.log('✅ Guest authentication state recovered successfully');
            return;
          }


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
            console.log('🔑 Initializing offline signing key...');
            const deviceId = offlineSecurityService.getDeviceId();

            // Try to get signing key from server first (skip for guest mode)
            if (!state.isGuestMode) {
              try {
                // Get Firebase ID token for server authentication
                const idToken = await auth.currentUser?.getIdToken();
                if (!idToken) {
                  throw new Error('Failed to get authentication token');
                }

                // Call the server to register device and get signing key
                console.log('🔑 Requesting offline signing key from server...');
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/offline-key`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({ device_id: deviceId })
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(`Failed to get offline key: ${errorData.message || response.statusText}`);
                }

                const { signing_key } = await response.json();
                await offlineSecurityService.initializeSigningKey(state.userId!, signing_key);
                console.log('🔑 Offline signing key initialized from server');

              } catch (serverError) {
                console.warn('⚠️ Server unavailable, using local fallback key:', serverError);

                // Use the built-in fallback mechanism (no session key = derive from user ID)
                await offlineSecurityService.initializeSigningKey(state.userId!);
                console.log('🔑 Local fallback signing key initialized');
              }
            } else {
              // Guest mode - always use local key
              console.log('🔑 Guest mode - using local signing key');
              await offlineSecurityService.initializeSigningKey(state.userId!);
              console.log('🔑 Guest local signing key initialized');
            }

          } catch (error) {
            console.error('❌ Failed to initialize offline key:', error);
            throw error;
          }
        },

        // Handle new user setup
        handleNewUser: async () => {
          const state = get();

          try {
            console.log('🆕 Setting up new user...');

            // Initialize collection if needed
            if (!state.offlineCollection) {
              await get().initializeOfflineCollection();
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
        syncCollection: async (): Promise<SyncResult> => {
          const state = get();

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

          set({ syncStatus: 'syncing', syncError: null });

          try {
            // Get authentication token with retry logic
            let authToken: string | null = null;
            let tokenRetries = 0;
            const maxTokenRetries = 3;

            while (!authToken && tokenRetries < maxTokenRetries) {
              try {
                if (state.isGuestMode) {
                  authToken = state.guestToken;
                  if (!authToken) {
                    throw new Error('Guest token not available');
                  }
                } else {
                  const currentUser = auth.currentUser;
                  if (!currentUser) {
                    throw new Error('Firebase user not available');
                  }
                  authToken = await currentUser.getIdToken(true); // Force refresh
                }
              } catch (tokenError) {
                tokenRetries++;
                console.warn(`⚠️ Token retrieval attempt ${tokenRetries} failed:`, tokenError);

                if (tokenRetries >= maxTokenRetries) {
                  throw new Error(`Failed to get authentication token after ${maxTokenRetries} attempts`);
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * tokenRetries));
              }
            }

            if (!authToken) {
              throw new Error('No authentication token available after retries');
            }

            // Perform sync with comprehensive error handling
            const result = await syncService.syncWithServer(
              state.offlineCollection,
              authToken,
              state.syncServiceState
            );

            if (result.success) {
              // Validate the updated collection before applying
              if (!result.updated_collection) {
                throw new Error('Sync succeeded but no updated collection received');
              }

              // Verify collection integrity after sync
              const postSyncValidation = syncService.validateCollectionForSync(result.updated_collection);
              if (!postSyncValidation.isValid) {
                console.error('❌ Post-sync collection validation failed:', postSyncValidation.errors);
                throw new Error('Received invalid collection from server');
              }

              // Update the collection and ensure pending actions are cleared
              const updatedCollection = {
                ...result.updated_collection,
                action_queue: [], // Clear the action queue after successful sync
                last_sync: Date.now() // Update sync timestamp
              };

              // Save collection with error handling
              try {
                get().saveOfflineCollection(updatedCollection);
              } catch (saveError) {
                console.error('❌ Failed to save synced collection:', saveError);
                throw new Error('Failed to save synced data locally');
              }

              // Update state with success
              set({
                syncStatus: 'success',
                lastSyncTime: Date.now(),
                syncConflicts: result.conflicts || [],
                showSyncConflicts: (result.conflicts || []).length > 0,
                pendingActions: 0, // Explicitly set pending actions to 0
                syncServiceState: result.newSyncState, // Update sync service state
                syncError: null // Clear any previous errors
              });

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
              console.error('❌ Sync failed:', {
                error: errorMessage,
                conflicts: result.conflicts?.length || 0,
                hasCollection: !!result.updated_collection
              });

              set({
                syncStatus: 'error',
                syncError: errorMessage,
                syncServiceState: result.newSyncState, // Update sync service state even on error
                syncConflicts: result.conflicts || [],
                showSyncConflicts: (result.conflicts || []).length > 0
              });
            }

            return result;

          } catch (error) {
            // Comprehensive error handling and recovery
            const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
            console.error('❌ Sync failed with error:', error);

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
            set({
              syncStatus: 'error',
              syncError: userFriendlyMessage,
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
          const stored = offlineSecurityService.loadOfflineCollection();
          if (stored) {
            const hasCards = Object.keys(stored.cards_owned).length > 0;
            set({
              offlineCollection: stored,
              hasStarterPack: hasCards,
              pendingActions: stored.action_queue.length
            });
            console.log('🔄 Collection state refreshed:', {
              cards_count: Object.keys(stored.cards_owned).length,
              credits: stored.eco_credits,
              pending_actions: stored.action_queue.length
            });
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
        }
      }),
      {
        name: 'biomasters-hybrid-game-store',
        storage: createJSONStorage(() =>
          createUserScopedIndexedDBStorage({
            getUserId: getCurrentUserId
          })
        ),
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
          userProfile: state.userProfile
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