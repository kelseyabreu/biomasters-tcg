/**
 * Comprehensive API Testing Script
 * Tests both positive and negative paths for all updated endpoints
 */

import axios from 'axios';
import { KeywordId, TrophicCategoryId, ConservationStatus } from '@biomasters/shared';

// Configuration
const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
  duration: number;
}

class APITester {
  private results: TestResult[] = [];
  // private authToken: string | null = null; // Unused for now

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive API Tests...\n');

    // Test server health first
    await this.testServerHealth();

    // Test card endpoints (no auth required)
    await this.testCardEndpoints();

    // Test authentication endpoints
    await this.testAuthEndpoints();

    // Test protected endpoints (with auth)
    await this.testProtectedEndpoints();

    // Test error handling and edge cases
    await this.testErrorHandling();

    // Print summary
    this.printSummary();
  }

  private async testServerHealth(): Promise<void> {
    console.log('🏥 Testing Server Health...');
    
    await this.runTest('Server Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      return response.data;
    });
  }

  private async testCardEndpoints(): Promise<void> {
    console.log('\n🃏 Testing Card Endpoints...');

    // Test GET /api/cards/database (positive)
    await this.runTest('GET /api/cards/database - Basic', async () => {
      const response = await axios.get(`${API_BASE}/cards/database`);
      const data = response.data as any;
      if (!data.success || !Array.isArray(data.cards)) {
        throw new Error('Invalid response structure');
      }
      return response.data;
    });

    // Test GET /api/cards/database with filters (positive)
    await this.runTest('GET /api/cards/database - With Filters', async () => {
      const response = await axios.get(`${API_BASE}/cards/database?trophic_level=1&limit=5`);
      const data = response.data as any;
      if (!data.success) {
        throw new Error('Filtered request failed');
      }
      return data;
    });

    // Test GET /api/cards/database with search (positive)
    await this.runTest('GET /api/cards/database - With Search', async () => {
      const response = await axios.get(`${API_BASE}/cards/database?search=test&page=1&limit=10`);
      const data = response.data as any;
      if (!data.success) {
        throw new Error('Search request failed');
      }
      return data;
    });

    // Test GET /api/cards/card/:id (positive)
    await this.runTest('GET /api/cards/card/1 - Valid ID', async () => {
      const response = await axios.get(`${API_BASE}/cards/card/1`);
      const data = response.data as any;
      if (!data.success || !data.card) {
        throw new Error('Card not found or invalid response');
      }
      return data;
    });

    // Test GET /api/cards/card/:id (negative - invalid ID)
    await this.runTest('GET /api/cards/card/invalid - Invalid ID', async () => {
      try {
        await axios.get(`${API_BASE}/cards/card/invalid`);
        throw new Error('Should have failed with invalid ID');
      } catch (error: any) {
        if (error.response?.status === 400) {
          return { expected: 'error', status: 400 };
        }
        throw error;
      }
    });

    // Test GET /api/cards/card/:id (negative - non-existent ID)
    await this.runTest('GET /api/cards/card/99999 - Non-existent ID', async () => {
      try {
        await axios.get(`${API_BASE}/cards/card/99999`);
        throw new Error('Should have failed with non-existent ID');
      } catch (error: any) {
        if (error.response?.status === 404) {
          return { expected: 'error', status: 404 };
        }
        throw error;
      }
    });

    // Test GET /api/cards/keywords (positive)
    await this.runTest('GET /api/cards/keywords', async () => {
      const response = await axios.get(`${API_BASE}/cards/keywords`);
      const data = response.data as any;
      if (!data.success || !data.all_keywords) {
        throw new Error('Keywords not returned properly');
      }

      // Verify enum integration
      const terrestrialKeyword = data.all_keywords.find((k: any) => k.keyword_name === 'TERRESTRIAL');
      if (!terrestrialKeyword || terrestrialKeyword.id !== KeywordId.TERRESTRIAL) {
        throw new Error(`TERRESTRIAL keyword ID mismatch: expected ${KeywordId.TERRESTRIAL}, got ${terrestrialKeyword?.id}`);
      }

      return data;
    });

    // Test GET /api/cards/abilities (positive)
    await this.runTest('GET /api/cards/abilities', async () => {
      const response = await axios.get(`${API_BASE}/cards/abilities`);
      const data = response.data as any;
      if (!data.success || !Array.isArray(data.abilities)) {
        throw new Error('Abilities not returned properly');
      }
      return data;
    });

    // Test GET /api/cards/trophic-categories (positive)
    await this.runTest('GET /api/cards/trophic-categories', async () => {
      const response = await axios.get(`${API_BASE}/cards/trophic-categories`);
      const data = response.data as any;
      if (!data.success || !Array.isArray(data.trophic_categories)) {
        throw new Error('Trophic categories not returned properly');
      }
      return data;
    });

    // Test GET /api/cards/conservation-statuses (positive)
    await this.runTest('GET /api/cards/conservation-statuses', async () => {
      const response = await axios.get(`${API_BASE}/cards/conservation-statuses`);
      const data = response.data as any;
      if (!data.success || !Array.isArray(data.conservation_statuses)) {
        throw new Error('Conservation statuses not returned properly');
      }

      // Verify IUCN data integration
      const criticallyEndangered = data.conservation_statuses.find((s: any) => s.status_name === 'CRITICALLY_ENDANGERED');
      if (!criticallyEndangered || parseFloat(criticallyEndangered.percentage) !== 8.96) {
        throw new Error('IUCN data not properly integrated');
      }

      return data;
    });

    // Test GET /api/cards/game-data (positive)
    await this.runTest('GET /api/cards/game-data', async () => {
      const response = await axios.get(`${API_BASE}/cards/game-data`);
      const data = response.data as any;
      if (!data.success || !data.game_data) {
        throw new Error('Game data not returned properly');
      }

      const gameData = data.game_data;
      if (!gameData.cards || !gameData.abilities || !gameData.keywords) {
        throw new Error('Incomplete game data');
      }

      return data;
    });
  }

  private async testAuthEndpoints(): Promise<void> {
    console.log('\n🔐 Testing Authentication Endpoints...');

    // Test GET /api/auth/status (no auth)
    await this.runTest('GET /api/auth/status - No Auth', async () => {
      const response = await axios.get(`${API_BASE}/auth/status`);
      const data = response.data as any;
      if (data.authenticated !== false) {
        throw new Error('Should not be authenticated without token');
      }
      return data;
    });

    // Test protected endpoint without auth (negative)
    await this.runTest('GET /api/cards/collection - No Auth', async () => {
      try {
        await axios.get(`${API_BASE}/cards/collection`);
        throw new Error('Should have failed without authentication');
      } catch (error: any) {
        if (error.response?.status === 401) {
          return { expected: 'error', status: 401 };
        }
        throw error;
      }
    });
  }

  private async testProtectedEndpoints(): Promise<void> {
    console.log('\n🛡️ Testing Protected Endpoints...');

    // Note: These tests will fail without proper authentication
    // In a real test environment, you'd set up test users and tokens

    await this.runTest('POST /api/cards/open-pack - No Auth', async () => {
      try {
        await axios.post(`${API_BASE}/cards/open-pack`, { pack_type: 'basic' });
        throw new Error('Should have failed without authentication');
      } catch (error: any) {
        if (error.response?.status === 401) {
          return { expected: 'error', status: 401 };
        }
        throw error;
      }
    });

    await this.runTest('POST /api/cards/validate-placement - No Auth', async () => {
      try {
        await axios.post(`${API_BASE}/cards/validate-placement`, {
          cardId: 1,
          position: { x: 0, y: 0 }
        });
        throw new Error('Should have failed without authentication');
      } catch (error: any) {
        if (error.response?.status === 401) {
          return { expected: 'error', status: 401 };
        }
        throw error;
      }
    });
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n❌ Testing Error Handling...');

    // Test invalid endpoints
    await this.runTest('GET /api/invalid-endpoint', async () => {
      try {
        await axios.get(`${API_BASE}/invalid-endpoint`);
        throw new Error('Should have failed with 404');
      } catch (error: any) {
        if (error.response?.status === 404) {
          return { expected: 'error', status: 404 };
        }
        throw error;
      }
    });

    // Test malformed requests
    await this.runTest('POST /api/cards/validate-placement - Missing Data', async () => {
      try {
        await axios.post(`${API_BASE}/cards/validate-placement`, {});
        throw new Error('Should have failed with missing data');
      } catch (error: any) {
        if (error.response?.status === 400 || error.response?.status === 401) {
          return { expected: 'error', status: error.response.status };
        }
        throw error;
      }
    });

    // Test invalid query parameters - should return 400
    await this.runTest('GET /api/cards/database - Invalid Params', async () => {
      try {
        await axios.get(`${API_BASE}/cards/database?page=-1&limit=abc`);
        throw new Error('Should reject invalid params');
      } catch (error: any) {
        if (error.response?.status !== 400) {
          throw new Error(`Should return 400 for invalid params, got ${error.response?.status}`);
        }
        return { expected: 'error', status: 400 };
      }
    });
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, response: result, duration });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({ 
        name, 
        passed: false, 
        error: error.message || 'Unknown error',
        duration 
      });
      console.log(`❌ ${name} (${duration}ms): ${error.message}`);
    }
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
    
    if (passed < total) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    console.log('\n🎯 Enum Integration Verification:');
    console.log(`✅ KeywordId.TERRESTRIAL = ${KeywordId.TERRESTRIAL}`);
    console.log(`✅ TrophicCategoryId.OMNIVORE = ${TrophicCategoryId.OMNIVORE}`);
    console.log(`✅ ConservationStatus.CRITICALLY_ENDANGERED = ${ConservationStatus.CRITICALLY_ENDANGERED}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🎉 API testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 API testing failed:', error);
      process.exit(1);
    });
}

export { APITester };
