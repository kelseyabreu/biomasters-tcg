import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in production)
export const analytics = import.meta.env.PROD ? getAnalytics(app) : null;

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔥 Connecting to Firebase emulators...');

  try {
    // Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('✅ Auth emulator connected');
  } catch (error) {
    console.log('ℹ️ Auth emulator already connected or unavailable');
  }

  try {
    // Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('✅ Firestore emulator connected');
  } catch (error) {
    console.log('ℹ️ Firestore emulator already connected or unavailable');
  }

  try {
    // Functions emulator
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Functions emulator connected');
  } catch (error) {
    console.log('ℹ️ Functions emulator already connected or unavailable');
  }
}

export default app;
