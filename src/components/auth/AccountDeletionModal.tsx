/**
 * Account Deletion Modal Component
 * Handles the complete account deletion flow with proper confirmation and re-authentication
 */

import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonText,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonAlert,
  IonProgressBar,
  IonToast,
  IonButtons,
  IonList,
} from '@ionic/react';
import {
  close,
  warning,
  trash,
  shield,
  lockClosed,
  checkmark,
  download
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { reauthenticateWithPassword } from '../../utils/auth';
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DeletionStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger' | 'warning'>('success');

  const { userProfile, isGuestMode, signOutUser, firebaseUser, guestToken } = useHybridGameStore();
  const { getUIText } = useUILocalization();

  const deletionSteps: DeletionStep[] = [
    {
      id: 'warning',
      title: 'Account Deletion Warning',
      description: 'Understand what will be permanently deleted',
      completed: false,
      required: true
    },
    {
      id: 'data-export',
      title: 'Data Export (Optional)',
      description: 'Download your data before deletion',
      completed: false,
      required: false
    },
    {
      id: 'confirmation',
      title: 'Confirmation',
      description: 'Type confirmation text and re-authenticate',
      completed: false,
      required: true
    },
    {
      id: 'final-confirm',
      title: 'Final Confirmation',
      description: 'Last chance to cancel',
      completed: false,
      required: true
    }
  ];

  const [steps, setSteps] = useState(deletionSteps);

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

  const showWarning = (message: string) => {
    setToastMessage(message);
    setToastColor('warning');
    setShowToast(true);
  };

  const handleStepComplete = (stepIndex: number) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed: true } : step
    ));
  };

  const handleDataExport = async () => {
    try {
      // Export user data as JSON for download
      const userData = {
        user: userProfile,
        exportedAt: new Date().toISOString(),
        note: 'User data export for account deletion'
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `biomasters-account-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleStepComplete(1);
      showSuccess('Account data exported successfully');
    } catch (error) {
      console.error('Data export failed:', error);
      showError('Failed to export data. You can still proceed with deletion.');
    }
  };

  const handlePasswordReauth = async () => {
    if (!password) {
      showError('Please enter your password');
      return;
    }

    try {
      // Use the correct re-authentication function that doesn't trigger global auth state changes
      await reauthenticateWithPassword(password);
      handleStepComplete(2);
      showSuccess('Re-authentication successful');
      // Stay on step 2 - the text confirmation will now be shown
    } catch (error: any) {
      console.error('Re-authentication failed:', error);
      showError('Invalid password. Please try again.');
    }
  };

  const handleAccountDeletion = async () => {
    console.log('🗑️ [AccountDeletion] Starting account deletion process...');
    console.log('🗑️ [AccountDeletion] Current user:', firebaseUser?.email);
    console.log('🗑️ [AccountDeletion] Confirmation text:', confirmationText);

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      console.log('❌ [AccountDeletion] Invalid confirmation text');
      showError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeleting(true);
    setShowFinalConfirm(false);
    console.log('🗑️ [AccountDeletion] Modal state updated, calling backend...');

    try {
      // Get the appropriate authentication token based on user type
      let authToken: string;

      if (isGuestMode) {
        // For guest accounts, use the guest JWT token
        console.log('🗑️ [AccountDeletion] Guest mode - using guest JWT token');
        console.log('🗑️ [AccountDeletion] Guest token available:', guestToken ? 'Yes' : 'No');

        if (!guestToken) {
          throw new Error('Guest authentication token not available. Please sign in again.');
        }

        authToken = guestToken;
        console.log('🗑️ [AccountDeletion] Using guest JWT token:', `Present (${authToken.substring(0, 50)}...)`);
      } else {
        // For registered accounts, use Firebase ID token
        console.log('🗑️ [AccountDeletion] Registered user mode - using Firebase ID token');
        console.log('🗑️ [AccountDeletion] Firebase user:', firebaseUser?.email);
        console.log('🗑️ [AccountDeletion] Firebase user UID:', firebaseUser?.uid);

        if (!firebaseUser) {
          throw new Error('Firebase user not available. Please sign in again.');
        }

        authToken = await firebaseUser.getIdToken();
        console.log('🗑️ [AccountDeletion] Got Firebase ID token:', authToken ? `Present (${authToken.substring(0, 50)}...)` : 'Missing');

        if (!authToken) {
          throw new Error('Firebase authentication token not available. Please sign in again.');
        }
      }

      // Call the backend deletion endpoint
      console.log('🗑️ [AccountDeletion] Calling DELETE /api/auth/account...');
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('🗑️ [AccountDeletion] Backend response status:', response.status);
      console.log('🗑️ [AccountDeletion] Backend response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response doesn't have JSON body (like 404), create a generic error
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText || 'Request failed'}`
          };
        }
        console.log('❌ [AccountDeletion] Backend error:', errorData);
        throw new Error(errorData.message || 'Account deletion failed');
      }

      const result = await response.json();
      console.log('✅ [AccountDeletion] Backend deletion successful:', result);

      // Sign out the user
      console.log('🔓 [AccountDeletion] Signing out user...');
      await signOutUser();
      console.log('✅ [AccountDeletion] User signed out successfully');

      showSuccess('Account deleted successfully. You will be redirected shortly.');
      console.log('✅ [AccountDeletion] Success message shown');

      // Close modal and redirect after a delay
      console.log('⏰ [AccountDeletion] Setting timeout for redirect...');
      setTimeout(() => {
        console.log('🔄 [AccountDeletion] Timeout triggered, calling onSuccess and onClose');
        if (onSuccess) {
          console.log('🔄 [AccountDeletion] Calling onSuccess callback');
          onSuccess();
        }
        console.log('🔄 [AccountDeletion] Calling onClose');
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('❌ [AccountDeletion] Account deletion failed:', error);
      showError(error.message || 'Account deletion failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(0);
    setPassword('');
    setConfirmationText('');
    setIsDeleting(false);
    setShowFinalConfirm(false);
    setSteps(deletionSteps);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const canProceedToNext = () => {
    const currentStepData = steps[currentStep];
    return currentStepData?.completed || !currentStepData?.required;
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 0: // Warning
        return (
          <div className="deletion-warning">
            <IonIcon icon={warning} color="danger" size="large" />
            <h3>⚠️ This action cannot be undone</h3>
            <IonList>
              <IonItem>
                <IonIcon icon={trash} color="danger" slot="start" />
                <IonLabel>
                  <h4>All your game data will be permanently deleted:</h4>
                  <p>• Card collection and decks</p>
                  <p>• Game progress and statistics</p>
                  <p>• Eco credits and XP points</p>
                  <p>• Profile and preferences</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonIcon icon={shield} color="danger" slot="start" />
                <IonLabel>
                  <h4>Your account will be removed from:</h4>
                  <p>• BioMasters TCG database</p>
                  <p>• Firebase authentication system</p>
                  <p>• All associated services</p>
                </IonLabel>
              </IonItem>
            </IonList>
            <IonButton
              expand="block"
              color="medium"
              onClick={() => {
                handleStepComplete(0);
                setCurrentStep(1);
              }}
              data-testid="acknowledge-warning-button"
            >
              I Understand - Continue
            </IonButton>
          </div>
        );

      case 1: // Data Export
        return (
          <div className="data-export">
            <IonIcon icon={download} color="primary" size="large" />
            <h3>Export Your Data (Optional)</h3>
            <IonText>
              <p>Before deleting your account, you can download a copy of your data including:</p>
              <ul>
                <li>Profile information</li>
                <li>Game statistics</li>
                <li>Collection data</li>
                <li>Preferences and settings</li>
              </ul>
            </IonText>
            <IonButton
              expand="block"
              color="primary"
              onClick={handleDataExport}
              data-testid="export-data-button"
            >
              <IonIcon icon={download} slot="start" />
              Export My Data
            </IonButton>
            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                handleStepComplete(1);
                setCurrentStep(2);
              }}
              data-testid="skip-export-button"
            >
              Skip Export
            </IonButton>
          </div>
        );

      case 2: // Confirmation
        return (
          <div className="confirmation-step">
            <IonIcon icon={lockClosed} color="warning" size="large" />
            <h3>Confirm Account Deletion</h3>
            
            {!isGuestMode && (
              <div className="password-reauth">
                <IonText>
                  <p>Please enter your password to confirm your identity:</p>
                </IonText>
                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value!)}
                    placeholder="Enter your password"
                    data-testid="deletion-password-input"
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  color="warning"
                  onClick={handlePasswordReauth}
                  disabled={!password}
                  data-testid="verify-password-button"
                >
                  Verify Password
                </IonButton>
              </div>
            )}

            {(isGuestMode || steps[2].completed) && (
              <div className="text-confirmation">
                <IonText>
                  <p>Type <strong>"DELETE MY ACCOUNT"</strong> to confirm:</p>
                </IonText>
                <IonItem>
                  <IonLabel position="stacked">Confirmation Text</IonLabel>
                  <IonInput
                    value={confirmationText}
                    onIonInput={(e) => setConfirmationText(e.detail.value!)}
                    placeholder="DELETE MY ACCOUNT"
                    data-testid="deletion-confirmation-input"
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  color="danger"
                  onClick={() => setShowFinalConfirm(true)}
                  disabled={confirmationText !== 'DELETE MY ACCOUNT'}
                  data-testid="proceed-to-final-button"
                >
                  Proceed to Final Confirmation
                </IonButton>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} data-testid="account-deletion-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Delete Account</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleClose} disabled={isDeleting} data-testid="cancel-deletion-button">
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          {isDeleting && (
            <div className="deletion-progress" data-testid="deletion-progress">
              <IonText>
                <h3>Deleting your account...</h3>
                <p>Please wait while we remove all your data.</p>
              </IonText>
              <IonProgressBar type="indeterminate" />
            </div>
          )}

          {!isDeleting && (
            <>
              {/* Progress Steps */}
              <div className="deletion-steps">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`step ${index === currentStep ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                  >
                    <div className="step-indicator">
                      {step.completed ? (
                        <IonIcon icon={checkmark} color="success" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="step-content">
                      <h4>{step.title}</h4>
                      <p>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Step Content */}
              <IonCard>
                <IonCardContent>
                  {getStepContent()}
                </IonCardContent>
              </IonCard>

              {/* Navigation */}
              <div className="step-navigation">
                {currentStep > 0 && (
                  <IonButton
                    fill="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Previous
                  </IonButton>
                )}
              </div>
            </>
          )}
        </IonContent>
      </IonModal>

      {/* Final Confirmation Alert */}
      <IonAlert
        isOpen={showFinalConfirm}
        onDidDismiss={() => setShowFinalConfirm(false)}
        header="Final Confirmation"
        message="Are you absolutely sure you want to delete your account? This action cannot be undone."
        data-testid="final-confirmation-alert"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setShowFinalConfirm(false)
          },
          {
            text: 'Delete Account',
            role: 'destructive',
            handler: handleAccountDeletion,
            cssClass: 'confirm-deletion-button'
          }
        ]}
      />

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
