import { getGlobalTestServer } from '../../utils/mongodb-test-server';
import { spawn, execSync } from 'child_process';
import * as http from 'http';
import * as os from 'os';

let webServerProcess: import('child_process').ChildProcess | null = null;

async function waitForServer(url: string, timeout: number = 60000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve(true);
          } else {
            reject(new Error(`Status code: ${res.statusCode}`));
          }
        });
        request.on('error', reject);
        request.setTimeout(1000);
      });

      return; // Server is ready
    } catch {
      // Server not ready yet, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`);
}

/**
 * Global setup for Vitest API tests
 * This runs once before all test files
 */
export async function setup() {
  console.log('🚀 Starting Vitest API test global setup...');

  try {
    // Start MongoDB test server
    console.log('🗄️  Starting MongoDB test server...');
    const testServer = getGlobalTestServer({
      enableLogging: process.env.DEBUG === 'true',
      useDocker: process.env.USE_DOCKER_MONGODB === 'true',
    });

    const mongoUri = await testServer.start();

    // Set the MongoDB URI for tests to use
    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_TEST_URI = mongoUri;

    // Create indexes for better performance
    await testServer.createIndexes();

    // Clear any existing test data
    await testServer.clearDatabase();

    console.log(`📊 MongoDB test server running at: ${mongoUri}`);

    // Verify required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Set test environment variables
    if (!process.env.NODE_ENV) {
      // Use Object.defineProperty to set NODE_ENV safely
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    process.env.DISABLE_RATE_LIMIT = 'true';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

    // Check if web server is already running
    try {
      await waitForServer('http://localhost:3000', 2000);
      console.log('📡 Web server already running, reusing existing server');
    } catch {
      // Start the Next.js dev server for API testing
      console.log('🌐 Starting Next.js web server for API tests...');

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
      }

      // Wait for the server to be ready
      await waitForServer('http://localhost:3000');
      console.log('✅ Web server started successfully');
    }

    console.log('✅ Vitest API test global setup completed successfully');

    return {
      mongoUri,
      testServer,
    };
  } catch (error) {
    console.error('❌ Vitest API test global setup failed:', error);
    throw error;
  }
}

/**
 * Global teardown for Vitest API tests
 * This runs once after all test files
 */
export async function teardown() {
  console.log('🧹 Starting Vitest API test global teardown...');

  try {
    // Clean up web server if we started it
    if (webServerProcess) {
      console.log('🌐 Stopping web server...');

      // Kill the process and all Next.js processes
      const killPromise = new Promise<void>((resolve) => {
        if (!webServerProcess || !webServerProcess.pid) {
          resolve();
          return;
        }

        const pid = webServerProcess.pid;
        console.log(`Terminating web server (PID ${pid})...`);

        // First kill the spawned process
        try {
          webServerProcess.kill('SIGTERM');
        } catch {}

        // Also kill any Next.js processes that might be running
        try {
          // Kill all Next.js dev server processes
          execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
          execSync('pkill -f "next-server" || true', { stdio: 'ignore' });
        } catch {}

        // Wait a moment for processes to exit
        setTimeout(() => {
          // Force kill if still running
          try {
            if (webServerProcess) {
              webServerProcess.kill('SIGKILL');
            }
          } catch {}

          console.log('✅ Web server process terminated');
          resolve();
        }, 2000);
      });

      await killPromise;
      webServerProcess = null;
    }

    // Clean up MongoDB test server
    const testServer = getGlobalTestServer();
    if (testServer && testServer.isRunning()) {
      console.log('🗄️  Stopping MongoDB test server...');
      await testServer.stop();
    }

    console.log('✅ Vitest API test global teardown completed successfully');

    // Force exit after a short delay to ensure all resources are cleaned up
    // This is needed because Next.js dev server might keep Node.js process alive
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('❌ Vitest API test global teardown failed:', error);
    // Force exit on error too
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}
