import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: resolve(__dirname, '.env.test') });
dotenv.config({ path: resolve(__dirname, '.env'), override: false });

export default defineConfig({
  test: {
    // Test directories for API and unit tests
    include: [
      'tests/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // Test environment setup
    environment: 'node',

    // Global setup and teardown
    globalSetup: ['tests/api/setup/global-setup.ts'],

    // Setup files run before each test file
    setupFiles: ['tests/api/setup/test-setup.ts'],

    // Test timeout
    testTimeout: 20000, // Reduced from 30s - API tests should be fast

    // Hook timeout for setup/teardown
    hookTimeout: 30000, // Reduced from 60s - startup should be faster

    // Don't run tests in parallel by default for database isolation
    // Individual test files can override this with `describe.concurrent`
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for database isolation
      },
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

    // Retry configuration
    retry: process.env.CI ? 2 : 1,

    // Environment variables available in tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
      DISABLE_RATE_LIMIT: 'true',
      BASE_URL: 'http://localhost:3000',
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '~/': resolve(__dirname, './'),
    },
  },
});
