import { cleanupGlobalTestServer, getGlobalTestServer } from './mongodb-test-server';
import { closeConnection } from './db-cleanup';

async function globalTeardown() {
  console.log('🧹 Starting global test cleanup...');

  try {
    // Get test server instance to check stats before cleanup
    const testServer = getGlobalTestServer();

    if (testServer.isRunning()) {
      // Log final database statistics
      const stats = await testServer.getStats();
      console.log('📊 Final database statistics:');
      Object.entries(stats).forEach(([collection, count]) => {
        console.log(`   - ${collection}: ${count} documents`);
      });

      // Clean up all test data one final time
      await testServer.clearDatabase();
    }

    // Close any open connections from db-cleanup utility
    await closeConnection();

    // Stop MongoDB test server
    console.log('🛑 Stopping MongoDB test server...');
    await cleanupGlobalTestServer();

    console.log('✅ Global cleanup completed successfully');
  } catch (error) {
    console.error('❌ Global cleanup failed:', error);
    // Don't throw here as it would fail the test run
    console.error('Continuing despite cleanup failure...');
  }
}

export default globalTeardown;
