import { getGlobalTestServer, getSharedReplicaSetUri } from './mongodb-test-server';
import { spawn, execSync } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Coordination for global setup
const COORDINATION_DIR = path.join(os.tmpdir(), 'iwe-test-coordination');
const WEB_SERVER_LOCK_FILE = path.join(COORDINATION_DIR, 'web-server.lock');
const WEB_SERVER_READY_FILE = path.join(COORDINATION_DIR, 'web-server.ready');
const WEB_SERVER_PID_FILE = path.join(COORDINATION_DIR, 'web-server.pid');

let webServerProcess: import('child_process').ChildProcess | null = null;

/**
 * Ensure coordination directory exists
 */
function ensureCoordinationDir(): void {
  if (!fs.existsSync(COORDINATION_DIR)) {
    fs.mkdirSync(COORDINATION_DIR, { recursive: true });
  }
}

/**
 * Check if web server is already running by another process
 */
function isWebServerRunning(): { running: boolean; pid?: number } {
  if (!fs.existsSync(WEB_SERVER_READY_FILE) || !fs.existsSync(WEB_SERVER_PID_FILE)) {
    return { running: false };
  }
  
  try {
    const pid = parseInt(fs.readFileSync(WEB_SERVER_PID_FILE, 'utf8').trim());
    // Check if process is still running
    process.kill(pid, 0); // Throws if process doesn't exist
    return { running: true, pid };
  } catch {
    // Process doesn't exist, clean up stale files
    [WEB_SERVER_READY_FILE, WEB_SERVER_PID_FILE].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch {}
      }
    });
    return { running: false };
  }
}

async function waitForServer(url: string, timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  const healthUrl = `${url}/api/health`;
  const checkInterval = 250; // Check every 250ms for faster detection

  while (Date.now() - startTime < timeout) {
    try {
      // Check health endpoint directly for database connectivity
      await new Promise((resolve, reject) => {
        const request = http
          .get(healthUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                const health = JSON.parse(data);
                if (res.statusCode === 200 && health.database === 'connected') {
                  resolve(true);
                } else {
                  reject(new Error(`Health check failed: ${data}`));
                }
              } catch {
                reject(new Error(`Invalid health response: ${data}`));
              }
            });
          })
          .on('error', reject)
          .setTimeout(3000); // Slightly longer timeout for individual requests
          
        // Handle timeout
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return; // Server is ready with database connected
    } catch {
      // Server not ready yet, wait a bit
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }

  throw new Error(`Server at ${url} did not become healthy within ${timeout}ms`);
}

/**
 * Wait for web server to be ready (started by another worker)
 */
async function waitForWebServerReady(timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 200;
  
  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(WEB_SERVER_READY_FILE)) {
      try {
        await waitForServer('http://localhost:3000', 5000);
        return;
      } catch {
        // Server file exists but not ready yet, continue waiting
      }
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Web server not ready within ${timeout}ms`);
}

/**
 * Cleanup function for setup failures
 */
async function cleanupOnFailure(): Promise<void> {
  try {
    if (webServerProcess && webServerProcess.pid) {
      console.log('Cleaning up web server process...');
      try {
        webServerProcess.kill('SIGTERM');
      } catch {}
      // Also kill any Next.js processes
      try {
        execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
        execSync('pkill -f "next-server" || true', { stdio: 'ignore' });
      } catch {}
    }

    // Clean up coordination files
    [WEB_SERVER_LOCK_FILE, WEB_SERVER_READY_FILE, WEB_SERVER_PID_FILE].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch {}
      }
    });

    // Clean up MongoDB test server if it was started
    try {
      const workerId = process.env.TEST_WORKER_INDEX || process.env.PLAYWRIGHT_WORKER_INDEX || '0';
      const testServer = getGlobalTestServer({ workerId: `global-setup-${workerId}` });
      if (testServer && testServer.isRunning()) {
        console.log('Cleaning up MongoDB test server...');
        // Close connections gracefully with timeout
        try {
          const client = await testServer.getClient();
          await Promise.race([
            client.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout')), 5000))
          ]);
        } catch (error) {
          console.warn('Client close warning:', error);
        }
        await testServer.stop();
      }
    } catch (error) {
      console.warn('Warning: Could not clean up MongoDB test server:', error);
    }
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError);
  }
}

async function globalSetup() {
  const workerId = process.env.TEST_WORKER_INDEX || process.env.PLAYWRIGHT_WORKER_INDEX || '0';
  console.log(`🚀 Starting optimized global test setup for worker ${workerId}...`);

  try {
    ensureCoordinationDir();
    
    // Check if a web server is already running
    const serverStatus = isWebServerRunning();
    let serverAlreadyRunning = serverStatus.running;
    
    if (!serverAlreadyRunning) {
      // Quick health check for running server that might not be tracked
      try {
        await waitForServer('http://localhost:3000', 2000);
        serverAlreadyRunning = true;
        console.log('📡 Web server already running (not tracked), reusing existing server');
      } catch {
        // Server not running, we'll start it
      }
    } else {
      console.log(`📡 Web server already running (PID: ${serverStatus.pid}), reusing existing server`);
    }

    // Initialize shared MongoDB replica set (optimized for parallel testing)
    console.log('🏁 Initializing shared MongoDB replica set for parallel workers...');
    const startTime = Date.now();
    
    const mongoUri = await getSharedReplicaSetUri({
      enableLogging: process.env.DEBUG === 'true',
      useDocker: process.env.USE_DOCKER_MONGODB === 'true',
      mongoVersion: process.env.MONGOMS_VERSION || '7.0.14',
      maxConnections: process.env.CI ? 15 : 20, // Adjust for CI environment
      timeoutMs: process.env.CI ? 15000 : 10000, // More generous timeout in CI
    });

    const setupTime = Date.now() - startTime;
    console.log(`📈 Shared MongoDB replica set ready in ${setupTime}ms: ${mongoUri}`);

    // Set the MongoDB URI for tests to use
    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_TEST_URI = mongoUri;
    
    // Get worker-specific test server for this global setup
    const testServer = getGlobalTestServer({
      enableLogging: process.env.DEBUG === 'true',
      useDocker: process.env.USE_DOCKER_MONGODB === 'true',
      workerId: `global-setup-${workerId}`,
      maxConnections: 4, // Conservative connection limit per worker
      timeoutMs: process.env.CI ? 12000 : 8000, // Adjust timeouts for CI
    });

    // Start the worker-specific instance (connects to shared replica set)
    await testServer.start();
    
    // Create indexes and clear data in parallel (with timeout protection)
    const setupOperations = [
      testServer.createIndexes(),
      testServer.clearDatabase()
    ];
    
    try {
      await Promise.race([
        Promise.all(setupOperations),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Setup operations timeout')), 15000))
      ]);
    } catch (error) {
      console.warn(`⚠️ Setup operations warning: ${error}`);
      // Continue with setup even if these operations fail
    }

    // Verify other required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Only start the Next.js dev server if it's not already running
    if (!serverAlreadyRunning) {
      console.log('🌐 Starting Next.js web server optimized for parallel testing...');
      
      // Try to acquire web server startup lock
      let lockAcquired = false;
      try {
        fs.writeFileSync(WEB_SERVER_LOCK_FILE, process.pid.toString(), { flag: 'wx' });
        lockAcquired = true;
        console.log(`🔒 Worker ${workerId} acquired web server startup lock`);
      } catch (error) {
        // Another worker is starting the server, wait for it
        console.log(`⏳ Worker ${workerId} waiting for web server startup...`);
        await waitForWebServerReady();
        return; // Setup complete, server started by another worker
      }

      try {
        webServerProcess = spawn('pnpm', ['run', 'dev'], {
          env: {
            ...process.env,
            DISABLE_RATE_LIMIT: 'true',
            NODE_ENV: 'test',
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
            MONGODB_URI: mongoUri,
            // Optimize Next.js for testing
            NEXT_TELEMETRY_DISABLED: '1',
            // Increase memory limit for parallel testing
            NODE_OPTIONS: '--max-old-space-size=2048',
          },
          stdio: 'pipe',
          shell: true,
        });

        // Store the process ID for cleanup
        if (webServerProcess.pid) {
          process.env.TEST_WEB_SERVER_PID = webServerProcess.pid.toString();
          process.env.PLAYWRIGHT_STARTED_SERVER = 'true';
          
          // Write PID to coordination file
          fs.writeFileSync(WEB_SERVER_PID_FILE, webServerProcess.pid.toString(), 'utf8');
        }

        // Wait for the server to be ready with health check
        await waitForServer('http://localhost:3000', process.env.CI ? 90000 : 60000);
        
        // Mark server as ready
        fs.writeFileSync(WEB_SERVER_READY_FILE, Date.now().toString(), 'utf8');
        
        console.log('✅ Web server started successfully and database connected');
      } finally {
        // Release the lock
        if (lockAcquired && fs.existsSync(WEB_SERVER_LOCK_FILE)) {
          try {
            fs.unlinkSync(WEB_SERVER_LOCK_FILE);
          } catch {}
        }
      }
    }

    const totalSetupTime = Date.now() - startTime;
    console.log(`✅ Optimized global setup completed successfully in ${totalSetupTime}ms`);
    console.log(`🔄 Worker ${workerId} ready for parallel test execution`);
  } catch (error) {
    console.error(`❌ Global setup failed for worker ${workerId}:`, error);

    // Clean up if setup failed
    await cleanupOnFailure();
    throw error;
  }
}

export default globalSetup;