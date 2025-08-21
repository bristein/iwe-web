import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: resolve(__dirname, '.env.test') });
dotenv.config({ path: resolve(__dirname, '.env'), override: false });

export default defineConfig({
  test: {
    // Test directories for API tests only
    include: ['tests/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Test environment setup
    environment: 'node',

    // Global setup and teardown
    globalSetup: ['tests/api/setup/global-setup.ts'],

    // Setup files run before each test file
    setupFiles: ['tests/api/setup/test-setup.ts'],

    // Test timeout
    testTimeout: 15000, // Reduced timeout with optimized MongoDB setup

    // Hook timeout for setup/teardown
    hookTimeout: 20000, // Faster startup with shared replica set

    // Enable parallel execution with worker isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Enable parallel execution
        maxForks: process.env.CI ? 2 : 3, // Controlled parallelism
        minForks: 1,
        isolate: true, // Isolate test environments
      },
    },

    // Improve test execution performance
    sequence: {
      concurrent: true, // Run test files concurrently
      shuffle: false, // Keep deterministic order for debugging
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
        'tests/**',
        'playwright.config.ts',
        'next.config.mjs',
        'tailwind.config.js',
        'postcss.config.mjs',
      ],
    },

    // Reporter configuration
    reporters: process.env.CI ? ['github-actions', 'json'] : ['verbose'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },

    // Retry configuration - reduced with better reliability
    retry: process.env.CI ? 1 : 0,

    // Environment variables available in tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
      DISABLE_RATE_LIMIT: 'true',
      BASE_URL: 'http://localhost:3000',
      // MongoDB optimization flags
      MONGOMS_DISABLE_POSTINSTALL: 'true', // Speed up in CI
      MONGOMS_DOWNLOAD_MIRROR: 'https://fastdl.mongodb.org',
      MONGOMS_VERSION: '7.0.14',
    },

    // Performance optimizations
    logHeapUsage: process.env.CI === 'true', // Monitor memory in CI
    isolate: true, // Ensure test isolation
    
    // Test file patterns for better discovery
    typecheck: {
      enabled: false, // Disable typecheck during test runs for speed
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '~/': resolve(__dirname, './'),
    },
  },
});
