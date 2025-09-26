/**
 * Hook for managing redemption status and operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHybridGameStore, getCurrentUserId, getClientUserId, getDbUserId } from '../state/hybridGameStore';
import apiClient from '../services/apiClient';

export interface RedemptionStatus {
  starter_deck_redeemed: boolean;
  starter_pack_redeemed: boolean;
  tutorial_rewards_redeemed: boolean;
  total_redemptions: number;
  available_promo_codes: string[];
  recent_redemptions: Array<{
    id: string;
    redemption_type: number;
    redemption_code?: string;
    redeemed_at: Date;
    status: number;
    redemption_data: Record<string, any>;
  }>;
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  redemption_id?: string;
  code?: string;
  rewards?: any[];
}

export const useRedemptionStatus = () => {
  const [status, setStatus] = useState<RedemptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revert to simple subscription to avoid infinite loops
  const { isAuthenticated, isOnline, isGuestMode, needsRegistration, identity, offlineCollection } = useHybridGameStore();

  // Get user IDs using new identity system
  const currentUserId = getCurrentUserId();
  const clientUserId = getClientUserId();
  const dbUserId = getDbUserId();

  // Fetch redemption status from API
  const fetchStatus = useCallback(async () => {
    console.log('🎁 [useRedemptionStatus] fetchStatus called:', {
      isAuthenticated,
      currentUserId,
      clientUserId,
      dbUserId,
      isOnline,
      isGuestMode,
      needsRegistration,
      hasExistingStatus: !!status
    });

    if (!isAuthenticated || !currentUserId) {
      console.log('🎁 [useRedemptionStatus] Not authenticated or no currentUserId - clearing status');
      setStatus(null);
      return;
    }

    // For guest users who haven't been registered with server yet,
    // assume they can redeem starter content until proven otherwise
    if (isGuestMode && needsRegistration) {
      console.log('🎁 [useRedemptionStatus] Guest user not yet registered - assuming can redeem starter content');
      const optimisticStatus = {
        starter_deck_redeemed: false,
        starter_pack_redeemed: false,
        tutorial_rewards_redeemed: false,
        total_redemptions: 0,
        available_promo_codes: [],
        recent_redemptions: []
      };
      setStatus(optimisticStatus);
      setLoading(false);
      setError(null);
      console.log('🎁 [useRedemptionStatus] Set optimistic status for unregistered guest:', optimisticStatus);
      return;
    }

    if (!isOnline) {
      console.log('🎁 [useRedemptionStatus] Device offline - using cached or optimistic status');
      // If offline, keep existing status or set optimistic defaults for new users
      if (!status) {
        const offlineStatus = {
          starter_deck_redeemed: false,
          starter_pack_redeemed: false,
          tutorial_rewards_redeemed: false,
          total_redemptions: 0,
          available_promo_codes: [],
          recent_redemptions: []
        };
        setStatus(offlineStatus);
        console.log('🎁 [useRedemptionStatus] Set optimistic status for offline user:', offlineStatus);
      } else {
        console.log('🎁 [useRedemptionStatus] Using cached status while offline:', status);
      }
      return;
    }

    // For guest users, ensure we have a token before making API calls
    if (isGuestMode) {
      const gameState = useHybridGameStore.getState();
      if (!gameState.guestToken) {
        console.log('🎁 [useRedemptionStatus] Guest mode but no token yet, skipping API call');
        return;
      }
    }

    console.log('🎁 [useRedemptionStatus] Fetching status from API...');
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/redemptions/status');
      console.log('🎁 [useRedemptionStatus] API response:', {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      });

      if (response.data.success) {
        setStatus(response.data.data);
        console.log('🎁 [useRedemptionStatus] Successfully set status from API:', response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch redemption status');
        console.log('🎁 [useRedemptionStatus] API returned error, using optimistic defaults');
        // On error, keep optimistic defaults for new users
        if (!status) {
          const errorFallbackStatus = {
            starter_deck_redeemed: false,
            starter_pack_redeemed: false,
            tutorial_rewards_redeemed: false,
            total_redemptions: 0,
            available_promo_codes: [],
            recent_redemptions: []
          };
          setStatus(errorFallbackStatus);
          console.log('🎁 [useRedemptionStatus] Set error fallback status:', errorFallbackStatus);
        }
      }
    } catch (err) {
      console.error('🎁 [useRedemptionStatus] Error fetching redemption status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // On error, keep optimistic defaults for new users
      if (!status) {
        const catchFallbackStatus = {
          starter_deck_redeemed: false,
          starter_pack_redeemed: false,
          tutorial_rewards_redeemed: false,
          total_redemptions: 0,
          available_promo_codes: [],
          recent_redemptions: []
        };
        setStatus(catchFallbackStatus);
        console.log('🎁 [useRedemptionStatus] Set catch fallback status:', catchFallbackStatus);
      }
    } finally {
      setLoading(false);
      console.log('🎁 [useRedemptionStatus] Finished fetching status');
    }
  }, [isAuthenticated, currentUserId, isOnline, isGuestMode, needsRegistration]);

  // Create a refresh function that doesn't cause dependency loops
  const refreshStatus = useCallback(async () => {
    console.log('🎁 [useRedemptionStatus] Manual refresh triggered');
    await fetchStatus();
  }, [fetchStatus]);

  // Redeem starter deck
  const redeemStarterDeck = useCallback(async (): Promise<RedemptionResult> => {
    if (!isAuthenticated || !currentUserId || !isOnline) {
      return {
        success: false,
        message: 'Not authenticated or offline',
        code: 'NOT_AUTHENTICATED'
      };
    }

    try {
      const response = await apiClient.post('/api/redemptions/starter-deck');

      // Refresh status after successful redemption
      if (response.data.success) {
        await refreshStatus();
      }

      return response.data;
    } catch (err) {
      console.error('Error redeeming starter deck:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'REDEMPTION_ERROR'
      };
    }
  }, [isAuthenticated, currentUserId, isOnline, refreshStatus]);

  // Redeem starter pack
  const redeemStarterPack = useCallback(async (): Promise<RedemptionResult> => {
    if (!isAuthenticated || !currentUserId || !isOnline) {
      return {
        success: false,
        message: 'Not authenticated or offline',
        code: 'NOT_AUTHENTICATED'
      };
    }

    try {
      const response = await apiClient.post('/api/redemptions/starter-pack');

      // Refresh status after successful redemption
      if (response.data.success) {
        await fetchStatus();
      }

      return response.data;
    } catch (err) {
      console.error('Error redeeming starter pack:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'REDEMPTION_ERROR'
      };
    }
  }, [isAuthenticated, currentUserId, isOnline, refreshStatus]);

  // Redeem promo code
  const redeemPromoCode = useCallback(async (code: string): Promise<RedemptionResult> => {
    if (!isAuthenticated || !currentUserId || !isOnline) {
      return {
        success: false,
        message: 'Not authenticated or offline',
        code: 'NOT_AUTHENTICATED'
      };
    }

    try {
      const response = await apiClient.post('/api/redemptions/promo-code', { code });

      // Refresh status after successful redemption
      if (response.data.success) {
        await fetchStatus();
      }

      return response.data;
    } catch (err) {
      console.error('Error redeeming promo code:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'REDEMPTION_ERROR'
      };
    }
  }, [isAuthenticated, currentUserId, isOnline, refreshStatus]);

  // Validate promo code without redeeming
  const validatePromoCode = useCallback(async (code: string): Promise<{
    valid: boolean;
    message: string;
    code_info?: any;
  }> => {
    if (!isAuthenticated || !currentUserId || !isOnline) {
      return {
        valid: false,
        message: 'Not authenticated or offline'
      };
    }

    try {
      const response = await apiClient.post('/api/redemptions/validate-code', { code });
      return response.data.data;
    } catch (err) {
      console.error('Error validating promo code:', err);
      return {
        valid: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, [isAuthenticated, currentUserId, isOnline]);

  // Auto-fetch status when dependencies change
  useEffect(() => {
    console.log('🎁 [useRedemptionStatus] useEffect triggered with dependencies:', {
      isAuthenticated,
      currentUserId,
      clientUserId,
      dbUserId,
      isOnline,
      isGuestMode,
      needsRegistration
    });
    console.log('🎁 [useRedemptionStatus] Calling fetchStatus...');
    fetchStatus();
  }, [isAuthenticated, currentUserId, isOnline, isGuestMode, needsRegistration]);

  // Computed values for easier access
  const hasRedeemedStarterDeck = status?.starter_deck_redeemed ?? false;
  const hasRedeemedStarterPack = status?.starter_pack_redeemed ?? false;

  // Check for offline starter pack redemptions in action queue
  const hasOfflineStarterPackAction = offlineCollection?.action_queue?.some(
    action => action.action === 'starter_pack_opened'
  ) ?? false;

  // Combine server status with offline actions
  // Priority: Server status > Offline actions (server is authoritative)
  const actuallyRedeemedStarterPack = hasRedeemedStarterPack || hasOfflineStarterPackAction;

  const canRedeemStarterDeck = !hasRedeemedStarterDeck;
  const canRedeemStarterPack = !actuallyRedeemedStarterPack;

  // Debug logging for computed values
  console.log('🎁 [useRedemptionStatus] Computed values:', {
    canRedeemStarterDeck,
    canRedeemStarterPack,
    hasRedeemedStarterDeck,
    hasRedeemedStarterPack,
    hasOfflineStarterPackAction,
    actuallyRedeemedStarterPack,
    offlineActionsCount: offlineCollection?.action_queue?.length ?? 0,
    status,
    loading,
    error
  });

  return {
    // Status data
    status,
    loading,
    error,
    
    // Computed values
    canRedeemStarterDeck,
    canRedeemStarterPack,
    hasRedeemedStarterDeck,
    hasRedeemedStarterPack,
    
    // Actions
    fetchStatus,
    redeemStarterDeck,
    redeemStarterPack,
    redeemPromoCode,
    validatePromoCode,
    
    // Refresh alias
    refresh: fetchStatus
  };
};
