import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

/**
 * Playwright Configuration for BioMasters TCG
 * End-to-end testing across web, mobile, and cross-platform scenarios
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
    /* Increased timeouts for mobile compatibility */
    actionTimeout: 15 * 1000, // 15 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for navigation
  },

  /* Environment variables for tests */
  env: {
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
    VITE_USE_FIREBASE_EMULATOR: process.env.VITE_USE_FIREBASE_EMULATOR,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports with enhanced compatibility */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // Enhanced mobile Chrome settings
        actionTimeout: 20 * 1000,
        navigationTimeout: 45 * 1000,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        // Enhanced mobile Safari settings
        actionTimeout: 25 * 1000, // Safari can be slower
        navigationTimeout: 60 * 1000,
        // Disable CDP-dependent features for Safari
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd server && npm run dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ],

  /* Global setup and teardown */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* Test timeout - Increased for mobile compatibility */
  timeout: 60 * 1000, // 60 seconds for complex authentication flows
  expect: {
    timeout: 15 * 1000, // 15 seconds for assertions
  },
});
