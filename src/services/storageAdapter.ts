/**
 * Platform-Aware Storage Adapter
 * 
 * Provides a unified storage interface that automatically selects the best storage
 * mechanism for the current platform:
 * - Mobile (Capacitor): Uses Capacitor Preferences (Keychain/EncryptedSharedPreferences)
 * - Web: Uses localStorage with IndexedDB fallback for large data
 * 
 * This adapter serves as the backend for user-scoped storage and other storage needs.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { StateStorage } from 'zustand/middleware';

export interface StorageAdapter extends StateStorage {
  // Extend StateStorage with additional methods
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;

  // Batch operations for efficiency
  getMultiple(keys: string[]): Promise<Record<string, string | null>>;
  setMultiple(items: Record<string, string>): Promise<void>;
  removeMultiple(keys: string[]): Promise<void>;

  // User-scoped storage helpers for easier migration
  getUserScopedKey(userId: string | null, key: string): string;
  getUserScopedItem(userId: string | null, key: string): Promise<string | null>;
  setUserScopedItem(userId: string | null, key: string, value: string): Promise<void>;
  removeUserScopedItem(userId: string | null, key: string): Promise<void>;
  clearUserData(userId: string): Promise<void>;
}

export interface StorageAdapterOptions {
  // Prefix for all keys to avoid conflicts
  keyPrefix?: string;
  
  // Maximum size for localStorage before falling back to IndexedDB (web only)
  maxLocalStorageSize?: number;
  
  // Enable debug logging
  debug?: boolean;
}

/**
 * Environment detection utility
 */
function detectStorageEnvironment(): 'capacitor' | 'web' {
  return Capacitor.isNativePlatform() ? 'capacitor' : 'web';
}

/**
 * Create a platform-aware storage adapter
 */
export function createStorageAdapter(options: StorageAdapterOptions = {}): StorageAdapter {
  const {
    keyPrefix = '',
    maxLocalStorageSize = 5 * 1024 * 1024, // 5MB
    debug = false
  } = options;

  const environment = detectStorageEnvironment();
  
  if (debug) {
    console.log(`🔧 [StorageAdapter] Creating adapter for environment: ${environment}`);
  }

  // Helper to add prefix to keys
  const prefixKey = (key: string): string => keyPrefix ? `${keyPrefix}${key}` : key;
  
  // Helper to remove prefix from keys
  const unprefixKey = (key: string): string => {
    if (keyPrefix && key.startsWith(keyPrefix)) {
      return key.substring(keyPrefix.length);
    }
    return key;
  };

  if (environment === 'capacitor') {
    // Capacitor-based storage (mobile platforms)
    return createCapacitorStorageAdapter(prefixKey, unprefixKey, debug);
  } else {
    // Web-based storage with localStorage + IndexedDB fallback
    return createWebStorageAdapter(prefixKey, unprefixKey, maxLocalStorageSize, debug);
  }
}

/**
 * Capacitor-based storage adapter for mobile platforms
 */
function createCapacitorStorageAdapter(
  prefixKey: (key: string) => string,
  unprefixKey: (key: string) => string,
  debug: boolean
): StorageAdapter {

  const log = (message: string, data?: any) => {
    if (debug) {
      console.log(`📱 [CapacitorStorage] ${message}`, data || '');
    }
  };

  const adapter: StorageAdapter = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const prefixedKey = prefixKey(key);
        const { value } = await Preferences.get({ key: prefixedKey });
        log(`Retrieved item: ${key}`, { hasValue: !!value });
        return value;
      } catch (error) {
        console.error(`❌ [CapacitorStorage] Error getting item ${key}:`, error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const prefixedKey = prefixKey(key);
        await Preferences.set({ key: prefixedKey, value });
        log(`Stored item: ${key}`, { size: value.length });
      } catch (error) {
        console.error(`❌ [CapacitorStorage] Error setting item ${key}:`, error);
        throw error;
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        const prefixedKey = prefixKey(key);
        await Preferences.remove({ key: prefixedKey });
        log(`Removed item: ${key}`);
      } catch (error) {
        console.error(`❌ [CapacitorStorage] Error removing item ${key}:`, error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        await Preferences.clear();
        log('Cleared all storage');
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error clearing storage:', error);
        throw error;
      }
    },

    keys: async (): Promise<string[]> => {
      try {
        const { keys } = await Preferences.keys();
        const unprefixedKeys = keys.map(unprefixKey);
        log(`Retrieved keys`, { count: keys.length });
        return unprefixedKeys;
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error getting keys:', error);
        return [];
      }
    },

    size: async (): Promise<number> => {
      try {
        const keys = await adapter.keys();
        return keys.length;
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error getting size:', error);
        return 0;
      }
    },

    getMultiple: async (keys: string[]): Promise<Record<string, string | null>> => {
      const result: Record<string, string | null> = {};

      try {
        // Capacitor doesn't have batch operations, so we do them in parallel
        const promises = keys.map(async (key) => {
          const value = await adapter.getItem(key);
          return { key, value };
        });
        
        const results = await Promise.all(promises);
        results.forEach(({ key, value }) => {
          result[key] = value;
        });
        
        log(`Retrieved multiple items`, { count: keys.length });
        return result;
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error getting multiple items:', error);
        return result;
      }
    },

    setMultiple: async (items: Record<string, string>): Promise<void> => {
      try {
        // Perform all sets in parallel
        const promises = Object.entries(items).map(async ([key, value]) => {
          const prefixedKey = prefixKey(key);
          await Preferences.set({ key: prefixedKey, value });
        });

        await Promise.all(promises);
        log(`Stored multiple items`, { count: Object.keys(items).length });
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error setting multiple items:', error);
        throw error;
      }
    },

    removeMultiple: async (keys: string[]): Promise<void> => {
      try {
        // Perform all removes in parallel
        const promises = keys.map(async (key) => {
          const prefixedKey = prefixKey(key);
          await Preferences.remove({ key: prefixedKey });
        });
        await Promise.all(promises);
        log(`Removed multiple items`, { count: keys.length });
      } catch (error) {
        console.error('❌ [CapacitorStorage] Error removing multiple items:', error);
        throw error;
      }
    },

    // User-scoped storage helpers
    getUserScopedKey: (userId: string | null, key: string): string => {
      const userPrefix = userId ? `user_${userId}_` : 'global_';
      return `${userPrefix}${key}`;
    },

    getUserScopedItem: async (userId: string | null, key: string): Promise<string | null> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      return adapter.getItem(scopedKey);
    },

    setUserScopedItem: async (userId: string | null, key: string, value: string): Promise<void> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      await adapter.setItem(scopedKey, value);
    },

    removeUserScopedItem: async (userId: string | null, key: string): Promise<void> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      await adapter.removeItem(scopedKey);
    },

    clearUserData: async (userId: string): Promise<void> => {
      try {
        const allKeys = await adapter.keys();
        const userPrefix = `user_${userId}_`;
        const userKeys = allKeys.filter(key => unprefixKey(key).startsWith(userPrefix));

        if (userKeys.length > 0) {
          await adapter.removeMultiple(userKeys.map(unprefixKey));
          log(`Cleared user data for ${userId}`, { keysRemoved: userKeys.length });
        }
      } catch (error) {
        console.error(`❌ [CapacitorStorage] Error clearing user data for ${userId}:`, error);
        throw error;
      }
    }
  };

  return adapter;
}

/**
 * Web-based storage adapter with localStorage + IndexedDB fallback
 */
function createWebStorageAdapter(
  prefixKey: (key: string) => string,
  unprefixKey: (key: string) => string,
  maxLocalStorageSize: number,
  debug: boolean
): StorageAdapter {

  const log = (message: string, data?: any) => {
    if (debug) {
      console.log(`🌐 [WebStorage] ${message}`, data || '');
    }
  };

  // Check if we should use IndexedDB for large items
  const shouldUseIndexedDB = (value: string): boolean => {
    return value.length > maxLocalStorageSize;
  };

  // IndexedDB helper
  const indexedDBHelper = createIndexedDBHelper(debug);

  const adapter: StorageAdapter = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const prefixedKey = prefixKey(key);

        // First try localStorage
        const localValue = localStorage.getItem(prefixedKey);
        if (localValue !== null) {
          log(`Retrieved from localStorage: ${key}`);
          return localValue;
        }

        // Fallback to IndexedDB
        const indexedValue = await indexedDBHelper.getItem(prefixedKey);
        if (indexedValue !== null) {
          log(`Retrieved from IndexedDB: ${key}`);
        }

        return indexedValue;
      } catch (error) {
        console.error(`❌ [WebStorage] Error getting item ${key}:`, error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const prefixedKey = prefixKey(key);

        if (shouldUseIndexedDB(value)) {
          // Large item - use IndexedDB
          await indexedDBHelper.setItem(prefixedKey, value);

          // Remove from localStorage if it exists there
          localStorage.removeItem(prefixedKey);

          log(`Stored large item in IndexedDB: ${key}`, { size: value.length });
        } else {
          // Small item - use localStorage
          localStorage.setItem(prefixedKey, value);

          // Remove from IndexedDB if it exists there
          await indexedDBHelper.removeItem(prefixedKey);

          log(`Stored item in localStorage: ${key}`, { size: value.length });
        }
      } catch (error) {
        console.error(`❌ [WebStorage] Error setting item ${key}:`, error);
        throw error;
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        const prefixedKey = prefixKey(key);

        // Remove from both storages
        localStorage.removeItem(prefixedKey);
        await indexedDBHelper.removeItem(prefixedKey);

        log(`Removed item: ${key}`);
      } catch (error) {
        console.error(`❌ [WebStorage] Error removing item ${key}:`, error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        // Clear localStorage items with our prefix
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (prefixKey('') === '' || key.startsWith(prefixKey('')))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear IndexedDB
        await indexedDBHelper.clear();
        
        log('Cleared all storage');
      } catch (error) {
        console.error('❌ [WebStorage] Error clearing storage:', error);
        throw error;
      }
    },

    keys: async (): Promise<string[]> => {
      try {
        const allKeys = new Set<string>();
        
        // Get localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (prefixKey('') === '' || key.startsWith(prefixKey('')))) {
            allKeys.add(unprefixKey(key));
          }
        }
        
        // Get IndexedDB keys
        const indexedKeys = await indexedDBHelper.keys();
        indexedKeys.forEach(key => allKeys.add(unprefixKey(key)));
        
        const result = Array.from(allKeys);
        log(`Retrieved keys`, { count: result.length });
        return result;
      } catch (error) {
        console.error('❌ [WebStorage] Error getting keys:', error);
        return [];
      }
    },

    size: async (): Promise<number> => {
      try {
        const keys = await adapter.keys();
        return keys.length;
      } catch (error) {
        console.error('❌ [WebStorage] Error getting size:', error);
        return 0;
      }
    },

    getMultiple: async (keys: string[]): Promise<Record<string, string | null>> => {
      const result: Record<string, string | null> = {};

      try {
        // Get all items in parallel
        const promises = keys.map(async (key) => {
          const value = await adapter.getItem(key);
          return { key, value };
        });
        
        const results = await Promise.all(promises);
        results.forEach(({ key, value }) => {
          result[key] = value;
        });
        
        log(`Retrieved multiple items`, { count: keys.length });
        return result;
      } catch (error) {
        console.error('❌ [WebStorage] Error getting multiple items:', error);
        return result;
      }
    },

    setMultiple: async (items: Record<string, string>): Promise<void> => {
      try {
        // Perform all sets in parallel
        const promises = Object.entries(items).map(async ([key, value]) => {
          const prefixedKey = prefixKey(key);

          if (shouldUseIndexedDB(value)) {
            // Large item - use IndexedDB
            await indexedDBHelper.setItem(prefixedKey, value);

            // Remove from localStorage if it exists there
            localStorage.removeItem(prefixedKey);
          } else {
            // Small item - use localStorage
            localStorage.setItem(prefixedKey, value);

            // Remove from IndexedDB if it exists there
            await indexedDBHelper.removeItem(prefixedKey);
          }
        });

        await Promise.all(promises);
        log(`Stored multiple items`, { count: Object.keys(items).length });
      } catch (error) {
        console.error('❌ [WebStorage] Error setting multiple items:', error);
        throw error;
      }
    },

    removeMultiple: async (keys: string[]): Promise<void> => {
      try {
        // Perform all removes in parallel
        const promises = keys.map(async (key) => {
          const prefixedKey = prefixKey(key);

          // Remove from both storages
          localStorage.removeItem(prefixedKey);
          await indexedDBHelper.removeItem(prefixedKey);
        });
        await Promise.all(promises);
        log(`Removed multiple items`, { count: keys.length });
      } catch (error) {
        console.error('❌ [WebStorage] Error removing multiple items:', error);
        throw error;
      }
    },

    // User-scoped storage helpers
    getUserScopedKey: (userId: string | null, key: string): string => {
      const userPrefix = userId ? `user_${userId}_` : 'global_';
      return `${userPrefix}${key}`;
    },

    getUserScopedItem: async (userId: string | null, key: string): Promise<string | null> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      return adapter.getItem(scopedKey);
    },

    setUserScopedItem: async (userId: string | null, key: string, value: string): Promise<void> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      await adapter.setItem(scopedKey, value);
    },

    removeUserScopedItem: async (userId: string | null, key: string): Promise<void> => {
      const scopedKey = adapter.getUserScopedKey(userId, key);
      await adapter.removeItem(scopedKey);
    },

    clearUserData: async (userId: string): Promise<void> => {
      try {
        const allKeys = await adapter.keys();
        const userPrefix = `user_${userId}_`;
        const userKeys = allKeys.filter(key => unprefixKey(key).startsWith(userPrefix));

        if (userKeys.length > 0) {
          await adapter.removeMultiple(userKeys.map(unprefixKey));
          log(`Cleared user data for ${userId}`, { keysRemoved: userKeys.length });
        }
      } catch (error) {
        console.error(`❌ [WebStorage] Error clearing user data for ${userId}:`, error);
        throw error;
      }
    }
  };

  return adapter;
}

/**
 * IndexedDB helper for web storage
 * Keys are already prefixed when passed to this helper
 */
function createIndexedDBHelper(debug: boolean) {
  const DB_NAME = 'biomasters-storage-adapter';
  const DB_VERSION = 1;
  const STORE_NAME = 'keyValueStore';

  let dbPromise: Promise<IDBDatabase> | null = null;

  const log = (message: string, data?: any) => {
    if (debug) {
      console.log(`🗄️ [IndexedDBHelper] ${message}`, data || '');
    }
  };

  const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('❌ [IndexedDBHelper] Failed to open database:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          log('Database opened successfully');
          resolve(request.result);
        };

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            log('Database schema created');
          }
        };
      });
    }

    return dbPromise;
  };

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const db = await getDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
          const request = store.get(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.value : null);
          };
        });
      } catch (error) {
        console.error(`❌ [IndexedDBHelper] Error getting item ${key}:`, error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const db = await getDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
          const request = store.put({
            key,
            value,
            timestamp: Date.now()
          });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        console.error(`❌ [IndexedDBHelper] Error setting item ${key}:`, error);
        throw error;
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        const db = await getDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
          const request = store.delete(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        console.error(`❌ [IndexedDBHelper] Error removing item ${key}:`, error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        const db = await getDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
          const request = store.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            log('IndexedDB cleared');
            resolve();
          };
        });
      } catch (error) {
        console.error('❌ [IndexedDBHelper] Error clearing store:', error);
        throw error;
      }
    },

    keys: async (): Promise<string[]> => {
      try {
        const db = await getDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
          const request = store.getAllKeys();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            resolve(request.result as string[]);
          };
        });
      } catch (error) {
        console.error('❌ [IndexedDBHelper] Error getting keys:', error);
        return [];
      }
    }
  };
}

// Export default for convenience
export default createStorageAdapter;
