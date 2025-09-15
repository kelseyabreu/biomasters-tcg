/**
 * E2E Test Configuration
 * Centralized configuration for E2E tests including rate limiting and timeouts
 */

export interface TestConfig {
  firebase: {
    rateLimiting: {
      enabled: boolean;
      minDelayMs: number;
      maxRequestsPerSecond: number;
      retryAttempts: number;
      exponentialBackoffBase: number;
      maxBackoffMs: number;
    };
    timeouts: {
      authenticationMs: number;
      userCreationMs: number;
      signInMs: number;
    };
  };
  playwright: {
    timeouts: {
      defaultMs: number;
      navigationMs: number;
      actionMs: number;
    };
    workers: {
      maxConcurrent: number;
      isolationDelayMs: number;
    };
  };
}

// Default configuration
const defaultConfig: TestConfig = {
  firebase: {
    rateLimiting: {
      enabled: true,
      minDelayMs: 100,
      maxRequestsPerSecond: 8, // Conservative limit
      retryAttempts: 5,
      exponentialBackoffBase: 2,
      maxBackoffMs: 30000,
    },
    timeouts: {
      authenticationMs: 45000, // Increased for rate limiting
      userCreationMs: 30000,
      signInMs: 20000,
    },
  },
  playwright: {
    timeouts: {
      defaultMs: 120000,
      navigationMs: 30000,
      actionMs: 10000,
    },
    workers: {
      maxConcurrent: 4, // Reduced to prevent overwhelming Firebase
      isolationDelayMs: 500,
    },
  },
};

// Environment-specific overrides
const environmentConfigs: Record<string, Partial<TestConfig>> = {
  development: {
    firebase: {
      rateLimiting: {
        enabled: true,
        minDelayMs: 200,
        maxRequestsPerSecond: 5, // More conservative for dev
      },
    },
  },
  ci: {
    firebase: {
      rateLimiting: {
        enabled: true,
        minDelayMs: 300,
        maxRequestsPerSecond: 3, // Very conservative for CI
        retryAttempts: 8,
      },
      timeouts: {
        authenticationMs: 60000,
        userCreationMs: 45000,
      },
    },
    playwright: {
      workers: {
        maxConcurrent: 2, // Reduced for CI
        isolationDelayMs: 1000,
      },
    },
  },
  emulator: {
    firebase: {
      rateLimiting: {
        enabled: false, // No rate limiting needed for emulator
        minDelayMs: 0,
        maxRequestsPerSecond: 100,
      },
      timeouts: {
        authenticationMs: 10000,
        userCreationMs: 5000,
        signInMs: 5000,
      },
    },
  },
};

/**
 * Get the current test configuration based on environment
 */
export function getTestConfig(): TestConfig {
  const env = process.env.NODE_ENV || 'development';
  const useEmulator = process.env.VITE_USE_FIREBASE_EMULATOR === 'true' || 
                     process.env.FIREBASE_USE_EMULATOR === 'true';
  
  let configKey = env;
  if (useEmulator) {
    configKey = 'emulator';
  } else if (process.env.CI) {
    configKey = 'ci';
  }
  
  const envConfig = environmentConfigs[configKey] || {};
  
  // Deep merge configurations
  return mergeDeep(defaultConfig, envConfig);
}

/**
 * Deep merge utility for configuration objects
 */
function mergeDeep(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Log current configuration for debugging
 */
export function logTestConfig(): void {
  const config = getTestConfig();
  console.log('🔧 E2E Test Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    useEmulator: process.env.VITE_USE_FIREBASE_EMULATOR === 'true',
    isCI: !!process.env.CI,
    firebase: {
      rateLimiting: config.firebase.rateLimiting.enabled,
      maxRequestsPerSecond: config.firebase.rateLimiting.maxRequestsPerSecond,
      authTimeout: config.firebase.timeouts.authenticationMs,
    },
    playwright: {
      maxWorkers: config.playwright.workers.maxConcurrent,
      defaultTimeout: config.playwright.timeouts.defaultMs,
    },
  });
}
