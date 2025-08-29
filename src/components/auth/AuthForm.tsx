/**
 * Authentication Form Component
 * Handles sign in, sign up, and guest authentication
 */

import React, { useState } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonCheckbox,
  IonToast
} from '@ionic/react';
import {
  mail,
  lockClosed,
  eye,
  eyeOff,
  logIn,
  personAdd,
  logoGoogle
} from 'ionicons/icons';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, AuthError } from '../../utils/auth';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { handleGuestConversion, canConvertGuest } from '../../utils/guestConversion';
import './AuthForm.css';

interface AuthFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isGuestConversion?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onCancel, isGuestConversion = false }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { signInAsGuest, guestToken, isGuestMode } = useHybridGameStore();

  const showError = (message: string) => {
    setToastMessage(message);
    setToastColor('danger');
    setShowToast(true);
  };

  const showSuccess = (message: string) => {
    setToastMessage(message);
    setToastColor('success');
    setShowToast(true);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showError('Please fill in all required fields');
      return;
    }

    if (isSignUp && !displayName) {
      showError('Please enter a display name');
      return;
    }

    setLoading(true);

    try {
      let firebaseCredential;

      if (isSignUp) {
        firebaseCredential = await signUpWithEmail({ email, password, displayName });
        showSuccess('Account created! Please check your email for verification.');
      } else {
        firebaseCredential = await signInWithEmail({ email, password });
        showSuccess('Signed in successfully!');
      }

      // Handle guest conversion if this is a guest user
      if (isGuestConversion && canConvertGuest(isGuestMode, guestToken)) {
        showSuccess('Converting your guest account...');

        const conversionResult = await handleGuestConversion(
          guestToken!,
          firebaseCredential,
          (result) => {
            showSuccess(`✅ Success! Your account is now secure. Welcome, ${result.user?.username}!`);
          },
          (error) => {
            showError(`Conversion failed: ${error}`);
          }
        );

        if (!conversionResult.success) {
          // If conversion fails, we should still allow the user to continue
          // but inform them about the issue
          showError('Account created but failed to merge guest data. Please contact support.');
        }
      }

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (error: any) {
      const authError = error as AuthError;
      showError(authError.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const firebaseCredential = await signInWithGoogle();
      showSuccess('Signed in with Google successfully!');

      // Handle guest conversion if this is a guest user
      if (isGuestConversion && canConvertGuest(isGuestMode, guestToken)) {
        showSuccess('Converting your guest account...');

        const conversionResult = await handleGuestConversion(
          guestToken!,
          firebaseCredential,
          (result) => {
            showSuccess(`✅ Success! Your account is now secure. Welcome, ${result.user?.username}!`);
          },
          (error) => {
            showError(`Conversion failed: ${error}`);
          }
        );

        if (!conversionResult.success) {
          showError('Account created but failed to merge guest data. Please contact support.');
        }
      }

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (error: any) {
      const authError = error as AuthError;
      showError(authError.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
      showSuccess('Signed in as guest!');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (error: any) {
      showError('Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IonCard className="auth-card">
        <IonCardHeader>
          <IonCardTitle className="auth-title">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </IonCardTitle>
          <IonText color="medium">
            <p>{isSignUp ? 'Join the Biomasters TCG community' : 'Sign in to your Biomasters TCG account'}</p>
          </IonText>
        </IonCardHeader>

        <IonCardContent>
          <form onSubmit={handleEmailAuth}>
            {/* Display Name (Sign Up Only) */}
            {isSignUp && (
              <IonItem className="auth-input">
                <IonIcon slot="start" icon={personAdd} />
                <IonLabel position="stacked">Display Name</IonLabel>
                <IonInput
                  type="text"
                  value={displayName}
                  placeholder="Enter your display name"
                  onIonInput={(e) => setDisplayName(e.detail.value!)}
                  required
                />
              </IonItem>
            )}

            {/* Email */}
            <IonItem className="auth-input">
              <IonIcon slot="start" icon={mail} />
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                placeholder="Enter your email"
                onIonInput={(e) => setEmail(e.detail.value!)}
                required
              />
            </IonItem>

            {/* Password */}
            <IonItem className="auth-input">
              <IonIcon slot="start" icon={lockClosed} />
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Enter your password"
                onIonInput={(e) => setPassword(e.detail.value!)}
                required
              />
              <IonButton
                slot="end"
                fill="clear"
                onClick={() => setShowPassword(!showPassword)}
              >
                <IonIcon icon={showPassword ? eyeOff : eye} />
              </IonButton>
            </IonItem>

            {/* Options */}
            {!isSignUp && (
              <div className="auth-options">
                <IonItem lines="none" className="remember-me">
                  <IonCheckbox
                    checked={rememberMe}
                    onIonChange={(e) => setRememberMe(e.detail.checked)}
                  />
                  <IonLabel className="ion-margin-start">Remember me</IonLabel>
                </IonItem>
                <IonButton
                  fill="clear"
                  size="small"
                  className="forgot-password-btn"
                >
                  Forgot Password?
                </IonButton>
              </div>
            )}

            {/* Primary Auth Button */}
            <IonButton
              expand="block"
              type="submit"
              className="auth-primary-btn"
              disabled={loading}
            >
              <IonIcon slot="start" icon={isSignUp ? personAdd : logIn} />
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </IonButton>

            {/* Hidden submit button for form submission */}
            <button type="submit" style={{ display: 'none' }} />
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Google Sign In */}
          <IonButton
            expand="block"
            fill="outline"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="google-signin-btn"
          >
            <IonIcon slot="start" icon={logoGoogle} />
            Continue with Google
          </IonButton>

          {/* Guest Continue */}
          <IonButton
            expand="block"
            fill="clear"
            onClick={handleGuestAuth}
            disabled={loading}
            className="guest-continue-btn"
          >
            Continue as Guest
          </IonButton>

          {/* Auth Switch */}
          <div className="auth-switch">
            <IonText color="medium">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <IonButton
                fill="clear"
                size="small"
                onClick={() => setIsSignUp(!isSignUp)}
                className="switch-auth-btn"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </IonButton>
            </IonText>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <IonButton
              expand="block"
              fill="clear"
              color="medium"
              onClick={onCancel}
              style={{ marginTop: '20px' }}
            >
              Cancel
            </IonButton>
          )}
        </IonCardContent>
      </IonCard>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
        color={toastColor}
      />
    </>
  );
};
