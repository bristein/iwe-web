import { getGlobalTestServer } from './mongodb-test-server';

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

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
