import { FullConfig } from '@playwright/test';
import { cleanupTestUsers, closeConnection } from './db-cleanup';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test cleanup...');

  try {
    // Clean up all test data
    await cleanupTestUsers({ deleteAll: true });

    // Close database connections
    await closeConnection();

    console.log('✅ Global cleanup completed successfully');
  } catch (error) {
    console.error('❌ Global cleanup failed:', error);
    // Don't throw here as it would fail the test run
    console.error('Continuing despite cleanup failure...');
  }
}

export default globalTeardown;
