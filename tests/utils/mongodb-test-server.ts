import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient, Db } from 'mongodb';

export interface TestServerConfig {
  useDocker?: boolean;
  dbName?: string;
  port?: number;
  mongoVersion?: string;
  enableLogging?: boolean;
  useReplSet?: boolean; // Use replica set for transaction support
  workerId?: string; // Worker ID for database isolation
  sharedInstance?: boolean; // Use shared replica set instance
  maxConnections?: number; // Max connections in pool
  timeoutMs?: number; // Connection timeout
}

export class MongoDBTestServer {
  private memoryServer?: MongoMemoryServer;
  private memoryReplSet?: MongoMemoryReplSet;
  private dockerContainer?: StartedMongoDBContainer;
  private client?: MongoClient;
  private connectionUri?: string;
  private config: TestServerConfig;
  private isStarted = false;

  constructor(config: TestServerConfig = {}) {
    this.config = {
      useDocker: config.useDocker === true, // Only use Docker if explicitly requested
      dbName: config.dbName || this.generateWorkerDbName(config.workerId),
      port: config.port, // Don't set default port, let MongoDB choose
      mongoVersion: config.mongoVersion || '7.0.14',
      enableLogging: config.enableLogging || process.env.DEBUG === 'true',
      useReplSet: config.useReplSet !== false, // Default to true for transaction support
      workerId: config.workerId,
      sharedInstance: config.sharedInstance !== false, // Default to true for shared instance
    };
  }

  /**
   * Generate worker-specific database name for isolation
   */
  private generateWorkerDbName(workerId?: string): string {
    const baseDbName = 'iwe-test';
    
    if (!workerId) {
      // Try to detect worker ID from various sources
      workerId = 
        process.env.TEST_WORKER_INDEX || 
        process.env.PLAYWRIGHT_WORKER_INDEX ||
        process.env.VITEST_WORKER_ID ||
        process.env.JEST_WORKER_ID ||
        'default';
    }
    
    // Clean and format worker ID for database name (make it deterministic for same worker)
    const cleanWorkerId = workerId.toString().replace(/[^a-zA-Z0-9]/g, '_');
    
    // Use a consistent identifier for the same worker across test runs
    // This ensures each worker always gets the same database name
    const workerHash = require('crypto').createHash('md5').update(`${cleanWorkerId}-${process.env.CI || 'local'}`).digest('hex').slice(0, 8);
    
    return `${baseDbName}_w${cleanWorkerId}_${workerHash}`;
  }

  /**
   * Start the MongoDB test server (uses shared replica set if configured)
   */
  async start(): Promise<string> {
    if (this.isStarted) {
      return this.connectionUri!;
    }

    try {
      if (this.config.sharedInstance && this.config.useReplSet && !this.config.useDocker) {
        // Use shared replica set instance
        this.connectionUri = await startSharedReplicaSet(this.config);
        this.log(`✅ Using shared MongoDB replica set: ${this.connectionUri}`);
      } else if (this.config.useDocker) {
        await this.startDockerMongoDB();
      } else {
        await this.startMemoryMongoDB();
      }

      this.isStarted = true;
      
      if (!this.config.sharedInstance) {
        this.log(`✅ MongoDB test server started: ${this.connectionUri}`);
      }
      
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
    if (this.config.useReplSet) {
      // Use replica set for transaction support with optimized configuration
      this.memoryReplSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1, // Single node replica set is sufficient for testing
          dbName: this.config.dbName,
          storageEngine: 'wiredTiger',
          // Optimize replica set configuration for testing
          configSettings: {
            // Reduce election timeout for faster startup
            electionTimeoutMillis: 500,
            // Reduce heartbeat interval
            heartbeatIntervalMillis: 500,
            // Reduce step down time
            heartbeatTimeoutSecs: 1,
          },
        },
        binary: {
          version: this.config.mongoVersion,
          // Add startup options for faster initialization
          downloadDir: process.env.MONGOMS_DOWNLOAD_DIR,
        },
        instanceOpts: [{
          // Optimize for testing performance
          args: [
            '--nojournal', // Disable journaling for speed (test data is ephemeral)
            '--syncdelay', '0', // Disable sync delay
            '--noprealloc', // Don't preallocate data files
            '--smallfiles', // Use smaller data files
          ],
        }],
      });

      this.connectionUri = this.memoryReplSet.getUri();
    } else {
      // Use single server (no transaction support)
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
   * Get MongoDB client instance with optimized connection settings
   */
  async getClient(): Promise<MongoClient> {
    if (!this.isStarted) {
      await this.start();
    }

    if (!this.client) {
      this.client = new MongoClient(this.connectionUri!, {
        // Optimize connection pool for parallel testing
        maxPoolSize: this.config.maxConnections || (process.env.CI ? 6 : 10), // Lower pool size in CI
        minPoolSize: 1, // Reduce minimum connections to save resources
        maxIdleTimeMS: 10000, // Close idle connections faster in tests
        serverSelectionTimeoutMS: this.config.timeoutMs || (process.env.CI ? 15000 : 10000), // Longer timeout in CI
        socketTimeoutMS: 15000, // Socket timeout
        connectTimeoutMS: this.config.timeoutMs || (process.env.CI ? 15000 : 10000), // Connection timeout
        heartbeatFrequencyMS: 10000, // Less frequent heartbeats to reduce load
        maxConnecting: 2, // Limit concurrent connection attempts for parallel workers
        // Optimize for replica set
        retryWrites: true,
        retryReads: true,
        readPreference: 'primary',
        // Fast operations
        // bufferMaxEntries: 0, // Property may not exist in all MongoDB driver versions
        // Improve connection efficiency
        compressors: ['snappy'],
        // Additional optimizations for parallel execution
        waitQueueTimeoutMS: 5000, // Don't wait too long for connections
        monitorCommands: false, // Disable command monitoring for performance
        // Connection optimizations
        // keepAlive and related options may vary by driver version
      });
      
      // Connect with retry logic for better reliability in parallel execution
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.client.connect();
          break;
        } catch (error: unknown) {
          lastError = error;
          this.log(`Connection attempt ${attempt} failed: ${String(error)}`);
          
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          // Wait before retry, with exponential backoff
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
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
   * Clear all data in the database with optimized operations
   */
  async clearDatabase(): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      // Use more efficient approach: drop and recreate collections
      const collections = await db.collections();
      
      if (collections.length === 0) {
        return; // No collections to clear
      }

      // Use bulk operations for better performance with timeout protection
      const dropPromises = collections.map(async (collection) => {
        try {
          // Add timeout to prevent hanging
          const dropPromise = collection.drop();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Drop timeout')), 3000)
          );
          
          await Promise.race([dropPromise, timeoutPromise]);
          this.log(`🧹 Dropped collection: ${collection.collectionName}`);
        } catch (error: unknown) {
          // Ignore 'ns not found' errors (collection already dropped) and timeout errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('ns not found') && !errorMessage.includes('timeout')) {
            this.log(`❌ Failed to drop collection ${collection.collectionName}: ${String(error)}`);
          }
        }
      });
      
      // Add overall timeout for all drop operations
      try {
        await Promise.race([
          Promise.all(dropPromises),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Bulk drop timeout')), 10000))
        ]);
      } catch (error: unknown) {
        this.log(`⚠️ Some collections may not have been dropped: ${String(error)}`);
      }
      
      // Recreate indexes after clearing (in background to not slow down tests)
      this.createIndexes().catch(error => {
        this.log(`⚠️ Index creation warning: ${String(error)}`);
      });
    } catch (error) {
      this.log(`❌ Failed to clear database: ${error}`);
      throw error;
    }
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
   * Create indexes for better test performance with error handling and timeout protection
   */
  async createIndexes(): Promise<void> {
    const db = await this.getDatabase();

    try {
      // Create indexes with background option for better performance
      const indexOperations = [
        // Users collection indexes
        {
          collection: 'users',
          indexes: [
            { key: { email: 1 } as const, options: { unique: true, background: true } },
            { key: { username: 1 } as const, options: { sparse: true, unique: true, background: true } },
            { key: { createdAt: -1 } as const, options: { background: true } },
          ],
        },
        // Projects collection indexes
        {
          collection: 'projects', 
          indexes: [
            { key: { userId: 1 } as const, options: { background: true } },
            { key: { createdAt: -1 } as const, options: { background: true } },
            { key: { userId: 1, createdAt: -1 } as const, options: { background: true } },
          ],
        },
      ];

      const indexPromises = indexOperations.map(async ({ collection: collectionName, indexes }) => {
        const collection = db.collection(collectionName);
        
        const collectionIndexPromises = indexes.map(async ({ key, options }) => {
          try {
            const indexPromise = collection.createIndex(key as any, options);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Index creation timeout')), 5000)
            );
            
            await Promise.race([indexPromise, timeoutPromise]);
          } catch (error) {
            // Ignore index already exists errors and timeout errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('already exists') && !errorMessage.includes('timeout')) {
              this.log(`⚠️ Index creation warning for ${collectionName}: ${String(error)}`);
            }
          }
        });
        
        await Promise.all(collectionIndexPromises);
      });

      // Add overall timeout for all index operations
      try {
        await Promise.race([
          Promise.all(indexPromises),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Index creation timeout')), 15000))
        ]);
        this.log('📍 Created database indexes');
      } catch (error) {
        this.log(`⚠️ Index creation completed with warnings: ${error}`);
        // Don't throw - indexes are optimization, not critical for tests
      }
    } catch (error) {
      this.log(`❌ Failed to create indexes: ${error}`);
      // Don't throw - indexes are optimization, not critical for tests
    }
  }

  /**
   * Stop the MongoDB test server (handles shared instances properly)
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      // Close client connection with timeout to prevent hanging
      if (this.client) {
        const closePromise = this.client.close();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Client close timeout')), 5000)
        );
        
        try {
          await Promise.race([closePromise, timeoutPromise]);
        } catch (error) {
          this.log(`⚠️ Client close warning: ${error}`);
          // Force close by setting to undefined
        }
        this.client = undefined;
      }

      // Only stop individual server instances, not shared replica set
      if (this.memoryServer) {
        await this.memoryServer.stop();
        this.memoryServer = undefined;
      }

      // Don't stop shared replica set from worker instances
      if (this.memoryReplSet && !this.config.sharedInstance) {
        await this.memoryReplSet.stop();
        this.memoryReplSet = undefined;
      }

      if (this.dockerContainer) {
        await this.dockerContainer.stop();
        this.dockerContainer = undefined;
      }

      this.connectionUri = undefined;
      this.isStarted = false;
      
      if (!this.config.sharedInstance) {
        this.log('✅ MongoDB test server stopped');
      }
    } catch (error) {
      this.log(`❌ Error stopping MongoDB test server: ${error}`);
      // Don't throw to prevent test failures during cleanup
      console.warn('MongoDB test server stop error:', error);
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

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Shared replica set instance for all workers
let sharedReplicaSet: MongoMemoryReplSet | null = null;
let sharedReplicaSetUri: string | null = null;
let replicaSetStartupPromise: Promise<string> | null = null;

// Worker-specific test server instances
const workerTestServers = new Map<string, MongoDBTestServer>();

// Coordination files for process synchronization
const COORDINATION_DIR = path.join(os.tmpdir(), 'iwe-test-coordination');
const REPLICA_SET_LOCK_FILE = path.join(COORDINATION_DIR, 'replica-set.lock');
const REPLICA_SET_URI_FILE = path.join(COORDINATION_DIR, 'replica-set.uri');
const REPLICA_SET_READY_FILE = path.join(COORDINATION_DIR, 'replica-set.ready');

/**
 * Ensure coordination directory exists
 */
function ensureCoordinationDir(): void {
  if (!fs.existsSync(COORDINATION_DIR)) {
    fs.mkdirSync(COORDINATION_DIR, { recursive: true });
  }
}

/**
 * Wait for replica set to be ready with file-based coordination
 */
async function waitForSharedReplicaSet(timeoutMs: number = 60000): Promise<string> {
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(REPLICA_SET_READY_FILE) && fs.existsSync(REPLICA_SET_URI_FILE)) {
      try {
        const uri = fs.readFileSync(REPLICA_SET_URI_FILE, 'utf8').trim();
        if (uri) {
          return uri;
        }
      } catch (error) {
        // File might be being written, continue waiting
      }
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Shared replica set not ready within ${timeoutMs}ms`);
}

/**
 * Start shared replica set instance with file-based coordination (called once globally)
 */
async function startSharedReplicaSet(config: TestServerConfig = {}): Promise<string> {
  // If we already have the URI in memory, return it
  if (sharedReplicaSetUri) {
    return sharedReplicaSetUri;
  }

  ensureCoordinationDir();
  
  // Check if another process already has the replica set ready
  if (fs.existsSync(REPLICA_SET_READY_FILE) && fs.existsSync(REPLICA_SET_URI_FILE)) {
    try {
      const uri = fs.readFileSync(REPLICA_SET_URI_FILE, 'utf8').trim();
      if (uri) {
        sharedReplicaSetUri = uri;
        return uri;
      }
    } catch (error) {
      // File might be corrupted, continue with startup
    }
  }

  // If we already have a startup promise, wait for it
  if (replicaSetStartupPromise) {
    return replicaSetStartupPromise;
  }

  replicaSetStartupPromise = (async () => {
    const enableLogging = config.enableLogging || process.env.DEBUG === 'true';
    
    // Try to acquire lock for replica set startup
    let lockAcquired = false;
    try {
      // Use exclusive file creation as atomic lock
      fs.writeFileSync(REPLICA_SET_LOCK_FILE, process.pid.toString(), { flag: 'wx' });
      lockAcquired = true;
      
      if (enableLogging) {
        console.log(`🔒 Process ${process.pid} acquired replica set startup lock`);
      }
    } catch (error) {
      // Lock already held by another process, wait for replica set to be ready
      if (enableLogging) {
        console.log(`⏳ Process ${process.pid} waiting for shared replica set...`);
      }
      return waitForSharedReplicaSet();
    }

    try {
      if (enableLogging) {
        console.log('🏁 Starting shared MongoDB replica set for parallel testing...');
      }

      // Clean up any stale coordination files
      [REPLICA_SET_URI_FILE, REPLICA_SET_READY_FILE].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      // Optimized replica set configuration for parallel testing
      sharedReplicaSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1, // Single node replica set is sufficient for testing
          dbName: 'iwe-test-shared', // Shared replica set, workers use different databases
          storageEngine: 'wiredTiger',
          configSettings: {
            // Optimized timings for test environments
            electionTimeoutMillis: 1000, // Faster election for tests
            heartbeatIntervalMillis: 500, // Faster heartbeat
            heartbeatTimeoutSecs: 1, // Quick timeout
            catchUpTimeoutMillis: 1000, // Faster catch-up
            // Optimize for parallel access
            // maxIncomingConnections: 200, // Allow more connections (property may not exist in all versions)
          },
        },
        binary: {
          version: config.mongoVersion || '7.0.14',
          downloadDir: process.env.MONGOMS_DOWNLOAD_DIR,
          // Note: downloadURL property name may vary between versions
        },
        instanceOpts: [{
          // Optimized MongoDB arguments for testing
          args: [
            '--nojournal', // Disable journaling for speed (test data is ephemeral)
            '--syncdelay', '0', // Disable sync delay
            '--noprealloc', // Don't preallocate data files
            '--smallfiles', // Use smaller data files
            '--oplogSize', '16', // Smaller oplog for tests
            '--wiredTigerCacheSizeGB', '0.2', // Slightly larger cache for parallel workers
            '--wiredTigerCollectionBlockCompressor', 'snappy', // Fast compression
            '--setParameter', 'enableTestCommands=1', // Enable test commands
            '--setParameter', 'failIndexKeyTooLong=false', // Relax index limits
            '--setParameter', 'maxConnections=200', // Support parallel workers
          ],
          // Basic instance configuration
          port: undefined, // Let MongoDB choose available port
          // ip: '127.0.0.1', // Bind to localhost (property may not exist in all versions)
        }],
      });

      sharedReplicaSetUri = sharedReplicaSet.getUri();
      
      // Write URI to coordination file
      fs.writeFileSync(REPLICA_SET_URI_FILE, sharedReplicaSetUri, 'utf8');
      
      // Mark replica set as ready
      fs.writeFileSync(REPLICA_SET_READY_FILE, Date.now().toString(), 'utf8');
      
      if (enableLogging) {
        console.log(`✅ Shared MongoDB replica set ready for ${process.env.CI ? 'CI' : 'local'} testing: ${sharedReplicaSetUri}`);
      }
      
      return sharedReplicaSetUri;
    } finally {
      // Always release the lock
      if (lockAcquired && fs.existsSync(REPLICA_SET_LOCK_FILE)) {
        try {
          fs.unlinkSync(REPLICA_SET_LOCK_FILE);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  })();

  return replicaSetStartupPromise;
}

/**
 * Get or create worker-specific test server instance
 */
export function getGlobalTestServer(config?: TestServerConfig): MongoDBTestServer {
  const workerId = config?.workerId || 
    process.env.TEST_WORKER_INDEX ||
    process.env.PLAYWRIGHT_WORKER_INDEX ||
    process.env.VITEST_WORKER_ID ||
    process.env.JEST_WORKER_ID ||
    'default';

  const workerKey = `worker_${workerId}`;
  
  if (!workerTestServers.has(workerKey)) {
    const serverConfig = {
      // Default optimizations for test environment
      maxConnections: process.env.CI ? 6 : 8, // Slightly lower in CI to reduce resource contention
      timeoutMs: process.env.CI ? 10000 : 8000, // More generous timeout in CI
      useReplSet: true, // Always use replica set for transaction support
      sharedInstance: true, // Use shared replica set
      enableLogging: config?.enableLogging || process.env.DEBUG === 'true',
      // Override with user config
      ...config,
      workerId,
    };
    
    workerTestServers.set(workerKey, new MongoDBTestServer(serverConfig));
  }
  
  return workerTestServers.get(workerKey)!;
}

/**
 * Get shared replica set URI (starts it if needed)
 */
export async function getSharedReplicaSetUri(config?: TestServerConfig): Promise<string> {
  return startSharedReplicaSet(config);
}

/**
 * Clean up worker-specific test server
 */
export async function cleanupWorkerTestServer(workerId?: string): Promise<void> {
  const actualWorkerId = workerId || 
    process.env.TEST_WORKER_INDEX ||
    process.env.PLAYWRIGHT_WORKER_INDEX ||
    process.env.VITEST_WORKER_ID ||
    'default';
    
  const workerKey = `worker_${actualWorkerId}`;
  const server = workerTestServers.get(workerKey);
  
  if (server) {
    await server.stop();
    workerTestServers.delete(workerKey);
  }
}

/**
 * Clean up global test server (legacy compatibility)
 */
export async function cleanupGlobalTestServer(): Promise<void> {
  // Clean up all worker servers with timeout protection
  const cleanupPromises = Array.from(workerTestServers.entries()).map(
    async ([workerKey, server]) => {
      try {
        const cleanupPromise = server.stop();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server stop timeout')), 5000)
        );
        await Promise.race([cleanupPromise, timeoutPromise]);
      } catch (error) {
        console.warn(`Failed to stop worker server ${workerKey}:`, error);
      }
    }
  );
  
  // Use timeout for all cleanup operations
  try {
    await Promise.race([
      Promise.all(cleanupPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 10000))
    ]);
  } catch (error) {
    console.warn('Worker cleanup timeout:', error);
  }
  
  workerTestServers.clear();
  
  // Clean up shared replica set (only in main process or when explicitly requested)
  const isMainProcess = process.env.TEST_WORKER_INDEX === '0' || 
                       process.env.TEST_WORKER_INDEX === undefined ||
                       process.env.PLAYWRIGHT_TEARDOWN === 'true';
  
  if (sharedReplicaSet && isMainProcess) {
    try {
      console.log('🛑 Stopping shared MongoDB replica set...');
      const stopPromise = sharedReplicaSet.stop();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Replica set stop timeout')), 10000)
      );
      
      await Promise.race([stopPromise, timeoutPromise]);
      
      sharedReplicaSet = null;
      sharedReplicaSetUri = null;
      replicaSetStartupPromise = null;
      
      // Clean up coordination files
      try {
        [REPLICA_SET_LOCK_FILE, REPLICA_SET_URI_FILE, REPLICA_SET_READY_FILE].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      } catch (error) {
        // Ignore file cleanup errors
      }
      
      console.log('✅ Shared MongoDB replica set stopped');
    } catch (error) {
      console.warn('❌ Failed to stop shared replica set:', error);
      // Force cleanup of global state even if stop failed
      sharedReplicaSet = null;
      sharedReplicaSetUri = null;
      replicaSetStartupPromise = null;
    }
  }
}
