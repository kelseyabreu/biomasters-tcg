/**
 * Connectivity Indicator Component
 * Shows connection status, offline indicators, and sync progress
 */

import React from 'react';
import { IonIcon, IonBadge, IonSpinner } from '@ionic/react';
import {
  wifiOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  syncOutline,
  warningOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';
import './ConnectivityIndicator.css';

export interface ConnectivityIndicatorProps {
  /** Show detailed status text */
  showText?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Position in the UI */
  position?: 'header' | 'footer' | 'floating' | 'inline';
}

export const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({
  showText = false,
  size = 'medium',
  position = 'inline'
}) => {
  const {
    isOnline,
    isAuthenticated,
    syncStatus,
    lastSyncTime,
    pendingActions,
    syncError,
    isGuestMode
  } = useHybridGameStore();

  const { getUIText } = useUILocalization();

  // Format time ago helper
  const formatTimeAgo = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  // Determine the overall connectivity state
  const getConnectivityState = () => {
    if (!isOnline) {
      return {
        status: 'offline',
        icon: cloudOfflineOutline,
        color: 'medium',
        text: getUIText(UITextId.UI_OFFLINE),
        description: 'Working offline. Changes will sync when online.'
      };
    }

    if (!isAuthenticated) {
      return {
        status: 'disconnected',
        icon: cloudOfflineOutline,
        color: 'warning',
        text: 'Not signed in',
        description: 'Sign in to sync your progress across devices.'
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          status: 'syncing',
          icon: syncOutline,
          color: 'primary',
          text: getUIText(UITextId.UI_SYNCING),
          description: 'Synchronizing your data with the server.'
        };

      case 'success':
        const timeSinceSync = Date.now() - lastSyncTime;
        const isRecent = timeSinceSync < 60000; // Less than 1 minute

        return {
          status: 'synced',
          icon: cloudDoneOutline,
          color: 'success',
          text: isRecent ? getUIText(UITextId.UI_SYNC_COMPLETE) : getUIText(UITextId.UI_ONLINE),
          description: isRecent
            ? 'All changes synced successfully.'
            : `Last synced ${formatTimeAgo(timeSinceSync)} ago.`
        };

      case 'error':
        return {
          status: 'error',
          icon: warningOutline,
          color: 'danger',
          text: getUIText(UITextId.UI_SYNC_FAILED),
          description: syncError || getUIText(UITextId.UI_CLICK_TO_RETRY)
        };

      default:
        return {
          status: 'online',
          icon: wifiOutline,
          color: 'success',
          text: getUIText(UITextId.UI_ONLINE),
          description: 'Connected and ready to sync.'
        };
    }
  };

  const state = getConnectivityState();

  // Handle click to retry sync
  const handleClick = () => {
    if (state.status === 'error' && isOnline && isAuthenticated) {
      const store = useHybridGameStore.getState();
      store.syncCollection();
    }
  };

  const baseClasses = [
    'connectivity-indicator',
    `connectivity-indicator--${size}`,
    `connectivity-indicator--${position}`,
    `connectivity-indicator--${state.status}`
  ].join(' ');

  return (
    <div 
      className={baseClasses}
      onClick={handleClick}
      title={state.description}
      role={state.status === 'error' ? 'button' : undefined}
      tabIndex={state.status === 'error' ? 0 : undefined}
    >
      <div className="connectivity-indicator__icon">
        {syncStatus === 'syncing' ? (
          <IonSpinner name="crescent" />
        ) : (
          <IonIcon icon={state.icon} color={state.color} />
        )}
        
        {/* Pending actions badge */}
        {pendingActions > 0 && (
          <IonBadge 
            color="warning" 
            className="connectivity-indicator__badge"
          >
            {pendingActions}
          </IonBadge>
        )}
      </div>

      {showText && (
        <div className="connectivity-indicator__text">
          <span className="connectivity-indicator__status">
            {state.text}
          </span>
          {isGuestMode && (
            <span className="connectivity-indicator__guest">
              {getUIText(UITextId.UI_GUEST_MODE)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Sync Progress Component
 * Shows detailed sync progress and status
 */
export const SyncProgress: React.FC = () => {
  const {
    syncStatus,
    pendingActions,
    lastSyncTime,
    syncError,
    isOnline,
    isAuthenticated,
    syncCollection
  } = useHybridGameStore();

  if (!isAuthenticated || syncStatus === 'idle') {
    return null;
  }

  const handleRetrySync = () => {
    if (isOnline && isAuthenticated) {
      syncCollection();
    }
  };

  return (
    <div className="sync-progress">
      <div className="sync-progress__header">
        <ConnectivityIndicator showText size="small" />
        
        {syncStatus === 'syncing' && (
          <div className="sync-progress__spinner">
            <IonSpinner name="dots" />
          </div>
        )}
      </div>

      {pendingActions > 0 && (
        <div className="sync-progress__pending">
          <IonIcon icon={syncOutline} color="warning" />
          <span>
            {pendingActions} action{pendingActions !== 1 ? 's' : ''} pending sync
          </span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="sync-progress__error">
          <IonIcon icon={warningOutline} color="danger" />
          <span>{syncError || 'Sync failed'}</span>
          {isOnline && (
            <button 
              className="sync-progress__retry"
              onClick={handleRetrySync}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {syncStatus === 'success' && lastSyncTime > 0 && (
        <div className="sync-progress__success">
          <IonIcon icon={checkmarkCircleOutline} color="success" />
          <span>
            Last synced {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Offline Banner Component
 * Shows when the app is offline
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useHybridGameStore();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-banner">
      <IonIcon icon={cloudOfflineOutline} />
      <span>You're offline. Changes will sync when you reconnect.</span>
    </div>
  );
};

export default ConnectivityIndicator;
