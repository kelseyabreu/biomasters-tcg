/**
 * Guest Account Conversion Utilities
 * Handles the conversion of guest accounts to registered Firebase accounts
 */

import { UserCredential } from 'firebase/auth';
import { guestApi } from '../services/apiClient';


export interface ConversionResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
    email: string;
    accountType: string;
  };
}

/**
 * Convert a guest account to a registered Firebase account
 * This is the core function that implements the conversion flow described in the requirements
 */
export const convertGuestToRegistered = async (
  guestToken: string,
  firebaseCredential: UserCredential
): Promise<ConversionResult> => {
  try {
    // Step 1: Get the Firebase ID token from the new credential
    const firebaseToken = await firebaseCredential.user.getIdToken();

    // Step 2: Call the server conversion endpoint using apiClient
    // Note: The guest JWT will be automatically attached by the apiClient interceptor
    const response = await guestApi.convert(firebaseToken);

    return {
      success: true,
      message: response.data.message || 'Account converted successfully',
      user: response.data.user || response.data.data?.user
    };

  } catch (error: any) {
    console.error('Guest conversion failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to convert guest account'
    };
  }
};

/**
 * Validate that the current state allows for guest conversion
 */
export const canConvertGuest = (
  isGuestMode: boolean,
  guestToken: string | null
): boolean => {
  return isGuestMode && !!guestToken;
};

/**
 * Clean up guest credentials after successful conversion
 */
export const cleanupGuestCredentials = () => {
  // Remove guest-related items from localStorage
  const keysToRemove = [
    'guestId',
    'guestSecret', 
    'guestToken',
    'biomasters-hybrid-game-store' // This will trigger Zustand to clear persisted guest state
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Handle the complete conversion flow with proper error handling and state management
 */
export const handleGuestConversion = async (
  guestToken: string,
  firebaseCredential: UserCredential,
  onSuccess?: (result: ConversionResult) => void,
  onError?: (error: string) => void
): Promise<ConversionResult> => {
  try {
    // Perform the conversion
    const result = await convertGuestToRegistered(guestToken, firebaseCredential);
    
    if (result.success) {
      // Clean up guest credentials on success
      cleanupGuestCredentials();
      
      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      if (onError) {
        onError(result.message);
      }
    }

    return result;
  } catch (error: any) {
    const errorMessage = error.message || 'Conversion failed';
    
    if (onError) {
      onError(errorMessage);
    }

    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * Get conversion status messages based on collection stats
 */
export const getConversionMessage = (
  ownedSpecies: number,
  credits: number,
  totalCards: number
): string => {
  if (ownedSpecies === 0 && credits <= 100) {
    return 'Create a free account to save your progress across devices';
  } else if (ownedSpecies < 5) {
    return `Save your ${ownedSpecies} species and ${credits} eco-credits`;
  } else {
    return `Protect ${ownedSpecies} species, ${totalCards} cards, and ${credits} eco-credits`;
  }
};
