/**
 * User Profile Component
 * Displays user information with different layouts for guest vs registered users
 */

import React, { useState } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import {
  person,
  shield,
  settings,
  logOut,
  trophy,
  leaf,
  star
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { AuthModal } from './auth/AuthModal';
import { Avatar } from './Avatar';
import './UserProfile.css';

interface UserProfileProps {
  showStats?: boolean;
  compact?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  showStats = true, 
  compact = false 
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const {
    isAuthenticated,
    isGuestMode,
    firebaseUser,
    offlineCollection,
    signOutUser,
    guestId
  } = useHybridGameStore();

  // Calculate collection stats
  const ownedSpecies = offlineCollection ? Object.keys(offlineCollection.species_owned).length : 0;
  const totalCards = offlineCollection ?
    Object.values(offlineCollection.species_owned).reduce((sum, species) => sum + species.quantity, 0) : 0;
  const credits = offlineCollection?.eco_credits || 0;
  const xpPoints = offlineCollection?.xp_points || 0;

  // Generate guest username from guestId
  const getGuestUsername = () => {
    if (!guestId) return 'Guest User';
    const shortId = guestId.slice(-6).toUpperCase();
    return `Guest-${shortId}`;
  };

  // Get user display information
  const getUserInfo = () => {
    if (!isAuthenticated) {
      return {
        username: 'Not Signed In',
        email: null,
        avatar: null,
        accountType: 'none' as const,
        showCTA: true,
        ctaText: 'Sign In / Continue as Guest',
        ctaColor: 'primary' as const
      };
    }

    if (isGuestMode) {
      return {
        username: getGuestUsername(),
        email: null,
        avatar: null,
        accountType: 'guest' as const,
        showCTA: true,
        ctaText: `Protect Your Progress! Save your ${ownedSpecies} species and ${credits} eco-credits`,
        ctaColor: 'warning' as const
      };
    }

    return {
      username: firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'User',
      email: firebaseUser?.email,
      avatar: firebaseUser?.photoURL,
      accountType: 'registered' as const,
      showCTA: false,
      ctaText: '',
      ctaColor: 'medium' as const
    };
  };

  const userInfo = getUserInfo();

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleCTAClick = () => {
    if (userInfo.accountType === 'none') {
      // Navigate to auth page or show modal
      setShowAuthModal(true);
    } else if (userInfo.accountType === 'guest') {
      // Show conversion modal
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // The store will automatically update the user state
  };

  if (compact) {
    return (
      <div className="user-profile-compact">
        <div className="user-info-compact">
          <Avatar
            src={userInfo.avatar}
            accountType={userInfo.accountType}
            username={userInfo.username}
            size="small"
            showStatusBadge={true}
          />
          
          <div className="user-details-compact">
            <div className="username">{userInfo.username}</div>
            <IonBadge 
              color={userInfo.accountType === 'registered' ? 'success' : 
                     userInfo.accountType === 'guest' ? 'warning' : 'medium'}
              size="small"
            >
              {userInfo.accountType === 'registered' ? 'Registered' :
               userInfo.accountType === 'guest' ? 'Guest' : 'Not Signed In'}
            </IonBadge>
          </div>
        </div>

        {userInfo.showCTA && (
          <IonButton
            size="small"
            fill="outline"
            color={userInfo.ctaColor}
            onClick={handleCTAClick}
          >
            <IonIcon icon={shield} slot="start" />
            {userInfo.accountType === 'guest' ? 'Secure Account' : 'Sign In'}
          </IonButton>
        )}

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <IonCard className="user-profile-card">
      <IonCardHeader>
        <div className="profile-header">
          <Avatar
            src={userInfo.avatar}
            accountType={userInfo.accountType}
            username={userInfo.username}
            size="large"
            showStatusBadge={true}
            showAccountTypeBadge={true}
          />
          
          <div className="user-info">
            <IonCardTitle>{userInfo.username}</IonCardTitle>
            {userInfo.email && (
              <IonText color="medium">
                <p>{userInfo.email}</p>
              </IonText>
            )}
            
            <div className="account-status">
              <IonBadge 
                color={userInfo.accountType === 'registered' ? 'success' : 
                       userInfo.accountType === 'guest' ? 'warning' : 'medium'}
              >
                <IonIcon 
                  icon={userInfo.accountType === 'registered' ? shield : 
                        userInfo.accountType === 'guest' ? person : person} 
                  style={{ marginRight: '5px' }} 
                />
                {userInfo.accountType === 'registered' ? 'Registered Account' :
                 userInfo.accountType === 'guest' ? 'Guest Account' : 'Not Signed In'}
              </IonBadge>
            </div>
          </div>
        </div>
      </IonCardHeader>

      <IonCardContent>
        {/* Call-to-Action for Guest Users */}
        {userInfo.showCTA && (
          <div className="cta-section">
            <IonButton
              expand="block"
              color={userInfo.ctaColor}
              size="large"
              onClick={handleCTAClick}
              className="protection-cta"
            >
              <IonIcon icon={shield} slot="start" />
              {userInfo.accountType === 'guest' ? 'Protect Your Progress!' : userInfo.ctaText}
            </IonButton>
            
            {userInfo.accountType === 'guest' && (
              <IonText color="medium" className="cta-subtitle">
                <p>Create a free account to save your collection across devices</p>
              </IonText>
            )}
          </div>
        )}

        {/* Collection Stats */}
        {showStats && isAuthenticated && offlineCollection && (
          <div className="stats-section">
            <IonGrid>
              <IonRow>
                <IonCol size="4">
                  <div className="stat-item">
                    <IonIcon icon={trophy} color="primary" />
                    <div className="stat-value">{ownedSpecies}</div>
                    <div className="stat-label">Species</div>
                  </div>
                </IonCol>
                <IonCol size="4">
                  <div className="stat-item">
                    <IonIcon icon={leaf} color="success" />
                    <div className="stat-value">{credits}</div>
                    <div className="stat-label">Eco-Credits</div>
                  </div>
                </IonCol>
                <IonCol size="4">
                  <div className="stat-item">
                    <IonIcon icon={star} color="warning" />
                    <div className="stat-value">{xpPoints}</div>
                    <div className="stat-label">XP</div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        )}

        {/* Account Actions */}
        {isAuthenticated && (
          <div className="account-actions">
            {!isGuestMode && (
              <IonButton
                fill="outline"
                size="small"
                color="medium"
                routerLink="/profile"
              >
                <IonIcon icon={settings} slot="start" />
                Account Settings
              </IonButton>
            )}
            
            <IonButton
              fill="outline"
              size="small"
              color="medium"
              onClick={handleSignOut}
            >
              <IonIcon icon={logOut} slot="start" />
              {isGuestMode ? 'Exit Guest Mode' : 'Sign Out'}
            </IonButton>
          </div>
        )}
      </IonCardContent>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </IonCard>
  );
};
