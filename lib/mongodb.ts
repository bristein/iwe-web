import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env');
}

const uri = process.env.MONGODB_URI;
const options = {};

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

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('iwe-backend');
}

// Helper function to connect to database (for compatibility)
export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db('iwe-backend');
  return { client, db };
}

// Track if indexes have been initialized
let indexesInitialized = false;

// Helper function to get collections with index initialization
export async function getUsersCollection(): Promise<Collection> {
  const db = await getDatabase();
  const collection = db.collection('users');

  // Ensure email unique index exists (prevents race condition)
  if (!indexesInitialized) {
    try {
      await collection.createIndex({ email: 1 }, { unique: true });
      indexesInitialized = true;
    } catch (error) {
      // Index might already exist, which is fine
      console.log('Index creation info:', error);
    }
  }

  return collection;
}

export async function getProjectsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('projects');
}
