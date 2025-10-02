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
  IonCheckbox
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
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';
import { authApi } from '../../services/apiClient';
import { useAuthRequest } from '../../hooks/useApiRequest';
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

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { signInAsGuest, guestToken, isGuestMode } = useHybridGameStore();
  const { getUIText } = useUILocalization();

  // Use the new API request hook for consistent error/success handling
  const authRequest = useAuthRequest({
    showSuccessToast: true,
    showErrorToast: true
  });

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      authRequest.setError(getUIText(UITextId.UI_FILL_REQUIRED_FIELDS));
      return;
    }

    if (isSignUp && !displayName) {
      authRequest.setError(getUIText(UITextId.UI_ENTER_DISPLAY_NAME_MSG));
      return;
    }

    try {
      let firebaseCredential;

      if (isSignUp) {
        console.log('🔄 [AuthForm] Starting registration process...', {
          email,
          displayName,
          timestamp: new Date().toISOString()
        });

        // Step 1: Create Firebase user
        console.log('🔄 [AuthForm] Step 1: Creating Firebase user...');
        firebaseCredential = await signUpWithEmail({ email, password, displayName });
        console.log('✅ [AuthForm] Firebase user created successfully:', {
          uid: firebaseCredential?.user?.uid,
          email: firebaseCredential?.user?.email,
          emailVerified: firebaseCredential?.user?.emailVerified,
          displayName: firebaseCredential?.user?.displayName
        });

        // Step 2: Register user in backend database
        console.log('🔄 [AuthForm] Step 2: Registering user in backend database...', {
          firebaseUid: firebaseCredential?.user?.uid,
          email: firebaseCredential?.user?.email,
          displayName,
          timestamp: new Date().toISOString()
        });

        try {
          console.log('🔄 [AuthForm] Calling authApi.register...');
          await authRequest.execute(() => authApi.register({ username: displayName }));
          console.log('✅ [AuthForm] Backend registration successful');
          authRequest.setSuccess(getUIText(UITextId.UI_ACCOUNT_CREATED));
        } catch (backendError: any) {
          console.error('❌ [AuthForm] Backend registration failed:', {
            error: backendError,
            message: backendError?.message,
            response: backendError?.response?.data,
            status: backendError?.response?.status,
            statusText: backendError?.response?.statusText,
            config: {
              url: backendError?.config?.url,
              method: backendError?.config?.method,
              headers: backendError?.config?.headers
            },
            firebaseUser: firebaseCredential?.user?.uid,
            timestamp: new Date().toISOString()
          });

          // Check if it's a validation error that we should show to the user
          if (backendError?.response?.status === 400) {
            const errorMessage = backendError?.response?.data?.message || 'Registration validation failed';
            authRequest.setError(errorMessage);
            return;
          }

          // For other backend errors, show success since Firebase user was created
          // The user can still use the app, but some features might not work until backend sync
          authRequest.setSuccess(getUIText(UITextId.UI_ACCOUNT_CREATED) + ' (Syncing with server...)');
        }
      } else {
        firebaseCredential = await signInWithEmail({ email, password });
        authRequest.setSuccess(getUIText(UITextId.UI_SIGNED_IN_SUCCESS));
      }

      // Handle guest conversion if this is a guest user
      if (isGuestConversion && canConvertGuest(isGuestMode, guestToken)) {
        authRequest.setSuccess(getUIText(UITextId.UI_CONVERTING_GUEST));

        const conversionResult = await handleGuestConversion(
          guestToken!,
          firebaseCredential,
          (result) => {
            const message = getUIText(UITextId.UI_CONVERSION_SUCCESS).replace('{username}', result.user?.username || 'User');
            authRequest.setSuccess(message);
          },
          (error) => {
            const message = getUIText(UITextId.UI_CONVERSION_FAILED).replace('{error}', error);
            authRequest.setError(message);
          }
        );

        if (!conversionResult.success) {
          // If conversion fails, we should still allow the user to continue
          // but inform them about the issue
          authRequest.setError(getUIText(UITextId.UI_ACCOUNT_CREATED_MERGE_FAILED));
        }
      }

      if (onSuccess) {
        setTimeout(onSuccess, 2500);
      }
    } catch (error: any) {
      const authError = error as AuthError;
      authRequest.setError(authError.message || getUIText(UITextId.UI_AUTH_FAILED));
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const firebaseCredential = await signInWithGoogle();
      authRequest.setSuccess(getUIText(UITextId.UI_GOOGLE_SIGNIN_SUCCESS));

      // Handle guest conversion if this is a guest user
      if (isGuestConversion && canConvertGuest(isGuestMode, guestToken)) {
        authRequest.setSuccess(getUIText(UITextId.UI_CONVERTING_GUEST));

        const conversionResult = await handleGuestConversion(
          guestToken!,
          firebaseCredential,
          (result) => {
            const message = getUIText(UITextId.UI_CONVERSION_SUCCESS).replace('{username}', result.user?.username || 'User');
            authRequest.setSuccess(message);
          },
          (error) => {
            const message = getUIText(UITextId.UI_CONVERSION_FAILED).replace('{error}', error);
            authRequest.setError(message);
          }
        );

        if (!conversionResult.success) {
          authRequest.setError(getUIText(UITextId.UI_ACCOUNT_CREATED_MERGE_FAILED));
        }
      }

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (error: any) {
      const authError = error as AuthError;
      authRequest.setError(authError.message || getUIText(UITextId.UI_GOOGLE_SIGNIN_FAILED));
    }
  };

  const handleGuestAuth = async () => {
    try {
      await signInAsGuest();
      authRequest.setSuccess(getUIText(UITextId.UI_GUEST_SIGNIN_SUCCESS));
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      authRequest.setError(getUIText(UITextId.UI_GUEST_SIGNIN_FAILED));
    }
  };

  return (
    <>
      <IonCard className="auth-card">
        <IonCardHeader>
          <IonCardTitle className="auth-title">
            {isSignUp ? getUIText(UITextId.UI_CREATE_ACCOUNT) : getUIText(UITextId.UI_WELCOME_BACK)}
          </IonCardTitle>
          <IonText color="medium">
            <p>{isSignUp ? getUIText(UITextId.UI_JOIN_COMMUNITY) : getUIText(UITextId.UI_SIGN_IN_ACCOUNT)}</p>
          </IonText>
        </IonCardHeader>

        <IonCardContent>
          <form onSubmit={handleEmailAuth}>
            {/* Display Name (Sign Up Only) */}
            {isSignUp && (
              <IonItem className="auth-input">
                <IonIcon slot="start" icon={personAdd} />
                <IonLabel position="stacked">{getUIText(UITextId.UI_DISPLAY_NAME)}</IonLabel>
                <IonInput
                  type="text"
                  value={displayName}
                  placeholder={getUIText(UITextId.UI_ENTER_DISPLAY_NAME)}
                  onIonInput={(e) => setDisplayName(e.detail.value!)}
                  required
                  data-testid="display-name-input"
                />
              </IonItem>
            )}

            {/* Email */}
            <IonItem className="auth-input">
              <IonIcon slot="start" icon={mail} />
              <IonLabel position="stacked">{getUIText(UITextId.UI_EMAIL)}</IonLabel>
              <IonInput
                type="email"
                value={email}
                placeholder={getUIText(UITextId.UI_ENTER_EMAIL)}
                onIonInput={(e) => setEmail(e.detail.value!)}
                required
                data-testid="email-input"
              />
            </IonItem>

            {/* Password */}
            <IonItem className="auth-input">
              <IonIcon slot="start" icon={lockClosed} />
              <IonLabel position="stacked">{getUIText(UITextId.UI_PASSWORD)}</IonLabel>
              <IonInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder={getUIText(UITextId.UI_ENTER_PASSWORD)}
                onIonInput={(e) => setPassword(e.detail.value!)}
                required
                data-testid="password-input"
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
                    slot="start"
                    checked={rememberMe}
                    onIonChange={(e) => setRememberMe(e.detail.checked)}
                  />
                  <IonLabel>{getUIText(UITextId.UI_REMEMBER_ME)}</IonLabel>
                </IonItem>
                <IonButton
                  fill="clear"
                  size="small"
                  color="primary"
                  className="forgot-password-btn"
                >
                  {getUIText(UITextId.UI_FORGOT_PASSWORD)}
                </IonButton>
              </div>
            )}

            {/* Primary Auth Button */}
            <IonButton
              expand="block"
              type="submit"
              color="primary"
              className="auth-primary-btn"
              disabled={authRequest.loading}
              data-testid={isSignUp ? "register-button" : "signin-button"}
            >
              <IonIcon slot="start" icon={isSignUp ? personAdd : logIn} />
              {authRequest.loading ? getUIText(UITextId.UI_PLEASE_WAIT) : (isSignUp ? getUIText(UITextId.UI_SIGN_UP) : getUIText(UITextId.UI_SIGN_IN))}
            </IonButton>

            {/* Hidden submit button for form submission */}
            <button type="submit" style={{ display: 'none' }} />
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>{getUIText(UITextId.UI_OR)}</span>
          </div>

          {/* Google Sign In */}
          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            onClick={handleGoogleAuth}
            disabled={authRequest.loading}
            className="google-signin-btn"
          >
            <IonIcon slot="start" icon={logoGoogle} />
            {getUIText(UITextId.UI_CONTINUE_WITH_GOOGLE)}
          </IonButton>

          {/* Guest Continue */}
          <IonButton
            expand="block"
            fill="clear"
            color="medium"
            onClick={handleGuestAuth}
            disabled={authRequest.loading}
            className="guest-continue-btn"
            data-testid="guest-login-button"
          >
            {getUIText(UITextId.UI_CONTINUE_AS_GUEST)}
          </IonButton>

          {/* Auth Switch */}
          <div className="auth-switch">
            <IonText color="medium">
              {isSignUp ? getUIText(UITextId.UI_ALREADY_HAVE_ACCOUNT) + ' ' : getUIText(UITextId.UI_DONT_HAVE_ACCOUNT) + ' '}
              <IonButton
                fill="clear"
                size="small"
                color="primary"
                onClick={() => setIsSignUp(!isSignUp)}
                className="switch-auth-btn"
                data-testid="switch-to-register"
              >
                {isSignUp ? getUIText(UITextId.UI_SIGN_IN) : getUIText(UITextId.UI_SIGN_UP)}
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
              {getUIText(UITextId.UI_CANCEL)}
            </IonButton>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );
};
