import { cleanupGlobalTestServer, getGlobalTestServer } from './mongodb-test-server';
import { closeConnection } from './db-cleanup';
import { execSync } from 'child_process';
import * as os from 'os';

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

    // Ensure all MongoDB connections are closed before stopping the server
    if (testServer && testServer.isRunning()) {
      try {
        // Explicitly close database connections
        const client = await testServer.getClient();
        await client.close();
        console.log('📊 Closed MongoDB client connections');
      } catch (err) {
        console.log('⚠️  Could not close MongoDB connections:', err);
      }
    }

    // Stop MongoDB test server
    console.log('🛑 Stopping MongoDB test server...');
    await cleanupGlobalTestServer();

    // Clean up any global MongoDB connections (important for CI)
    if (global._mongoClientPromise) {
      try {
        const client = await global._mongoClientPromise;
        await client.close();
        global._mongoClientPromise = undefined;
        console.log('📊 Closed global MongoDB client');
      } catch (err) {
        console.log('⚠️  Could not close global MongoDB client:', err);
      }
    }

    // Stop web server if it was started by Playwright tests (not by Vitest)
    // Only stop if we have a PID and Playwright started the server
    if (process.env.TEST_WEB_SERVER_PID && process.env.PLAYWRIGHT_STARTED_SERVER === 'true') {
      console.log('🛑 Stopping web server started by Playwright...');
      try {
        const pid = parseInt(process.env.TEST_WEB_SERVER_PID);

        // Kill the process
        try {
          process.kill(pid, 'SIGTERM');
        } catch {}

        // Also kill any Next.js processes
        try {
          execSync('pkill -f \"next dev\" || true', { stdio: 'ignore' });
          execSync('pkill -f \"next-server\" || true', { stdio: 'ignore' });
        } catch {}

        // Wait a bit for processes to exit
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log('✅ Web server stopped successfully');
      } catch (error) {
        console.warn('Could not stop web server:', error);
      }
    } else if (process.env.TEST_WEB_SERVER_PID) {
      console.log('ℹ️  Web server was started by another test runner, leaving it running');
    }

    console.log('✅ Global cleanup completed successfully');
  } catch (error) {
    console.error('❌ Global cleanup failed:', error);
    // Don't throw here as it would fail the test run
    console.error('Continuing despite cleanup failure...');
  }
}

export default globalTeardown;
