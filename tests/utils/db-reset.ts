import { test as base } from '@playwright/test';
import { getGlobalTestServer } from './mongodb-test-server';
import { TestDataSeeder } from './test-data-factory';

/**
 * Database reset utilities for test isolation
 */
export class DatabaseReset {
  private static testServer = getGlobalTestServer();

  /**
   * Reset database to clean state
   */
  static async resetToCleanState() {
    const server = this.testServer;
    if (!server.isRunning()) {
      await server.start();
    }

    // Clear all data
    await server.clearDatabase();

    // Recreate indexes
    await server.createIndexes();
  }

  /**
   * Reset with basic seed data
   */
  static async resetWithSeedData() {
    await this.resetToCleanState();

    // Seed basic data
    const seedData = await TestDataSeeder.seedBasicData();
    await this.testServer.seedData(seedData);
  }

  /**
   * Reset specific collections only
   */
  static async resetCollections(collectionNames: string[]) {
    const db = await this.testServer.getDatabase();

    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      await collection.deleteMany({});
      console.log(`🧹 Reset collection: ${collectionName}`);
    }
  }

  /**
   * Create a database snapshot for rollback
   */
  static async createSnapshot(): Promise<DatabaseSnapshot> {
    const db = await this.testServer.getDatabase();
    const collections = await db.collections();
    const snapshot: DatabaseSnapshot = {};

    for (const collection of collections) {
      const data = await collection.find({}).toArray();
      snapshot[collection.collectionName] = data;
    }

    return snapshot;
  }

  /**
   * Restore database from snapshot
   */
  static async restoreSnapshot(snapshot: DatabaseSnapshot) {
    await this.testServer.clearDatabase();

    const db = await this.testServer.getDatabase();

    for (const [collectionName, documents] of Object.entries(snapshot)) {
      if (documents.length > 0) {
        const collection = db.collection(collectionName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await collection.insertMany(documents as any[]);
      }
    }
  }

  /**
   * Transaction-like test execution with automatic rollback
   */
  static async runInTransaction<T>(
    testFn: () => Promise<T>,
    options: { preserveData?: boolean } = {}
  ): Promise<T> {
    let snapshot: DatabaseSnapshot | null = null;

    if (!options.preserveData) {
      snapshot = await this.createSnapshot();
    }

    try {
      return await testFn();
    } finally {
      if (snapshot && !options.preserveData) {
        await this.restoreSnapshot(snapshot);
      }
    }
  }
}

/**
 * Type for database snapshots
 */
export interface DatabaseSnapshot {
  [collectionName: string]: unknown[];
}

/**
 * Playwright test with database reset
 */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const test = base.extend<any>({
  /**
   * Automatically reset database before each test
   */
  resetDatabase: [
    async (_context: unknown, use: any) => {
      // Reset before test
      await DatabaseReset.resetToCleanState();

      // Run test
      await use();

      // Optional: Clean up after test
      // await DatabaseReset.resetToCleanState();
    },
    { auto: true },
  ],

  /**
   * Provide database utilities to tests
   */

  db: async (_context: unknown, use: any) => {
    const testServer = getGlobalTestServer();
    const database = await testServer.getDatabase();

    await use({
      database,
      reset: DatabaseReset.resetToCleanState,
      resetWithSeed: DatabaseReset.resetWithSeedData,
      resetCollections: DatabaseReset.resetCollections,
      createSnapshot: DatabaseReset.createSnapshot,
      restoreSnapshot: DatabaseReset.restoreSnapshot,
      seedData: testServer.seedData.bind(testServer),
      getStats: testServer.getStats.bind(testServer),
    });
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

/**
 * Test-specific database helpers
 */
export class TestDatabaseHelpers {
  /**
   * Wait for database operation to complete
   */
  static async waitForDatabaseOperation(
    checkFn: () => Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await checkFn()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Database operation timed out');
  }

  /**
   * Verify collection exists and has expected count
   */
  static async verifyCollection(collectionName: string, expectedCount?: number): Promise<boolean> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const collection = db.collection(collectionName);

    const count = await collection.countDocuments();

    if (expectedCount !== undefined) {
      return count === expectedCount;
    }

    return count >= 0;
  }

  /**
   * Get direct database access for custom queries
   */
  static async getDirectAccess() {
    const testServer = getGlobalTestServer();
    const client = await testServer.getClient();
    const db = await testServer.getDatabase();

    return {
      client,
      db,
      users: db.collection('users'),
      projects: db.collection('projects'),
    };
  }

  /**
   * Clean up test data by pattern
   */
  static async cleanupByPattern(pattern: {
    email?: RegExp;
    username?: RegExp;
    createdAfter?: Date;
  }) {
    const { users } = await this.getDirectAccess();

    const filter: Record<string, unknown> = {};

    if (pattern.email) {
      filter.email = pattern.email;
    }

    if (pattern.username) {
      filter.username = pattern.username;
    }

    if (pattern.createdAfter) {
      filter.createdAt = { $gte: pattern.createdAfter };
    }

    const result = await users.deleteMany(filter);
    return result.deletedCount;
  }
}
