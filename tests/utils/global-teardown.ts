import { cleanupGlobalTestServer, getGlobalTestServer, cleanupWorkerTestServer } from './mongodb-test-server';
import { closeConnection } from './db-cleanup';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Coordination files for cleanup
const COORDINATION_DIR = path.join(os.tmpdir(), 'iwe-test-coordination');
const WEB_SERVER_READY_FILE = path.join(COORDINATION_DIR, 'web-server.ready');
const WEB_SERVER_PID_FILE = path.join(COORDINATION_DIR, 'web-server.pid');
const REPLICA_SET_READY_FILE = path.join(COORDINATION_DIR, 'replica-set.ready');
const REPLICA_SET_URI_FILE = path.join(COORDINATION_DIR, 'replica-set.uri');
const REPLICA_SET_LOCK_FILE = path.join(COORDINATION_DIR, 'replica-set.lock');

/**
 * Check if we should clean up the web server (only the worker that started it should stop it)
 */
function shouldCleanupWebServer(): boolean {
  // Check if this worker started the server
  const startedByPlaywright = process.env.PLAYWRIGHT_STARTED_SERVER === 'true';
  const hasServerPid = !!process.env.TEST_WEB_SERVER_PID;
  
  // Also check if we're the main worker (worker 0 or undefined) for final cleanup
  const isMainWorker = !process.env.TEST_WORKER_INDEX || process.env.TEST_WORKER_INDEX === '0';
  
  return startedByPlaywright && hasServerPid && isMainWorker;
}

/**
 * Clean up coordination files
 */
function cleanupCoordinationFiles(): void {
  const filesToClean = [
    WEB_SERVER_READY_FILE,
    WEB_SERVER_PID_FILE,
    REPLICA_SET_READY_FILE,
    REPLICA_SET_URI_FILE,
    REPLICA_SET_LOCK_FILE
  ];
  
  filesToClean.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
}

async function globalTeardown() {
  const workerId = process.env.TEST_WORKER_INDEX || process.env.PLAYWRIGHT_WORKER_INDEX || '0';
  console.log(`🧹 Starting optimized global test cleanup for worker ${workerId}...`);
  const startTime = Date.now();

  try {
    // Get test server instance to check stats before cleanup
    const testServer = getGlobalTestServer({ workerId: `global-setup-${workerId}` });

    if (testServer.isRunning()) {
      try {
        // Log final database statistics (if logging enabled)
        if (process.env.DEBUG === 'true') {
          const stats = await testServer.getStats();
          console.log('📈 Final database statistics:');
          Object.entries(stats).forEach(([collection, count]) => {
            console.log(`   - ${collection}: ${count} documents`);
          });
        }

        // Clean up all test data one final time (fast cleanup with timeout)
        const clearPromise = testServer.clearDatabase();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Clear database timeout')), 5000)
        );
        
        await Promise.race([clearPromise, timeoutPromise]);
      } catch (error) {
        console.warn('⚠️ Could not get database stats or clear data:', error);
      }
    }

    // Close any open connections from db-cleanup utility with timeout
    try {
      const closePromise = closeConnection();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Close connection timeout')), 3000)
      );
      await Promise.race([closePromise, timeoutPromise]);
    } catch (error) {
      console.warn('⚠️ Connection close warning:', error);
    }

    // Gracefully close all MongoDB connections with timeout protection
    const connectionCleanupPromises = [];
    
    if (testServer && testServer.isRunning()) {
      connectionCleanupPromises.push(
        (async () => {
          try {
            const client = await testServer.getClient();
            const closePromise = client.close();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Client close timeout')), 3000)
            );
            
            await Promise.race([closePromise, timeoutPromise]);
            console.log('📈 Closed MongoDB client connections');
          } catch (err) {
            console.log('⚠️  Could not close MongoDB connections:', err);
          }
        })()
      );
    }
    
    // Clean up worker-specific test server
    connectionCleanupPromises.push(
      cleanupWorkerTestServer(`global-setup-${workerId}`)
    );
    
    // Wait for all connection cleanup to complete with overall timeout
    try {
      await Promise.race([
        Promise.all(connectionCleanupPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection cleanup timeout')), 8000))
      ]);
    } catch (error) {
      console.warn('⚠️ Connection cleanup warning:', error);
    }

    // Stop MongoDB test server (only clean up shared instance if we're the main worker)
    const isMainWorker = !process.env.TEST_WORKER_INDEX || process.env.TEST_WORKER_INDEX === '0';
    if (isMainWorker) {
      console.log('🛑 Cleaning up MongoDB test infrastructure...');
      // Set environment variable to signal this is teardown
      process.env.PLAYWRIGHT_TEARDOWN = 'true';
      
      try {
        const cleanupPromise = cleanupGlobalTestServer();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Global cleanup timeout')), 15000)
        );
        
        await Promise.race([cleanupPromise, timeoutPromise]);
      } catch (error) {
        console.warn('⚠️ Global server cleanup warning:', error);
      }
    }

    // Clean up any global MongoDB connections (important for CI)
    if (global._mongoClientPromise) {
      try {
        const client = await global._mongoClientPromise;
        const closePromise = client.close();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Global client close timeout')), 3000)
        );
        
        await Promise.race([closePromise, timeoutPromise]);
        global._mongoClientPromise = undefined;
        console.log('📈 Closed global MongoDB client');
      } catch (err) {
        console.log('⚠️  Could not close global MongoDB client:', err);
      }
    }

    // Stop web server if appropriate
    if (shouldCleanupWebServer()) {
      console.log(`🛑 Worker ${workerId} stopping web server...`);
      try {
        const pid = parseInt(process.env.TEST_WEB_SERVER_PID!);

        // Kill the process
        try {
          process.kill(pid, 'SIGTERM');
        } catch {}

        // Also kill any Next.js processes
        try {
          execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
          execSync('pkill -f "next-server" || true', { stdio: 'ignore' });
        } catch {}

        // Wait a bit for processes to exit
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log('✅ Web server stopped successfully');
      } catch (error) {
        console.warn('Could not stop web server:', error);
      }
    } else if (process.env.TEST_WEB_SERVER_PID) {
      console.log(`ℹ️  Worker ${workerId}: Web server managed by another worker`);
    }

    // Clean up coordination files (only main worker)
    if (isMainWorker) {
      cleanupCoordinationFiles();
    }

    const cleanupTime = Date.now() - startTime;
    console.log(`✅ Optimized global cleanup completed successfully for worker ${workerId} in ${cleanupTime}ms`);
  } catch (error) {
    console.error(`❌ Global cleanup failed for worker ${workerId}:`, error);
    // Don't throw here as it would fail the test run
    console.error('Continuing despite cleanup failure...');
    
    // In CI environments, ensure we still clean up processes
    if (process.env.CI) {
      try {
        console.log('Attempting emergency cleanup in CI...');
        const { execSync } = require('child_process');
        // Kill any remaining processes
        execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
        execSync('pkill -f "node.*mongodb" || true', { stdio: 'ignore' });
        
        // Clean up coordination files in emergency
        cleanupCoordinationFiles();
      } catch {
        // Ignore errors in emergency cleanup
      }
    }
  }
}

export default globalTeardown;