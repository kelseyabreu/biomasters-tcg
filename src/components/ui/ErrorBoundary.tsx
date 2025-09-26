import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonText
} from '@ionic/react';
import { warning, refresh, home, bug } from 'ionicons/icons';
import { notificationService } from '../../services/notificationService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * React Error Boundary to catch JavaScript errors and prevent app crashes
 * Provides graceful error recovery without full page reloads
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('🚨 [ErrorBoundary] Caught error:', error);
    console.error('🚨 [ErrorBoundary] Error info:', errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send error notification
    notificationService.show({
      type: 'system',
      title: 'Application Error',
      message: 'An unexpected error occurred. You can try to recover or restart the app.',
      color: 'danger',
      persistent: true
    });

    // Log error details for debugging
    this.logErrorDetails(error, errorInfo);
  }

  private logErrorDetails = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount
    };

    console.group('🚨 Error Boundary Details');
    console.error('Error:', errorDetails);
    console.groupEnd();

    // In development, also log to console for easier debugging
    if (import.meta.env.DEV) {
      console.warn('🔧 [DEV] Error occurred in component tree:', errorInfo.componentStack);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 [ErrorBoundary] Retry attempt ${this.retryCount}/${this.maxRetries}`);
      
      // Reset error state to retry rendering
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });

      // Show retry notification
      notificationService.show({
        type: 'system',
        title: 'Retrying...',
        message: `Attempt ${this.retryCount} of ${this.maxRetries}`,
        color: 'primary',
        duration: 2000
      });
    } else {
      // Max retries reached, suggest page reload
      notificationService.show({
        type: 'system',
        title: 'Max Retries Reached',
        message: 'Please refresh the page if the problem persists.',
        color: 'warning',
        persistent: true
      });
    }
  };

  private handleReload = () => {
    // Only reload as last resort
    console.log('🔄 [ErrorBoundary] User requested page reload');
    window.location.reload();
  };

  private handleGoHome = () => {
    // Navigate to home instead of reload
    console.log('🏠 [ErrorBoundary] Navigating to home');
    window.location.hash = '/';
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh'
        }}>
          <IonCard style={{ maxWidth: '500px', width: '100%' }}>
            <IonCardHeader>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={warning} color="danger" />
                Something went wrong
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              <IonText color="medium">
                <p>
                  An unexpected error occurred in the application. 
                  You can try to recover or return to the main menu.
                </p>
              </IonText>

              {import.meta.env.DEV && this.state.error && (
                <details style={{ marginTop: '16px', fontSize: '12px' }}>
                  <summary>Error Details (Development)</summary>
                  <pre style={{ 
                    background: 'var(--ion-color-light)', 
                    padding: '8px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '20px',
                flexWrap: 'wrap'
              }}>
                {this.retryCount < this.maxRetries && (
                  <IonButton 
                    onClick={this.handleRetry}
                    color="primary"
                    size="default"
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </IonButton>
                )}

                <IonButton 
                  onClick={this.handleGoHome}
                  color="medium"
                  fill="outline"
                  size="default"
                >
                  <IonIcon icon={home} slot="start" />
                  Main Menu
                </IonButton>

                {this.retryCount >= this.maxRetries && (
                  <IonButton 
                    onClick={this.handleReload}
                    color="danger"
                    fill="outline"
                    size="default"
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Reload Page
                  </IonButton>
                )}
              </div>

              <IonText color="medium" style={{ fontSize: '12px', marginTop: '16px' }}>
                <p>Error ID: {this.state.errorId}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    console.error('🚨 [useErrorHandler] Manual error report:', error);
    
    notificationService.show({
      type: 'system',
      title: 'Error Occurred',
      message: error.message || 'An unexpected error occurred',
      color: 'danger',
      duration: 5000
    });
  }, []);

  return { handleError };
};
