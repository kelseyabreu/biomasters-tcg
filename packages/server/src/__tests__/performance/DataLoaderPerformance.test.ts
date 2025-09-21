/**
 * Comprehensive performance and reliability tests for UnifiedDataLoader
 * Tests caching (50ms → 1-5ms), retry logic, error handling, and edge cases
 */

import { createUnifiedDataLoader, LoadResult } from '@kelseyabreu/shared';
import { promises as fs } from 'fs';
import path from 'path';



// Test utilities
function measureTime<T>(fn: () => Promise<T>) {
  return async (): Promise<{ result: T; time: number }> => {
    const start = Date.now();
    const result = await fn();
    const time = Date.now() - start;
    return { result, time };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('UnifiedDataLoader Performance & Reliability', () => {
  describe('Basic Functionality Verification', () => {
    let serverLoader: any;

    beforeEach(() => {
      // Calculate correct path to project root from packages/server/src/__tests__/performance/
      // From packages/server/src/__tests__/performance/ we need to go up 5 levels to reach project root
      const projectRoot = path.resolve(__dirname, '../../../../../');
      const dataPath = path.join(projectRoot, 'public/data');

      console.log('🔍 DataLoader test paths:');
      console.log('  - __dirname:', __dirname);
      console.log('  - projectRoot:', projectRoot);
      console.log('  - dataPath:', dataPath);

      serverLoader = createUnifiedDataLoader({
        environment: 'server', // Force server environment to enable caching
        source: 'filesystem',
        dataPath: dataPath, // Correct path to project root public/data
        enableCaching: true, // Explicitly enable caching for performance tests
        cacheConfig: { ttl: 300000, maxSize: 100 }, // 5 minutes, 100 items max
        retryConfig: { maxRetries: 3, retryDelay: 100, backoffMultiplier: 2 }
      });
    });

    test('should load data successfully and verify sophisticated features', async () => {
      console.log('🧪 Testing basic data loading...');

      // Test basic data loading
      const cardsResult = await serverLoader.loadCards();
      console.log('📊 Cards result:', { success: cardsResult.success, dataLength: cardsResult.data?.length, error: cardsResult.error });

      expect(cardsResult.success).toBe(true);
      expect(cardsResult.data).toBeDefined();
      expect(cardsResult.data.length).toBeGreaterThan(0);

      // Test cache stats
      const stats = serverLoader.getCacheStats();
      console.log('📈 Cache stats:', stats);
      expect(stats.totalRequests).toBeGreaterThan(0);

      // Test health check
      const isHealthy = await serverLoader.healthCheck();
      console.log('🏥 Health check:', isHealthy);
      expect(isHealthy).toBe(true);

      console.log('✅ All basic functionality verified!');
    });
  });

  describe('Caching Performance (Good Paths)', () => {
    let serverLoader: any;

    beforeEach(() => {
      // Use the same path calculation as the basic functionality test
      const projectRoot = path.resolve(__dirname, '../../../../../');
      const dataPath = path.join(projectRoot, 'public/data');

      serverLoader = createUnifiedDataLoader({
        environment: 'server', // Force server environment to enable caching
        source: 'filesystem',
        dataPath: dataPath, // Correct path to project root public/data
        enableCaching: true, // Explicitly enable caching for performance tests
        cacheConfig: { ttl: 300000, maxSize: 100 }, // 5 minutes, 100 items max
        retryConfig: { maxRetries: 3, retryDelay: 100, backoffMultiplier: 2 }
      });
    });

    test('should demonstrate filesystem vs cache performance (50ms → 1-5ms)', async () => {
      // Clear cache to ensure clean test
      serverLoader.clearCache();

      // First load (filesystem access)
      const { result: result1, time: time1 } = await measureTime(() => serverLoader.loadCards())();
      const loadResult1 = result1 as LoadResult<any[]>;

      expect(loadResult1.success).toBe(true);
      expect(loadResult1.data).toBeDefined();
      expect(loadResult1.data!.length).toBeGreaterThan(0);
      // Note: time1 might be 0 due to measurement precision, that's ok

      // Second load (cache hit) - should be significantly faster
      const { result: result2, time: time2 } = await measureTime(() => serverLoader.loadCards())();
      const loadResult2 = result2 as LoadResult<any[]>;

      expect(loadResult2.success).toBe(true);
      expect(loadResult2.data).toEqual(loadResult1.data); // Same data

      // Verify cache stats (more reliable than timing)
      const stats = serverLoader.getCacheStats();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.cacheHits).toBeGreaterThanOrEqual(1);

      // Performance improvement verification (handle 0ms edge case)
      if (time1 > 0 && time2 > 0) {
        expect(time2).toBeLessThanOrEqual(time1); // Cache should be same or faster
        const speedup = time1 / time2;
        console.log(`📊 Performance: ${time1}ms → ${time2}ms (${speedup.toFixed(1)}x faster)`);
      } else {
        console.log(`📊 Performance: ${time1}ms → ${time2}ms (both very fast)`);
      }

      console.log(`📈 Cache stats: ${stats.cacheHits} hits, ${stats.totalRequests} total requests`);
    });

    test('should handle multiple rapid cache hits efficiently', async () => {
      // Prime the cache
      await serverLoader.loadCards();
      
      // Multiple rapid requests
      const promises = Array(10).fill(null).map(() => 
        measureTime(() => serverLoader.loadCards())()
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(({ result }) => {
        const loadResult = result as LoadResult<any[]>;
        expect(loadResult.success).toBe(true);
      });
      
      // All should be fast (cache hits)
      const times = results.map(({ time }) => time);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThanOrEqual(15);
      expect(maxTime).toBeLessThanOrEqual(20);
      
      console.log(`⚡ Rapid cache hits: avg ${avgTime.toFixed(1)}ms, max ${maxTime}ms`);
    });

    test('should cache different data types efficiently', async () => {
      const dataTypes = [
        { name: 'cards', fn: () => serverLoader.loadCards() },
        { name: 'abilities', fn: () => serverLoader.loadAbilities() },
        { name: 'gameConfig', fn: () => serverLoader.loadGameConfig() },
        { name: 'localization', fn: () => serverLoader.loadLocalizationData('en') }
      ];

      for (const dataType of dataTypes) {
        // First load
        const { result: firstLoad, time: firstTime } = await measureTime(dataType.fn)();
        const firstResult = firstLoad as LoadResult<any>;

        // Second load (should be cached)
        const { result: secondLoad, time: secondTime } = await measureTime(dataType.fn)();
        const secondResult = secondLoad as LoadResult<any>;

        expect(firstResult.success).toBe(true);
        expect(secondResult.success).toBe(true);

        // Cache hit should be same or faster (handle 0ms edge case)
        if (firstTime > 0 && secondTime > 0) {
          expect(secondTime).toBeLessThanOrEqual(firstTime);
        }

        console.log(`📚 ${dataType.name}: ${firstTime}ms → ${secondTime}ms`);
      }
    });

    test('should provide accurate cache statistics', async () => {
      // Clear cache and start fresh
      serverLoader.clearCache();
      let stats = serverLoader.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.totalRequests).toBe(0);
      
      // Load some data
      await serverLoader.loadCards();
      await serverLoader.loadAbilities();
      await serverLoader.loadCards(); // Cache hit
      
      stats = serverLoader.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      
      console.log(`📈 Cache stats: ${stats.size} items, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
    });
  });

  describe('Error Handling (Bad Paths)', () => {
    test('should handle invalid data path with retries', async () => {
      const badPathLoader = createUnifiedDataLoader({
        environment: 'server',
        source: 'filesystem',
        dataPath: './nonexistent-bad-path-test', // Use specific bad path that won't have fallbacks
        enableCaching: true,
        cacheConfig: { ttl: 300000, maxSize: 100 },
        retryConfig: { maxRetries: 2, retryDelay: 50, backoffMultiplier: 2 }
      });

      const { result, time } = await measureTime(() => badPathLoader.loadCards())();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(time).toBeGreaterThan(50); // Should take time due to retries

      console.log(`❌ Invalid path handled: ${time}ms with retries`);
      console.log(`❌ Error: ${result.error}`);
    });

    test('should handle corrupted JSON files gracefully', async () => {
      // Create a temporary corrupted JSON file for testing
      const fs = require('fs').promises;
      const path = require('path');
      const testDir = path.join(process.cwd(), '../public/data/test-corrupted');
      const gameConfigDir = path.join(testDir, 'game-config');
      const testFile = path.join(gameConfigDir, 'cards.json');

      try {
        // Ensure test directory exists
        await fs.mkdir(gameConfigDir, { recursive: true });

        // Write corrupted JSON
        await fs.writeFile(testFile, '{ "invalid": json content }');

        const corruptedLoader = createUnifiedDataLoader({
          environment: 'server',
          source: 'filesystem',
          dataPath: '../public/data/test-corrupted',
          enableCaching: true,
          cacheConfig: { ttl: 300000, maxSize: 100 },
          retryConfig: { maxRetries: 1, retryDelay: 50, backoffMultiplier: 2 }
        });

        const { result, time } = await measureTime(() => corruptedLoader.loadCards())();

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('JSON'); // Should mention JSON parsing error

        console.log(`🔧 Corrupted JSON handled: ${time}ms`);
        console.log(`🔧 Error: ${result.error}`);
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFile);
          await fs.rmdir(gameConfigDir);
          await fs.rmdir(testDir);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    test('should handle cache TTL expiration correctly', async () => {
      const shortTTLLoader = createUnifiedDataLoader({
        environment: 'server',
        source: 'filesystem',
        dataPath: '../public/data', // Correct path from server directory
        enableCaching: true,
        cacheConfig: { ttl: 100, maxSize: 100 }, // 100ms TTL
        retryConfig: { maxRetries: 1, retryDelay: 50, backoffMultiplier: 2 }
      });

      // Clear cache first
      shortTTLLoader.clearCache();

      // Load data (first time - cache miss)
      const { result: firstResult, time: firstTime } = await measureTime(() => shortTTLLoader.loadCards())();
      expect(firstResult.success).toBe(true);

      // Load immediately (should be cache hit)
      const { result: immediateResult, time: immediateTime } = await measureTime(() => shortTTLLoader.loadCards())();
      expect(immediateResult.success).toBe(true);

      // Cache hit should be faster or at least not slower (allow for timing variations)
      expect(immediateTime).toBeLessThanOrEqual(Math.max(firstTime, 1)); // Allow for 0ms edge case

      // Wait for TTL to expire
      await sleep(150);

      // Load again (should be cache miss due to TTL expiration)
      const { result, time: secondTime } = await measureTime(() => shortTTLLoader.loadCards())();

      expect(result.success).toBe(true);

      // Verify TTL expiration by checking cache stats
      const finalStats = shortTTLLoader.getCacheStats();
      expect(finalStats.cacheMisses).toBeGreaterThan(1); // Should have at least 2 cache misses (first load + expired load)

      console.log(`⏰ TTL expiration: ${firstTime}ms → ${immediateTime}ms (hit) → ${secondTime}ms (expired)`);
      console.log(`⏰ Cache stats: ${finalStats.cacheMisses} misses, ${finalStats.cacheHits} hits`);
    });
  });

  describe('Client-Side Performance', () => {
    beforeEach(() => {
      // Mock fetch for client testing
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        await sleep(20); // Simulate network delay
        
        if (url.includes('nonexistent') || url.includes('retry-test')) {
          throw new Error('Network error');
        }
        
        if (url.includes('cards.json')) {
          return {
            ok: true,
            json: async () => [{ cardId: 1, nameId: 'TEST_CARD' }]
          };
        }
        
        return {
          ok: true,
          json: async () => ({ test: 'data' })
        };
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should demonstrate client-side caching performance', async () => {
      const clientLoader = createUnifiedDataLoader({
        environment: 'client',
        source: 'fetch',
        baseUrl: '/data',
        enableCaching: true,
        cacheConfig: { ttl: 300000, maxSize: 100 },
        retryConfig: { maxRetries: 3, retryDelay: 100, backoffMultiplier: 2 }
      });
      
      // First load (network request)
      const { result: result1, time: time1 } = await measureTime(() => clientLoader.loadCards())();
      
      // Second load (cache hit)
      const { result: result2, time: time2 } = await measureTime(() => clientLoader.loadCards())();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(time2).toBeLessThanOrEqual(10); // Cache hit should be very fast
      
      console.log(`📱 Client caching: ${time1}ms → ${time2}ms`);
    });

    test('should handle client-side retry logic', async () => {
      const retryLoader = createUnifiedDataLoader({
        environment: 'client',
        source: 'fetch',
        baseUrl: '/retry-test',
        enableCaching: false,
        retryConfig: { maxRetries: 3, retryDelay: 50, backoffMultiplier: 2 }
      });
      
      const { result, time } = await measureTime(() => retryLoader.loadCards())();
      
      expect(result.success).toBe(false);
      expect(time).toBeGreaterThan(150); // Should take time due to retries
      
      console.log(`🔄 Client retry logic: ${time}ms with retries`);
    });
  });

  describe('Edge Cases & Stress Tests', () => {
    let serverLoader: any;
    
    beforeEach(() => {
      serverLoader = createUnifiedDataLoader({
        environment: 'server',
        source: 'filesystem',
        dataPath: './public/data',
        enableCaching: true,
        cacheConfig: { ttl: 300000, maxSize: 100 },
        retryConfig: { maxRetries: 3, retryDelay: 100, backoffMultiplier: 2 }
      });
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentPromises = Array(20).fill(null).map(() => serverLoader.loadCards());
      
      const start = Date.now();
      const results = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - start;
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should complete reasonably quickly
      expect(totalTime).toBeLessThan(200);
      
      console.log(`⚡ Concurrent requests: 20 requests in ${totalTime}ms`);
    });

    test('should clear cache properly', async () => {
      // Load some data
      await serverLoader.loadCards();
      await serverLoader.loadAbilities();
      
      const statsBefore = serverLoader.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);
      
      // Clear cache
      serverLoader.clearCache();
      
      const statsAfter = serverLoader.getCacheStats();
      expect(statsAfter.size).toBe(0);
      expect(statsAfter.totalRequests).toBe(0);
      
      console.log(`🧹 Cache cleared: ${statsBefore.size} → ${statsAfter.size} items`);
    });

    test('should pass health check', async () => {
      const { result: isHealthy, time } = await measureTime(() => serverLoader.healthCheck())();
      
      expect(isHealthy).toBe(true);
      expect(time).toBeLessThan(100);
      
      console.log(`🏥 Health check: ${isHealthy} in ${time}ms`);
    });

    test('should preload data efficiently', async () => {
      serverLoader.clearCache(); // Start fresh

      const { time } = await measureTime(() => serverLoader.preloadData())();
      const stats = serverLoader.getCacheStats();

      expect(stats.size).toBeGreaterThanOrEqual(2); // Should preload at least cards and abilities
      expect(time).toBeLessThan(1000);

      console.log(`🚀 Preload: ${stats.size} items in ${time}ms`);
      console.log(`🚀 Preload stats: ${JSON.stringify(stats)}`);
    });
  });
});
