import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test directory for unit tests only
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Test environment for React components
    environment: 'jsdom',

    // Setup files for React Testing Library
    globalSetup: undefined,
    setupFiles: ['tests/unit/setup.ts'],

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
