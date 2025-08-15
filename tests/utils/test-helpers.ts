import { Page, expect } from '@playwright/test';
import { getGlobalTestServer } from './mongodb-test-server';
import { TestDataFactory } from './test-data-factory';
import { ObjectId } from 'mongodb';
import { User } from '../../lib/models/user';

/**
 * Direct database access helpers for tests
 */
export class DatabaseTestHelpers {
  /**
   * Insert a user directly into the database
   */
  static async insertUser(userData: Partial<User> = {}): Promise<User> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    const user = await TestDataFactory.createUser(userData);
    await users.insertOne(user);

    return user;
  }

  /**
   * Insert multiple users directly
   */
  static async insertUsers(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    const userDocs = await TestDataFactory.createUsers(count, overrides);
    await users.insertMany(userDocs);

    return userDocs;
  }

  /**
   * Find a user by email
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    return (await users.findOne({ email })) as User | null;
  }

  /**
   * Update a user
   */
  static async updateUser(email: string, updates: Partial<User>): Promise<boolean> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    const result = await users.updateOne(
      { email },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete a user
   */
  static async deleteUser(email: string): Promise<boolean> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    const result = await users.deleteOne({ email });
    return result.deletedCount > 0;
  }

  /**
   * Insert a project directly
   */
  static async insertProject(userId: string | ObjectId, projectData: Record<string, unknown> = {}) {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const projects = db.collection('projects');

    const project = TestDataFactory.createProject(userId, projectData);
    await projects.insertOne(project);

    return project;
  }

  /**
   * Get all users count
   */
  static async getUserCount(): Promise<number> {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const users = db.collection('users');

    return await users.countDocuments();
  }

  /**
   * Get all projects for a user
   */
  static async getUserProjects(userId: string | ObjectId) {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const projects = db.collection('projects');

    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return await projects.find({ userId: userObjectId }).toArray();
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert user exists in database
   */
  static async assertUserExists(email: string, expectedData?: Partial<User>) {
    const user = await DatabaseTestHelpers.findUserByEmail(email);

    expect(user).toBeTruthy();
    expect(user!.email).toBe(email);

    if (expectedData) {
      Object.entries(expectedData).forEach(([key, value]) => {
        if (key !== 'password') {
          // Don't compare hashed passwords
          expect(user![key as keyof User]).toEqual(value);
        }
      });
    }
  }

  /**
   * Assert user does not exist
   */
  static async assertUserNotExists(email: string) {
    const user = await DatabaseTestHelpers.findUserByEmail(email);
    expect(user).toBeNull();
  }

  /**
   * Assert collection count
   */
  static async assertCollectionCount(collectionName: string, expectedCount: number) {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const collection = db.collection(collectionName);

    const count = await collection.countDocuments();
    expect(count).toBe(expectedCount);
  }

  /**
   * Assert database is empty
   */
  static async assertDatabaseEmpty() {
    const testServer = getGlobalTestServer();
    const stats = await testServer.getStats();

    Object.entries(stats).forEach(([collection, count]) => {
      expect(count).toBe(0);
    });
  }
}

/**
 * Performance testing helpers
 */
export class PerformanceHelpers {
  /**
   * Measure database operation time
   */
  static async measureOperation<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;

    console.log(`⏱️ ${label}: ${duration}ms`);

    return { result, duration };
  }

  /**
   * Run concurrent operations
   */
  static async runConcurrent<T>(operations: Array<() => Promise<T>>, label: string): Promise<T[]> {
    const start = Date.now();
    const results = await Promise.all(operations.map((op) => op()));
    const duration = Date.now() - start;

    console.log(`⏱️ ${label} (${operations.length} concurrent): ${duration}ms`);

    return results;
  }

  /**
   * Create load test scenario
   */
  static async createLoadTestScenario(options: {
    userCount: number;
    projectsPerUser: number;
    concurrent?: boolean;
  }) {
    const { userCount, projectsPerUser, concurrent = false } = options;

    if (concurrent) {
      const operations = [];
      for (let i = 0; i < userCount; i++) {
        operations.push(async () => {
          const user = await DatabaseTestHelpers.insertUser();
          for (let j = 0; j < projectsPerUser; j++) {
            await DatabaseTestHelpers.insertProject(user._id!);
          }
          return user;
        });
      }

      return await this.runConcurrent(operations, 'Load test scenario');
    } else {
      const users = [];
      for (let i = 0; i < userCount; i++) {
        const user = await DatabaseTestHelpers.insertUser();
        for (let j = 0; j < projectsPerUser; j++) {
          await DatabaseTestHelpers.insertProject(user._id!);
        }
        users.push(user);
      }
      return users;
    }
  }
}

/**
 * API testing helpers with database verification
 */
export class ApiDatabaseHelpers {
  /**
   * Sign up via API and verify in database
   */
  static async signupAndVerify(
    page: Page,
    userData: {
      email: string;
      password: string;
      name: string;
      username?: string;
    }
  ) {
    const response = await page.request.post('/api/auth/signup', {
      data: userData,
    });

    expect(response.status()).toBe(201);

    // Verify user was created in database
    await TestAssertions.assertUserExists(userData.email, {
      name: userData.name,
      username: userData.username,
      role: 'user',
    });

    return await response.json();
  }

  /**
   * Login via API and verify token
   */
  static async loginAndVerify(
    page: Page,
    credentials: {
      email: string;
      password: string;
    }
  ) {
    const response = await page.request.post('/api/auth/login', {
      data: credentials,
    });

    expect(response.status()).toBe(200);

    const cookies = await page.context().cookies();
    const authToken = cookies.find((c) => c.name === 'auth-token');
    expect(authToken).toBeTruthy();

    return { response: await response.json(), token: authToken?.value };
  }

  /**
   * Create authenticated context
   */
  static async createAuthenticatedContext(page: Page): Promise<{
    user: User;
    token: string;
  }> {
    const user = await DatabaseTestHelpers.insertUser();
    const plainPassword = 'Test123!@#';

    // Update user with known password
    await DatabaseTestHelpers.updateUser(user.email, {
      password: await TestDataFactory.createUser({ password: plainPassword }).then(
        (u) => u.password
      ),
    });

    const { token } = await this.loginAndVerify(page, {
      email: user.email,
      password: plainPassword,
    });

    return { user, token: token! };
  }
}

/**
 * Debug helpers for test development
 */
export class DebugHelpers {
  /**
   * Dump database state
   */
  static async dumpDatabase(label?: string) {
    const testServer = getGlobalTestServer();
    const stats = await testServer.getStats();

    console.log(`\n📊 Database State${label ? ` - ${label}` : ''}:`);
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} documents`);
    });
    console.log('');
  }

  /**
   * Dump specific collection
   */
  static async dumpCollection(collectionName: string, limit = 10) {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const collection = db.collection(collectionName);

    const documents = await collection.find({}).limit(limit).toArray();

    console.log(
      `\n📄 Collection: ${collectionName} (showing ${documents.length}/${await collection.countDocuments()} documents)`
    );
    documents.forEach((doc, index) => {
      console.log(`\n[${index + 1}]`, JSON.stringify(doc, null, 2));
    });
  }

  /**
   * Watch collection changes
   */
  static async watchCollection(collectionName: string, duration = 5000) {
    const testServer = getGlobalTestServer();
    const db = await testServer.getDatabase();
    const collection = db.collection(collectionName);

    console.log(`\n👁️ Watching collection: ${collectionName} for ${duration}ms`);

    const changeStream = collection.watch();

    changeStream.on('change', (change) => {
      console.log('Change detected:', change);
    });

    await new Promise((resolve) => setTimeout(resolve, duration));
    await changeStream.close();
  }
}
