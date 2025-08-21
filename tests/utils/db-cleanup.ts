import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env', override: false });

// Connection pool for tests
let cachedClient: MongoClient | null = null;

export interface CleanupOptions {
  emails?: string[];
  usernames?: string[];
  deleteAll?: boolean;
  workerId?: string;
  executionId?: string;
}

/**
 * Get a cached MongoDB client or create a new one with optimized settings
 */
async function getClient(): Promise<MongoClient> {
  if (!cachedClient) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    cachedClient = new MongoClient(mongoUri, {
      // Optimize for cleanup operations
      maxPoolSize: 3, // Small pool for cleanup operations
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
      // Reduce resource usage
      retryWrites: false, // No retries needed for cleanup
      retryReads: false,
      compressors: ['snappy'],
      // Fast cleanup settings
      waitQueueTimeoutMS: 3000,
      monitorCommands: false,
    });
    
    // Connect with timeout
    const connectPromise = cachedClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 8000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
  }
  return cachedClient;
}

/**
 * Close the cached client connection with timeout protection
 */
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    try {
      const closePromise = cachedClient.close();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Close timeout')), 3000)
      );
      
      await Promise.race([closePromise, timeoutPromise]);
    } catch (error) {
      console.warn('Warning: Could not close cached client gracefully:', error);
    } finally {
      cachedClient = null;
    }
  }
}

/**
 * Cleanup test users from the database with optimized operations
 */
export async function cleanupTestUsers(options: CleanupOptions = {}) {
  const client = await getClient();
  
  // Use worker-specific database name for true isolation
  let dbName;
  if (process.env.NODE_ENV === 'test') {
    const workerId = process.env.TEST_WORKER_INDEX || 
                    process.env.PLAYWRIGHT_WORKER_INDEX || 
                    'default';
    const workerHash = require('crypto').createHash('md5').update(`${workerId}-${process.env.CI || 'local'}`).digest('hex').slice(0, 8);
    dbName = `iwe-test_w${workerId}_${workerHash}`;
  } else {
    dbName = 'iwe-backend';
  }
  
  const db = client.db(dbName);
  const usersCollection = db.collection('users');

  let filter: Record<string, unknown> = {};

  if (options.deleteAll) {
    // WARNING: This should only be used in emergency situations or in global teardown
    // For parallel test safety, prefer specific email cleanup
    console.warn(
      '⚠️  Using deleteAll - this should only be used in global teardown or emergency cleanup'
    );

    filter = {
      $or: [
        // Test users created by our test suite
        { email: { $regex: /^test.*@.*\.test$/i } },
        { email: { $regex: /^testuser\d+@example\.com$/i } },
        { email: { $regex: /^playwright-test-.*@example\.com$/i } },
        // Worker-scoped test users for parallel execution
        { email: { $regex: /^[^@]+-w\d+-[^@]+@example\.com$/i } },
        // Users with test metadata (if we add this field)
        { isTestUser: true },
        { createdBy: 'test-automation' },
        // Standard example.com emails (RFC 2606 reserved domain)
        { email: { $regex: /@example\.(com|org|net)$/i } },
        // Test pattern with timestamp
        { email: { $regex: /^test-\d{13}@/i } },
      ],
    };
  } else if (options.workerId && options.executionId) {
    // Worker and execution specific cleanup
    filter = {
      email: { $regex: new RegExp(`-w${options.workerId}-${options.executionId}-`, 'i') },
    };
  } else {
    // Build filter based on provided options
    const conditions = [];

    if (options.emails && options.emails.length > 0) {
      conditions.push({ email: { $in: options.emails } });
    }

    if (options.usernames && options.usernames.length > 0) {
      conditions.push({ username: { $in: options.usernames } });
    }

    if (conditions.length > 0) {
      filter = conditions.length === 1 ? conditions[0] : { $or: conditions };
    }
  }

  try {
    // Add timeout to delete operation
    const deletePromise = usersCollection.deleteMany(filter);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Delete operation timeout')), 10000)
    );
    
    const result = await Promise.race([deletePromise, timeoutPromise]) as { deletedCount: number };
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
  // Note: We don't close the client here anymore since it's cached
}

/**
 * Get all test users from the database
 */
export async function getTestUsers() {
  const client = await getClient();
  
  // Use worker-specific database name for true isolation
  let dbName;
  if (process.env.NODE_ENV === 'test') {
    const workerId = process.env.TEST_WORKER_INDEX || 
                    process.env.PLAYWRIGHT_WORKER_INDEX || 
                    'default';
    const workerHash = require('crypto').createHash('md5').update(`${workerId}-${process.env.CI || 'local'}`).digest('hex').slice(0, 8);
    dbName = `iwe-test_w${workerId}_${workerHash}`;
  } else {
    dbName = 'iwe-backend';
  }
  
  const db = client.db(dbName);
  const usersCollection = db.collection('users');

  // Add timeout to find operation
  const findPromise = usersCollection
    .find({
      $or: [
        // Use same specific patterns as cleanup
        { email: { $regex: /^test.*@.*\.test$/i } },
        { email: { $regex: /^testuser\d+@example\.com$/i } },
        { email: { $regex: /^playwright-test-.*@example\.com$/i } },
        // Worker-scoped test users for parallel execution
        { email: { $regex: /^test.*-w\d+-\d{13}-\d{1,3}@example\.com$/i } },
        { isTestUser: true },
        { createdBy: 'test-automation' },
        { email: { $regex: /@example\.(com|org|net)$/i } },
        { email: { $regex: /^test-\d{13}@/i } },
      ],
    })
    .limit(1000) // Prevent excessive results
    .toArray();
    
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Find operation timeout')), 5000)
  );
  
  const users = await Promise.race([findPromise, timeoutPromise]) as any[];

  try {
    console.log(`📊 Found ${users.length} test user(s)`);
    users.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.name})`);
    });

    return users;
  } catch (error) {
    console.error('❌ Error fetching test users:', error);
    throw error;
  }
  // Note: We don't close the client here anymore since it's cached
}

// CLI script support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  async function run() {
    try {
      switch (command) {
        case 'list':
          await getTestUsers();
          break;

        case 'clean':
          const emails = args.slice(1);
          if (emails.length > 0) {
            await cleanupTestUsers({ emails });
          } else {
            console.log('⚠️  No emails specified. Use "clean-all" to delete all test users.');
          }
          break;

        case 'clean-all':
          console.log('🗑️  Deleting all test users...');
          await cleanupTestUsers({ deleteAll: true });
          break;

        default:
          console.log(`
📚 Database Cleanup Utility

Commands:
  list        - List all test users
  clean       - Delete specific users by email
  clean-all   - Delete all test users

Examples:
  npx ts-node tests/utils/db-cleanup.ts list
  npx ts-node tests/utils/db-cleanup.ts clean test@example.com
  npx ts-node tests/utils/db-cleanup.ts clean-all
          `);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    process.exit(0);
  }

  run();
}
