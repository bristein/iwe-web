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
}

/**
 * Get a cached MongoDB client or create a new one
 */
async function getClient(): Promise<MongoClient> {
  if (!cachedClient) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    cachedClient = new MongoClient(mongoUri);
    await cachedClient.connect();
  }
  return cachedClient;
}

/**
 * Close the cached client connection
 */
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
  }
}

/**
 * Cleanup test users from the database
 */
export async function cleanupTestUsers(options: CleanupOptions = {}) {
  const client = await getClient();
  const db = client.db('iwe-backend');
  const usersCollection = db.collection('users');

  let filter: Record<string, unknown> = {};

  if (options.deleteAll) {
    // Delete all test users (be careful with this!)
    filter = {
      $or: [{ email: { $regex: /^test/i } }, { email: { $regex: /@example\.com$/i } }],
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
    const result = await usersCollection.deleteMany(filter);
    console.log(`✅ Deleted ${result.deletedCount} test user(s)`);

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
  const db = client.db('iwe-backend');
  const usersCollection = db.collection('users');

  const users = await usersCollection
    .find({
      $or: [{ email: { $regex: /^test/i } }, { email: { $regex: /@example\.com$/i } }],
    })
    .toArray();

  try {
    console.log(`📊 Found ${users.length} test user(s)`);
    users.forEach((user) => {
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
