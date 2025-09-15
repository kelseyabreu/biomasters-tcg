/**
 * Professional API Client with Automatic Token Management
 * 
 * Features:
 * - Automatic token attachment for all requests
 * - Automatic token refresh on 401 errors
 * - Support for both Firebase and Guest authentication
 * - Request/Response interceptors for centralized error handling
 * - TypeScript support with proper error types
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { auth } from '../config/firebase';
import { tokenManager } from './tokenStorage';
import { ApiResponse, ApiError } from '@shared/types';

// Use shared API types instead of local definitions

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Attach authentication tokens to every request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Check if Firebase user is authenticated
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        // Firebase user - get fresh ID token
        const idToken = await firebaseUser.getIdToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${idToken}`;
        console.log('🔐 [API] Attached Firebase token to request:', {
          url: config.url,
          method: config.method,
          uid: firebaseUser.uid,
          tokenLength: idToken.length,
          tokenPrefix: idToken.substring(0, 20) + '...'
        });
      } else {
        // Check for guest authentication
        const guestCredentials = await tokenManager.getGuestCredentials();
        
        if (guestCredentials?.guestToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${guestCredentials.guestToken}`;
          console.log('🔐 Attached guest token to request');
        } else {
          console.log('ℹ️ No authentication token available for request');
        }
      }
      
      return config;
    } catch (error) {
      console.error('❌ Failed to attach authentication token:', error);
      return config; // Continue without token
    }
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Handle token refresh and error responses
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Successful response - return as is
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors (token expired/invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('🔄 [API] Received 401, attempting token refresh...', {
        url: originalRequest.url,
        method: originalRequest.method,
        hasAuthHeader: !!originalRequest.headers?.Authorization,
        authHeaderPrefix: typeof originalRequest.headers?.Authorization === 'string'
          ? originalRequest.headers.Authorization.substring(0, 20) + '...'
          : 'N/A',
        errorMessage: error.response?.data
      });
      
      try {
        const firebaseUser = auth.currentUser;
        
        if (firebaseUser) {
          // Firebase user - force token refresh
          console.log('🔄 Refreshing Firebase token...');
          const newIdToken = await firebaseUser.getIdToken(true); // Force refresh
          
          // Update the failed request with new token
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newIdToken}`;
          
          console.log('✅ Firebase token refreshed, retrying request');
          return apiClient(originalRequest);
          
        } else {
          // Guest user - check if we can refresh guest token
          const guestCredentials = await tokenManager.getGuestCredentials();
          
          if (guestCredentials?.guestId && guestCredentials?.guestSecret) {
            console.log('🔄 Attempting guest token refresh...');
            
            // Try to login again to get fresh guest token
            const response = await axios.post(`${apiClient.defaults.baseURL}/api/guest/login`, {
              guestId: guestCredentials.guestId,
              guestSecret: guestCredentials.guestSecret
            });
            
            if (response.data.success && response.data.auth?.token) {
              // Update stored token
              await tokenManager.updateGuestToken(response.data.auth.token);
              
              // Update the failed request with new token
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${response.data.auth.token}`;
              
              console.log('✅ Guest token refreshed, retrying request');
              return apiClient(originalRequest);
            }
          }
        }
        
        // If we get here, token refresh failed
        console.log('❌ Token refresh failed, user needs to re-authenticate');

        // Clear invalid tokens
        await tokenManager.clearAllAuthData();

        // Force sign-out in the game store to immediately clear UI state
        const { useHybridGameStore } = await import('../state/hybridGameStore');
        useHybridGameStore.getState().signOutUser();

        // Redirect to auth or trigger logout in the app
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);

        // Clear invalid tokens
        await tokenManager.clearAllAuthData();

        // Force sign-out in the game store to immediately clear UI state
        const { useHybridGameStore } = await import('../state/hybridGameStore');
        useHybridGameStore.getState().signOutUser();

        // Trigger logout
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
      }
    }
    
    // Handle other error types
    const apiError = new Error((error.response?.data as any)?.message || error.message || 'An unexpected error occurred') as ApiError;
    apiError.code = error.code || 'UNKNOWN_ERROR';
    apiError.status = error.response?.status;
    
    console.error('❌ API Error:', apiError);
    return Promise.reject(apiError);
  }
);

/**
 * Typed API methods for common operations
 */
export const api = {
  // GET request
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config);
  },
  
  // POST request
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config);
  },
  
  // PUT request
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data, config);
  },
  
  // PATCH request
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch<T>(url, data, config);
  },
  
  // DELETE request
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, config);
  }
};

/**
 * Specialized API methods for common app operations
 */
// Profile update interface
export interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  location?: string;
  favoriteSpecies?: string;
  isPublicProfile?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export const authApi = {
  // Check authentication status
  getStatus: () => api.get<ApiResponse>('/api/auth/status'),

  // Register new user
  register: async (userData: { username: string }) => {
    console.log('🔄 [API-CLIENT] Calling registration endpoint...', {
      userData,
      timestamp: new Date().toISOString()
    });
    try {
      const response = await api.post<ApiResponse>('/api/auth/register', userData);
      console.log('✅ [API-CLIENT] Registration API call successful:', {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      return response;
    } catch (error: any) {
      console.error('❌ [API-CLIENT] Registration API call failed:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  // Get user profile
  getProfile: () => api.get<ApiResponse>('/api/auth/profile'),

  // Update user profile (enhanced version)
  updateProfile: (profileData: ProfileUpdateData) =>
    api.put<ApiResponse>('/api/users/me', profileData),

  // Get public user profile by ID
  getPublicProfile: (userId: string) =>
    api.get<ApiResponse>(`/api/users/${userId}/public`),
};

export const guestApi = {
  // Register guest and sync
  registerAndSync: (data: { guestId: string; actionQueue: any[]; deviceId?: string }) =>
    api.post<ApiResponse>('/api/guest/register-and-sync', data),
  
  // Login existing guest
  login: (credentials: { guestId: string; guestSecret: string }) =>
    api.post<ApiResponse>('/api/guest/login', credentials),
  
  // Convert guest to registered account
  convert: (firebaseToken: string) =>
    api.post<ApiResponse>('/api/guest/convert', { firebaseToken }),
  
  // Get guest status
  getStatus: () => api.get<ApiResponse>('/api/guest/status'),
};

export const gameApi = {
  // Get user collection
  getCollection: () => api.get<ApiResponse>('/api/cards/collection'),

  // Get user collection with pagination and search
  getUserCollection: (page = 1, limit = 50, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return api.get<ApiResponse>(`/api/cards/collection?${params}`);
  },

  // Check if user owns a specific card by CardId
  checkCardOwnership: async (cardId: number): Promise<boolean> => {
    try {
      const response = await gameApi.getUserCollection(1, 1000);
      return response.data.data?.collection?.some((card: any) => card.card_id === cardId) || false;
    } catch (error) {
      return false;
    }
  },

  // Check if user owns a specific species (legacy compatibility)
  checkSpeciesOwnership: async (speciesName: string): Promise<boolean> => {
    try {
      const response = await gameApi.getUserCollection(1, 1000);
      return response.data.data?.collection?.some((card: any) => card.species_name === speciesName) || false;
    } catch (error) {
      return false;
    }
  },

  // Get quantity of a specific card owned by CardId
  getCardQuantity: async (cardId: number): Promise<number> => {
    try {
      const response = await gameApi.getUserCollection(1, 1000);
      const card = response.data.data?.collection?.find((card: any) => card.card_id === cardId);
      return card?.quantity || 0;
    } catch (error) {
      return 0;
    }
  },

  // Get quantity of a specific species owned (legacy compatibility)
  getSpeciesQuantity: async (speciesName: string): Promise<number> => {
    try {
      const response = await gameApi.getUserCollection(1, 1000);
      const card = response.data.data?.collection?.find((card: any) => card.species_name === speciesName);
      return card?.quantity || 0;
    } catch (error) {
      return 0;
    }
  },

  // Get collection stats
  getCollectionStats: () => api.get<ApiResponse>('/api/cards/collection/stats'),

  // Pack opening
  openPack: (packType: string) => api.post<ApiResponse>('/api/packs/open', { packType }),

  // Sync collection
  syncCollection: (data: any) => api.post<ApiResponse>('/api/sync', data),

  // Get decks
  getDecks: () => api.get<ApiResponse>('/api/decks'),

  // Create deck
  createDeck: (deckData: any) => api.post<ApiResponse>('/api/decks', deckData),

  // Update deck
  updateDeck: (deckId: string, deckData: any) =>
    api.put<ApiResponse>(`/api/decks/${deckId}`, deckData),

  // Delete deck
  deleteDeck: (deckId: string) => api.delete<ApiResponse>(`/api/decks/${deckId}`),

  // TCG Game API endpoints
  createGame: (gameData: {
    gameId: string;
    players: any[];
    settings?: any;
  }) => api.post<ApiResponse>('/api/game/tcg/create', gameData),

  playCard: (actionData: {
    gameId: string;
    playerId: string;
    cardId: string;
    position: { x: number; y: number };
  }) => api.post<ApiResponse>('/api/game/tcg/play-card', actionData),

  passTurn: (actionData: {
    gameId: string;
    playerId: string;
  }) => api.post<ApiResponse>('/api/game/tcg/pass-turn', actionData),

  syncOfflineGame: (syncData: {
    gameId: string;
    gameState: any;
    actionHistory: any[];
  }) => api.post<ApiResponse>('/api/game/tcg/sync', syncData),

  getGameState: (gameId: string) => api.get<ApiResponse>(`/api/game/tcg/${gameId}/state`),

  // ============================================================================
  // ONLINE MULTIPLAYER ENDPOINTS
  // ============================================================================

  // Matchmaking endpoints
  findMatch: (data: { gameMode: string; preferences?: any }) =>
    api.post<ApiResponse>('/api/matchmaking/find', data),

  cancelMatchmaking: () =>
    api.delete<ApiResponse>('/api/matchmaking/cancel'),

  getMatchmakingStatus: () =>
    api.get<ApiResponse>('/api/matchmaking/status'),

  // Rating and leaderboard endpoints
  getPlayerRatings: (data: { playerIds: string[] }) =>
    api.post<ApiResponse>('/api/users/ratings', data),

  updatePlayerRating: (data: any) =>
    api.post<ApiResponse>('/api/users/rating/update', data),

  getLeaderboard: (gameMode: string, limit: number = 100) =>
    api.get<ApiResponse>(`/api/leaderboard/${gameMode}?limit=${limit}`),

  // Match history endpoints
  getMatchHistory: (page: number = 1, limit: number = 20) =>
    api.get<ApiResponse>(`/api/matches/history?page=${page}&limit=${limit}`),

  forfeitMatch: (sessionId: string) =>
    api.post<ApiResponse>(`/api/matches/${sessionId}/forfeit`),

  // Quest endpoints
  getDailyQuests: () =>
    api.get<ApiResponse>('/api/quests/daily'),

  updateQuestProgress: (data: any) =>
    api.post<ApiResponse>('/api/quests/progress', data),

  claimQuestReward: (questId: string) =>
    api.post<ApiResponse>(`/api/quests/${questId}/claim`),

  // Generic HTTP methods for flexibility
  post: <T = any>(url: string, data?: any) => api.post<T>(url, data),
  get: <T = any>(url: string) => api.get<T>(url),
  put: <T = any>(url: string, data?: any) => api.put<T>(url, data),
  delete: <T = any>(url: string) => api.delete<T>(url),
};

// Export the main client for custom requests
export default apiClient;
