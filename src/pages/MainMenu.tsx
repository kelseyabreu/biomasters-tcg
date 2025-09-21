import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
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
  IonText
} from '@ionic/react';
import { 
  library, 
  construct, 
  settings, 
  flash, 
  gift,
  person,
  statsChart
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { getCollectionStats } from '@kelseyabreu/shared';
import { UserProfile } from '../components/UserProfile';
import { GuestRegistrationCTA } from '../components/GuestRegistrationCTA';
import { CollectionDebugPanel } from '../components/debug/CollectionDebugPanel';
import { useUILocalization } from '../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

const MainMenu: React.FC = () => {
  const history = useHistory();
  const { getUIText } = useUILocalization();
  const {
    offlineCollection,
    isAuthenticated,
    firebaseUser,
    isGuestMode,
    allSpeciesCards,
    speciesLoaded,
    signOutUser,
    initializeOfflineCollection,
    refreshCollectionState
  } = useHybridGameStore();

  // Debug logging
  console.log('🔍 MainMenu state:', {
    isAuthenticated,
    isGuestMode,
    hasFirebaseUser: !!firebaseUser,
    hasOfflineCollection: !!offlineCollection
  });

  // Refresh collection state on mount to ensure UI is up to date
  useEffect(() => {
    if (isAuthenticated) {
      refreshCollectionState();
    }
  }, [isAuthenticated, refreshCollectionState]);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Calculate collection stats
  const { ownedSpecies, totalCards } = offlineCollection ?
    getCollectionStats(offlineCollection.cards_owned) :
    { ownedSpecies: 0, totalCards: 0 };
  const credits = offlineCollection?.eco_credits || 0;
  const pendingActions = offlineCollection?.action_queue.length || 0;

  // Authentication functions

  const handleInitializeCollection = async () => {
    try {
      setToastMessage('Initializing collection...');
      setShowToast(true);
      await initializeOfflineCollection();

      // Force refresh the collection state to ensure UI updates
      setTimeout(() => {
        refreshCollectionState();
      }, 500);

      setToastMessage('✅ Collection initialized! You received starter credits and cards!');
      setShowToast(true);
    } catch (error) {
      console.error('Failed to initialize collection:', error);
      setToastMessage('❌ Failed to initialize collection. Please try again.');
      setShowToast(true);
    }
  };

  const handleSignOut = async () => {
    try {
      setToastMessage('Signing out...');
      setShowToast(true);
      await signOutUser();
      // Navigation is handled in the store, no need for success toast
    } catch (error) {
      console.error('Sign-out failed:', error);
      setToastMessage('❌ Failed to sign out. Please try again.');
      setShowToast(true);
    }
  };

  // Removed pack opening functionality - moved to dedicated PackOpening page

  return (
    <IonPage data-testid="main-menu">
      <IonHeader>
        <IonToolbar>
          <IonTitle>🧬 Biomasters TCG</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Enhanced User Profile Section */}
        <UserProfile showStats={false} />

        {/* Guest Registration CTA - only shows for guest users */}
        <GuestRegistrationCTA variant="card" dismissible={true} />

        {/* Collection Initialization for authenticated users without collection */}
        {isAuthenticated && (!offlineCollection || (offlineCollection && getCollectionStats(offlineCollection.cards_owned).ownedSpecies === 0)) && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{getUIText(UITextId.UI_INITIALIZE_COLLECTION)}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{getUIText(UITextId.UI_INITIALIZE_DESCRIPTION)}</p>
              <IonButton
                expand="block"
                onClick={handleInitializeCollection}
                color="success"
                size="large"
              >
                <IonIcon icon={gift} slot="start" />
                {getUIText(UITextId.UI_INITIALIZE_BUTTON)}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Collection Stats */}
        {offlineCollection && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={statsChart} style={{ marginRight: '8px' }} />
                {getUIText(UITextId.UI_YOUR_COLLECTION)}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{ownedSpecies}</h2>
                      <p>{getUIText(UITextId.UI_SPECIES_OWNED)}</p>
                    </div>
                  </IonCol>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{totalCards}</h2>
                      <p>{getUIText(UITextId.UI_TOTAL_CARDS)}</p>
                    </div>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{credits}</h2>
                      <p>{getUIText(UITextId.UI_ECO_CREDITS)}</p>
                    </div>
                  </IonCol>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{pendingActions}</h2>
                      <p>{getUIText(UITextId.UI_PENDING_SYNC)}</p>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* Main Actions */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{getUIText(UITextId.UI_GAME_ACTIONS)}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/collection"
                    fill="outline"
                    size="large"
                  >
                    <IonIcon icon={library} slot="start" />
                    {getUIText(UITextId.UI_VIEW_COLLECTION)}
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/deck-builder"
                    fill="outline"
                    size="large"
                  >
                    <IonIcon icon={construct} slot="start" />
                    {getUIText(UITextId.UI_BUILD_DECK)}
                  </IonButton>
                </IonCol>
              </IonRow>

              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/battle"
                    color="primary"
                    size="large"
                    disabled={ownedSpecies < 8}
                  >
                    <IonIcon icon={flash} slot="start" />
                    {ownedSpecies >= 8 ? getUIText(UITextId.UI_START_BATTLE) : getUIText(UITextId.UI_NEED_SPECIES_BATTLE)}
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/packs"
                    color="secondary"
                    size="large"
                  >
                    <IonIcon icon={gift} slot="start" />
                    {getUIText(UITextId.UI_OPEN_PACKS)}
                  </IonButton>
                </IonCol>
              </IonRow>
              
              <IonRow>
                <IonCol size={isAuthenticated && !isGuestMode ? "6" : "12"}>
                  <IonButton
                    expand="block"
                    routerLink="/settings"
                    fill="clear"
                  >
                    <IonIcon icon={settings} slot="start" />
                    {getUIText(UITextId.UI_SETTINGS_SYNC)}
                  </IonButton>
                </IonCol>
                {isAuthenticated && !isGuestMode && (
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      routerLink="/profile"
                      fill="clear"
                      color="primary"
                    >
                      <IonIcon icon={person} slot="start" />
                      {getUIText(UITextId.UI_MY_PROFILE)}
                    </IonButton>
                  </IonCol>
                )}
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Getting Started */}
        {ownedSpecies === 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{getUIText(UITextId.UI_GETTING_STARTED)}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{getUIText(UITextId.UI_WELCOME_INSTRUCTIONS)}</p>
              <ol>
                <li>Go to <strong>Settings</strong> and sign in as guest</li>
                <li>Initialize your collection and open starter pack</li>
                <li>View your <strong>Collection</strong> to see your species</li>
                <li>Build a <strong>Deck</strong> with 8-12 cards</li>
                <li>Start a <strong>Battle</strong> against AI!</li>
              </ol>
            </IonCardContent>
          </IonCard>
        )}

        {/* Debug Panel - Remove in production */}
        <CollectionDebugPanel />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />


      </IonContent>
    </IonPage>
  );
};

export default MainMenu;
