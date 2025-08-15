import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient, Db } from 'mongodb';

export interface TestServerConfig {
  useDocker?: boolean;
  dbName?: string;
  port?: number;
  mongoVersion?: string;
  enableLogging?: boolean;
}

export class MongoDBTestServer {
  private memoryServer?: MongoMemoryServer;
  private dockerContainer?: StartedMongoDBContainer;
  private client?: MongoClient;
  private connectionUri?: string;
  private config: TestServerConfig;
  private isStarted = false;

  constructor(config: TestServerConfig = {}) {
    this.config = {
      useDocker: config.useDocker === true, // Only use Docker if explicitly requested
      dbName: config.dbName || 'iwe-test',
      port: config.port, // Don't set default port, let MongoDB choose
      mongoVersion: config.mongoVersion || '7.0.14',
      enableLogging: config.enableLogging || process.env.DEBUG === 'true',
    };
  }

  /**
   * Start the MongoDB test server
   */
  async start(): Promise<string> {
    if (this.isStarted) {
      return this.connectionUri!;
    }

    try {
      if (this.config.useDocker) {
        await this.startDockerMongoDB();
      } else {
        await this.startMemoryMongoDB();
      }

      this.isStarted = true;
      this.log(`✅ MongoDB test server started: ${this.connectionUri}`);
      return this.connectionUri!;
    } catch (error) {
      this.log(`❌ Failed to start MongoDB test server: ${error}`);
      throw error;
    }
  }

  /**
   * Start MongoDB using memory server (fast, for local testing)
   */
  private async startMemoryMongoDB(): Promise<void> {
    const instanceConfig: Record<string, unknown> = {
      dbName: this.config.dbName,
    };

    // Only set port if explicitly provided
    if (this.config.port) {
      instanceConfig.port = this.config.port;
    }

    this.memoryServer = await MongoMemoryServer.create({
      instance: instanceConfig,
      binary: {
        version: this.config.mongoVersion,
      },
    });

    this.connectionUri = this.memoryServer.getUri();
  }

  /**
   * Start MongoDB using Docker container (production-like, for CI)
   */
  private async startDockerMongoDB(): Promise<void> {
    this.dockerContainer = await new MongoDBContainer(`mongo:${this.config.mongoVersion}`)
      .withExposedPorts(27017)
      .start();

    this.connectionUri = this.dockerContainer.getConnectionString();
  }

  /**
   * Get MongoDB client instance
   */
  async getClient(): Promise<MongoClient> {
    if (!this.isStarted) {
      await this.start();
    }

    if (!this.client) {
      this.client = new MongoClient(this.connectionUri!, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      await this.client.connect();
    }

    return this.client;
  }

  /**
   * Get connection URI
   */
  getUri(): string {
    if (!this.connectionUri) {
      throw new Error('MongoDB test server not started. Call start() first.');
    }
    return this.connectionUri;
  }

  /**
   * Get database instance
   */
  async getDatabase(dbName?: string): Promise<Db> {
    const client = await this.getClient();
    return client.db(dbName || this.config.dbName);
  }

  /**
   * Clear all data in the database
   */
  async clearDatabase(): Promise<void> {
    const db = await this.getDatabase();
    const collections = await db.collections();

    await Promise.all(
      collections.map(async (collection) => {
        try {
          await collection.deleteMany({});
          this.log(`🧹 Cleared collection: ${collection.collectionName}`);
        } catch (error) {
          this.log(`❌ Failed to clear collection ${collection.collectionName}: ${error}`);
        }
      })
    );
  }

  /**
   * Drop the entire database
   */
  async dropDatabase(): Promise<void> {
    const db = await this.getDatabase();
    await db.dropDatabase();
    this.log(`🗑️ Dropped database: ${this.config.dbName}`);
  }

  /**
   * Create indexes for better test performance
   */
  async createIndexes(): Promise<void> {
    const db = await this.getDatabase();

    // Create indexes for users collection
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { sparse: true, unique: true });
    await usersCollection.createIndex({ createdAt: -1 });

    // Create indexes for projects collection
    const projectsCollection = db.collection('projects');
    await projectsCollection.createIndex({ userId: 1 });
    await projectsCollection.createIndex({ createdAt: -1 });
    await projectsCollection.createIndex({ userId: 1, createdAt: -1 });

    this.log('📍 Created database indexes');
  }

  /**
   * Stop the MongoDB test server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      // Close client connection
      if (this.client) {
        await this.client.close();
        this.client = undefined;
      }

      // Stop the server
      if (this.memoryServer) {
        await this.memoryServer.stop();
        this.memoryServer = undefined;
      }

      if (this.dockerContainer) {
        await this.dockerContainer.stop();
        this.dockerContainer = undefined;
      }

      this.connectionUri = undefined;
      this.isStarted = false;
      this.log('✅ MongoDB test server stopped');
    } catch (error) {
      this.log(`❌ Error stopping MongoDB test server: ${error}`);
      throw error;
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[MongoDB Test Server] ${message}`);
    }
  }

  /**
   * Seed test data
   */
  async seedData(data: { collections: Record<string, unknown[]> }): Promise<void> {
    const db = await this.getDatabase();

    for (const [collectionName, documents] of Object.entries(data.collections)) {
      if (documents.length > 0) {
        const collection = db.collection(collectionName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await collection.insertMany(documents as any[]);
        this.log(`🌱 Seeded ${documents.length} documents into ${collectionName}`);
      }
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const db = await this.getDatabase();
    const collections = await db.collections();
    const stats: Record<string, number> = {};

    for (const collection of collections) {
      const count = await collection.countDocuments();
      stats[collection.collectionName] = count;
    }

    return stats;
  }
}

// Singleton instance for global test setup
let globalTestServer: MongoDBTestServer | null = null;

/**
 * Get or create global test server instance
 */
export function getGlobalTestServer(config?: TestServerConfig): MongoDBTestServer {
  if (!globalTestServer) {
    globalTestServer = new MongoDBTestServer(config);
  }
  return globalTestServer;
}

/**
 * Clean up global test server
 */
export async function cleanupGlobalTestServer(): Promise<void> {
  if (globalTestServer) {
    await globalTestServer.stop();
    globalTestServer = null;
  }
}
