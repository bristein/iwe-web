import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: false });

// MongoDB test server will be started automatically by global setup
// No need to manually configure MONGODB_URI

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false, // Changed to false for better database test isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2, // Limit workers to prevent DB conflicts
  timeout: 30000, // 30 second timeout
  expect: {
    timeout: 10000, // 10 second assertion timeout
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000, // 15 second action timeout
    navigationTimeout: 30000, // 30 second navigation timeout
  },
  globalSetup: require.resolve('./tests/utils/global-setup.ts'),
  globalTeardown: require.resolve('./tests/utils/global-teardown.ts'),
  projects: [
    // All integration tests
    {
      name: 'integration',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts$/,
    },
    // Authentication tests - focused testing
    {
      name: 'auth-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /auth\/.*\.spec\.ts$/,
    },
    // API tests - faster execution
    {
      name: 'api-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /api\/.*\.spec\.ts$/,
    },
    // UI tests
    {
      name: 'ui-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /ui\/.*\.spec\.ts$/,
    },
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*mobile.*\.spec\.ts$/,
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testMatch: /.*\.spec\.ts$/,
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testMatch: /.*\.spec\.ts$/,
    // },
  ],
  webServer: {
    command: 'DISABLE_RATE_LIMIT=true pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DISABLE_RATE_LIMIT: 'true',
    },
  },
});
