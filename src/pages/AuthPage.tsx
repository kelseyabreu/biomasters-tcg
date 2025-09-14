/**
 * Authentication Page
 * Dedicated page for sign-in and sign-up
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
  IonText,
  IonToast,
  IonBackButton,
  IonButtons
} from '@ionic/react';
import { person, arrowBack } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { AuthForm } from '../components/auth/AuthForm';
import { useHybridGameStore } from '../state/hybridGameStore';
import './AuthPage.css';

const AuthPage: React.FC = () => {
  const history = useHistory();
  const { signInAsGuest } = useHybridGameStore();
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSignInAsGuest = async () => {
    try {
      setToastMessage('Signing in as guest...');
      setShowToast(true);
      await signInAsGuest();
      setToastMessage('✅ Signed in as guest successfully!');
      setShowToast(true);
      // Navigate back to home after successful guest sign-in
      setTimeout(() => history.push('/home'), 1500);
    } catch (error) {
      console.error('Failed to sign in:', error);
      setToastMessage('❌ Failed to sign in as guest. Please try again.');
      setShowToast(true);
    }
  };

  const handleAuthSuccess = () => {
    setToastMessage('✅ Signed in successfully!');
    setShowToast(true);
    // Navigate back to home after successful authentication
    setTimeout(() => history.push('/home'), 1500);
  };

  return (
    <IonPage data-testid="auth-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Sign In</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding auth-page-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="logo-section">
            <IonIcon icon={person} size="large" color="primary" />
            <h1>Welcome to Biomasters TCG</h1>
            <IonText color="medium">
              <p>Sign in to sync your progress across devices, or continue as guest for offline play.</p>
            </IonText>
          </div>
        </div>

        {/* Authentication Form */}
        <IonCard className="auth-card">
          <IonCardHeader>
            <IonCardTitle>Sign In / Sign Up</IonCardTitle>
          </IonCardHeader>
          
          <IonCardContent>
            <AuthForm onSuccess={handleAuthSuccess} />
          </IonCardContent>
        </IonCard>

        {/* Guest Option */}
        <IonCard className="guest-card">
          <IonCardHeader>
            <IonCardTitle>Play as Guest</IonCardTitle>
          </IonCardHeader>
          
          <IonCardContent>
            <IonText color="medium">
              <p>Continue without an account. Your progress will be saved locally but won't sync across devices.</p>
            </IonText>
            
            <IonButton
              expand="block"
              fill="outline"
              onClick={handleSignInAsGuest}
              color="secondary"
              size="large"
            >
              <IonIcon icon={person} slot="start" />
              Continue as Guest
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Features Info */}
        <IonCard className="features-card">
          <IonCardContent>
            <IonText color="medium">
              <h3>Why create an account?</h3>
              <ul>
                <li>🔄 Sync progress across all your devices</li>
                <li>☁️ Cloud backup of your collection</li>
                <li>🏆 Access to leaderboards and achievements</li>
                <li>🎁 Exclusive rewards and events</li>
                <li>👥 Connect with other players</li>
              </ul>
            </IonText>
          </IonCardContent>
        </IonCard>

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

export default AuthPage;
