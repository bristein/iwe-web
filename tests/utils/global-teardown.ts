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

    // Stop web server if it was started by tests
    if (process.env.TEST_WEB_SERVER_PID) {
      console.log('🛑 Stopping web server...');
      try {
        const pid = parseInt(process.env.TEST_WEB_SERVER_PID);
        
        // First try graceful shutdown
        process.kill(pid, 'SIGTERM');
        
        // Wait for graceful shutdown with timeout
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const maxAttempts = 10; // 5 seconds total
          
          const checkInterval = setInterval(() => {
            try {
              // Check if process still exists (throws if it doesn't)
              process.kill(pid, 0);
              attempts++;
              
              if (attempts >= maxAttempts) {
                // Force kill if still running after timeout
                console.warn('Web server did not stop gracefully, forcing shutdown...');
                try {
                  process.kill(pid, 'SIGKILL');
                } catch {
                  // Process might have died between check and kill
                }
                clearInterval(checkInterval);
                resolve();
              }
            } catch {
              // Process no longer exists, success!
              clearInterval(checkInterval);
              resolve();
            }
          }, 500);
        });
        
        console.log('✅ Web server stopped successfully');
      } catch (error) {
        console.warn('Could not stop web server:', error);
      }
    }

    console.log('✅ Global cleanup completed successfully');
  } catch (error) {
    console.error('❌ Global cleanup failed:', error);
    // Don't throw here as it would fail the test run
    console.error('Continuing despite cleanup failure...');
  }
}

export default globalTeardown;
