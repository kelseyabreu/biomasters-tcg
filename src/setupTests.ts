/**
 * Test setup file for Vitest
 * This file is automatically loaded before running tests
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Capacitor plugins for testing
const mockCapacitor = {
  Plugins: {
    Storage: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn(),
    },
    Network: {
      getStatus: vi.fn(() => Promise.resolve({ connected: true })),
      addListener: vi.fn(),
    },
    App: {
      addListener: vi.fn(),
    },
  },
  registerPlugin: vi.fn(),
};

// Mock @capacitor/core
vi.mock('@capacitor/core', () => mockCapacitor);

// Mock @capacitor/preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: mockCapacitor.Plugins.Storage,
}));

// Mock @capacitor/network
vi.mock('@capacitor/network', () => ({
  Network: mockCapacitor.Plugins.Network,
}));

// Mock @capacitor/app
vi.mock('@capacitor/app', () => ({
  App: mockCapacitor.Plugins.App,
}));

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock Ionic React components
vi.mock('@ionic/react', () => ({
  ...vi.importActual('@ionic/react'),
  isPlatform: vi.fn(() => false),
}));

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project-id';
