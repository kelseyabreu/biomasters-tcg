import React, { useEffect, useRef } from 'react';
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
} from '@ionic/react';
import {
  library,
  construct,
  settings,
  flash,
  gift,
  person,
  statsChart,
  trophy,
  school
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { getCollectionStats } from '@kelseyabreu/shared';
import { UserProfile } from '../components/UserProfile';
import { GuestRegistrationCTA } from '../components/GuestRegistrationCTA';
import { CollectionDebugPanel } from '../components/debug/CollectionDebugPanel';
import { useUILocalization } from '../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

const MainMenu: React.FC = () => {
  const { getUIText } = useUILocalization();

  // Component cleanup tracking
  const mountedRef = useRef(true);

  const {
    offlineCollection,
    isAuthenticated,
    firebaseUser,
    isGuestMode,
    refreshCollectionState
  } = useHybridGameStore();

  // Debug logging
  console.log('🔍 MainMenu state:', {
    isAuthenticated,
    isGuestMode,
    hasFirebaseUser: !!firebaseUser,
    hasOfflineCollection: !!offlineCollection
  });

  // Component lifecycle and cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Refresh collection state on mount to ensure UI is up to date
  useEffect(() => {
    if (isAuthenticated && mountedRef.current) {
      refreshCollectionState();
    }
  }, [isAuthenticated, refreshCollectionState]);



  // Calculate collection stats
  const { ownedSpecies, totalCards } = offlineCollection ?
    getCollectionStats(offlineCollection.cards_owned) :
    { ownedSpecies: 0, totalCards: 0 };
  const credits = offlineCollection?.eco_credits || 0;
  const pendingActions = offlineCollection?.action_queue.length || 0;

  // Authentication functions




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
                    disabled={!isAuthenticated}
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
                    disabled={!isAuthenticated || ownedSpecies < 8}
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
                    disabled={!isAuthenticated}
                  >
                    <IonIcon icon={gift} slot="start" />
                    {getUIText(UITextId.UI_OPEN_PACKS)}
                  </IonButton>
                </IonCol>
              </IonRow>

              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/challenge"
                    color="tertiary"
                    size="large"
                    disabled={!isAuthenticated}
                  >
                    <IonIcon icon={school} slot="start" />
                    Ecosystem Challenge
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    routerLink="/profile"
                    fill="outline"
                    size="large"
                    disabled={!isAuthenticated}
                  >
                    <IonIcon icon={trophy} slot="start" />
                    View Achievements
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




      </IonContent>
    </IonPage>
  );
};

export default MainMenu;
