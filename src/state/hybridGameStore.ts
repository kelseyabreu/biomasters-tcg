/**
 * Hybrid Game Store
 * Best practice state management for cross-platform TCG
 * Combines Zustand (offline state) + React Query (server state)
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { offlineSecurityService, OfflineCollection, OfflineAction } from '../services/offlineSecurityService';
import { starterPackService } from '../services/starterPackService';
import { syncService, SyncResult } from '../services/syncService';
import { loadAllSpeciesCards } from '../utils/speciesDataProcessor';
import { BoosterPackSystem, PackOpeningResult } from '../utils/boosterPackSystem';
import { Card } from '../types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User, signInAnonymously, signOut } from 'firebase/auth';

export interface HybridGameState {
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
  
  // Sync State
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: number;
  syncError: string | null;
  pendingActions: number;
  
  // UI State
  showSyncConflicts: boolean;
  syncConflicts: any[];
  
  // Actions
  initializeOfflineCollection: () => void;
  loadOfflineCollection: () => void;
  saveOfflineCollection: (collection: OfflineCollection) => void;

  // Species Data Actions
  loadSpeciesData: () => Promise<void>;

  // Firebase Auth Actions
  initializeAuth: () => void;
  signInAsGuest: () => Promise<void>;
  signOutUser: () => Promise<void>;
  handleNewUser: () => Promise<void>;
  initializeOfflineKey: () => Promise<void>;
  
  // Starter Pack Actions
  openStarterPack: () => Promise<void>;
  
  // Card Actions
  addCardToCollection: (speciesName: string, quantity: number, acquiredVia: string) => Promise<void>;
  openPack: (packType: string) => Promise<string[]>;
  
  // Deck Actions
  createDeck: (name: string, cards: string[]) => Promise<string>;
  updateDeck: (deckId: string, name: string, cards: string[]) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  
  // Sync Actions
  syncCollection: () => Promise<SyncResult>;
  setOnlineStatus: (online: boolean) => void;
  setAuthenticationStatus: (authenticated: boolean, userId?: string) => void;
  
  // Conflict Resolution
  resolveSyncConflicts: (conflicts: any[]) => void;
  dismissSyncConflicts: () => void;
}

export const useHybridGameStore = create<HybridGameState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        offlineCollection: null,
        hasStarterPack: false,
        isFirstLaunch: true,

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
        syncStatus: 'idle',
        lastSyncTime: 0,
        syncError: null,
        pendingActions: 0,
        showSyncConflicts: false,
        syncConflicts: [],

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
            get().initializeAuth();
          }
        },

        // Load offline collection from storage
        loadOfflineCollection: () => {
          const stored = offlineSecurityService.loadOfflineCollection();
          if (stored) {
            set({ 
              offlineCollection: stored,
              hasStarterPack: Object.keys(stored.species_owned).length > 0,
              pendingActions: stored.action_queue.length
            });
          } else {
            get().initializeOfflineCollection();
          }
        },

        // Save offline collection to storage
        saveOfflineCollection: (collection: OfflineCollection) => {
          offlineSecurityService.saveOfflineCollection(collection);
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
            const allCards = await loadAllSpeciesCards();
            console.log(`✅ Loaded ${allCards.length} species cards`);

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
        initializeAuth: () => {
          console.log('🔥 Initializing Firebase auth...');

          onAuthStateChanged(auth, async (user) => {
            console.log('🔥 Auth state changed:', user ? `User: ${user.uid}` : 'No user');

            const previousUser = get().firebaseUser;
            const currentState = get();

            // Don't override guest mode authentication
            if (currentState.isGuestMode && !user) {
              console.log('🔥 Preserving guest mode authentication');
              set({
                firebaseUser: user
              });
              return;
            }

            set({
              firebaseUser: user,
              isAuthenticated: !!user,
              userId: user?.uid || null
            });

            // Handle user sign-out - clear state
            if (!user && previousUser) {
              console.log('👤 User signed out - clearing state...');
              set({
                offlineCollection: null,
                hasStarterPack: false,
                isGuestMode: false,
                syncStatus: 'idle',
                lastSyncTime: 0,
                syncError: null,
                pendingActions: 0,
                showSyncConflicts: false,
                syncConflicts: []
              });
            }

            // Handle user authentication (new or returning)
            if (user && !previousUser) {
              console.log('👤 User authenticated - setting up...');
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
            if (user && get().offlineCollection && !get().isGuestMode) {
              console.log('👤 User authenticated with offline data - ready for sync');
              // Auto-sync when coming online
              if (navigator.onLine) {
                setTimeout(() => get().syncCollection(), 1000);
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

          // Check if we already have guest credentials stored
          if (state.guestId && state.guestSecret) {
            console.log('👤 Found existing guest credentials, attempting login...');
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
          set({
            isAuthenticated: true,
            isGuestMode: true,
            guestId,
            guestSecret: null, // Will be set after server registration
            guestToken: null,
            needsRegistration: true,
            userId: guestId, // Use guestId as userId initially
            firebaseUser: null
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

          const response = await fetch('/api/guest/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              guestId: state.guestId,
              guestSecret: state.guestSecret
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Guest login failed');
          }

          const data = await response.json();

          set({
            isAuthenticated: true,
            isGuestMode: true,
            guestToken: data.auth.token,
            userId: data.user.id,
            needsRegistration: false
          });

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

          const response = await fetch('/api/guest/register-and-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              guestId: state.guestId,
              actionQueue: actionQueue.map(action => ({
                action: action.action_type,
                payload: action.payload,
                signature: action.signature,
                timestamp: action.timestamp
              })),
              deviceId: offlineSecurityService.getDeviceId()
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Guest registration failed');
          }

          const data = await response.json();

          // Update state with server credentials
          set({
            guestSecret: data.auth.guestSecret,
            guestToken: data.auth.token,
            userId: data.user.id,
            needsRegistration: false
          });

          // Clear processed actions from local queue
          if (state.offlineCollection) {
            const updatedCollection = {
              ...state.offlineCollection,
              action_queue: [] // Clear processed actions
            };
            get().saveOfflineCollection(updatedCollection);
          }

          console.log('✅ Guest registered with server successfully');
        },

        // Sign out user
        signOutUser: async () => {
          try {
            console.log('👤 Signing out...');

            const state = get();
            if (state.isGuestMode) {
              // For guest mode, just clear local state
              console.log('👤 Signing out guest user...');
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
                syncConflicts: []
              });
            } else {
              // For Firebase users, sign out through Firebase
              await signOut(auth);
            }

            console.log('✅ Sign-out successful');
          } catch (error) {
            console.error('❌ Sign-out failed:', error);
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

                // Request signing key from server
                const response = await fetch('/api/auth/offline-key', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({ device_id: deviceId })
                });

                if (!response.ok) {
                  throw new Error(`Failed to get offline key: ${response.statusText}`);
                }

                const { signing_key } = await response.json();

                // Initialize offline security service with server key
                await offlineSecurityService.initializeSigningKey(state.userId, signing_key);
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
            const hasAnySpecies = currentState.offlineCollection &&
              Object.keys(currentState.offlineCollection.species_owned).length > 0;

            console.log('🔍 Checking starter pack status:', {
              hasStarterPack: currentState.hasStarterPack,
              hasAnySpecies,
              speciesCount: currentState.offlineCollection ? Object.keys(currentState.offlineCollection.species_owned).length : 0
            });

            if (!hasAnySpecies) {
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
        openStarterPack: async (): Promise<string[]> => {
          const state = get();

          // Check if collection exists
          if (!state.offlineCollection) {
            throw new Error('No collection initialized');
          }

          // Check if user already has any species (indicating starter pack was opened)
          const hasAnySpecies = Object.keys(state.offlineCollection.species_owned).length > 0;
          if (hasAnySpecies) {
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

            // Add starter species to collection
            const starterSpecies = starterPackService.createStarterCollection();
            const starterSpeciesNames = Object.keys(starterSpecies);

            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              species_owned: {
                ...state.offlineCollection.species_owned,
                ...starterSpecies
              },
              action_queue: [...state.offlineCollection.action_queue, action]
            };

            // Update collection hash
            updatedCollection.collection_hash = offlineSecurityService.calculateCollectionHash(updatedCollection);

            get().saveOfflineCollection(updatedCollection);
            set({ hasStarterPack: true });

            return starterSpeciesNames;

          } catch (error) {
            console.error('Failed to open starter pack:', error);
            throw error;
          }
        },

        // Add card to collection
        addCardToCollection: async (speciesName: string, quantity: number, acquiredVia: string) => {
          const state = get();
          if (!state.offlineCollection) {
            throw new Error('No collection initialized');
          }

          try {
            // Create card acquisition action
            const action = offlineSecurityService.createAction('card_acquired', {
              species_name: speciesName,
              quantity
            });

            // Update collection
            const existingCard = state.offlineCollection.species_owned[speciesName];
            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              species_owned: {
                ...state.offlineCollection.species_owned,
                [speciesName]: {
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
        openPack: async (packType: string): Promise<string[]> => {
          const state = get();
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

            // Open pack using proper rarity system
            const pack = packSystem.generateBoosterPack(`${packType} pack`);
            const packResult: PackOpeningResult = packSystem.generatePackStats(pack);
            const newCards: string[] = packResult.pack.cards.map(card => card.speciesName);

            // Update collection
            const updatedSpecies = { ...state.offlineCollection.species_owned };
            newCards.forEach(species => {
              const existing = updatedSpecies[species];
              updatedSpecies[species] = {
                quantity: (existing?.quantity || 0) + 1,
                acquired_via: existing?.acquired_via || 'pack',
                first_acquired: existing?.first_acquired || Date.now(),
                last_acquired: Date.now()
              };
            });

            const updatedCollection: OfflineCollection = {
              ...state.offlineCollection,
              species_owned: updatedSpecies,
              eco_credits: state.offlineCollection.eco_credits - config.cost,
              action_queue: [...state.offlineCollection.action_queue, action]
            };

            // Update collection hash
            updatedCollection.collection_hash = offlineSecurityService.calculateCollectionHash(updatedCollection);

            get().saveOfflineCollection(updatedCollection);
            return newCards;

          } catch (error) {
            console.error('Failed to open pack:', error);
            throw error;
          }
        },

        // Create deck
        createDeck: async (name: string, cards: string[]): Promise<string> => {
          const deckId = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const action = offlineSecurityService.createAction('deck_created', {
            deck_id: deckId,
            deck_data: { name, cards }
          });

          const state = get();
          if (state.offlineCollection) {
            const updatedCollection = offlineSecurityService.addActionToQueue(state.offlineCollection, action);
            get().saveOfflineCollection(updatedCollection);
          }

          return deckId;
        },

        // Update deck
        updateDeck: async (deckId: string, name: string, cards: string[]): Promise<void> => {
          const action = offlineSecurityService.createAction('deck_updated', {
            deck_id: deckId,
            deck_data: { name, cards }
          });

          const state = get();
          if (state.offlineCollection) {
            const updatedCollection = offlineSecurityService.addActionToQueue(state.offlineCollection, action);
            get().saveOfflineCollection(updatedCollection);
          }
        },

        // Delete deck
        deleteDeck: async (deckId: string): Promise<void> => {
          // Implementation would add delete action to queue
          console.log('Delete deck:', deckId);
        },

        // Sync with server
        syncCollection: async (): Promise<SyncResult> => {
          const state = get();
          if (!state.offlineCollection || !state.isOnline) {
            throw new Error('Cannot sync: offline or no collection');
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
                syncError: 'Guest registration failed'
              });
              throw error;
            }
          }

          set({ syncStatus: 'syncing', syncError: null });

          try {
            // Use guest token for authentication if in guest mode
            const authToken = state.isGuestMode ? state.guestToken : await auth.currentUser?.getIdToken();

            if (!authToken) {
              throw new Error('No authentication token available');
            }

            const result = await syncService.syncWithServer(state.offlineCollection, authToken);

            if (result.success) {
              get().saveOfflineCollection(result.updated_collection);
              set({
                syncStatus: 'success',
                lastSyncTime: Date.now(),
                syncConflicts: result.conflicts,
                showSyncConflicts: result.conflicts.length > 0
              });
            } else {
              set({
                syncStatus: 'error',
                syncError: result.error || 'Sync failed'
              });
            }

            return result;

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
            set({
              syncStatus: 'error',
              syncError: errorMessage
            });
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
        }
      }),
      {
        name: 'biomasters-hybrid-game-store',
        partialize: (state) => ({
          // Only persist offline state, not UI state
          hasStarterPack: state.hasStarterPack,
          isFirstLaunch: state.isFirstLaunch,
          lastSyncTime: state.lastSyncTime,
          userId: state.userId,
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )
);

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
