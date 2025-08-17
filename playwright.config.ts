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
  fullyParallel: true, // Enable parallel execution for better performance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4, // Increase workers for better parallelization
  timeout: 20000, // Reduce timeout as tests should be faster now
  expect: {
    timeout: 8000, // Reduce assertion timeout
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
    // All E2E integration tests (browser workflows only, API tests handled by Vitest)
    {
      name: 'integration',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts$/,
      testIgnore: [
        '**/tests/api/**', // API tests are now handled by Vitest
      ],
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testMatch: /.*\.spec\.ts$/,
    //   testIgnore: ['**/tests/api/**'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testMatch: /.*\.spec\.ts$/,
    //   testIgnore: ['**/tests/api/**'],
    // },
  ],
  webServer: undefined, // We'll start the web server in global setup after MongoDB is ready
});
