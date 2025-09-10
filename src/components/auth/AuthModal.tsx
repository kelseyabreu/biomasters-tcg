/**
 * Authentication Modal Component
 * Modal wrapper for the AuthForm component with guest conversion support
 */

import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonText,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge
} from '@ionic/react';
import { close, shield, trophy, leaf, star } from 'ionicons/icons';
import { AuthForm } from './AuthForm';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { getCollectionStats } from '@shared/utils/cardIdHelpers';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'auth' | 'guest-conversion';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'auth'
}) => {
  const {
    isGuestMode,
    offlineCollection,
    guestId
  } = useHybridGameStore();

  // Calculate collection stats for guest conversion messaging
  const { ownedSpecies, totalCards } = offlineCollection ?
    getCollectionStats(offlineCollection.cards_owned) :
    { ownedSpecies: 0, totalCards: 0 };
  const credits = offlineCollection?.eco_credits || 0;
  const xpPoints = offlineCollection?.xp_points || 0;

  // Determine if this is a guest conversion flow
  const isGuestConversion = mode === 'guest-conversion' || isGuestMode;

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const getModalTitle = () => {
    if (isGuestConversion) {
      return 'Protect Your Progress';
    }
    return 'Authentication';
  };

  const getGuestUsername = () => {
    if (!guestId) return 'Guest User';
    const shortId = guestId.slice(-6).toUpperCase();
    return `Guest-${shortId}`;
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} data-testid="auth-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{getModalTitle()}</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            onClick={onClose}
          >
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Guest Conversion Header */}
        {isGuestConversion && (
          <IonCard className="conversion-info-card">
            <IonCardContent>
              <div className="conversion-header">
                <IonIcon icon={shield} color="warning" size="large" />
                <div className="conversion-text">
                  <h3>Create an account to permanently save:</h3>
                  <IonText color="medium">
                    <p>Your collection as <strong>{getGuestUsername()}</strong></p>
                  </IonText>
                </div>
              </div>

              {/* Progress Stats */}
              {(ownedSpecies > 0 || credits > 100) && (
                <div className="progress-preview">
                  <IonGrid>
                    <IonRow>
                      {ownedSpecies > 0 && (
                        <IonCol size="3">
                          <div className="stat-preview">
                            <IonIcon icon={trophy} color="primary" />
                            <div className="stat-value">{ownedSpecies}</div>
                            <div className="stat-label">Species</div>
                          </div>
                        </IonCol>
                      )}
                      {totalCards > 0 && (
                        <IonCol size="3">
                          <div className="stat-preview">
                            <IonIcon icon={trophy} color="secondary" />
                            <div className="stat-value">{totalCards}</div>
                            <div className="stat-label">Cards</div>
                          </div>
                        </IonCol>
                      )}
                      {credits > 0 && (
                        <IonCol size="3">
                          <div className="stat-preview">
                            <IonIcon icon={leaf} color="success" />
                            <div className="stat-value">{credits}</div>
                            <div className="stat-label">Credits</div>
                          </div>
                        </IonCol>
                      )}
                      {xpPoints > 0 && (
                        <IonCol size="3">
                          <div className="stat-preview">
                            <IonIcon icon={star} color="warning" />
                            <div className="stat-value">{xpPoints}</div>
                            <div className="stat-label">XP</div>
                          </div>
                        </IonCol>
                      )}
                    </IonRow>
                  </IonGrid>
                </div>
              )}

              <div className="conversion-benefits">
                <IonBadge color="success">✓ Keep all progress</IonBadge>
                <IonBadge color="success">✓ Play on any device</IonBadge>
                <IonBadge color="success">✓ Never lose data</IonBadge>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        <AuthForm
          onSuccess={handleSuccess}
          onCancel={onClose}
          isGuestConversion={isGuestConversion}
        />
      </IonContent>
    </IonModal>
  );
};
