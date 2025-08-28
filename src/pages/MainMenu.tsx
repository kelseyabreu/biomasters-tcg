import React, { useState } from 'react';
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

const MainMenu: React.FC = () => {
  const history = useHistory();
  const {
    offlineCollection,
    isAuthenticated,
    firebaseUser,
    isGuestMode,
    allSpeciesCards,
    speciesLoaded,
    signOutUser,
    initializeOfflineCollection
  } = useHybridGameStore();

  // Debug logging
  console.log('🔍 MainMenu state:', {
    isAuthenticated,
    isGuestMode,
    hasFirebaseUser: !!firebaseUser,
    hasOfflineCollection: !!offlineCollection
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Calculate collection stats
  const ownedSpecies = offlineCollection ? Object.keys(offlineCollection.species_owned).length : 0;
  const totalCards = offlineCollection ?
    Object.values(offlineCollection.species_owned).reduce((sum, species) => sum + species.quantity, 0) : 0;
  const credits = offlineCollection?.eco_credits || 0;
  const pendingActions = offlineCollection?.action_queue.length || 0;

  // Authentication functions

  const handleInitializeCollection = async () => {
    try {
      setToastMessage('Initializing collection...');
      setShowToast(true);
      await initializeOfflineCollection();
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
      setToastMessage('✅ Signed out successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Sign-out failed:', error);
      setToastMessage('❌ Failed to sign out. Please try again.');
      setShowToast(true);
    }
  };

  // Removed pack opening functionality - moved to dedicated PackOpening page

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>🧬 Biomasters TCG</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Welcome Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Welcome to Biomasters TCG</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>A hybrid offline/online trading card game with real biological data.</p>
            
            {isAuthenticated ? (
              <div style={{ marginTop: '15px' }}>
                <IonBadge color={isGuestMode ? "secondary" : "success"}>
                  <IonIcon icon={person} style={{ marginRight: '5px' }} />
                  {isGuestMode ? "Guest Mode" : "Signed In"}
                </IonBadge>
                {isGuestMode && (
                  <div style={{ marginTop: '10px' }}>
                    <IonText color="medium">
                      <small>Playing offline - progress won't sync</small>
                    </IonText>
                  </div>
                )}
                <div style={{ marginTop: '15px' }}>
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={handleSignOut}
                    color="medium"
                    size="small"
                  >
                    {isGuestMode ? "Exit Guest Mode" : "Sign Out"}
                  </IonButton>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <IonBadge color="warning">Not Signed In</IonBadge>
                <div style={{ marginTop: '15px' }}>
                  <IonButton
                    expand="block"
                    onClick={() => history.push('/auth')}
                    color="primary"
                    size="large"
                  >
                    <IonIcon icon={person} slot="start" />
                    Sign In / Continue as Guest
                  </IonButton>
                </div>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Collection Initialization for authenticated users without collection */}
        {isAuthenticated && !offlineCollection && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Initialize Your Collection</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>You're signed in! Now initialize your collection to start playing.</p>
              <IonButton
                expand="block"
                onClick={handleInitializeCollection}
                color="success"
                size="large"
              >
                <IonIcon icon={gift} slot="start" />
                Initialize Collection & Get Starter Pack
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
                Your Collection
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{ownedSpecies}</h2>
                      <p>Species Owned</p>
                    </div>
                  </IonCol>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{totalCards}</h2>
                      <p>Total Cards</p>
                    </div>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{credits}</h2>
                      <p>Eco Credits</p>
                    </div>
                  </IonCol>
                  <IonCol size="6">
                    <div style={{ textAlign: 'center' }}>
                      <h2>{pendingActions}</h2>
                      <p>Pending Sync</p>
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
            <IonCardTitle>Game Actions</IonCardTitle>
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
                    View Collection
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
                    Build Deck
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
                    {ownedSpecies >= 8 ? 'Start Battle' : 'Need 8+ Species'}
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
                    Open Packs
                  </IonButton>
                </IonCol>
              </IonRow>
              
              <IonRow>
                <IonCol size="12">
                  <IonButton 
                    expand="block" 
                    routerLink="/settings" 
                    fill="clear"
                  >
                    <IonIcon icon={settings} slot="start" />
                    Settings & Sync
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Getting Started */}
        {ownedSpecies === 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Getting Started</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Welcome! To start playing:</p>
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
