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
  const [globalResolution, setGlobalResolution] = useState<'server_wins' | 'user_wins'>('server_wins');
  const [isResolving, setIsResolving] = useState(false);



  // Log modal state changes for debugging
  React.useEffect(() => {
    console.log('🔄 [CONFLICT-UI] ConflictResolutionModal rendered with:', {
      isOpen,
      conflictsCount: syncConflicts?.length || 0,
      conflicts: syncConflicts,
      globalResolution,
      isResolving,
      timestamp: new Date().toISOString()
    });
  }, [isOpen, syncConflicts, globalResolution, isResolving]);

  const handleResolveConflicts = async () => {
    console.log('🔄 [CONFLICT-UI] Resolving conflicts with global resolution...', {
      conflictsCount: syncConflicts.length,
      globalResolution,
      timestamp: new Date().toISOString()
    });

    setIsResolving(true);
    try {
      // Apply global resolution to all conflicts
      const conflictResolutions: Record<string, 'server_wins' | 'user_wins' | 'merge'> = {};

      syncConflicts.forEach((conflict: SyncConflict) => {
        conflictResolutions[conflict.action_id] = globalResolution;
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
              {syncConflicts.length} offline action{syncConflicts.length !== 1 ? 's' : ''} conflict{syncConflicts.length !== 1 ? '' : 's'} with the server state.
              Choose how to resolve all conflicts:
            </p>
          </div>
        </div>

        {/* Conflict Summary */}
        <IonCard className="conflict-section">
          <IonCardHeader>
            <IonCardTitle>
              Conflicted Actions Summary
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {syncConflicts.map((conflict: SyncConflict) => (
                <IonItem key={conflict.action_id}>
                  <IonIcon
                    icon={getConflictIcon(conflict.reason)}
                    color="warning"
                    slot="start"
                  />
                  <IonLabel>
                    <h3>{conflict.user_action.action.replace('_', ' ').toUpperCase()}</h3>
                    <p>{syncService.getConflictExplanation(conflict)}</p>
                  </IonLabel>
                  <IonBadge color="warning" slot="end">
                    {conflict.reason.replace('_', ' ')}
                  </IonBadge>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Global Resolution Choice */}
        <IonCard className="conflict-section">
          <IonCardHeader>
            <IonCardTitle>
              Choose Resolution for All Conflicts
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonRadioGroup
              value={globalResolution}
              onIonChange={(e) => setGlobalResolution(e.detail.value)}
            >
              <IonItem data-testid="conflict-option-server">
                <IonIcon icon={serverOutline} slot="start" color="primary" />
                <IonLabel>
                  <h3>Keep Server Data</h3>
                  <p>Discard all {syncConflicts.length} offline action{syncConflicts.length !== 1 ? 's' : ''} and keep server state</p>
                </IonLabel>
                <IonRadio slot="end" value="server_wins" data-testid="conflict-radio-server" />
              </IonItem>

              <IonItem data-testid="conflict-option-user">
                <IonIcon icon={phonePortraitOutline} slot="start" color="secondary" />
                <IonLabel>
                  <h3>Keep My Data</h3>
                  <p>Apply all {syncConflicts.length} offline action{syncConflicts.length !== 1 ? 's' : ''} and override server data</p>
                </IonLabel>
                <IonRadio slot="end" value="user_wins" data-testid="conflict-radio-user" />
              </IonItem>
            </IonRadioGroup>
          </IonCardContent>
        </IonCard>

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
