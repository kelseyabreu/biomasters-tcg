/**
 * Sync Status Component
 * Shows online/offline status and sync controls
 */

import React from 'react';
import { IonCard, IonCardContent, IonButton, IonIcon, IonText, IonBadge, IonSpinner } from '@ionic/react';
import { cloudDone, cloudOffline, sync, warning, checkmarkCircle } from 'ionicons/icons';

interface SyncStatusProps {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onSync: () => void;
  pendingActions?: number;
  lastSyncTime?: number;
  syncError?: string | null;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isOnline,
  syncStatus,
  onSync,
  pendingActions = 0,
  lastSyncTime,
  syncError
}) => {
  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSyncStatusColor = (): string => {
    if (!isOnline) return 'medium';
    switch (syncStatus) {
      case 'syncing': return 'primary';
      case 'success': return 'success';
      case 'error': return 'danger';
      default: return 'medium';
    }
  };

  const getSyncStatusIcon = () => {
    if (!isOnline) return cloudOffline;
    switch (syncStatus) {
      case 'syncing': return sync;
      case 'success': return checkmarkCircle;
      case 'error': return warning;
      default: return cloudDone;
    }
  };

  const getSyncStatusText = (): string => {
    if (!isOnline) return 'Offline';
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Synced';
      case 'error': return 'Sync Error';
      default: return 'Online';
    }
  };

  return (
    <IonCard className="sync-status-card">
      <IonCardContent>
        <div className="sync-status-content">
          {/* Status Indicator */}
          <div className="sync-status-indicator">
            <div className="status-icon">
              {syncStatus === 'syncing' ? (
                <IonSpinner name="crescent" color="primary" />
              ) : (
                <IonIcon 
                  icon={getSyncStatusIcon()} 
                  color={getSyncStatusColor()}
                  size="large"
                />
              )}
            </div>
            
            <div className="status-text">
              <IonText color={getSyncStatusColor()}>
                <h4>{getSyncStatusText()}</h4>
              </IonText>
              
              {isOnline && lastSyncTime && (
                <IonText color="medium">
                  <small>Last sync: {formatLastSync(lastSyncTime)}</small>
                </IonText>
              )}
              
              {!isOnline && (
                <IonText color="medium">
                  <small>Playing offline - changes will sync when online</small>
                </IonText>
              )}
            </div>
          </div>

          {/* Pending Actions Badge */}
          {pendingActions > 0 && (
            <IonBadge color="warning" className="pending-badge">
              {pendingActions} pending
            </IonBadge>
          )}

          {/* Sync Button */}
          <IonButton
            fill="outline"
            size="small"
            onClick={onSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="sync-button"
          >
            <IonIcon icon={sync} slot="start" />
            Sync Now
          </IonButton>
        </div>

        {/* Error Message */}
        {syncError && (
          <div className="sync-error">
            <IonText color="danger">
              <small>{syncError}</small>
            </IonText>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default SyncStatus;
