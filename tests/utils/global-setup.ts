import { getGlobalTestServer } from './mongodb-test-server';
import { spawn, execSync } from 'child_process';
import * as http from 'http';
// import * as os from 'os';

let webServerProcess: import('child_process').ChildProcess | null = null;

async function waitForServer(url: string, timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  const healthUrl = `${url}/api/health`;

  while (Date.now() - startTime < timeout) {
    try {
      // Check health endpoint directly for database connectivity
      await new Promise((resolve, reject) => {
        http
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
          .setTimeout(2000); // Increased timeout for individual requests
      });

      return; // Server is ready with database connected
    } catch {
      // Server not ready yet, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500)); // Reduced wait time between checks
    }
  }

  throw new Error(`Server at ${url} did not become healthy within ${timeout}ms`);
}

async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  try {
    // Check if a web server is already running (e.g., from Vitest tests)
    let serverAlreadyRunning = false;
    try {
      await waitForServer('http://localhost:3000', 3000); // Slightly longer check for existing server
      serverAlreadyRunning = true;
      console.log('📡 Web server already running, reusing existing server');
    } catch {
      // Server not running, we'll start it
    }

    // Start MongoDB test server only if not already running
    console.log('🏁 Checking MongoDB test server...');
    const testServer = getGlobalTestServer({
      enableLogging: process.env.DEBUG === 'true',
      useDocker: process.env.USE_DOCKER_MONGODB === 'true',
    });

    let mongoUri = process.env.MONGODB_URI || process.env.MONGODB_TEST_URI;

    if (!mongoUri || !testServer.isRunning()) {
      console.log('🏁 Starting MongoDB test server...');
      mongoUri = await testServer.start();

      // Set the MongoDB URI for tests to use
      process.env.MONGODB_URI = mongoUri;
      process.env.MONGODB_TEST_URI = mongoUri;

      // Create indexes for better performance
      await testServer.createIndexes();

      // Clear any existing test data
      await testServer.clearDatabase();

      console.log(`📊 MongoDB test server running at: ${mongoUri}`);
    } else {
      console.log(`📊 MongoDB test server already running at: ${mongoUri}`);
      // Still clear the database for test isolation
      await testServer.clearDatabase();
    }

    // Verify other required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Only start the Next.js dev server if it's not already running
    if (!serverAlreadyRunning) {
      console.log('🌐 Starting Next.js web server...');

      webServerProcess = spawn('pnpm', ['run', 'dev'], {
        env: {
          ...process.env,
          DISABLE_RATE_LIMIT: 'true',
          NODE_ENV: 'test',
          JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
          MONGODB_URI: mongoUri,
        },
        stdio: 'pipe',
        shell: true,
      });

      // Store the process ID for cleanup
      if (webServerProcess.pid) {
        process.env.TEST_WEB_SERVER_PID = webServerProcess.pid.toString();
        process.env.PLAYWRIGHT_STARTED_SERVER = 'true'; // Mark that Playwright started this server
      }

      // Wait for the server to be ready
      await waitForServer('http://localhost:3000');
      console.log('✅ Web server started successfully');
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);

    // Clean up if setup failed
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

      // Also clean up MongoDB test server if it was started
      const testServer = getGlobalTestServer();
      if (testServer && testServer.isRunning()) {
        console.log('Cleaning up MongoDB test server...');
        await testServer.stop();
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    throw error;
  }
}

export default globalSetup;
