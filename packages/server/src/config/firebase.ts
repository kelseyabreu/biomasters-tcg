import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let firebaseApp: admin.app.App;
let auth: admin.auth.Auth;
let firestore: admin.firestore.Firestore;

/**
 * Initialize Firebase Admin SDK
 */
export async function initializeFirebase(): Promise<void> {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      console.log('🔥 Firebase Admin SDK already initialized');
      return;
    }

    // Get service account configuration from environment variables
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env['FIREBASE_PROJECT_ID'],
      private_key_id: process.env['FIREBASE_PRIVATE_KEY_ID'],
      private_key: process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
      client_email: process.env['FIREBASE_CLIENT_EMAIL'],
      client_id: process.env['FIREBASE_CLIENT_ID'],
      auth_uri: process.env['FIREBASE_AUTH_URI'] || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env['FIREBASE_TOKEN_URI'] || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env['FIREBASE_AUTH_PROVIDER_X509_CERT_URL'] || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env['FIREBASE_CLIENT_X509_CERT_URL']
    };

    // Validate required environment variables
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field as keyof typeof serviceAccount]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Firebase environment variables: ${missingFields.join(', ')}`);
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env['FIREBASE_PROJECT_ID'] || '',
      databaseURL: `https://${process.env['FIREBASE_PROJECT_ID'] || 'default'}-default-rtdb.firebaseio.com/`
    });

    // Initialize services
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);

    // Configure Firestore settings
    firestore.settings({
      ignoreUndefinedProperties: true
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`📍 Project ID: ${process.env['FIREBASE_PROJECT_ID']}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): admin.auth.Auth {
  if (!auth) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebase() first.');
  }
  return auth;
}

/**
 * Get Firestore instance
 */
export function getFirebaseFirestore(): admin.firestore.Firestore {
  if (!firestore) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebase() first.');
  }
  return firestore;
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    // In test environment, handle test tokens
    if (process.env['NODE_ENV'] === 'test' && idToken.startsWith('eyJ')) {
      // This is a JWT token for testing - decode it directly
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(idToken, process.env['JWT_SECRET'] || 'test-secret');

      // Return in Firebase DecodedIdToken format
      return {
        uid: decoded.uid,
        email: decoded.email,
        email_verified: decoded.email_verified || false,
        iss: decoded.iss,
        aud: decoded.aud,
        auth_time: decoded.auth_time,
        user_id: decoded.user_id,
        sub: decoded.sub,
        iat: decoded.iat,
        exp: decoded.exp,
        firebase: decoded.firebase || {}
      } as admin.auth.DecodedIdToken;
    }

    // Production: use real Firebase verification
    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('❌ Failed to verify ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user by UID
 */
export async function getFirebaseUser(uid: string): Promise<admin.auth.UserRecord> {
  try {
    const user = await getFirebaseAuth().getUser(uid);
    return user;
  } catch (error) {
    console.error('❌ Failed to get Firebase user:', error);
    throw new Error('User not found');
  }
}

/**
 * Create custom token for user
 */
export async function createCustomToken(uid: string, additionalClaims?: object): Promise<string> {
  try {
    const customToken = await getFirebaseAuth().createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('❌ Failed to create custom token:', error);
    throw new Error('Failed to create custom token');
  }
}

/**
 * Update user claims
 */
export async function setCustomUserClaims(uid: string, customClaims: object): Promise<void> {
  try {
    await getFirebaseAuth().setCustomUserClaims(uid, customClaims);
    console.log(`✅ Custom claims set for user: ${uid}`);
  } catch (error) {
    console.error('❌ Failed to set custom claims:', error);
    throw new Error('Failed to set custom claims');
  }
}

/**
 * Delete user
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  try {
    await getFirebaseAuth().deleteUser(uid);
    console.log(`✅ User deleted: ${uid}`);
  } catch (error) {
    console.error('❌ Failed to delete user:', error);
    throw new Error('Failed to delete user');
  }
}

/**
 * Batch get users
 */
export async function getFirebaseUsers(uids: string[]): Promise<admin.auth.GetUsersResult> {
  try {
    const result = await getFirebaseAuth().getUsers(uids.map(uid => ({ uid })));
    return result;
  } catch (error) {
    console.error('❌ Failed to get users:', error);
    throw new Error('Failed to get users');
  }
}

/**
 * List users with pagination
 */
export async function listFirebaseUsers(maxResults: number = 1000, pageToken?: string): Promise<admin.auth.ListUsersResult> {
  try {
    const result = await getFirebaseAuth().listUsers(maxResults, pageToken);
    return result;
  } catch (error) {
    console.error('❌ Failed to list users:', error);
    throw new Error('Failed to list users');
  }
}

export { firebaseApp, auth, firestore };
