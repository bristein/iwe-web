import { MongoClient, Db, Collection } from 'mongodb';

// In test environment, we'll use a placeholder URI that gets replaced by the test server
// The actual URI will be set by the global test setup
if (!process.env.MONGODB_URI && process.env.NODE_ENV !== 'test') {
  throw new Error('Please add your Mongo URI to .env');
}

// In test environment, always get URI dynamically to support test server changes
function getMongoUri(): string {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iwe-test';
}

// Configure connection pool settings
const options = {
  maxPoolSize: process.env.NODE_ENV === 'test' ? 5 : 10,
  minPoolSize: process.env.NODE_ENV === 'test' ? 1 : 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Function to create a fresh connection (used in test environments)
function createConnection(): Promise<MongoClient> {
  const uri = getMongoUri();
  client = new MongoClient(uri, options);
  return client.connect();
}

if (process.env.NODE_ENV === 'test') {
  // In test mode, don't cache connections to allow dynamic URI changes
  clientPromise = createConnection();
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    const uri = getMongoUri();
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = createConnection();
}

// Function to refresh connection (for test environments)
export function refreshConnection(): void {
  if (process.env.NODE_ENV === 'test') {
    clientPromise = createConnection();
  }
}

// Export a module-scoped MongoClient promise
export default clientPromise;

// Determine database name based on environment
// Use test database if NODE_ENV is test OR if connecting to a test MongoDB server
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('127.0.0.1'));
const DB_NAME = isTestEnvironment ? 'iwe-test' : 'iwe-backend';

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// Helper function to connect to database (for compatibility)
export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return { client, db };
}

// Track indexes per database to avoid race conditions
const indexCache = new Map<string, Set<string>>();

// Helper function to get collections with index initialization
export async function getUsersCollection(): Promise<Collection> {
  const db = await getDatabase();
  const collection = db.collection('users');
  const dbName = db.databaseName;

  // Initialize cache for this database if needed
  if (!indexCache.has(dbName)) {
    indexCache.set(dbName, new Set());
  }

  const dbIndexes = indexCache.get(dbName)!;
  const indexKey = 'users_email_unique';

  // Check if we've already created this index for this database
  if (!dbIndexes.has(indexKey)) {
    try {
      await collection.createIndex(
        { email: 1 },
        {
          unique: true,
          name: indexKey,
          background: true, // Allow other operations while creating index
        }
      );
      dbIndexes.add(indexKey);
    } catch (error) {
      // Error code 85 means IndexAlreadyExists, which is fine
      const mongoError = error as { code?: number; codeName?: string };
      if (mongoError.code === 85 || mongoError.codeName === 'IndexOptionsConflict') {
        dbIndexes.add(indexKey);
      } else {
        console.error('Failed to create email index:', error);
        // Don't throw - allow the application to continue
      }
    }
  }

  return collection;
}

export async function getProjectsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('projects');
}

export async function getWorldBiblesCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('worldbibles');
}

export async function getManuscriptsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('manuscripts');
}
