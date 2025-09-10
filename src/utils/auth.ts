import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { signInWithGoogleMobile } from './mobileAuth';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export interface AuthError {
  code: string;
  message: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Create a new user account with email and password
 */
export const signUpWithEmail = async (data: SignUpData): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    
    // Update the user's display name
    if (userCredential.user && data.displayName) {
      await updateProfile(userCredential.user, {
        displayName: data.displayName
      });
    }
    
    // Send email verification
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
    }
    
    return userCredential;
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (data: SignInData): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, data.email, data.password);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use mobile-optimized Google Sign-In
      return await signInWithGoogleMobile();
    } else {
      // Web platform
      return await signInWithPopup(auth, googleProvider);
    }
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (user: User, data: { displayName?: string; photoURL?: string }): Promise<void> => {
  try {
    await updateProfile(user, data);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Convert Firebase auth error codes to user-friendly messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
};

/**
 * Check if user email is verified
 */
export const isEmailVerified = (user: User | null): boolean => {
  return user?.emailVerified ?? false;
};

/**
 * Resend email verification
 */
export const resendEmailVerification = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};

/**
 * Re-authenticate user with password for sensitive operations
 * This function verifies credentials without triggering a global sign-in event
 */
export const reauthenticateWithPassword = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw {
      code: 'auth/no-user-found',
      message: 'No user is currently signed in.'
    } as AuthError;
  }

  if (!user.email) {
    throw {
      code: 'auth/no-email',
      message: 'User email is not available for re-authentication.'
    } as AuthError;
  }

  const credential = EmailAuthProvider.credential(user.email, password);

  try {
    await reauthenticateWithCredential(user, credential);
  } catch (error: any) {
    throw {
      code: error.code,
      message: getAuthErrorMessage(error.code)
    } as AuthError;
  }
};
