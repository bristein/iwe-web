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
  fullyParallel: true, // Enable full parallel with optimized MongoDB shared replica set
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduce retries since tests should be more reliable
  workers: process.env.CI ? 3 : 4, // Optimal workers with shared replica set architecture
  timeout: process.env.CI ? 60000 : 45000, // Slightly longer timeout in CI for replica set startup
  expect: {
    timeout: process.env.CI ? 12000 : 10000, // Adjusted for CI environment
  },
  reporter: [
    ['html', { open: 'never' }], // Don't auto-open in parallel execution
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ...(process.env.CI ? [['github'] as const] : [['line'] as const]), // Add line reporter for local dev
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    actionTimeout: process.env.CI ? 10000 : 8000, // Slightly longer in CI
    navigationTimeout: process.env.CI ? 20000 : 15000, // More generous navigation timeout in CI
    // Optimize for parallel execution
    launchOptions: {
      // Reduce resource usage per browser instance
      args: [
        '--disable-dev-shm-usage', // Overcome limited resource problems in CI
        '--disable-web-security', // Speed up tests
        '--no-sandbox', // Required for CI environments
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI', // Reduce memory usage
        '--disable-extensions', // No extensions needed for tests
        '--disable-component-extensions-with-background-pages',
        '--disable-ipc-flooding-protection', // Speed up communication
        process.env.CI ? '--memory-pressure-off' : '', // Disable memory pressure in CI
      ].filter(Boolean),
      // Reduce memory usage in parallel execution
      chromiumSandbox: false,
    },
    // Browser context options for better parallel execution
    contextOptions: {
      // Reduce memory usage
      viewport: { width: 1280, height: 720 }, // Standard viewport
      // Disable some features for performance
      permissions: [], // No special permissions needed
      geolocation: undefined, // Don't set geolocation
      locale: 'en-US', // Consistent locale
    },
  },
  globalSetup: require.resolve('./tests/utils/global-setup.ts'),
  globalTeardown: require.resolve('./tests/utils/global-teardown.ts'),
  projects: [
    // All E2E integration tests (browser workflows only, API tests handled by Vitest)
    {
      name: 'integration',
      use: { 
        ...devices['Desktop Chrome'],
        // Worker-specific configuration for database isolation
        contextOptions: {
          // Each worker gets isolated context
          ignoreHTTPSErrors: true,
          // Optimize for parallel execution
          reducedMotion: 'reduce', // Faster animations
          forcedColors: 'none', // Consistent rendering
        },
        // Additional browser optimizations for parallel execution
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-sync', // No sync needed for tests
            '--no-first-run', // Skip first run experience
            '--no-default-browser-check', // Skip browser check
            process.env.CI ? '--memory-pressure-off' : '',
            process.env.CI ? '--max_old_space_size=2048' : '',
          ].filter(Boolean),
        },
      },
      testMatch: /.*\.spec\.ts$/,
      testIgnore: [
        '**/tests/api/**', // API tests are now handled by Vitest
      ],
      // Test execution settings optimized for parallel runs
      fullyParallel: true,
      // Retry configuration for parallel execution
      retries: process.env.CI ? 1 : 0,
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
  webServer: undefined, // Web server started in global setup after shared MongoDB replica set is ready
  
  // Global test settings for parallel execution
  globalTimeout: process.env.CI ? 10 * 60 * 1000 : 6 * 60 * 1000, // 10 min in CI, 6 min locally (account for replica set startup)
  
  // Optimize test execution
  reportSlowTests: {
    max: 5,
    threshold: process.env.CI ? 15000 : 10000, // More lenient in CI due to resource constraints
  },
  
  // Additional optimizations for parallel execution
  preserveOutput: 'failures-only', // Reduce disk I/O
  
  // Test metadata for better coordination
  metadata: {
    testMode: 'parallel-optimized',
    mongodbArchitecture: 'shared-replica-set',
    workers: process.env.CI ? 3 : 4,
  },
});
