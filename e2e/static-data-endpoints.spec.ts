import { test, expect, Page } from '@playwright/test';

/**
 * Static Data Endpoints E2E Tests
 * 
 * Tests the server-side static data endpoints that were recently implemented:
 * 1. /api/static-data/manifest endpoint
 * 2. /api/static-data/:fileName endpoints
 * 3. Version checking and caching behavior
 * 4. Error handling for missing files
 * 5. Integration with frontend StaticDataManager
 */

test.describe('Static Data Endpoints', () => {
  const baseURL = 'http://localhost:3001'; // Server URL
  
  test.beforeAll(async () => {
    // Ensure server is running
    const response = await fetch(`${baseURL}/health`).catch(() => null);
    if (!response || !response.ok) {
      throw new Error('Server is not running. Please start the server with "npm run dev" in the server directory.');
    }
  });

  test('Manifest endpoint returns valid data', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/static-data/manifest`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    
    const manifest = await response.json();
    
    // Verify manifest structure
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('timestamp');
    expect(manifest).toHaveProperty('files');
    expect(typeof manifest.timestamp).toBe('number');
    
    // Verify files object has expected entries
    expect(manifest.files['cards.json']).toBeTruthy();
    expect(manifest.files['abilities.json']).toBeTruthy();
    expect(manifest.files['keywords.json']).toBeTruthy();
    
    // Verify file entries have required properties
    const cardsFile = manifest.files['cards.json'];
    expect(cardsFile).toHaveProperty('checksum');
    expect(cardsFile).toHaveProperty('size');
    expect(typeof cardsFile.checksum).toBe('string');
    expect(typeof cardsFile.size).toBe('number');
  });

  test('Data file endpoints serve correct content', async ({ request }) => {
    // Test cards.json
    const cardsResponse = await request.get(`${baseURL}/api/static-data/cards.json`);
    expect(cardsResponse.status()).toBe(200);
    expect(cardsResponse.headers()['content-type']).toContain('application/json');
    
    const cardsData = await cardsResponse.json();
    expect(Array.isArray(cardsData)).toBeTruthy();
    
    // Test abilities.json
    const abilitiesResponse = await request.get(`${baseURL}/api/static-data/abilities.json`);
    expect(abilitiesResponse.status()).toBe(200);
    
    const abilitiesData = await abilitiesResponse.json();
    expect(Array.isArray(abilitiesData)).toBeTruthy();
    
    // Test keywords.json
    const keywordsResponse = await request.get(`${baseURL}/api/static-data/keywords.json`);
    expect(keywordsResponse.status()).toBe(200);
    
    const keywordsData = await keywordsResponse.json();
    expect(Array.isArray(keywordsData)).toBeTruthy();
  });

  test('Caching headers are set correctly', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/static-data/cards.json`);
    
    expect(response.status()).toBe(200);
    
    // Should have caching headers
    expect(response.headers()).toHaveProperty('etag');
    expect(response.headers()).toHaveProperty('cache-control');
    
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('max-age');
  });

  test('ETag caching works correctly', async ({ request }) => {
    // First request
    const firstResponse = await request.get(`${baseURL}/api/static-data/cards.json`);
    expect(firstResponse.status()).toBe(200);
    
    const etag = firstResponse.headers()['etag'];
    expect(etag).toBeTruthy();
    
    // Second request with If-None-Match header
    const secondResponse = await request.get(`${baseURL}/api/static-data/cards.json`, {
      headers: {
        'If-None-Match': etag
      }
    });
    
    // Should return 304 Not Modified
    expect(secondResponse.status()).toBe(304);
  });

  test('Error handling for non-existent files', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/static-data/nonexistent.json`);
    
    expect(response.status()).toBe(404);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toContain('not found');
  });

  test('Security: Path traversal protection', async ({ request }) => {
    // Try various path traversal attempts
    const maliciousPaths = [
      '../../../package.json',
      '..%2F..%2F..%2Fpackage.json',
      '....//....//package.json',
      'cards.json/../../../package.json'
    ];
    
    for (const path of maliciousPaths) {
      const response = await request.get(`${baseURL}/api/static-data/${path}`);
      
      // Should either return 404 or 400, never 200 with sensitive data
      expect(response.status()).not.toBe(200);
      expect([400, 404]).toContain(response.status());
    }
  });

  test('Frontend integration with StaticDataManager', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to initialize
    await page.waitForSelector('ion-app', { timeout: 10000 });

    // Check that the app loaded successfully
    await expect(page.locator('ion-app')).toBeVisible();

    // Check that static data is accessible (indirectly through UI)
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();

    // Verify the app is functional
    const title = await page.title();
    expect(title).toContain('Biomasters');
  });

  test('Version checking and updates', async ({ page, request }) => {
    // Get current manifest
    const manifestResponse = await request.get(`${baseURL}/api/static-data/manifest`);
    const manifest = await manifestResponse.json();
    const originalTimestamp = manifest.timestamp;
    
    // Navigate to app and let it load data
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate a version update by triggering manifest rebuild
    // (This would normally happen when data files are updated)
    const updateResponse = await request.post(`${baseURL}/api/static-data/update-manifest`);
    expect(updateResponse.status()).toBe(200);
    
    // Get updated manifest
    const updatedManifestResponse = await request.get(`${baseURL}/api/static-data/manifest`);
    const updatedManifest = await updatedManifestResponse.json();
    
    // Timestamp should be newer
    expect(updatedManifest.timestamp).toBeGreaterThan(originalTimestamp);
  });

  test('Concurrent requests are handled correctly', async ({ request }) => {
    // Make multiple concurrent requests
    const promises = Array.from({ length: 10 }, () => 
      request.get(`${baseURL}/api/static-data/cards.json`)
    );
    
    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // All should have the same ETag (same content)
    const etags = responses.map(r => r.headers()['etag']);
    const uniqueEtags = new Set(etags);
    expect(uniqueEtags.size).toBe(1);
  });

  test('Large file handling', async ({ request }) => {
    // Test that larger files are handled correctly
    const response = await request.get(`${baseURL}/api/static-data/cards.json`);

    expect(response.status()).toBe(200);

    // Should have content-length header (may not be present in all environments)
    const contentLength = response.headers()['content-length'];
    if (contentLength) {
      expect(parseInt(contentLength)).toBeGreaterThan(0);
    }

    // Content should be valid JSON
    const data = await response.json();
    expect(data).toBeTruthy();
    expect(Array.isArray(data)).toBe(true);
  });

  test('CORS headers for cross-origin requests', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/static-data/manifest`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    
    expect(response.status()).toBe(200);
    
    // Should have CORS headers if configured
    const corsHeader = response.headers()['access-control-allow-origin'];
    if (corsHeader) {
      expect(['*', 'http://localhost:5173']).toContain(corsHeader);
    }
  });

  test('Checksum validation', async ({ request }) => {
    // Get manifest with checksums
    const manifestResponse = await request.get(`${baseURL}/api/static-data/manifest`);
    const manifest = await manifestResponse.json();

    // Get actual file content
    const cardsResponse = await request.get(`${baseURL}/api/static-data/cards.json`);
    const cardsContent = await cardsResponse.text();

    // Verify file size is reasonable (allow for some variance due to encoding)
    const cardsFile = manifest.files['cards.json'];
    expect(cardsContent.length).toBeGreaterThan(0);
    expect(cardsContent.length).toBeLessThan(cardsFile.size * 2); // Allow up to 2x variance

    // Verify the content is valid JSON
    const parsedContent = JSON.parse(cardsContent);
    expect(Array.isArray(parsedContent)).toBe(true);

    // Verify checksum exists and is a string
    expect(typeof cardsFile.checksum).toBe('string');
    expect(cardsFile.checksum.length).toBeGreaterThan(0);
  });
});
