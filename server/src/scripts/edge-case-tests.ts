/**
 * Edge Case and Negative Path Testing
 * Tests boundary conditions, error handling, and data validation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

interface TestCase {
  name: string;
  test: () => Promise<void>;
}

class EdgeCaseTester {
  private passed = 0;
  private failed = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Edge Case and Negative Path Tests...\n');

    const tests: TestCase[] = [
      // Database Query Edge Cases
      { name: 'Large pagination request', test: this.testLargePagination },
      { name: 'Zero and negative pagination', test: this.testInvalidPagination },
      { name: 'SQL injection attempts', test: this.testSQLInjection },
      { name: 'Very long search queries', test: this.testLongSearchQueries },
      
      // Card ID Edge Cases
      { name: 'Maximum integer card ID', test: this.testMaxIntegerCardId },
      { name: 'Negative card IDs', test: this.testNegativeCardIds },
      { name: 'Float card IDs', test: this.testFloatCardIds },
      { name: 'Special character card IDs', test: this.testSpecialCharacterCardIds },
      
      // Filter Validation
      { name: 'Invalid trophic levels', test: this.testInvalidTrophicLevels },
      { name: 'Invalid keyword IDs', test: this.testInvalidKeywordIds },
      { name: 'Multiple filter combinations', test: this.testMultipleFilters },
      
      // Content-Type and Headers
      { name: 'Invalid content types', test: this.testInvalidContentTypes },
      { name: 'Missing headers', test: this.testMissingHeaders },
      { name: 'Malformed JSON', test: this.testMalformedJSON },
      
      // Rate Limiting and Performance
      { name: 'Rapid sequential requests', test: this.testRapidRequests },
      { name: 'Concurrent requests', test: this.testConcurrentRequests },
      
      // Data Integrity
      { name: 'Enum value consistency', test: this.testEnumConsistency },
      { name: 'IUCN percentage totals', test: this.testIUCNTotals },
      { name: 'Keyword ID sequence', test: this.testKeywordSequence },
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.test);
    }

    this.printSummary();
  }

  private testLargePagination = async (): Promise<void> => {
    // Test very large page numbers and limits
    const response = await axios.get(`${API_BASE}/cards/database?page=999999&limit=1000`);
    const data = response.data as any;
    if (!data.success) {
      throw new Error('Should handle large pagination gracefully');
    }
    if (data.cards.length > 1000) {
      throw new Error('Should respect limit parameter');
    }
  };

  private testInvalidPagination = async (): Promise<void> => {
    // Test zero and negative values - should return 400 errors
    const tests = [
      { page: 0, limit: 10 },
      { page: -1, limit: 10 },
      { page: 1, limit: 0 },
      { page: 1, limit: -5 }
    ];

    for (const params of tests) {
      try {
        await axios.get(`${API_BASE}/cards/database?page=${params.page}&limit=${params.limit}`);
        throw new Error(`Should reject invalid pagination: page=${params.page}, limit=${params.limit}`);
      } catch (error: any) {
        if (error.response?.status !== 400) {
          throw new Error(`Should return 400 for invalid pagination, got ${error.response?.status}`);
        }
      }
    }
  };

  private testSQLInjection = async (): Promise<void> => {
    // Test common SQL injection patterns
    const injectionAttempts = [
      "'; DROP TABLE cards; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users; --",
      "' UNION SELECT * FROM cards --"
    ];

    for (const injection of injectionAttempts) {
      const response = await axios.get(`${API_BASE}/cards/database?search=${encodeURIComponent(injection)}`);
      const data = response.data as any;
      if (!data.success) {
        throw new Error(`Should handle SQL injection attempt gracefully: ${injection}`);
      }
    }
  };

  private testLongSearchQueries = async (): Promise<void> => {
    // Test very long search strings
    const longString = 'a'.repeat(10000);
    const response = await axios.get(`${API_BASE}/cards/database?search=${encodeURIComponent(longString)}`);
    const data = response.data as any;
    if (!data.success) {
      throw new Error('Should handle very long search queries');
    }
  };

  private testMaxIntegerCardId = async (): Promise<void> => {
    // Test maximum safe integer
    try {
      await axios.get(`${API_BASE}/cards/card/9007199254740991`);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw new Error(`Should return 404 for non-existent large ID, got ${error.response?.status}`);
      }
    }
  };

  private testNegativeCardIds = async (): Promise<void> => {
    try {
      await axios.get(`${API_BASE}/cards/card/-1`);
      throw new Error('Should reject negative card IDs');
    } catch (error: any) {
      if (error.response?.status !== 400) {
        throw new Error(`Should return 400 for negative ID, got ${error.response?.status}`);
      }
    }
  };

  private testFloatCardIds = async (): Promise<void> => {
    try {
      await axios.get(`${API_BASE}/cards/card/1.5`);
      throw new Error('Should reject float card IDs');
    } catch (error: any) {
      if (error.response?.status !== 400) {
        throw new Error(`Should return 400 for float ID, got ${error.response?.status}`);
      }
    }
  };

  private testSpecialCharacterCardIds = async (): Promise<void> => {
    const specialChars = ['abc', '!@#', '🎮', 'null', 'undefined'];
    
    for (const char of specialChars) {
      try {
        await axios.get(`${API_BASE}/cards/card/${encodeURIComponent(char)}`);
        throw new Error(`Should reject special character ID: ${char}`);
      } catch (error: any) {
        if (error.response?.status !== 400) {
          throw new Error(`Should return 400 for special char ID ${char}, got ${error.response?.status}`);
        }
      }
    }
  };

  private testInvalidTrophicLevels = async (): Promise<void> => {
    const invalidLevels = [-1, 999, 'abc', 1.5]; // 0 is actually valid

    for (const level of invalidLevels) {
      try {
        await axios.get(`${API_BASE}/cards/database?trophic_level=${level}`);
        throw new Error(`Should reject invalid trophic level: ${level}`);
      } catch (error: any) {
        if (error.response?.status !== 400) {
          throw new Error(`Should return 400 for invalid trophic level ${level}, got ${error.response?.status}`);
        }
      }
    }
  };

  private testInvalidKeywordIds = async (): Promise<void> => {
    const invalidKeywords = [-1, 0, 999999, 'invalid'];

    for (const keyword of invalidKeywords) {
      try {
        await axios.get(`${API_BASE}/cards/database?keyword=${keyword}`);
        throw new Error(`Should reject invalid keyword ID: ${keyword}`);
      } catch (error: any) {
        if (error.response?.status !== 400) {
          throw new Error(`Should return 400 for invalid keyword ${keyword}, got ${error.response?.status}`);
        }
      }
    }
  };

  private testMultipleFilters = async (): Promise<void> => {
    // Test complex filter combinations
    const response = await axios.get(`${API_BASE}/cards/database?trophic_level=1&trophic_category=1&keyword=1&search=test&page=1&limit=5`);
    const data = response.data as any;
    if (!data.success) {
      throw new Error('Should handle multiple filters');
    }
  };

  private testInvalidContentTypes = async (): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/cards/validate-placement`, 'invalid-json', {
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (error: any) {
      // Should fail gracefully, not crash server
      if (error.response?.status !== 400 && error.response?.status !== 401) {
        throw new Error(`Should handle invalid content type gracefully, got ${error.response?.status}`);
      }
    }
  };

  private testMissingHeaders = async (): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/cards/validate-placement`, {}, {
        headers: {} // No headers
      });
    } catch (error: any) {
      // Should fail gracefully
      if (!error.response || error.response.status >= 500) {
        throw new Error('Should handle missing headers gracefully');
      }
    }
  };

  private testMalformedJSON = async (): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/cards/validate-placement`, '{"invalid": json}', {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      // Should return 400, not crash
      if (error.response?.status !== 400 && error.response?.status !== 401) {
        throw new Error(`Should handle malformed JSON gracefully, got ${error.response?.status}`);
      }
    }
  };

  private testRapidRequests = async (): Promise<void> => {
    // Send 10 rapid requests
    const promises = Array(10).fill(0).map(() => 
      axios.get(`${API_BASE}/cards/keywords`)
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (successful < 8) { // Allow some to be rate limited
      throw new Error(`Too many requests failed: ${successful}/10 successful`);
    }
  };

  private testConcurrentRequests = async (): Promise<void> => {
    // Test concurrent requests to different endpoints
    const promises = [
      axios.get(`${API_BASE}/cards/database`),
      axios.get(`${API_BASE}/cards/keywords`),
      axios.get(`${API_BASE}/cards/abilities`),
      axios.get(`${API_BASE}/cards/trophic-categories`),
      axios.get(`${API_BASE}/cards/conservation-statuses`)
    ];
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (successful < 4) {
      throw new Error(`Too many concurrent requests failed: ${successful}/5 successful`);
    }
  };

  private testEnumConsistency = async (): Promise<void> => {
    const [keywordsRes, gameDataRes] = await Promise.all([
      axios.get(`${API_BASE}/cards/keywords`),
      axios.get(`${API_BASE}/cards/game-data`)
    ]);

    const keywordsData = keywordsRes.data as any;
    const gameDataData = gameDataRes.data as any;
    const keywordsCount = keywordsData.all_keywords?.length || 0;
    const gameDataKeywordsCount = gameDataData.game_data?.keywords?.length || 0;

    if (keywordsCount !== gameDataKeywordsCount) {
      throw new Error(`Keyword count mismatch: ${keywordsCount} vs ${gameDataKeywordsCount}`);
    }
  };

  private testIUCNTotals = async (): Promise<void> => {
    const response = await axios.get(`${API_BASE}/cards/conservation-statuses`);
    const data = response.data as any;
    const total = data.total_percentage;

    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`IUCN percentages don't total 100%: ${total}%`);
    }
  };

  private testKeywordSequence = async (): Promise<void> => {
    const response = await axios.get(`${API_BASE}/cards/keywords`);
    const data = response.data as any;
    const keywords = data.all_keywords;
    
    // Check that TERRESTRIAL has ID 1 (from our enum)
    const terrestrial = keywords.find((k: any) => k.keyword_name === 'TERRESTRIAL');
    if (!terrestrial || terrestrial.id !== 1) {
      throw new Error(`TERRESTRIAL keyword should have ID 1, got ${terrestrial?.id}`);
    }
  };

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      this.passed++;
      console.log(`✅ ${name}`);
    } catch (error: any) {
      this.failed++;
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  private printSummary(): void {
    const total = this.passed + this.failed;
    console.log(`\n📊 Edge Case Test Summary:`);
    console.log(`✅ Passed: ${this.passed}/${total} (${((this.passed/total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${this.failed}/${total}`);
    
    if (this.passed === total) {
      console.log('🎉 All edge case tests passed! API is robust.');
    } else {
      console.log('⚠️  Some edge cases need attention.');
    }
  }
}

// Run tests
const tester = new EdgeCaseTester();
tester.runAllTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Edge case testing failed:', error);
    process.exit(1);
  });
