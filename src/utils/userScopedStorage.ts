/**
 * User-Scoped Storage Adapter
 * Provides user-specific storage isolation to prevent data bleeding between accounts
 * on the same device. Each user gets their own storage namespace.
 *
 * Now uses the platform-aware storage adapter as the backend for optimal
 * cross-platform performance and security.
 */

import { StateStorage } from 'zustand/middleware';
import { createStorageAdapter } from '../services/storageAdapter';

export interface UserScopedStorageOptions {
  getUserId: () => string | null;
  fallbackStorage?: StateStorage;
  // Platform-aware storage options
  debug?: boolean;
  keyPrefix?: string;
}

/**
 * Creates a user-scoped storage adapter that isolates data by userId
 * This prevents data bleeding when multiple users use the same device
 * Now uses platform-aware storage for optimal cross-platform performance
 */
export function createUserScopedStorage(options: UserScopedStorageOptions): StateStorage {
  const {
    getUserId,
    fallbackStorage = localStorage,
    debug = false,
    keyPrefix = 'biomasters_'
  } = options;

  // Create platform-aware storage adapter
  const platformStorage = createStorageAdapter({
    keyPrefix,
    debug
  });

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const userId = getUserId();
        if (!userId) {
          console.warn('⚠️ No userId available for storage access, returning null');
          return null;
        }

        const scopedKey = `user_${userId}_${name}`;
        const value = await platformStorage.getItem(scopedKey);

        if (value && debug) {
          console.log(`📦 Retrieved user-scoped data for ${userId}:`, { key: name, hasData: true });
        }

        return value;
      } catch (error) {
        console.error('❌ Error retrieving user-scoped data:', error);

        // Fallback to legacy storage if platform storage fails
        try {
          const userId = getUserId();
          if (userId) {
            const scopedKey = `user_${userId}_${name}`;
            const fallbackValue = fallbackStorage.getItem(scopedKey);

            // Handle both sync and async fallback storage
            if (fallbackValue instanceof Promise) {
              return await fallbackValue;
            }
            return fallbackValue;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback storage also failed:', fallbackError);
        }

        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const userId = getUserId();
        if (!userId) {
          console.warn('⚠️ No userId available for storage, skipping save');
          return;
        }

        const scopedKey = `user_${userId}_${name}`;
        await platformStorage.setItem(scopedKey, value);

        if (debug) {
          console.log(`💾 Saved user-scoped data for ${userId}:`, {
            key: name,
            dataSize: value.length,
            scopedKey
          });
        }
      } catch (error) {
        console.error('❌ Error saving user-scoped data:', error);

        // Fallback to legacy storage if platform storage fails
        try {
          const userId = getUserId();
          if (userId) {
            const scopedKey = `user_${userId}_${name}`;
            fallbackStorage.setItem(scopedKey, value);
            console.warn('⚠️ Used fallback storage for setItem');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback storage setItem also failed:', fallbackError);
          throw error; // Re-throw original error
        }
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        const userId = getUserId();
        if (!userId) {
          console.warn('⚠️ No userId available for storage, skipping removal');
          return;
        }

        const scopedKey = `user_${userId}_${name}`;
        await platformStorage.removeItem(scopedKey);

        if (debug) {
          console.log(`🗑️ Removed user-scoped data for ${userId}:`, { key: name, scopedKey });
        }
      } catch (error) {
        console.error('❌ Error removing user-scoped data:', error);

        // Fallback to legacy storage if platform storage fails
        try {
          const userId = getUserId();
          if (userId) {
            const scopedKey = `user_${userId}_${name}`;
            fallbackStorage.removeItem(scopedKey);
            console.warn('⚠️ Used fallback storage for removeItem');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback storage removeItem also failed:', fallbackError);
        }
      }
    }
  };
}

/**
 * IndexedDB-based user-scoped storage for better performance and larger storage limits
 */
export function createUserScopedIndexedDBStorage(options: UserScopedStorageOptions): StateStorage {
  const { getUserId } = options;
  const DB_NAME = 'biomasters-user-storage';
  const DB_VERSION = 1;

  let dbPromise: Promise<IDBDatabase> | null = null;

  const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object store for user data if it doesn't exist
          if (!db.objectStoreNames.contains('userData')) {
            db.createObjectStore('userData', { keyPath: 'key' });
          }
        };
      });
    }
    return dbPromise;
  };

  return {
    getItem: async (name: string): Promise<string | null> => {
      console.log('📦 IndexedDB getItem called:', { name });
      try {
        const userId = getUserId();
        console.log('📦 IndexedDB getItem userId result:', { userId, hasUserId: !!userId });

        if (!userId || userId === 'no-user-id' || userId === 'default-user') {
          console.log('⚠️ Using default storage key for initial hydration');

          const db = await getDB();
          const transaction = db.transaction(['userData'], 'readonly');
          const store = transaction.objectStore('userData');
          const defaultKey = `user_default-user_${name}`;

          return new Promise((resolve) => {
            const request = store.get(defaultKey);
            request.onerror = () => {
              console.log('📦 No default data found, returning null for hydration');
              resolve(null);
            };
            request.onsuccess = () => {
              const result = request.result;
              const value = result ? result.value : null;
              console.log('📦 Default storage result:', { hasData: !!value });
              resolve(value);
            };
          });
        }

        const db = await getDB();
        const transaction = db.transaction(['userData'], 'readonly');
        const store = transaction.objectStore('userData');
        const scopedKey = `user_${userId}_${name}`;

        return new Promise((resolve, reject) => {
          const request = store.get(scopedKey);
          request.onerror = () => {
            console.error('❌ IndexedDB getItem error');
            reject(request.error);
          };
          request.onsuccess = () => {
            const result = request.result;
            const value = result ? result.value : null;

            if (value) {
              console.log(`📦 Retrieved user-scoped IndexedDB data for ${userId}:`, { key: name, hasData: true });
            } else {
              console.log(`📦 No data found for ${userId}:`, { key: name });
            }

            resolve(value);
          };
        });
      } catch (error) {
        console.error('❌ Error retrieving from IndexedDB:', error);
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const userId = getUserId();
        console.log('💾 IndexedDB setItem called:', { name, userId, hasUserId: !!userId, valueSize: value.length });

        if (!userId || userId === 'no-user-id') {
          console.warn('⚠️ No valid userId available for IndexedDB, deferring save until user is established');
          // For now, we'll skip the save but not throw an error
          // The store will retry saving once the user identity is established
          return;
        }

        const db = await getDB();
        const transaction = db.transaction(['userData'], 'readwrite');
        const store = transaction.objectStore('userData');
        const scopedKey = `user_${userId}_${name}`;

        return new Promise((resolve, reject) => {
          const request = store.put({ key: scopedKey, value, userId, timestamp: Date.now() });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            console.log(`💾 Saved user-scoped IndexedDB data for ${userId}:`, {
              key: name,
              dataSize: value.length,
              scopedKey
            });
            resolve();
          };
        });
      } catch (error) {
        console.error('❌ Error saving to IndexedDB:', error);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        const userId = getUserId();
        if (!userId) {
          console.warn('⚠️ No userId available for IndexedDB, skipping removal');
          return;
        }

        const db = await getDB();
        const transaction = db.transaction(['userData'], 'readwrite');
        const store = transaction.objectStore('userData');
        const scopedKey = `user_${userId}_${name}`;
        
        return new Promise((resolve, reject) => {
          const request = store.delete(scopedKey);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            console.log(`🗑️ Removed user-scoped IndexedDB data for ${userId}:`, { key: name, scopedKey });
            resolve();
          };
        });
      } catch (error) {
        console.error('❌ Error removing from IndexedDB:', error);
      }
    }
  };
}

/**
 * Utility function to clear all data for a specific user
 * Useful when a user signs out to prevent data leakage
 * Clears BOTH localStorage AND IndexedDB data for the user
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    console.log(`🧹 Clearing all data for user: ${userId}`);
    let totalCleared = 0;

    // 1. Clear localStorage data
    const localStorageKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`user_${userId}_`)) {
        localStorageKeysToRemove.push(key);
      }
    }

    localStorageKeysToRemove.forEach(key => localStorage.removeItem(key));
    totalCleared += localStorageKeysToRemove.length;
    console.log(`🧹 Cleared ${localStorageKeysToRemove.length} localStorage items for user ${userId}`);

    // 2. Clear IndexedDB data
    try {
      const DB_NAME = 'biomasters-user-storage';
      const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          // Database doesn't exist yet, nothing to clear
          resolve(request.result);
        };
      });

      const db = await dbPromise;

      if (db.objectStoreNames.contains('userData')) {
        const transaction = db.transaction(['userData'], 'readwrite');
        const store = transaction.objectStore('userData');

        // Get all keys and filter for this user
        const getAllKeysPromise = new Promise<string[]>((resolve, reject) => {
          const getAllRequest = store.getAllKeys();
          getAllRequest.onerror = () => reject(getAllRequest.error);
          getAllRequest.onsuccess = () => resolve(getAllRequest.result as string[]);
        });

        const allKeys = await getAllKeysPromise;
        const userKeys = allKeys.filter(key => key.startsWith(`user_${userId}_`));

        // Delete user-specific keys
        const deletePromises = userKeys.map(key => {
          return new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(key);
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onsuccess = () => resolve();
          });
        });

        await Promise.all(deletePromises);
        totalCleared += userKeys.length;
        console.log(`🧹 Cleared ${userKeys.length} IndexedDB items for user ${userId}`);
      }

      db.close();
    } catch (indexedDBError) {
      console.warn(`⚠️ Could not clear IndexedDB data for user ${userId}:`, indexedDBError);
    }

    console.log(`✅ Total items cleared for user ${userId}: ${totalCleared}`);

  } catch (error) {
    console.error(`❌ Error clearing data for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Utility function to migrate data from global storage to user-scoped storage
 * Useful for existing users when implementing user-scoped storage
 */
export async function migrateToUserScopedStorage(
  userId: string, 
  globalKey: string, 
  userScopedStorage: StateStorage
): Promise<boolean> {
  try {
    console.log(`🔄 Migrating data to user-scoped storage for user: ${userId}`);
    
    // Try to get data from global storage
    const globalData = localStorage.getItem(globalKey);
    if (!globalData) {
      console.log('📦 No global data found to migrate');
      return false;
    }
    
    // Save to user-scoped storage
    await userScopedStorage.setItem(globalKey, globalData);
    
    // Remove from global storage
    localStorage.removeItem(globalKey);
    
    console.log(`✅ Successfully migrated data for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrating data for user ${userId}:`, error);
    return false;
  }
}
