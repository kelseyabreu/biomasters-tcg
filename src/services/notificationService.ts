/**
 * Real-time notification service for online multiplayer features
 * Handles matchmaking updates, quest completions, rating changes, and other events
 */

export interface NotificationData {
  id: string;
  type: 'matchmaking' | 'quest' | 'rating' | 'achievement' | 'system';
  title: string;
  message: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  duration?: number;
  persistent?: boolean;
  timestamp: number;
  data?: any;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  color?: string;
}

class NotificationService {
  private listeners: ((notification: NotificationData) => void)[] = [];
  private activeNotifications: NotificationData[] = [];
  private maxNotifications = 5;

  /**
   * Subscribe to notification events
   */
  subscribe(listener: (notification: NotificationData) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Show a notification
   */
  show(notification: Omit<NotificationData, 'id' | 'timestamp'>): string {
    const fullNotification: NotificationData = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now(),
      duration: notification.duration ?? 5000,
      color: notification.color ?? 'primary'
    };

    // Add to active notifications
    this.activeNotifications.unshift(fullNotification);
    
    // Limit number of active notifications
    if (this.activeNotifications.length > this.maxNotifications) {
      this.activeNotifications = this.activeNotifications.slice(0, this.maxNotifications);
    }

    // Notify all listeners
    this.listeners.forEach(listener => listener(fullNotification));

    // Auto-dismiss if not persistent
    if (!fullNotification.persistent && fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(fullNotification.id);
      }, fullNotification.duration);
    }

    return fullNotification.id;
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    this.activeNotifications = this.activeNotifications.filter(n => n.id !== id);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.activeNotifications = [];
  }

  /**
   * Get active notifications
   */
  getActive(): NotificationData[] {
    return [...this.activeNotifications];
  }

  /**
   * Matchmaking-specific notifications
   */
  matchmaking = {
    searchStarted: (gameMode: string) => {
      return this.show({
        type: 'matchmaking',
        title: 'Matchmaking Started',
        message: `Searching for ${gameMode} match...`,
        icon: 'search',
        color: 'primary',
        persistent: true
      });
    },

    matchFound: (gameMode: string, estimatedTime?: number) => {
      return this.show({
        type: 'matchmaking',
        title: 'Match Found!',
        message: `${gameMode} match ready${estimatedTime ? ` (${Math.round(estimatedTime/1000)}s)` : ''}`,
        icon: 'checkmark-circle',
        color: 'success',
        duration: 3000
      });
    },

    searchCancelled: () => {
      return this.show({
        type: 'matchmaking',
        title: 'Search Cancelled',
        message: 'Matchmaking search has been cancelled',
        icon: 'close-circle',
        color: 'warning',
        duration: 2000
      });
    },

    searchFailed: (reason?: string) => {
      return this.show({
        type: 'matchmaking',
        title: 'Matchmaking Failed',
        message: reason || 'Unable to find a match at this time',
        icon: 'alert-circle',
        color: 'danger',
        duration: 4000
      });
    }
  };

  /**
   * Quest-specific notifications
   */
  quest = {
    progressUpdate: (questName: string, progress: number, target: number) => {
      return this.show({
        type: 'quest',
        title: 'Quest Progress',
        message: `${questName}: ${progress}/${target}`,
        icon: 'star',
        color: 'secondary',
        duration: 2000
      });
    },

    completed: (questName: string, rewards: any) => {
      const rewardText = this.formatRewards(rewards);
      return this.show({
        type: 'quest',
        title: 'Quest Completed!',
        message: `${questName} - ${rewardText}`,
        icon: 'trophy',
        color: 'success',
        duration: 4000
      });
    },

    rewardClaimed: (questName: string, rewards: any) => {
      const rewardText = this.formatRewards(rewards);
      return this.show({
        type: 'quest',
        title: 'Reward Claimed',
        message: `${questName}: ${rewardText}`,
        icon: 'gift',
        color: 'success',
        duration: 3000
      });
    },

    streakUpdate: (streak: number) => {
      return this.show({
        type: 'quest',
        title: 'Quest Streak!',
        message: `${streak} day quest streak`,
        icon: 'flame',
        color: 'warning',
        duration: 3000
      });
    }
  };

  /**
   * Rating-specific notifications
   */
  rating = {
    updated: (oldRating: number, newRating: number, change: number) => {
      const isIncrease = change > 0;
      return this.show({
        type: 'rating',
        title: `Rating ${isIncrease ? 'Increased' : 'Decreased'}`,
        message: `${oldRating} → ${newRating} (${isIncrease ? '+' : ''}${change})`,
        icon: isIncrease ? 'trending-up' : 'trending-down',
        color: isIncrease ? 'success' : 'warning',
        duration: 4000
      });
    },

    rankUp: (newRank: string, newRating: number) => {
      return this.show({
        type: 'rating',
        title: 'Rank Up!',
        message: `Promoted to ${newRank} (${newRating})`,
        icon: 'medal',
        color: 'warning',
        duration: 5000
      });
    },

    winStreak: (streak: number) => {
      return this.show({
        type: 'rating',
        title: 'Win Streak!',
        message: `${streak} wins in a row`,
        icon: 'flash',
        color: 'success',
        duration: 3000
      });
    }
  };

  /**
   * System notifications
   */
  system = {
    connectionLost: () => {
      return this.show({
        type: 'system',
        title: 'Connection Lost',
        message: 'Switched to offline mode',
        icon: 'wifi-off',
        color: 'warning',
        persistent: true
      });
    },

    connectionRestored: () => {
      return this.show({
        type: 'system',
        title: 'Connection Restored',
        message: 'Back online',
        icon: 'wifi',
        color: 'success',
        duration: 2000
      });
    },

    syncComplete: () => {
      // Toast notification removed per user request
      return null;
    }
  };

  /**
   * Helper methods
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatRewards(rewards: any): string {
    if (!rewards) return 'Rewards claimed';

    const parts: string[] = [];
    if (rewards.eco_credits) parts.push(`${rewards.eco_credits} credits`);
    if (rewards.xp_points) parts.push(`${rewards.xp_points} XP`);
    if (rewards.packs) parts.push(`${rewards.packs} packs`);

    return parts.join(', ') || 'Rewards claimed';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
