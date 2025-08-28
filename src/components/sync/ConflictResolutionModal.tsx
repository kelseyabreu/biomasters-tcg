import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';
import { warningOutline, checkmarkCircle, closeCircle } from 'ionicons/icons';

interface SyncConflict {
  action_id: string;
  reason: string;
  server_state: {
    credits: number;
  };
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: SyncConflict[];
  discardedActions: string[];
  onClose: () => void;
  onRetry: () => void;
}

const getConflictMessage = (reason: string): { title: string; description: string; icon: string; color: string } => {
  switch (reason) {
    case 'insufficient_credits':
      return {
        title: 'Insufficient Credits',
        description: 'You didn\'t have enough credits for this action when it was processed.',
        icon: warningOutline,
        color: 'warning'
      };
    case 'invalid_signature':
      return {
        title: 'Invalid Signature',
        description: 'This action could not be verified. It may have been tampered with.',
        icon: closeCircle,
        color: 'danger'
      };
    case 'duplicate_action':
      return {
        title: 'Duplicate Action',
        description: 'This action was already processed in a previous sync.',
        icon: warningOutline,
        color: 'warning'
      };
    case 'timestamp_too_old':
      return {
        title: 'Action Too Old',
        description: 'This action is more than 7 days old and cannot be processed.',
        icon: warningOutline,
        color: 'warning'
      };
    case 'starter_pack_already_opened':
      return {
        title: 'Starter Pack Already Opened',
        description: 'You have already opened your starter pack.',
        icon: warningOutline,
        color: 'warning'
      };
    case 'missing_signature':
      return {
        title: 'Missing Signature',
        description: 'This action is missing required security verification.',
        icon: closeCircle,
        color: 'danger'
      };
    default:
      return {
        title: 'Unknown Conflict',
        description: 'An unknown conflict occurred with this action.',
        icon: warningOutline,
        color: 'medium'
      };
  }
};

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflicts,
  discardedActions,
  onClose,
  onRetry
}) => {
  const hasConflicts = conflicts.length > 0 || discardedActions.length > 0;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sync Results</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {hasConflicts ? (
          <>
            <IonCard color="warning">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={warningOutline} style={{ marginRight: '8px' }} />
                  Sync Conflicts Detected
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  Some of your offline actions could not be processed. Your collection has been 
                  updated with the server's authoritative state.
                </IonText>
              </IonCardContent>
            </IonCard>

            {conflicts.length > 0 && (
              <>
                <h3>Conflicted Actions</h3>
                <IonList>
                  {conflicts.map((conflict, index) => {
                    const conflictInfo = getConflictMessage(conflict.reason);
                    return (
                      <IonItem key={index}>
                        <IonIcon 
                          icon={conflictInfo.icon} 
                          color={conflictInfo.color}
                          slot="start" 
                        />
                        <IonLabel>
                          <h3>{conflictInfo.title}</h3>
                          <p>{conflictInfo.description}</p>
                          <p>
                            <small>Action ID: {conflict.action_id}</small>
                          </p>
                        </IonLabel>
                      </IonItem>
                    );
                  })}
                </IonList>
              </>
            )}

            {discardedActions.length > 0 && (
              <>
                <h3>Discarded Actions</h3>
                <IonText color="medium">
                  <p>{discardedActions.length} actions were discarded due to conflicts.</p>
                </IonText>
              </>
            )}
          </>
        ) : (
          <IonCard color="success">
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={checkmarkCircle} style={{ marginRight: '8px' }} />
                Sync Successful
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText>
                All your offline actions were successfully synchronized with the server.
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <IonButton expand="block" fill="outline" onClick={onClose}>
            Close
          </IonButton>
          {hasConflicts && (
            <IonButton expand="block" onClick={onRetry}>
              Retry Sync
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ConflictResolutionModal;
