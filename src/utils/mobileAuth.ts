import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  UserCredential 
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Mobile-optimized Google Sign-In
 * Uses browser-based flow for mobile platforms
 */
export const signInWithGoogleMobile = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  if (Capacitor.isNativePlatform()) {
    // For mobile platforms, use redirect flow
    try {
      // First, try to get any existing redirect result
      const result = await getRedirectResult(auth);
      if (result) {
        return result;
      }

      // If no redirect result, initiate sign-in
      await signInWithRedirect(auth, provider);
      
      // This will redirect the user, so we need to handle the result
      // when the app resumes. The redirect result will be available
      // on the next app launch/resume
      throw new Error('Redirect initiated - result will be available on app resume');
    } catch (error: any) {
      // If redirect fails, fall back to browser-based flow
      console.warn('Redirect sign-in failed, falling back to browser:', error);
      return await signInWithGoogleBrowser();
    }
  } else {
    // For web platforms, use popup
    return await signInWithPopup(auth, provider);
  }
};

/**
 * Browser-based Google Sign-In for mobile
 * Opens authentication in system browser
 */
const signInWithGoogleBrowser = async (): Promise<UserCredential> => {
  try {
    // Create the OAuth URL manually for better mobile support
    const clientId = import.meta.env.VITE_FIREBASE_API_KEY; // This would be your Google Client ID
    const redirectUri = `${window.location.origin}/auth-callback`;
    
    const authUrl = `https://accounts.google.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid%20profile%20email&` +
      `state=${generateRandomState()}`;

    // Open in system browser
    await Browser.open({
      url: authUrl,
      windowName: '_system'
    });

    // For now, we'll use the popup method as fallback
    // In a full implementation, you'd handle the callback
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error('Browser-based sign-in failed:', error);
    throw error;
  }
};

/**
 * Generate a random state parameter for OAuth security
 */
const generateRandomState = (): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0].toString(36);
};

/**
 * Handle deep link authentication callback
 * This would be called when the app resumes from OAuth flow
 */
export const handleAuthCallback = async (url: string): Promise<UserCredential | null> => {
  try {
    // Parse the callback URL for auth tokens
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // In a full implementation, you'd exchange the code for tokens
      // and create a Firebase custom token
      console.log('Auth callback received:', { code, state });
      
      // For now, check for redirect result
      const result = await getRedirectResult(auth);
      return result;
    }

    return null;
  } catch (error: any) {
    console.error('Error handling auth callback:', error);
    throw error;
  }
};

/**
 * Configure mobile-specific authentication settings
 */
export const configureMobileAuth = () => {
  if (Capacitor.isNativePlatform()) {
    console.log('🔧 Configuring mobile authentication...');
    
    // Set up app state change listeners for handling auth callbacks
    document.addEventListener('resume', async () => {
      console.log('📱 App resumed - checking for auth redirect result...');
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Auth redirect result found:', result.user.uid);
        }
      } catch (error) {
        console.error('❌ Error checking redirect result:', error);
      }
    });

    // Handle deep links (if configured)
    // This would require additional Capacitor plugins for deep linking
  }
};


/**
 * Check if the current platform supports native authentication
 */
export const supportsNativeAuth = (): boolean => {
  return Capacitor.isNativePlatform() && (
    Capacitor.getPlatform() === 'ios' || 
    Capacitor.getPlatform() === 'android'
  );
};

/**
 * Get platform-specific authentication options
 */
export const getAuthOptions = () => {
  const platform = Capacitor.getPlatform();
  
  return {
    platform,
    isNative: Capacitor.isNativePlatform(),
    supportsPopup: platform === 'web',
    supportsRedirect: true,
    supportsBrowser: Capacitor.isNativePlatform(),
    supportsDeepLinks: Capacitor.isNativePlatform()
  };
};
