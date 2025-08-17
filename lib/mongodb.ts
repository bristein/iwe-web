import { MongoClient, Db, Collection } from 'mongodb';

// In test environment, we'll use a placeholder URI that gets replaced by the test server
// The actual URI will be set by the global test setup
const isTestEnvironment = process.env.NODE_ENV === 'test';

if (!process.env.MONGODB_URI && !isTestEnvironment) {
  throw new Error('Please add your Mongo URI to .env');
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iwe-test';

// Configure connection pool settings
const options = {
  maxPoolSize: process.env.NODE_ENV === 'test' ? 5 : 10,
  minPoolSize: process.env.NODE_ENV === 'test' ? 1 : 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise
export default clientPromise;

// Determine database name based on environment
const DB_NAME = process.env.NODE_ENV === 'test' ? 'iwe-test' : 'iwe-backend';

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
      await collection.createIndex({ email: 1 }, { 
        unique: true,
        name: indexKey,
        background: true // Allow other operations while creating index
      });
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
