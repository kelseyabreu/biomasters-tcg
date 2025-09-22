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

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn(() => {
    const request = {
      result: {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
            put: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
            delete: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
            clear: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
            getAllKeys: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          })),
        })),
        createObjectStore: vi.fn(),
      },
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    } as any;

    // Simulate async success
    setTimeout(() => {
      if (request.onsuccess && typeof request.onsuccess === 'function') {
        const event = { target: request } as any;
        request.onsuccess(event);
      }
    }, 0);

    return request;
  }),
  deleteDatabase: vi.fn(),
};

// Mock localStorage for fallback testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

// Set up global mocks
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project-id';

// Mock the localization hooks to avoid LocalizationProvider context issues
vi.mock('./hooks/useCardLocalization', () => ({
  useUILocalization: () => ({
    getUIText: vi.fn((id: string) => `[${id}]`),
    currentLanguage: 'en',
    isLoading: false,
    getButtonText: vi.fn((id: string) => `[${id}]`),
    getMenuText: vi.fn((id: string) => `[${id}]`),
    getErrorText: vi.fn((id: string) => `[${id}]`)
  }),
  useCardLocalization: () => ({
    getCardName: vi.fn((id: string) => `[${id}]`),
    getScientificName: vi.fn((id: string) => `[${id}]`),
    getCardDescription: vi.fn((id: string) => `[${id}]`),
    getAbilityName: vi.fn((id: string) => `[${id}]`),
    getUIText: vi.fn((id: string) => `[${id}]`),
    currentLanguage: 'en',
    isLoading: false,
    getBatchCardNames: vi.fn(() => ({})),
    getBatchScientificNames: vi.fn(() => ({})),
    getBatchCardDescriptions: vi.fn(() => ({})),
    getCardLocalization: vi.fn(() => ({
      name: 'Test Card',
      scientificName: 'Test Scientific',
      description: 'Test Description'
    })),
    preloadLocalizations: vi.fn(),
    getCacheStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0, hitRate: 0 }))
  }),
  useSimpleCardLocalization: () => ({
    getCardName: vi.fn((id: string) => `[${id}]`),
    currentLanguage: 'en',
    isLoading: false,
    getCardDisplayInfo: vi.fn(() => ({
      name: 'Test Card',
      language: 'en',
      isLoading: false
    }))
  })
}));
