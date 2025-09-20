/**
 * User Profile Page
 * Editable profile page for registered users
 */

import React, { useState, useEffect } from 'react';
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
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonText,
  IonToast,
  IonBackButton,
  IonButtons,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonAlert
} from '@ionic/react';
import {
  person,
  save,
  camera,
  logOut,
  shield,
  notifications,
  globe,
  eye,
  eyeOff
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { getCollectionStats } from '@kelseyabreu/shared';
import { Avatar } from '../components/Avatar';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi } from '../services/apiClient';
import './Profile.css';

const Profile: React.FC = () => {
  const {
    isAuthenticated,
    isGuestMode,
    firebaseUser,
    userProfile,
    offlineCollection,
    signOutUser,
    updateUserProfile
  } = useHybridGameStore();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [favoriteSpecies, setFavoriteSpecies] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSignOutAlert, setShowSignOutAlert] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (firebaseUser) {
      setDisplayName(firebaseUser.displayName || '');
      setEmail(firebaseUser.email || '');
    }
    if (userProfile) {
      setDisplayName(userProfile.display_name || userProfile.username || '');
    }
  }, [firebaseUser, userProfile]);

  // Redirect guests to auth
  useEffect(() => {
    if (!isAuthenticated || isGuestMode) {
      // Could redirect to auth page or show message
    }
  }, [isAuthenticated, isGuestMode]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleSaveProfile = async () => {
    if (!firebaseUser) return;

    setIsLoading(true);
    try {
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: displayName.trim()
      });

      // Get Firebase token for API call
      const token = await firebaseUser.getIdToken();

      // Update server profile
      await authApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        favoriteSpecies: favoriteSpecies.trim() || undefined,
        isPublicProfile,
        emailNotifications,
        pushNotifications
      });

      // Update local store
      updateUserProfile({
        display_name: displayName.trim() || undefined
      });

      showToastMessage('✅ Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update failed:', error);
      showToastMessage(`❌ Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showToastMessage('❌ Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showToastMessage('❌ Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Note: In a real app, you'd need to re-authenticate the user first
      // For now, we'll just show a message about this limitation
      showToastMessage('🔒 Password change requires re-authentication. Please sign out and use "Forgot Password".');
    } catch (error: any) {
      console.error('Password change failed:', error);
      showToastMessage(`❌ Failed to change password: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser();
      // Navigation is handled in the store, no need for toast here
    } catch (error: any) {
      console.error('Sign out failed:', error);
      showToastMessage(`❌ Sign out failed: ${error.message}`);
      setIsSigningOut(false); // Reset loading state on error
    }
  };

  // Calculate profile stats
  const { ownedSpecies, totalCards } = offlineCollection ?
    getCollectionStats(offlineCollection.cards_owned) :
    { ownedSpecies: 0, totalCards: 0 };
  const credits = offlineCollection?.eco_credits || 0;
  const xpPoints = offlineCollection?.xp_points || 0;

  if (!isAuthenticated || isGuestMode) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonCard>
            <IonCardContent className="text-center">
              <IonIcon icon={person} size="large" color="medium" />
              <h2>Profile Not Available</h2>
              <p>You need to be signed in with a registered account to access your profile.</p>
              <IonButton routerLink="/auth" color="primary">
                Sign In
              </IonButton>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>My Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Profile Header */}
        <IonCard className="profile-header-card">
          <IonCardContent>
            <div className="profile-header">
              <Avatar
                src={firebaseUser?.photoURL}
                accountType="registered"
                username={displayName || firebaseUser?.email?.split('@')[0]}
                size="xlarge"
                showStatusBadge={true}
                showAccountTypeBadge={true}
              />
              
              <div className="profile-info">
                <h2>{displayName || firebaseUser?.email?.split('@')[0] || 'User'}</h2>
                <p className="email">{firebaseUser?.email}</p>
                <div className="account-status">
                  <IonIcon icon={shield} color="success" />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <IonGrid>
                <IonRow>
                  <IonCol size="3">
                    <div className="stat-item">
                      <div className="stat-value">{ownedSpecies}</div>
                      <div className="stat-label">Species</div>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <div className="stat-value">{totalCards}</div>
                      <div className="stat-label">Cards</div>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <div className="stat-value">{credits}</div>
                      <div className="stat-label">Credits</div>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <div className="stat-value">{xpPoints}</div>
                      <div className="stat-label">XP</div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Basic Information */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Basic Information</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Display Name</IonLabel>
              <IonInput
                value={displayName}
                onIonInput={(e) => setDisplayName(e.detail.value!)}
                placeholder="Enter your display name"
                maxlength={50}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={email}
                readonly
                placeholder="Email address"
              />
              <IonText color="medium" slot="helper">
                Email cannot be changed here. Contact support if needed.
              </IonText>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Bio</IonLabel>
              <IonTextarea
                value={bio}
                onIonInput={(e) => setBio(e.detail.value!)}
                placeholder="Tell others about yourself..."
                rows={3}
                maxlength={200}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Location</IonLabel>
              <IonInput
                value={location}
                onIonInput={(e) => setLocation(e.detail.value!)}
                placeholder="City, Country"
                maxlength={100}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Favorite Species</IonLabel>
              <IonInput
                value={favoriteSpecies}
                onIonInput={(e) => setFavoriteSpecies(e.detail.value!)}
                placeholder="e.g., Red Panda, Blue Whale"
                maxlength={100}
              />
            </IonItem>

            <IonButton
              expand="block"
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="save-button"
            >
              {isLoading ? <IonSpinner name="crescent" /> : <IonIcon icon={save} slot="start" />}
              {isLoading ? 'Saving...' : 'Save Profile'}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Privacy Settings */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Privacy & Notifications</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonIcon icon={globe} slot="start" />
              <IonLabel>
                <h3>Public Profile</h3>
                <p>Allow others to see your profile and stats</p>
              </IonLabel>
              <IonToggle
                checked={isPublicProfile}
                onIonChange={(e) => setIsPublicProfile(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonIcon icon={notifications} slot="start" />
              <IonLabel>
                <h3>Email Notifications</h3>
                <p>Receive updates about new features and events</p>
              </IonLabel>
              <IonToggle
                checked={emailNotifications}
                onIonChange={(e) => setEmailNotifications(e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonIcon icon={notifications} slot="start" />
              <IonLabel>
                <h3>Push Notifications</h3>
                <p>Get notified about game events and updates</p>
              </IonLabel>
              <IonToggle
                checked={pushNotifications}
                onIonChange={(e) => setPushNotifications(e.detail.checked)}
              />
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Account Security */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Account Security</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonButton
              expand="block"
              fill="outline"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              <IonIcon icon={showPasswordSection ? eyeOff : eye} slot="start" />
              {showPasswordSection ? 'Hide' : 'Change'} Password
            </IonButton>

            {showPasswordSection && (
              <div className="password-section">
                <IonItem>
                  <IonLabel position="stacked">Current Password</IonLabel>
                  <IonInput
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onIonInput={(e) => setCurrentPassword(e.detail.value!)}
                    placeholder="Enter current password"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">New Password</IonLabel>
                  <IonInput
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onIonInput={(e) => setNewPassword(e.detail.value!)}
                    placeholder="Enter new password"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Confirm New Password</IonLabel>
                  <IonInput
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                    placeholder="Confirm new password"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel>Show Passwords</IonLabel>
                  <IonToggle
                    checked={showPasswords}
                    onIonChange={(e) => setShowPasswords(e.detail.checked)}
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  onClick={handleChangePassword}
                  disabled={isLoading || !newPassword || newPassword !== confirmPassword}
                  color="warning"
                >
                  {isLoading ? <IonSpinner name="crescent" /> : 'Change Password'}
                </IonButton>
              </div>
            )}

            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              onClick={() => setShowSignOutAlert(true)}
              disabled={isSigningOut}
              className="sign-out-button"
            >
              <IonIcon icon={logOut} slot="start" />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Sign Out Confirmation */}
        <IonAlert
          isOpen={showSignOutAlert}
          onDidDismiss={() => setShowSignOutAlert(false)}
          header="Sign Out"
          message="Are you sure you want to sign out?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Sign Out',
              role: 'destructive',
              handler: handleSignOut
            }
          ]}
        />

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

export default Profile;
