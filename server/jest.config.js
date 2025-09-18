module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/simple-server.ts',
    '!src/scripts/**',
    '!src/database/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 60000, // Increased for resource contention scenarios
  verbose: true,

  // CRITICAL: Sequential execution to prevent resource contention
  maxWorkers: 1, // Force sequential execution to prevent database pool exhaustion
  testSequencer: '<rootDir>/src/__tests__/utils/testSequencer.js',

  // Better test isolation and cleanup
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Enhanced resource management
  workerIdleMemoryLimit: '512MB',
  logHeapUsage: false, // Disable to reduce noise
};
