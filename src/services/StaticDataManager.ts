/**
 * Static Data Manager
 * Handles background updates of game data files with version checking and cache management
 * Provides offline-first data loading with automatic background updates
 */

import { createStorageAdapter } from './storageAdapter';

export interface DataVersion {
  version: string;
  lastUpdated: number;
  checksum?: string;
}

export interface StaticDataFile {
  path: string;
  version: DataVersion;
  data: any;
  size: number;
}

export interface StaticDataCache {
  [filePath: string]: StaticDataFile;
}

export interface DataUpdateResult {
  success: boolean;
  updatedFiles: string[];
  errors: string[];
  totalSize: number;
}

/**
 * Static Data Manager Service
 * Manages offline caching and background updates of static game data
 */
export class StaticDataManager {
  private storageAdapter = createStorageAdapter({
    keyPrefix: 'static_data_',
    debug: false,
    maxLocalStorageSize: 5 * 1024 * 1024 // 5MB threshold for IndexedDB
  });

  private readonly DATA_CACHE_KEY = 'data_cache';
  private readonly VERSION_MANIFEST_KEY = 'version_manifest';
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Initialize the static data manager
   */
  async initialize(): Promise<void> {
    try {
      // Load existing cache
      const cache = await this.loadCache();
      console.log('📦 [StaticDataManager] Initialized with cache:', {
        files: Object.keys(cache).length,
        totalSize: this.calculateCacheSize(cache)
      });

      // Start background update check if online
      if (navigator.onLine) {
        this.scheduleBackgroundUpdate();
      }

      // Listen for online events to trigger updates
      window.addEventListener('online', () => {
        console.log('🌐 [StaticDataManager] Device came online, checking for updates');
        this.checkForUpdates();
      });

    } catch (error) {
      console.error('❌ [StaticDataManager] Failed to initialize:', error);
    }
  }

  /**
   * Get data file with offline-first approach
   */
  async getDataFile(filePath: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // First, try to get from cache
      const cache = await this.loadCache();
      const cachedFile = cache[filePath];

      if (cachedFile && !this.isExpired(cachedFile.version.lastUpdated)) {
        console.log(`📁 [StaticDataManager] Serving ${filePath} from cache`);



        return { success: true, data: cachedFile.data };
      }

      // If not in cache or expired, try to fetch fresh data
      if (navigator.onLine) {
        try {
          const freshData = await this.fetchDataFile(filePath);
          if (freshData) {


            // Update cache with fresh data
            await this.updateCacheFile(filePath, freshData);
            return { success: true, data: freshData.data };
          }
        } catch (fetchError) {
          console.warn(`⚠️ [StaticDataManager] Failed to fetch fresh ${filePath}, using cache:`, fetchError);
        }
      }

      // Fall back to cached data even if expired
      if (cachedFile) {
        console.log(`📁 [StaticDataManager] Serving expired ${filePath} from cache (offline fallback)`);
        return { success: true, data: cachedFile.data };
      }

      // No cache and can't fetch - this is an error
      const errorMessage = `Data file ${filePath} not available offline and cannot be fetched`;
      return { success: false, error: errorMessage };

    } catch (error) {
      console.error(`❌ [StaticDataManager] Failed to get data file ${filePath}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check for updates to static data files
   */
  async checkForUpdates(): Promise<DataUpdateResult> {
    if (!navigator.onLine) {
      return {
        success: false,
        updatedFiles: [],
        errors: ['Device is offline'],
        totalSize: 0
      };
    }

    try {
      console.log('🔄 [StaticDataManager] Checking for data updates...');

      // Fetch version manifest from server
      const manifest = await this.fetchVersionManifest();
      const cache = await this.loadCache();
      
      const updatedFiles: string[] = [];
      const errors: string[] = [];
      let totalSize = 0;

      // Check each file in manifest
      for (const [filePath, serverVersion] of Object.entries(manifest)) {
        try {
          const cachedFile = cache[filePath];
          const needsUpdate = !cachedFile || 
            cachedFile.version.version !== serverVersion.version ||
            this.isExpired(cachedFile.version.lastUpdated);

          if (needsUpdate) {
            console.log(`📥 [StaticDataManager] Updating ${filePath} (${serverVersion.version})`);
            
            const freshData = await this.fetchDataFile(filePath);
            if (freshData) {
              await this.updateCacheFile(filePath, freshData);
              updatedFiles.push(filePath);
              totalSize += freshData.size;
            }
          }
        } catch (error) {
          console.error(`❌ [StaticDataManager] Failed to update ${filePath}:`, error);
          errors.push(`${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log('✅ [StaticDataManager] Update check complete:', {
        updatedFiles: updatedFiles.length,
        errors: errors.length,
        totalSize
      });

      return {
        success: errors.length === 0,
        updatedFiles,
        errors,
        totalSize
      };

    } catch (error) {
      console.error('❌ [StaticDataManager] Update check failed:', error);
      return {
        success: false,
        updatedFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        totalSize: 0
      };
    }
  }

  /**
   * Preload essential data files
   */
  async preloadEssentialData(filePaths: string[]): Promise<void> {
    console.log('🚀 [StaticDataManager] Preloading essential data files:', filePaths);

    const promises = filePaths.map(async (filePath) => {
      try {
        const result = await this.getDataFile(filePath);
        if (result.success) {
          console.log(`✅ [StaticDataManager] Preloaded ${filePath}`);
        } else {
          console.error(`❌ [StaticDataManager] Failed to preload ${filePath}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ [StaticDataManager] Failed to preload ${filePath}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('🎯 [StaticDataManager] Essential data preloading complete');
  }

  /**
   * Clear cache (useful for debugging or storage cleanup)
   */
  async clearCache(): Promise<void> {
    try {
      await this.storageAdapter.removeItem(this.DATA_CACHE_KEY);
      await this.storageAdapter.removeItem(this.VERSION_MANIFEST_KEY);
      console.log('🗑️ [StaticDataManager] Cache cleared');
    } catch (error) {
      console.error('❌ [StaticDataManager] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    fileCount: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
  }> {
    try {
      const cache = await this.loadCache();
      const files = Object.values(cache);
      
      if (files.length === 0) {
        return {
          fileCount: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null
        };
      }

      const totalSize = this.calculateCacheSize(cache);
      const sortedByDate = files.sort((a, b) => a.version.lastUpdated - b.version.lastUpdated);

      return {
        fileCount: files.length,
        totalSize,
        oldestFile: sortedByDate[0]?.path || null,
        newestFile: sortedByDate[sortedByDate.length - 1]?.path || null
      };
    } catch (error) {
      console.error('❌ [StaticDataManager] Failed to get cache stats:', error);
      throw error;
    }
  }

  // Private helper methods

  private async loadCache(): Promise<StaticDataCache> {
    try {
      const cacheData = await this.storageAdapter.getItem(this.DATA_CACHE_KEY);
      return cacheData ? JSON.parse(cacheData) : {};
    } catch (error) {
      console.warn('⚠️ [StaticDataManager] Failed to load cache, starting fresh:', error);
      return {};
    }
  }

  private async saveCache(cache: StaticDataCache): Promise<void> {
    try {
      await this.storageAdapter.setItem(this.DATA_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ [StaticDataManager] Failed to save cache:', error);
      throw error;
    }
  }

  private async fetchVersionManifest(): Promise<Record<string, DataVersion>> {
    try {
      const response = await fetch('/api/static-data/manifest');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [StaticDataManager] Failed to fetch version manifest:', error);
      throw error;
    }
  }

  private async fetchDataFile(filePath: string): Promise<StaticDataFile | null> {
    try {
      const response = await fetch(`/api/static-data/${filePath}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const size = JSON.stringify(data).length;

      return {
        path: filePath,
        version: {
          version: response.headers.get('X-Data-Version') || '1.0.0',
          lastUpdated: Date.now(),
          checksum: response.headers.get('X-Data-Checksum') || undefined
        },
        data,
        size
      };
    } catch (error) {
      console.error(`❌ [StaticDataManager] Failed to fetch ${filePath}:`, error);
      return null;
    }
  }

  private async updateCacheFile(filePath: string, fileData: StaticDataFile): Promise<void> {
    const cache = await this.loadCache();
    cache[filePath] = fileData;
    await this.saveCache(cache);
  }

  private isExpired(lastUpdated: number): boolean {
    return Date.now() - lastUpdated > this.CACHE_EXPIRY_MS;
  }

  private calculateCacheSize(cache: StaticDataCache): number {
    return Object.values(cache).reduce((total, file) => total + file.size, 0);
  }

  private scheduleBackgroundUpdate(): void {
    // Check for updates periodically
    setInterval(() => {
      if (navigator.onLine) {
        this.checkForUpdates().catch(error => {
          console.error('❌ [StaticDataManager] Background update failed:', error);
        });
      }
    }, this.UPDATE_CHECK_INTERVAL);
  }
}

// Export singleton instance
export const staticDataManager = new StaticDataManager();
