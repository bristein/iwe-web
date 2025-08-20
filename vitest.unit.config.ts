import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test directory for unit tests only
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Test environment
    environment: 'node',

    // No global setup needed for unit tests
    globalSetup: undefined,
    setupFiles: undefined,

    // Faster timeout for unit tests
    testTimeout: 5000,

    // Reporter
    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '~/': resolve(__dirname, './'),
    },
  },
});
