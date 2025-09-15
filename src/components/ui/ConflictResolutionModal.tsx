/**
 * Conflict Resolution Modal Component
 * Handles sync conflicts with user choice mechanisms
 */

import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonText,
  IonCheckbox
} from '@ionic/react';
import {
  closeOutline,
  warningOutline,
  serverOutline,
  phonePortraitOutline,
  gitMergeOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { syncService, SyncConflict } from '../../services/syncService';
import './ConflictResolutionModal.css';

export interface ConflictResolutionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onDismiss
}) => {
  const { syncConflicts, dismissSyncConflicts } = useHybridGameStore();
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);

  // Initialize resolutions with automatic resolutions
  React.useEffect(() => {
    if (syncConflicts.length > 0) {
      const initialResolutions: Record<string, string> = {};
      syncConflicts.forEach((conflict: SyncConflict) => {
        // Use existing resolution if it's not manual
        if (conflict.resolution !== 'manual') {
          initialResolutions[conflict.action_id] = conflict.resolution;
        } else {
          // Default to server wins for manual conflicts
          initialResolutions[conflict.action_id] = 'server_wins';
        }
      });
      setResolutions(initialResolutions);
    }
  }, [syncConflicts]);

  // Log modal state changes for debugging
  React.useEffect(() => {
    console.log('🔄 [CONFLICT-UI] ConflictResolutionModal rendered with:', {
      isOpen,
      conflictsCount: syncConflicts?.length || 0,
      conflicts: syncConflicts,
      resolutions,
      isResolving,
      timestamp: new Date().toISOString()
    });
  }, [isOpen, syncConflicts, resolutions, isResolving]);

  const handleResolutionChange = (actionId: string, resolution: string) => {
    setResolutions(prev => ({
      ...prev,
      [actionId]: resolution
    }));
  };

  const handleResolveConflicts = async () => {
    console.log('🔄 [CONFLICT-UI] Resolving conflicts...', {
      conflictsCount: syncConflicts.length,
      resolutions,
      timestamp: new Date().toISOString()
    });

    setIsResolving(true);
    try {
      // Prepare conflict resolutions for sync service
      const conflictResolutions: Record<string, 'server_wins' | 'user_wins' | 'merge'> = {};

      syncConflicts.forEach((conflict: SyncConflict) => {
        const resolution = resolutions[conflict.action_id] || 'server_wins';
        conflictResolutions[conflict.action_id] = resolution as 'server_wins' | 'user_wins' | 'merge';
      });

      console.log('✅ [CONFLICT-UI] Prepared conflict resolutions:', {
        resolutions: conflictResolutions,
        conflictCount: Object.keys(conflictResolutions).length
      });

      // Dismiss modal first to prevent UI issues
      dismissSyncConflicts();
      onDismiss();

      console.log('🔄 [CONFLICT-UI] Modal dismissed, triggering sync with resolutions...');

      // Trigger sync with the user's conflict resolutions
      const store = useHybridGameStore.getState();
      const result = await store.syncCollection(conflictResolutions);

      console.log('✅ [CONFLICT-UI] Sync completed after conflict resolution:', {
        success: result.success,
        remainingConflicts: result.conflicts?.length || 0,
        discardedActions: result.discarded_actions?.length || 0
      });

    } catch (error) {
      console.error('❌ [CONFLICT-UI] Failed to resolve conflicts:', error);
      // Re-show conflicts if sync failed
      const store = useHybridGameStore.getState();
      store.resolveSyncConflicts(syncConflicts);
    } finally {
      setIsResolving(false);
    }
  };

  const handleDismiss = () => {
    dismissSyncConflicts();
    onDismiss();
  };

  const getConflictIcon = (reason: string) => {
    switch (reason) {
      case 'insufficient_credits':
      case 'card_not_owned':
        return warningOutline;
      case 'version_mismatch':
        return gitMergeOutline;
      case 'timestamp_too_old':
      case 'duplicate_action':
        return informationCircleOutline;
      default:
        return warningOutline;
    }
  };

  const getConflictSeverity = (reason: string): 'low' | 'medium' | 'high' => {
    switch (reason) {
      case 'duplicate_action':
      case 'timestamp_too_old':
        return 'low';
      case 'insufficient_credits':
      case 'invalid_pack_type':
        return 'medium';
      case 'version_mismatch':
      case 'card_not_owned':
        return 'high';
      default:
        return 'medium';
    }
  };

  const manualConflicts = syncConflicts.filter((c: SyncConflict) => c.resolution === 'manual');
  const autoConflicts = syncConflicts.filter((c: SyncConflict) => c.resolution !== 'manual');

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDismiss} data-testid="conflict-resolution-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sync Conflicts</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={handleDismiss} data-testid="conflict-modal-close">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="conflict-resolution-content">
        <div className="conflict-resolution-header">
          <IonIcon icon={warningOutline} color="warning" />
          <div>
            <h2>Sync Conflicts Detected</h2>
            <p>
              Some of your offline actions conflict with the server state. 
              Please review and resolve these conflicts to continue syncing.
            </p>
          </div>
        </div>

        {/* Auto-resolved conflicts */}
        {autoConflicts.length > 0 && (
          <IonCard className="conflict-section">
            <IonCardHeader>
              <IonCardTitle>
                Automatically Resolved ({autoConflicts.length})
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {autoConflicts.map((conflict: SyncConflict) => (
                  <IonItem key={conflict.action_id}>
                    <IonIcon 
                      icon={getConflictIcon(conflict.reason)} 
                      color="success" 
                      slot="start" 
                    />
                    <IonLabel>
                      <h3>{syncService.getConflictExplanation(conflict)}</h3>
                      <p>Resolution: {conflict.resolution.replace('_', ' ')}</p>
                    </IonLabel>
                    <IonBadge color="success" slot="end">
                      Auto
                    </IonBadge>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Manual conflicts requiring user input */}
        {manualConflicts.length > 0 && (
          <IonCard className="conflict-section">
            <IonCardHeader>
              <IonCardTitle>
                Requires Your Decision ({manualConflicts.length})
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {manualConflicts.map((conflict: SyncConflict) => (
                <div key={conflict.action_id} className="manual-conflict">
                  <div className="conflict-header">
                    <IonIcon 
                      icon={getConflictIcon(conflict.reason)} 
                      color={getConflictSeverity(conflict.reason) === 'high' ? 'danger' : 'warning'}
                    />
                    <div className="conflict-info">
                      <h3>{syncService.getConflictExplanation(conflict)}</h3>
                      <IonText color="medium">
                        <p>Action: {conflict.user_action.action}</p>
                      </IonText>
                    </div>
                    <IonBadge 
                      color={
                        getConflictSeverity(conflict.reason) === 'high' ? 'danger' :
                        getConflictSeverity(conflict.reason) === 'medium' ? 'warning' : 'medium'
                      }
                    >
                      {getConflictSeverity(conflict.reason)}
                    </IonBadge>
                  </div>

                  <IonRadioGroup
                    value={resolutions[conflict.action_id] || 'server_wins'}
                    onIonChange={(e) => handleResolutionChange(conflict.action_id, e.detail.value)}
                  >
                    <IonItem data-testid="conflict-option-server">
                      <IonIcon icon={serverOutline} slot="start" color="primary" />
                      <IonLabel>
                        <h3>Use Server Version</h3>
                        <p>Keep the server's data and discard your offline action</p>
                      </IonLabel>
                      <IonRadio slot="end" value="server_wins" data-testid="conflict-radio-server" />
                    </IonItem>

                    <IonItem data-testid="conflict-option-user">
                      <IonIcon icon={phonePortraitOutline} slot="start" color="secondary" />
                      <IonLabel>
                        <h3>Use My Version</h3>
                        <p>Apply your offline action and override server data</p>
                      </IonLabel>
                      <IonRadio slot="end" value="user_wins" data-testid="conflict-radio-user" />
                    </IonItem>

                    {conflict.reason === 'version_mismatch' && (
                      <IonItem>
                        <IonIcon icon={gitMergeOutline} slot="start" color="tertiary" />
                        <IonLabel>
                          <h3>Merge Both</h3>
                          <p>Attempt to combine both versions intelligently</p>
                        </IonLabel>
                        <IonRadio slot="end" value="merge" />
                      </IonItem>
                    )}
                  </IonRadioGroup>
                </div>
              ))}
            </IonCardContent>
          </IonCard>
        )}

        {/* Resolution actions */}
        <div className="conflict-actions">
          <IonButton
            expand="block"
            onClick={handleResolveConflicts}
            disabled={isResolving}
            data-testid="conflict-apply-button"
          >
            {isResolving ? 'Resolving...' : 'Apply Resolutions & Sync'}
          </IonButton>

          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            onClick={handleDismiss}
            disabled={isResolving}
            data-testid="conflict-dismiss-button"
          >
            Dismiss (Keep Offline)
          </IonButton>
        </div>

        {/* Help text */}
        <div className="conflict-help">
          <IonText color="medium">
            <p>
              <strong>Server Version:</strong> Recommended for most conflicts. 
              Ensures data consistency across all your devices.
            </p>
            <p>
              <strong>My Version:</strong> Use when you're certain your offline 
              action is correct and should override the server.
            </p>
            <p>
              <strong>Merge:</strong> Available for compatible conflicts. 
              Attempts to preserve both changes when possible.
            </p>
          </IonText>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ConflictResolutionModal;
