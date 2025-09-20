/**
 * Module Resolution Test
 * Test to verify that module imports are working correctly
 */

describe('Module Resolution Test', () => {
  test('should import testDataLoader', async () => {
    const { loadTestGameData } = await import('./testDataLoader');
    expect(loadTestGameData).toBeDefined();
    expect(typeof loadTestGameData).toBe('function');
  });
});
