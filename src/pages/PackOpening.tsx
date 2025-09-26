/**
 * Pack Opening Page
 * Dedicated page for opening different types of booster packs
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonToast,
  IonText,
  IonBackButton,
  IonButtons,
} from '@ionic/react';
import {
  gift,
  star,
  diamond,
  sparkles,
  trophy
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import PackOpeningModal from '../components/PackOpeningModal';
import { useUILocalization } from '../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';
import { useRedemptionStatus } from '../hooks/useRedemptionStatus';
import './PackOpening.css';

const PackOpening: React.FC = () => {
  const {
    offlineCollection,
    isAuthenticated,
    isGuestMode
  } = useHybridGameStore();

  const { getUIText } = useUILocalization();
  const { canRedeemStarterPack, loading: redemptionLoading, status: redemptionStatus, error: redemptionError } = useRedemptionStatus();

  // Debug logging for pack opening
  console.log('📦 [PackOpening] Redemption status:', {
    canRedeemStarterPack,
    redemptionLoading,
    redemptionStatus,
    redemptionError,
    isAuthenticated,
    isGuestMode
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isOpening] = useState<string | null>(null);
  const [showPackOpener, setShowPackOpener] = useState(false);
  const [selectedPackType, setSelectedPackType] = useState<string | null>(null);

  const credits = offlineCollection?.eco_credits || 0;

  // Pack configurations - filter out starter pack if already claimed
  const allPackTypes = [
    {
      id: 'starter',
      name: getUIText(UITextId.UI_STARTER_PACK),
      description: getUIText(UITextId.UI_STARTER_PACK_DESCRIPTION),
      cost: 0,
      cards: 5,
      icon: star,
      color: 'success',
      special: true,
      available: canRedeemStarterPack && isAuthenticated && !redemptionLoading
    },
    {
      id: 'basic',
      name: getUIText(UITextId.UI_BASIC_PACK),
      description: getUIText(UITextId.UI_BASIC_PACK_DESCRIPTION),
      cost: 50,
      cards: 3,
      icon: gift,
      color: 'primary',
      special: false,
      available: isAuthenticated // ANONYMOUS users can't open packs
    },
    {
      id: 'premium',
      name: getUIText(UITextId.UI_PREMIUM_PACK),
      description: getUIText(UITextId.UI_PREMIUM_PACK_DESCRIPTION),
      cost: 100,
      cards: 5,
      icon: diamond,
      color: 'secondary',
      special: false,
      available: isAuthenticated // ANONYMOUS users can't open packs
    },
    {
      id: 'legendary',
      name: getUIText(UITextId.UI_LEGENDARY_PACK),
      description: getUIText(UITextId.UI_LEGENDARY_PACK_DESCRIPTION),
      cost: 200,
      cards: 7,
      icon: trophy,
      color: 'warning',
      special: false,
      available: true
    },
    {
      id: 'conservation',
      name: getUIText(UITextId.UI_CONSERVATION_PACK),
      description: getUIText(UITextId.UI_CONSERVATION_PACK_DESCRIPTION),
      cost: 150,
      cards: 6,
      icon: sparkles,
      color: 'tertiary',
      special: true,
      available: true
    },
    {
      id: 'stage10award',
      name: 'Stage 10 Award Pack',
      description: 'Exclusive reward for completing all Ecosystem Challenge levels',
      cost: 0,
      cards: 10,
      icon: trophy,
      color: 'warning',
      special: true,
      available: offlineCollection?.action_queue.some(action =>
        action.action === 'pack_opened' &&
        action.pack_type === 'stage10award'
      ) || false // Available if there's an unopened stage10award pack in queue
    }
  ];

  // Filter out starter pack if already claimed (don't show it at all)
  const packTypes = allPackTypes.filter(pack => {
    if (pack.id === 'starter') {
      const shouldShow = canRedeemStarterPack && isAuthenticated;
      console.log('📦 [PackOpening] Starter pack filter decision:', {
        packId: pack.id,
        canRedeemStarterPack,
        isAuthenticated,
        shouldShow,
        redemptionLoading
      });
      return shouldShow;
    }
    return true;
  });

  console.log('📦 [PackOpening] Final pack types after filtering:', {
    totalPacks: allPackTypes.length,
    filteredPacks: packTypes.length,
    packIds: packTypes.map(p => p.id),
    hasStarterPack: packTypes.some(p => p.id === 'starter')
  });

  const handleOpenPack = async (packType: string) => {
    console.log('🎁 [PackOpening] handleOpenPack called with packType:', packType);
    console.log('🎁 [PackOpening] Current state - isOpening:', isOpening);
    console.log('🎁 [PackOpening] Current state - isAuthenticated:', isAuthenticated);
    console.log('🎁 [PackOpening] Current state - isGuestMode:', isGuestMode);
    console.log('🎁 [PackOpening] localStorage before opening:', {
      userCollection: localStorage.getItem('userCollection'),
      userPacks: localStorage.getItem('userPacks'),
      syncQueue: localStorage.getItem('syncQueue')
    });

    // Prevent opening if already opening a pack
    if (isOpening) {
      console.log('🚫 Pack opening already in progress, ignoring duplicate call');
      return;
    }

    if (!isAuthenticated) {
      setToastMessage(getUIText(UITextId.UI_PLEASE_SIGN_IN_FIRST));
      setShowToast(true);
      return;
    }

    if (!offlineCollection) {
      setToastMessage(getUIText(UITextId.UI_PLEASE_INITIALIZE_COLLECTION));
      setShowToast(true);
      return;
    }

    const pack = packTypes.find(p => p.id === packType);
    if (!pack) return;

    if (packType !== 'starter' && credits < pack.cost) {
      setToastMessage(getUIText(UITextId.UI_NOT_ENOUGH_CREDITS).replace('{cost}', pack.cost.toString()).replace('{credits}', credits.toString()));
      setShowToast(true);
      return;
    }

    console.log(`🎁 Initiating ${packType} pack opening...`);
    console.log('🎁 [PackOpening] About to show pack opener modal');

    // Show the pack opening modal with visual effects
    setSelectedPackType(packType);
    setShowPackOpener(true);

    console.log('🎁 [PackOpening] Pack opener modal state set to true');
  };

  return (
    <IonPage data-testid="pack-opening-view">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>{getUIText(UITextId.UI_OPEN_PACKS)}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Credits Display */}
        <IonCard>
          <IonCardContent>
            <div className="credits-display">
              <IonText color="primary">
                <h2>{getUIText(UITextId.UI_ECO_CREDITS)}: {credits}</h2>
              </IonText>
              <IonText color="medium">
                <p>{getUIText(UITextId.UI_EARN_CREDITS_DESCRIPTION)}</p>
              </IonText>
              {redemptionLoading && isAuthenticated && (
                <IonText color="medium">
                  <p><em>Loading redemption status...</em></p>
                </IonText>
              )}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Pack Selection Grid */}
        <IonGrid>
          <IonRow>
            {packTypes.map((pack) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={pack.id}>
                <IonCard 
                  className={`pack-card ${pack.special ? 'special-pack' : ''} ${!pack.available ? 'unavailable' : ''}`}
                >
                  <IonCardHeader>
                    <div className="pack-header">
                      <IonIcon 
                        icon={pack.icon} 
                        size="large" 
                        color={pack.color}
                        className="pack-icon"
                      />
                      <IonCardTitle>{pack.name}</IonCardTitle>
                    </div>
                  </IonCardHeader>
                  
                  <IonCardContent>
                    <div className="pack-details">
                      <IonText color="medium">
                        <p>{pack.description}</p>
                      </IonText>
                      
                      <div className="pack-stats">
                        <IonBadge color="primary">
                          {pack.cards} {getUIText(UITextId.UI_CARDS)}
                        </IonBadge>
                        {pack.cost > 0 && (
                          <IonBadge color={pack.color}>
                            {pack.cost} {getUIText(UITextId.UI_CREDITS)}
                          </IonBadge>
                        )}
                        {pack.cost === 0 && (
                          <IonBadge color="success">
                            {getUIText(UITextId.UI_FREE)}
                          </IonBadge>
                        )}
                      </div>

                      <IonButton
                        expand="block"
                        color={pack.color}
                        onClick={() => handleOpenPack(pack.id)}
                        disabled={
                          !pack.available || 
                          !isAuthenticated || 
                          (pack.cost > 0 && credits < pack.cost) ||
                          isOpening === pack.id
                        }
                        className="open-pack-button"
                      >
                        <IonIcon 
                          icon={isOpening === pack.id ? sparkles : pack.icon} 
                          slot="start" 
                        />
                        {isOpening === pack.id
                          ? getUIText(UITextId.UI_OPENING)
                          : pack.available
                            ? pack.id === 'starter'
                              ? 'Claim Starter Pack'
                              : getUIText(UITextId.UI_OPEN_PACK).replace('{packName}', pack.name)
                            : pack.id === 'starter'
                              ? 'Already Claimed'
                              : getUIText(UITextId.UI_NOT_AVAILABLE)
                        }
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <IonCard>
            <IonCardContent>
              <IonText color="warning">
                <h3>{getUIText(UITextId.UI_SIGN_IN_REQUIRED)}</h3>
                <p>{getUIText(UITextId.UI_SIGN_IN_TO_OPEN_PACKS)}</p>
              </IonText>
              <IonButton
                expand="block"
                routerLink="/auth"
                color="primary"
              >
                {getUIText(UITextId.UI_GO_TO_SIGN_IN)}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}



        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>

      {/* Pack Opening Modal */}
      {selectedPackType && (
        <PackOpeningModal
          isOpen={showPackOpener}
          onClose={() => {
            setShowPackOpener(false);
            setSelectedPackType(null);
          }}
          packType={selectedPackType}
          packName={packTypes.find(p => p.id === selectedPackType)?.name || 'Pack'}
        />
      )}
    </IonPage>
  );
};

export default PackOpening;
