import { getGlobalTestServer } from './mongodb-test-server';
import { spawn } from 'child_process';
import * as http from 'http';

let webServerProcess: import('child_process').ChildProcess | null = null;

async function waitForServer(url: string, timeout: number = 120000): Promise<void> {
  const startTime = Date.now();
  const healthUrl = `${url}/api/health`;

  while (Date.now() - startTime < timeout) {
    try {
      // First check if server is responding
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

      // Then check health endpoint for database connectivity
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
          .setTimeout(1000);
      });

      return; // Server is ready with database connected
    } catch {
      // Server not ready yet, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Server at ${url} did not become healthy within ${timeout}ms`);
}

async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  try {
    // Start MongoDB test server
    console.log('🏁 Starting MongoDB test server...');
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

    // Verify other required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Start the Next.js dev server
    // Always start a fresh server for tests to ensure correct database connection
    // Note: Reusing existing servers can cause database connection issues
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
    }

    // Wait for the server to be ready
    await waitForServer('http://localhost:3000');
    console.log('✅ Web server started successfully');

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);

    // Clean up if setup failed
    try {
      if (webServerProcess) {
        console.log('Cleaning up web server process...');
        webServerProcess.kill('SIGTERM');
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
