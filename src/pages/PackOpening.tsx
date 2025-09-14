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
  flash,
  sparkles,
  trophy
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import PackOpeningModal from '../components/PackOpeningModal';
import './PackOpening.css';

const PackOpening: React.FC = () => {
  const {
    offlineCollection,
    isAuthenticated,
    isGuestMode,
    openPack,
    openStarterPack,
    hasStarterPack
  } = useHybridGameStore();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [showPackOpener, setShowPackOpener] = useState(false);
  const [selectedPackType, setSelectedPackType] = useState<string | null>(null);

  const credits = offlineCollection?.eco_credits || 0;

  // Pack configurations
  const packTypes = [
    {
      id: 'starter',
      name: 'Starter Pack',
      description: 'Get your first 5 species to begin your journey',
      cost: 0,
      cards: 5,
      icon: star,
      color: 'success',
      special: true,
      available: !hasStarterPack && isAuthenticated
    },
    {
      id: 'basic',
      name: 'Basic Pack',
      description: 'Common species with a chance for rare finds',
      cost: 50,
      cards: 3,
      icon: gift,
      color: 'primary',
      special: false,
      available: true
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      description: 'Higher chance of rare and endangered species',
      cost: 100,
      cards: 5,
      icon: diamond,
      color: 'secondary',
      special: false,
      available: true
    },
    {
      id: 'legendary',
      name: 'Legendary Pack',
      description: 'Guaranteed rare species and exclusive variants',
      cost: 200,
      cards: 7,
      icon: trophy,
      color: 'warning',
      special: false,
      available: true
    },
    {
      id: 'conservation',
      name: 'Conservation Pack',
      description: 'Focus on endangered species education',
      cost: 150,
      cards: 6,
      icon: sparkles,
      color: 'tertiary',
      special: true,
      available: true
    }
  ];

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
      setToastMessage('Please sign in first!');
      setShowToast(true);
      return;
    }

    if (!offlineCollection) {
      setToastMessage('Please initialize your collection first!');
      setShowToast(true);
      return;
    }

    const pack = packTypes.find(p => p.id === packType);
    if (!pack) return;

    if (packType !== 'starter' && credits < pack.cost) {
      setToastMessage(`Not enough credits! Need ${pack.cost}, have ${credits}`);
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
          <IonTitle>🎁 Open Packs</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Credits Display */}
        <IonCard>
          <IonCardContent>
            <div className="credits-display">
              <IonText color="primary">
                <h2>💰 Eco Credits: {credits}</h2>
              </IonText>
              <IonText color="medium">
                <p>Earn credits by playing battles and completing achievements</p>
              </IonText>
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
                          {pack.cards} Cards
                        </IonBadge>
                        {pack.cost > 0 && (
                          <IonBadge color={pack.color}>
                            {pack.cost} Credits
                          </IonBadge>
                        )}
                        {pack.cost === 0 && (
                          <IonBadge color="success">
                            FREE
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
                          ? 'Opening...' 
                          : pack.available 
                            ? `Open ${pack.name}`
                            : 'Not Available'
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
                <h3>🔐 Sign In Required</h3>
                <p>Please sign in to open packs and save your collection.</p>
              </IonText>
              <IonButton
                expand="block"
                routerLink="/auth"
                color="primary"
              >
                Go to Sign In
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Collection Initialization Notice */}
        {isAuthenticated && !offlineCollection && (
          <IonCard>
            <IonCardContent>
              <IonText color="warning">
                <h3>📦 Collection Not Initialized</h3>
                <p>
                  {isGuestMode
                    ? "Your guest collection needs to be initialized to start playing."
                    : "Your collection needs to be initialized to start playing."
                  }
                </p>
              </IonText>
              <IonButton
                expand="block"
                routerLink="/home"
                color="primary"
              >
                Go to Home to Initialize
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
