/**
 * Firebase Test Configuration
 * Configures Firebase for e2e testing with real Firebase services
 */

export interface FirebaseTestConfig {
  useEmulator: boolean;
  emulatorHost: string;
  emulatorPort: number;
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Environment-based configuration
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';
const useEmulator = process.env.VITE_USE_FIREBASE_EMULATOR === 'true' || process.env.FIREBASE_USE_EMULATOR === 'true' || isTestEnvironment;

export const FIREBASE_TEST_CONFIG: FirebaseTestConfig = {
  useEmulator,
  emulatorHost: process.env.FIREBASE_EMULATOR_HOST || 'localhost',
  emulatorPort: parseInt(process.env.FIREBASE_AUTH_EMULATOR_PORT || '9099'),
  
  // Firebase project configuration
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'biomasters-tcg-test',
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'test-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'biomasters-tcg-test.firebaseapp.com',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'biomasters-tcg-test.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:test-app-id'
};

// Test user patterns for cleanup
export const TEST_USER_PATTERNS = [
  'e2e-test-%',
  'playwright-%',
  'test-user-%',
  'auth-test-%',
  'deletion-test-%'
];

// Test configuration constants - Enhanced for mobile compatibility
export const TEST_CONSTANTS = {
  // Timeouts - Increased for mobile compatibility
  AUTH_TIMEOUT: 45000, // Increased for mobile auth flows
  DELETION_TIMEOUT: 60000, // Increased for mobile deletion flows
  NETWORK_TIMEOUT: 25000, // Increased for mobile network operations
  MOBILE_TIMEOUT: 60000, // Specific timeout for mobile operations
  MODAL_TIMEOUT: 20000, // Timeout for modal operations
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Test data
  DEFAULT_PASSWORD: 'TestPassword123!',
  DELETION_CONFIRMATION_TEXT: 'DELETE MY ACCOUNT',
  
  // Selectors
  SELECTORS: {
    // Authentication
    SIGNIN_BUTTON: '[data-testid="signin-button"]',
    AUTH_MODAL: '[data-testid="auth-modal"]',
    EMAIL_INPUT: '[data-testid="email-input"]',
    PASSWORD_INPUT: '[data-testid="password-input"]',
    DISPLAY_NAME_INPUT: '[data-testid="display-name-input"]',
    REGISTER_BUTTON: '[data-testid="register-button"]',
    GUEST_LOGIN_BUTTON: '[data-testid="guest-login-button"]',
    
    // User profile
    USER_PROFILE: '[data-testid="user-profile"]',
    USERNAME: '[data-testid="username"]',
    DISPLAY_NAME: '[data-testid="display-name"]',
    USER_EMAIL: '[data-testid="user-email"]',
    ACCOUNT_TYPE_BADGE: '[data-testid="account-type-badge"]',
    
    // Account deletion
    DELETE_ACCOUNT_BUTTON: '[data-testid="delete-account-button"]',
    ACCOUNT_DELETION_MODAL: '[data-testid="account-deletion-modal"]',
    ACKNOWLEDGE_WARNING_BUTTON: '[data-testid="acknowledge-warning-button"]',
    SKIP_EXPORT_BUTTON: '[data-testid="skip-export-button"]',
    DELETION_PASSWORD_INPUT: '[data-testid="deletion-password-input"]',
    VERIFY_PASSWORD_BUTTON: '[data-testid="verify-password-button"]',
    DELETION_CONFIRMATION_INPUT: '[data-testid="deletion-confirmation-input"]',
    PROCEED_TO_FINAL_BUTTON: '[data-testid="proceed-to-final-button"]',
    FINAL_CONFIRMATION_ALERT: '[data-testid="final-confirmation-alert"]',
    CONFIRM_DELETION_BUTTON: '[data-testid="confirm-deletion-button"]',
    DELETION_SUCCESS: '[data-testid="deletion-success"]',
    
    // Error states
    AUTH_ERROR: '[data-testid="auth-error"]',
    EMAIL_ERROR: '[data-testid="email-error"]',
    PASSWORD_ERROR: '[data-testid="password-error"]',
    NETWORK_ERROR: '[data-testid="network-error"]',
    
    // Navigation
    SETTINGS_TAB: 'ion-tab-button[tab="settings"]',
    HOME_TAB: 'ion-tab-button[tab="home"]'
  }
};

// Firebase emulator utilities
export class FirebaseEmulatorManager {
  private static instance: FirebaseEmulatorManager;
  private isRunning = false;

  static getInstance(): FirebaseEmulatorManager {
    if (!FirebaseEmulatorManager.instance) {
      FirebaseEmulatorManager.instance = new FirebaseEmulatorManager();
    }
    return FirebaseEmulatorManager.instance;
  }

  async startEmulators(): Promise<void> {
    if (this.isRunning || !FIREBASE_TEST_CONFIG.useEmulator) {
      return;
    }

    try {
      console.log('🔥 Starting Firebase emulators...');
      
      // Check if emulators are already running
      const response = await fetch(`http://${FIREBASE_TEST_CONFIG.emulatorHost}:${FIREBASE_TEST_CONFIG.emulatorPort}`);
      if (response.ok) {
        console.log('✅ Firebase emulators already running');
        this.isRunning = true;
        return;
      }
    } catch (error) {
        if (this.options.enableLogging) {
            console.log(error.message);
        }
    }

    // Start emulators (this would typically be done via npm script or external process)
    console.log('⚠️ Firebase emulators not detected. Please start them manually with: npm run firebase:emulators');
    console.log('   Or ensure FIREBASE_USE_EMULATOR=false to use real Firebase');
  }

  async stopEmulators(): Promise<void> {
    if (!this.isRunning || !FIREBASE_TEST_CONFIG.useEmulator) {
      return;
    }

    try {
      console.log('🛑 Stopping Firebase emulators...');
      // Emulators are typically stopped externally
      this.isRunning = false;
      console.log('✅ Firebase emulators stopped');
    } catch (error) {
      console.error('❌ Failed to stop Firebase emulators:', error);
    }
  }

  async clearEmulatorData(): Promise<void> {
    if (!FIREBASE_TEST_CONFIG.useEmulator) {
      return;
    }

    try {
      console.log('🧹 Clearing Firebase emulator data...');
      
      // Clear Auth emulator data
      const authClearUrl = `http://${FIREBASE_TEST_CONFIG.emulatorHost}:${FIREBASE_TEST_CONFIG.emulatorPort}/emulator/v1/projects/${FIREBASE_TEST_CONFIG.projectId}/accounts`;
      await fetch(authClearUrl, { method: 'DELETE' });
      
      console.log('✅ Firebase emulator data cleared');
    } catch (error) {
      console.error('❌ Failed to clear emulator data:', error);
    }
  }

  getEmulatorUrl(): string {
    return `http://${FIREBASE_TEST_CONFIG.emulatorHost}:${FIREBASE_TEST_CONFIG.emulatorPort}`;
  }

  isEmulatorRunning(): boolean {
    return this.isRunning;
  }
}

// Test environment validation
export function validateTestEnvironment(): void {
  console.log('🔍 Validating test environment...');

  const requiredEnvVars = [
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  // Log all environment variables for debugging
  console.log('📋 Environment variables check:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
  });

  console.log(`🔧 VITE_USE_FIREBASE_EMULATOR: ${process.env.VITE_USE_FIREBASE_EMULATOR}`);
  console.log(`🔧 FIREBASE_USE_EMULATOR: ${process.env.FIREBASE_USE_EMULATOR}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔧 PLAYWRIGHT_TEST: ${process.env.PLAYWRIGHT_TEST}`);
  console.log(`🔧 useEmulator calculated: ${FIREBASE_TEST_CONFIG.useEmulator}`);

  if (missingVars.length > 0 && !FIREBASE_TEST_CONFIG.useEmulator) {
    console.warn('⚠️ Missing Firebase environment variables:', missingVars);
    console.warn('   Consider using Firebase emulator for testing');
  } else if (missingVars.length === 0) {
    console.log('✅ All Firebase environment variables found');
    console.log('📍 Firebase Project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
    console.log('📍 Firebase Auth Domain:', process.env.VITE_FIREBASE_AUTH_DOMAIN);
  }

  if (FIREBASE_TEST_CONFIG.useEmulator) {
    console.log('🔥 Using Firebase emulator for testing');
  } else {
    console.log('☁️ Using real Firebase services for testing');
  }
}

// Export singleton instance
export const firebaseEmulatorManager = FirebaseEmulatorManager.getInstance();
