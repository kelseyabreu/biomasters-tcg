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

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  // Guest API specific fields
  user?: any;
  auth?: {
    token: string;
    guestSecret?: string;
    expiresIn?: string;
  };
  sync?: any;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

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
        console.log('🔐 Attached Firebase token to request');
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
      
      console.log('🔄 Received 401, attempting token refresh...');
      
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
    const apiError: ApiError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: (error.response?.data as any)?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status
    };
    
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
export const authApi = {
  // Check authentication status
  getStatus: () => api.get<ApiResponse>('/api/auth/status'),
  
  // Register new user
  register: (userData: { username: string }) => 
    api.post<ApiResponse>('/api/auth/register', userData),
  
  // Get user profile
  getProfile: () => api.get<ApiResponse>('/api/auth/profile'),
  
  // Update user profile
  updateProfile: (profileData: { displayName?: string; preferences?: any }) =>
    api.put<ApiResponse>('/api/auth/profile', profileData),
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
};

// Export the main client for custom requests
export default apiClient;
