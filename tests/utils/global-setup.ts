import { FullConfig } from '@playwright/test';
import { cleanupTestUsers, closeConnection } from './db-cleanup';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  try {
    // Skip database cleanup for now - just verify environment
    // console.log('🧹 Cleaning up existing test data...');
    // await cleanupTestUsers({ deleteAll: true });

    // Verify test environment variables
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
