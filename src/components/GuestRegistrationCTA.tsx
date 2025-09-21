/**
 * Guest Registration Call-to-Action Component
 * Prominent banner encouraging guest users to secure their account
 */

import React, { useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import {
  shield,
  trophy,
  leaf,
  star,
  warning,
  close,
  checkmark
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { getCollectionStats } from '@kelseyabreu/shared';
import { AuthModal } from './auth/AuthModal';
import { useUILocalization } from '../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';
import './GuestRegistrationCTA.css';

interface GuestRegistrationCTAProps {
  variant?: 'banner' | 'card' | 'compact';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const GuestRegistrationCTA: React.FC<GuestRegistrationCTAProps> = ({
  variant = 'banner',
  dismissible = false,
  onDismiss
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { getUIText } = useUILocalization();

  const {
    isGuestMode,
    isAuthenticated,
    offlineCollection,
    guestId
  } = useHybridGameStore();

  // Don't show if not a guest user
  if (!isAuthenticated || !isGuestMode || isDismissed) {
    return null;
  }

  // Calculate collection stats for compelling messaging
  const { ownedSpecies, totalCards } = offlineCollection ?
    getCollectionStats(offlineCollection.cards_owned) :
    { ownedSpecies: 0, totalCards: 0 };
  const credits = offlineCollection?.eco_credits || 0;
  const xpPoints = offlineCollection?.xp_points || 0;

  // Generate compelling messages based on progress
  const getCtaMessage = () => {
    if (ownedSpecies === 0 && credits <= 100) {
      return {
        title: getUIText(UITextId.UI_PROTECT_PROGRESS),
        subtitle: getUIText(UITextId.UI_CREATE_FREE_ACCOUNT),
        urgency: "low" as const
      };
    } else if (ownedSpecies < 5) {
      return {
        title: getUIText(UITextId.UI_DONT_LOSE_CARDS),
        subtitle: getUIText(UITextId.UI_SAVE_SPECIES_CREDITS)
          .replace('{species}', ownedSpecies.toString())
          .replace('{credits}', credits.toString()),
        urgency: "medium" as const
      };
    } else {
      return {
        title: getUIText(UITextId.UI_SECURE_COLLECTION),
        subtitle: getUIText(UITextId.UI_PROTECT_SPECIES_CARDS_CREDITS)
          .replace('{species}', ownedSpecies.toString())
          .replace('{cards}', totalCards.toString())
          .replace('{credits}', credits.toString()),
        urgency: "high" as const
      };
    }
  };

  const ctaData = getCtaMessage();

  const handleProtectProgress = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // The store will automatically update the user state
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (variant === 'compact') {
    return (
      <div className="guest-cta-compact">
        <div className="cta-content-compact">
          <IonIcon icon={warning} color="warning" />
          <div className="cta-text-compact">
            <span className="cta-title-compact">{getUIText(UITextId.UI_UNSAVED_PROGRESS)}</span>
            <span className="cta-subtitle-compact">{getUIText(UITextId.UI_SECURE_YOUR_ACCOUNT)}</span>
          </div>
        </div>
        <IonButton
          size="small"
          color="warning"
          onClick={handleProtectProgress}
        >
          <IonIcon icon={shield} slot="start" />
          {getUIText(UITextId.UI_PROTECT)}
        </IonButton>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <IonCard className={`guest-cta-card urgency-${ctaData.urgency}`}>
        {dismissible && (
          <IonButton
            fill="clear"
            size="small"
            className="dismiss-button"
            onClick={handleDismiss}
          >
            <IonIcon icon={close} />
          </IonButton>
        )}

        <IonCardContent>
          <div className="cta-header">
            <IonIcon icon={shield} className="cta-icon" />
            <div className="cta-text">
              <h3 className="cta-title">{ctaData.title}</h3>
              <p className="cta-subtitle">{ctaData.subtitle}</p>
            </div>
          </div>

          {/* Progress Stats */}
          {(ownedSpecies > 0 || credits > 100) && (
            <div className="progress-stats">
              <IonGrid>
                <IonRow>
                  {ownedSpecies > 0 && (
                    <IonCol size="4">
                      <div className="stat-highlight">
                        <IonIcon icon={trophy} color="primary" />
                        <span className="stat-value">{ownedSpecies}</span>
                        <span className="stat-label">{getUIText(UITextId.UI_SPECIES)}</span>
                      </div>
                    </IonCol>
                  )}
                  {credits > 0 && (
                    <IonCol size="4">
                      <div className="stat-highlight">
                        <IonIcon icon={leaf} color="success" />
                        <span className="stat-value">{credits}</span>
                        <span className="stat-label">{getUIText(UITextId.UI_CREDITS)}</span>
                      </div>
                    </IonCol>
                  )}
                  {xpPoints > 0 && (
                    <IonCol size="4">
                      <div className="stat-highlight">
                        <IonIcon icon={star} color="warning" />
                        <span className="stat-value">{xpPoints}</span>
                        <span className="stat-label">XP</span>
                      </div>
                    </IonCol>
                  )}
                </IonRow>
              </IonGrid>
            </div>
          )}

          <IonButton
            expand="block"
            color="warning"
            size="large"
            onClick={handleProtectProgress}
            className="protection-button"
          >
            <IonIcon icon={shield} slot="start" />
            {getUIText(UITextId.UI_CREATE_FREE_ACCOUNT_BUTTON)}
          </IonButton>

          <div className="benefits-list">
            <div className="benefit-item">
              <IonIcon icon={checkmark} color="success" />
              <span>Play on any device</span>
            </div>
            <div className="benefit-item">
              <IonIcon icon={checkmark} color="success" />
              <span>Never lose progress</span>
            </div>
            <div className="benefit-item">
              <IonIcon icon={checkmark} color="success" />
              <span>Access leaderboards</span>
            </div>
          </div>
        </IonCardContent>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </IonCard>
    );
  }

  // Default banner variant
  return (
    <div className={`guest-cta-banner urgency-${ctaData.urgency}`}>
      {dismissible && (
        <IonButton
          fill="clear"
          size="small"
          className="dismiss-button"
          onClick={handleDismiss}
        >
          <IonIcon icon={close} />
        </IonButton>
      )}

      <div className="banner-content">
        <div className="banner-icon">
          <IonIcon icon={shield} />
        </div>
        
        <div className="banner-text">
          <h4 className="banner-title">{ctaData.title}</h4>
          <p className="banner-subtitle">{ctaData.subtitle}</p>
        </div>

        <IonButton
          color="warning"
          onClick={handleProtectProgress}
          className="banner-button"
        >
          <IonIcon icon={shield} slot="start" />
          {getUIText(UITextId.UI_SECURE_ACCOUNT)}
        </IonButton>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
