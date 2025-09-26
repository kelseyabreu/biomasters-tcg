import React, { useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonList } from '@ionic/react';
import { useHybridGameStore } from '../state/hybridGameStore';
import { getCollectionStats } from '@kelseyabreu/shared';

/**
 * System status component for monitoring the hybrid game store
 */
export const SystemStatus: React.FC = () => {


  const {
    firebaseUser,
    isAuthenticated,
    userId,
    offlineCollection,
    allSpeciesCards,
    speciesLoaded,
    isOnline,
    syncStatus,
    syncCollection,
    signInAsGuest,
    signOutUser,
    handleNewUser,
    openPack
  } = useHybridGameStore();

  const handleSignInAsGuest = async () => {
    try {
      await signInAsGuest();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleOpenPack = async (packType: string) => {
    try {
      const cards = await openPack(packType);
      console.log(`Opened ${packType} pack:`, cards);
    } catch (error) {
      console.error('Pack opening failed:', error);
    }
  };



  const handleSetupNewUser = async () => {
    try {
      await handleNewUser();
    } catch (error) {
      console.error('New user setup failed:', error);
    }
  };

  const handleSync = async () => {
    try {
      await syncCollection();
      // Conflicts are now handled by the main ConflictResolutionModal in App.tsx
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>📊 System Status</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Authentication Status</h3>
                <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                <p>User ID: {userId || 'None'}</p>
                <p>Firebase User: {firebaseUser ? '✅ Connected' : '❌ Not connected'}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Collection Status</h3>
                <p>Collection: {offlineCollection ? '✅ Initialized' : '❌ Not initialized'}</p>
                <p>Species Loaded: {speciesLoaded ? `✅ ${allSpeciesCards.length} cards` : '❌ Not loaded'}</p>
                <p>Credits: {offlineCollection?.eco_credits || 0}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Collection Details</h3>
                {offlineCollection ? (
                  <>
                    <p>Unique Species: {getCollectionStats(offlineCollection.cards_owned).ownedSpecies}</p>
                    <p>Total Cards: {getCollectionStats(offlineCollection.cards_owned).totalCards}</p>
                    <p>Pending Actions: {offlineCollection.action_queue.length}</p>
                  </>
                ) : (
                  <p>No collection data</p>
                )}
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Sync Status</h3>
                <p>Online: {isOnline ? '✅ Yes' : '❌ No'}</p>
                <p>Sync Status: {syncStatus}</p>
                <p>Pending Actions: {offlineCollection?.action_queue.length || 0}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>🔥 Auth Actions</h3>
            <IonButton 
              expand="block" 
              fill="outline" 
              onClick={handleSignInAsGuest}
              disabled={isAuthenticated}
            >
              Sign In as Guest
            </IonButton>
            
            <IonButton 
              expand="block" 
              fill="outline" 
              color="danger"
              onClick={handleSignOut}
              disabled={!isAuthenticated}
            >
              Sign Out
            </IonButton>

            <h3>🎮 Game Actions</h3>


            <IonButton
              expand="block"
              fill="outline"
              onClick={handleSetupNewUser}
              disabled={!isAuthenticated}
            >
              Setup New User
            </IonButton>

            <h3>🔄 Sync Actions</h3>
            <IonButton
              expand="block"
              fill="outline"
              color="primary"
              onClick={handleSync}
              disabled={!isAuthenticated || !isOnline || syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Collection'}
            </IonButton>

            <h3>🎁 Pack Opening</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={() => handleOpenPack('basic')}
                disabled={!offlineCollection || (offlineCollection.eco_credits < 50)}
              >
                Basic Pack (50)
              </IonButton>
              
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={() => handleOpenPack('premium')}
                disabled={!offlineCollection || (offlineCollection.eco_credits < 100)}
              >
                Premium Pack (100)
              </IonButton>
              
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={() => handleOpenPack('legendary')}
                disabled={!offlineCollection || (offlineCollection.eco_credits < 200)}
              >
                Legendary Pack (200)
              </IonButton>
            </div>
          </div>
        </IonCardContent>
      </IonCard>


    </div>
  );
};

export default SystemStatus;
