/**
 * Collection Debug Panel
 * Helps debug collection persistence issues
 */

import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonText,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonIcon
} from '@ionic/react';
import { refresh, bug, information, warning } from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';

export const CollectionDebugPanel: React.FC = () => {
  const {
    offlineCollection,
    isAuthenticated,
    userId,
    guestId,
    isGuestMode,
    pendingActions,
    syncStatus,
    loadOfflineCollection,
    refreshCollectionState
  } = useHybridGameStore();

  const handleRefreshCollection = () => {
    console.log('🔄 [Debug] Manually refreshing collection...');
    refreshCollectionState();
  };

  const handleLoadCollection = () => {
    console.log('🔄 [Debug] Manually loading collection...');
    loadOfflineCollection();
  };



  const handleCheckLocalStorage = () => {
    console.log('🔍 [Debug] Checking localStorage...');
    const allKeys = Object.keys(localStorage);
    const collectionKeys = allKeys.filter(key => key.includes('biomasters'));
    console.log('🔍 [Debug] BioMasters keys in localStorage:', collectionKeys);
    
    collectionKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          console.log(`🔍 [Debug] ${key}:`, parsed);
        }
      } catch (error) {
        console.warn(`⚠️ [Debug] Failed to parse ${key}:`, error);
      }
    });
  };

  const currentUserId = userId || guestId;
  const collectionCardCount = offlineCollection ? Object.keys(offlineCollection.cards_owned || {}).length : 0;

  return (
    <IonCard className="debug-panel">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={bug} />
          Collection Debug Panel
        </IonCardTitle>
      </IonCardHeader>
      
      <IonCardContent>
        {/* Authentication State */}
        <div className="debug-section">
          <h4>Authentication State</h4>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Authenticated</h3>
                <p>{isAuthenticated ? 'Yes' : 'No'}</p>
              </IonLabel>
              <IonBadge color={isAuthenticated ? 'success' : 'danger'}>
                {isAuthenticated ? 'Auth' : 'No Auth'}
              </IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>
                <h3>Mode</h3>
                <p>{isGuestMode ? 'Guest' : 'Firebase'}</p>
              </IonLabel>
              <IonBadge color={isGuestMode ? 'warning' : 'primary'}>
                {isGuestMode ? 'Guest' : 'Firebase'}
              </IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>
                <h3>User ID</h3>
                <p>{currentUserId || 'None'}</p>
              </IonLabel>
            </IonItem>
          </IonList>
        </div>

        {/* Collection State */}
        <div className="debug-section">
          <h4>Collection State</h4>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Collection Loaded</h3>
                <p>{offlineCollection ? 'Yes' : 'No'}</p>
              </IonLabel>
              <IonBadge color={offlineCollection ? 'success' : 'danger'}>
                {offlineCollection ? 'Loaded' : 'Missing'}
              </IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>
                <h3>Cards Count</h3>
                <p>{collectionCardCount} cards</p>
              </IonLabel>
              <IonBadge color={collectionCardCount > 0 ? 'success' : 'warning'}>
                {collectionCardCount}
              </IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>
                <h3>Credits</h3>
                <p>{offlineCollection?.eco_credits || 0}</p>
              </IonLabel>
            </IonItem>
            

            
            <IonItem>
              <IonLabel>
                <h3>Pending Actions</h3>
                <p>{pendingActions} actions</p>
              </IonLabel>
              <IonBadge color={pendingActions > 0 ? 'warning' : 'success'}>
                {pendingActions}
              </IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>
                <h3>Sync Status</h3>
                <p>{syncStatus}</p>
              </IonLabel>
              <IonBadge color={syncStatus === 'success' ? 'success' : syncStatus === 'error' ? 'danger' : 'medium'}>
                {syncStatus}
              </IonBadge>
            </IonItem>
          </IonList>
        </div>

        {/* Debug Actions */}
        <div className="debug-actions">
          <h4>Debug Actions</h4>
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={handleRefreshCollection}
            color="primary"
          >
            <IonIcon icon={refresh} slot="start" />
            Refresh Collection State
          </IonButton>
          
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={handleLoadCollection}
            color="secondary"
          >
            <IonIcon icon={information} slot="start" />
            Load Collection
          </IonButton>
          

          
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={handleCheckLocalStorage}
            color="dark"
          >
            <IonIcon icon={bug} slot="start" />
            Check localStorage
          </IonButton>
        </div>

        {/* Collection Details */}
        {offlineCollection && (
          <div className="debug-section">
            <h4>Collection Details</h4>
            <IonText>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify({
                  user_id: offlineCollection.user_id,
                  device_id: offlineCollection.device_id,
                  cards_count: Object.keys(offlineCollection.cards_owned).length,
                  eco_credits: offlineCollection.eco_credits,
                  xp_points: offlineCollection.xp_points,
                  action_queue_length: offlineCollection.action_queue.length,
                  last_sync: new Date(offlineCollection.last_sync).toLocaleString(),
                  collection_hash: offlineCollection.collection_hash?.slice(0, 16) + '...'
                }, null, 2)}
              </pre>
            </IonText>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default CollectionDebugPanel;
