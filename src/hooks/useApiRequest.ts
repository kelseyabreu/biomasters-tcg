/**
 * useApiRequest Hook
 * 
 * Consolidates common API request patterns across the application:
 * - Loading state management
 * - Error handling with proper ApiError types
 * - Success/failure toast notifications
 * - Automatic retry logic
 * - Response data extraction
 * 
 * Replaces duplicate patterns found in AuthForm, Profile, Settings, and other components.
 */

import { useState, useCallback } from 'react';
import { ApiResponse, ApiError, ApiStatus } from '@kelseyabreu/shared';
import { AxiosResponse } from 'axios';

/**
 * Configuration options for API requests
 */
export interface ApiRequestOptions {
  // Toast notification options
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  
  // Retry options
  retryAttempts?: number;
  retryDelay?: number;
  
  // Response handling
  extractData?: boolean; // Whether to extract data from ApiResponse wrapper
  
  // Loading state options
  resetOnSuccess?: boolean; // Whether to reset loading state immediately on success
}

/**
 * API request state
 */
export interface ApiRequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * API request result
 */
export interface ApiRequestResult<T> extends ApiRequestState<T> {
  execute: (requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>) => Promise<T | null>;
  reset: () => void;
  setError: (error: string) => void;
  setSuccess: (message: string) => void;
}

/**
 * Default options for API requests
 */
const DEFAULT_OPTIONS: Required<ApiRequestOptions> = {
  showSuccessToast: true,
  showErrorToast: true,
  successMessage: 'Operation completed successfully',
  errorMessage: 'Operation failed',
  retryAttempts: 0,
  retryDelay: 1000,
  extractData: true,
  resetOnSuccess: true
};

/**
 * Custom hook for handling API requests with consistent patterns
 */
export function useApiRequest<T = any>(options: ApiRequestOptions = {}): ApiRequestResult<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  });

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    });
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error,
      success: false
    }));
    
    if (config.showErrorToast) {
      // Dispatch custom event for toast notification
      window.dispatchEvent(new CustomEvent('api:toast', {
        detail: {
          message: error || config.errorMessage,
          color: 'danger',
          duration: 4000
        }
      }));
    }
  }, [config.showErrorToast, config.errorMessage]);

  // Set success state
  const setSuccess = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      loading: config.resetOnSuccess ? false : prev.loading,
      error: null,
      success: true
    }));
    
    if (config.showSuccessToast) {
      // Dispatch custom event for toast notification
      window.dispatchEvent(new CustomEvent('api:toast', {
        detail: {
          message: message || config.successMessage,
          color: 'success',
          duration: 3000
        }
      }));
    }
  }, [config.showSuccessToast, config.successMessage, config.resetOnSuccess]);

  // Execute API request with retry logic
  const execute = useCallback(async (
    requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false
    }));

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await requestFn();
        
        // Extract data from response
        const apiResponse = response.data;
        
        // Check if the API response indicates success
        if (apiResponse.status === ApiStatus.SUCCESS || apiResponse.success) {
          const resultData = config.extractData ? apiResponse.data : (apiResponse as T);

          setState(prev => ({
            ...prev,
            data: resultData || null,
            loading: config.resetOnSuccess ? false : prev.loading,
            error: null,
            success: true
          }));

          if (config.showSuccessToast) {
            setSuccess(apiResponse.message || config.successMessage);
          }

          return resultData || null;
        } else {
          // API returned error status
          const errorMessage = apiResponse.error || apiResponse.message || config.errorMessage;
          setError(errorMessage);
          return null;
        }
        
      } catch (error: any) {
        lastError = error;
        
        // If this is the last attempt, handle the error
        if (attempt === config.retryAttempts) {
          let errorMessage = config.errorMessage;
          
          // Extract error message from different error types
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          setError(errorMessage);
          return null;
        }
        
        // Wait before retrying
        if (config.retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }
    
    return null;
  }, [config, setError, setSuccess]);

  return {
    ...state,
    execute,
    reset,
    setError,
    setSuccess
  };
}

/**
 * Specialized hook for authentication requests
 */
export function useAuthRequest<T = any>(options: ApiRequestOptions = {}) {
  return useApiRequest<T>({
    successMessage: 'Authentication successful',
    errorMessage: 'Authentication failed',
    retryAttempts: 1,
    ...options
  });
}

/**
 * Specialized hook for profile update requests
 */
export function useProfileRequest<T = any>(options: ApiRequestOptions = {}) {
  return useApiRequest<T>({
    successMessage: 'Profile updated successfully',
    errorMessage: 'Failed to update profile',
    ...options
  });
}

/**
 * Specialized hook for collection/sync requests
 */
export function useSyncRequest<T = any>(options: ApiRequestOptions = {}) {
  return useApiRequest<T>({
    successMessage: 'Sync completed successfully',
    errorMessage: 'Sync failed',
    retryAttempts: 2,
    retryDelay: 2000,
    ...options
  });
}
