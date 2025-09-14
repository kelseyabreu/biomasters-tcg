/**
 * Hook for managing online multiplayer notifications
 * Monitors state changes and triggers appropriate notifications
 */

import { useEffect, useRef } from 'react';
import { useHybridGameStore } from '../state/hybridGameStore';
import { notificationService } from '../services/notificationService';

export const useOnlineNotifications = () => {
  const {
    isOnline,
    isAuthenticated,
    syncStatus,
    online
  } = useHybridGameStore();

  // Track previous values to detect changes
  const prevValues = useRef({
    isOnline,
    syncStatus,
    rating: online.rating.current,
    winStreak: online.rating.winStreak,
    questStreak: online.quests.questStreak,
    matchmakingStatus: online.matchmaking.isSearching
  });

  // Monitor connection status changes
  useEffect(() => {
    if (prevValues.current.isOnline !== isOnline) {
      if (isOnline) {
        notificationService.system.connectionRestored();
      } else {
        notificationService.system.connectionLost();
      }
      prevValues.current.isOnline = isOnline;
    }
  }, [isOnline]);

  // Monitor sync status changes
  useEffect(() => {
    if (prevValues.current.syncStatus !== syncStatus) {
      if (syncStatus === 'success' && prevValues.current.syncStatus === 'syncing') {
        notificationService.system.syncComplete();
      }
      prevValues.current.syncStatus = syncStatus;
    }
  }, [syncStatus]);

  // Monitor rating changes
  useEffect(() => {
    const currentRating = online.rating.current;
    const prevRating = prevValues.current.rating;
    
    if (currentRating !== prevRating && prevRating > 0) {
      const change = currentRating - prevRating;
      notificationService.rating.updated(prevRating, currentRating, change);
      
      // Check for rank up
      const prevRank = getRankName(prevRating);
      const currentRank = getRankName(currentRating);
      if (prevRank !== currentRank && change > 0) {
        notificationService.rating.rankUp(currentRank, currentRating);
      }
    }
    
    prevValues.current.rating = currentRating;
  }, [online.rating.current]);

  // Monitor win streak changes
  useEffect(() => {
    const currentStreak = online.rating.winStreak;
    const prevStreak = prevValues.current.winStreak;
    
    if (currentStreak > prevStreak && currentStreak >= 3) {
      notificationService.rating.winStreak(currentStreak);
    }
    
    prevValues.current.winStreak = currentStreak;
  }, [online.rating.winStreak]);

  // Monitor quest streak changes
  useEffect(() => {
    const currentStreak = online.quests.questStreak;
    const prevStreak = prevValues.current.questStreak;
    
    if (currentStreak > prevStreak && currentStreak >= 2) {
      notificationService.quest.streakUpdate(currentStreak);
    }
    
    prevValues.current.questStreak = currentStreak;
  }, [online.quests.questStreak]);

  // Monitor quest completions
  useEffect(() => {
    Object.entries(online.quests.dailyQuests).forEach(([questType, quest]) => {
      if (quest.isCompleted && !quest.isClaimed) {
        const questName = questType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        notificationService.quest.completed(questName, quest.rewards);
      }
    });
  }, [online.quests.dailyQuests]);

  // Monitor matchmaking status changes
  useEffect(() => {
    const isSearching = online.matchmaking.isSearching;
    const wasSearching = prevValues.current.matchmakingStatus;
    
    // If we stopped searching and it wasn't cancelled (would be handled elsewhere)
    if (wasSearching && !isSearching) {
      // This could indicate a match was found or search failed
      // The specific notification would be handled by the matchmaking action
    }
    
    prevValues.current.matchmakingStatus = isSearching;
  }, [online.matchmaking.isSearching]);

  // Helper function to determine rank
  const getRankName = (rating: number): string => {
    if (rating >= 2000) return 'Gold';
    if (rating >= 1500) return 'Silver';
    return 'Bronze';
  };
};

/**
 * Hook for triggering specific notifications from components
 */
export const useNotificationTriggers = () => {
  return {
    // Matchmaking notifications
    matchFound: (gameMode: string, waitTime?: number) => {
      notificationService.matchmaking.matchFound(gameMode, waitTime);
    },
    
    matchFailed: (reason?: string) => {
      notificationService.matchmaking.searchFailed(reason);
    },
    
    // Quest notifications
    questProgress: (questName: string, progress: number, target: number) => {
      notificationService.quest.progressUpdate(questName, progress, target);
    },
    
    questCompleted: (questName: string, rewards: any) => {
      notificationService.quest.completed(questName, rewards);
    },
    
    questRewardClaimed: (questName: string, rewards: any) => {
      notificationService.quest.rewardClaimed(questName, rewards);
    },
    
    // Rating notifications
    ratingUpdated: (oldRating: number, newRating: number, change: number) => {
      notificationService.rating.updated(oldRating, newRating, change);
    },
    
    rankUp: (newRank: string, newRating: number) => {
      notificationService.rating.rankUp(newRank, newRating);
    },
    
    winStreak: (streak: number) => {
      notificationService.rating.winStreak(streak);
    },
    
    // System notifications
    connectionLost: () => {
      notificationService.system.connectionLost();
    },
    
    connectionRestored: () => {
      notificationService.system.connectionRestored();
    },
    
    syncComplete: () => {
      notificationService.system.syncComplete();
    }
  };
};
