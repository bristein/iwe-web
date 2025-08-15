import { test, expect } from '@playwright/test';
import {
  DatabaseTestHelpers,
  TestAssertions,
  ApiDatabaseHelpers,
  PerformanceHelpers,
  DebugHelpers,
} from '../utils/test-helpers';
import { TestDataFactory, TestDataSeeder } from '../utils/test-data-factory';
import { DatabaseReset } from '../utils/db-reset';

/**
 * Example test suite demonstrating MongoDB test server capabilities
 *
 * This file shows various patterns and utilities available for testing
 * with the automatic MongoDB test server infrastructure.
 */

test.describe('MongoDB Test Server Examples', () => {
  test.beforeEach(async () => {
    // Database is automatically reset by global setup
    // But you can also reset manually if needed
    await DatabaseReset.resetToCleanState();
  });

  test('direct database operations', async () => {
    // Insert user directly into database
    await DatabaseTestHelpers.insertUser({
      email: 'direct-test@example.com',
      name: 'Direct Test User',
      role: 'admin',
    });

    // Verify user exists
    await TestAssertions.assertUserExists('direct-test@example.com', {
      name: 'Direct Test User',
      role: 'admin',
    });

    // Update user
    await DatabaseTestHelpers.updateUser('direct-test@example.com', {
      name: 'Updated Name',
    });

    // Verify update
    const updated = await DatabaseTestHelpers.findUserByEmail('direct-test@example.com');
    expect(updated?.name).toBe('Updated Name');

    // Delete user
    await DatabaseTestHelpers.deleteUser('direct-test@example.com');

    // Verify deletion
    await TestAssertions.assertUserNotExists('direct-test@example.com');
  });

  test('test data factory usage', async () => {
    // Create test users with factory
    const users = await TestDataFactory.createUsers(5, {
      role: 'user',
    });

    // Insert them into database
    for (const user of users) {
      await DatabaseTestHelpers.insertUser(user);
    }

    // Verify count
    const count = await DatabaseTestHelpers.getUserCount();
    expect(count).toBe(5);

    // Create a complete scenario
    const scenario = await TestDataFactory.createScenario({
      userCount: 3,
      projectsPerUser: 2,
    });

    expect(scenario.users).toHaveLength(3);
    expect(scenario.projects).toHaveLength(6);
  });

  test('API testing with database verification', async ({ page }) => {
    // Create test data
    const authData = TestDataFactory.createAuthData();

    // Sign up via API and verify in database
    const signupResult = await ApiDatabaseHelpers.signupAndVerify(page, {
      email: authData.email,
      password: authData.password,
      name: authData.name,
    });

    expect(signupResult.user.email).toBe(authData.email);

    // Login and get token
    const { token } = await ApiDatabaseHelpers.loginAndVerify(page, {
      email: authData.email,
      password: authData.password,
    });

    expect(token).toBeTruthy();

    // Verify user projects (should be empty)
    const projects = await DatabaseTestHelpers.getUserProjects(signupResult.user._id);
    expect(projects).toHaveLength(0);
  });

  test('database reset and snapshots', async () => {
    // Seed some data
    const seedData = await TestDataSeeder.seedBasicData();
    const { getGlobalTestServer } = await import('../utils/mongodb-test-server');
    const testServer = getGlobalTestServer();
    await testServer.seedData(seedData);

    // Verify seeded data exists
    let userCount = await DatabaseTestHelpers.getUserCount();
    expect(userCount).toBeGreaterThan(0);

    // Create snapshot
    const snapshot = await DatabaseReset.createSnapshot();

    // Clear database
    await DatabaseReset.resetToCleanState();
    userCount = await DatabaseTestHelpers.getUserCount();
    expect(userCount).toBe(0);

    // Restore snapshot
    await DatabaseReset.restoreSnapshot(snapshot);
    userCount = await DatabaseTestHelpers.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });

  test('transaction-like test execution', async () => {
    // Initial state
    const initialCount = await DatabaseTestHelpers.getUserCount();

    // Run operations in transaction (will be rolled back)
    await DatabaseReset.runInTransaction(async () => {
      // Add users
      await DatabaseTestHelpers.insertUsers(10);

      // Verify they exist during transaction
      const count = await DatabaseTestHelpers.getUserCount();
      expect(count).toBe(initialCount + 10);
    });

    // Verify rollback - count should be same as initial
    const finalCount = await DatabaseTestHelpers.getUserCount();
    expect(finalCount).toBe(initialCount);
  });

  test('performance testing', async () => {
    // Measure single operation
    const { duration: singleDuration } = await PerformanceHelpers.measureOperation(async () => {
      await DatabaseTestHelpers.insertUser({
        email: 'perf-test@example.com',
      });
    }, 'Insert single user');

    expect(singleDuration).toBeLessThan(100); // Should be fast

    // Measure batch operations
    const { duration: batchDuration } = await PerformanceHelpers.measureOperation(async () => {
      await DatabaseTestHelpers.insertUsers(50);
    }, 'Insert 50 users');

    expect(batchDuration).toBeLessThan(1000); // Should complete in 1 second

    // Test concurrent operations
    const operations = Array(10)
      .fill(null)
      .map(
        (_, i) => () => DatabaseTestHelpers.insertUser({ email: `concurrent-${i}@example.com` })
      );

    const results = await PerformanceHelpers.runConcurrent(
      operations,
      'Insert 10 users concurrently'
    );

    expect(results).toHaveLength(10);
  });

  test('debugging utilities', async () => {
    // Skip in CI to avoid noise
    if (process.env.CI) {
      test.skip();
    }

    // Dump initial state
    await DebugHelpers.dumpDatabase('Initial State');

    // Add some test data
    await DatabaseTestHelpers.insertUsers(3);
    await DebugHelpers.dumpDatabase('After Adding Users');

    // Dump specific collection
    await DebugHelpers.dumpCollection('users', 2);

    // Note: watchCollection would block, so skip in automated tests
    // await DebugHelpers.watchCollection('users', 2000);
  });

  test('collection assertions', async () => {
    // Start with empty database
    await TestAssertions.assertDatabaseEmpty();

    // Add specific number of users
    await DatabaseTestHelpers.insertUsers(5);
    await TestAssertions.assertCollectionCount('users', 5);

    // Add projects
    const user = await DatabaseTestHelpers.findUserByEmail(
      (await DatabaseTestHelpers.insertUser()).email
    );
    await DatabaseTestHelpers.insertProject(user!._id!, { title: 'Test Project' });

    await TestAssertions.assertCollectionCount('projects', 1);
  });

  test('large payload testing', async ({ page }) => {
    // Create large payload (should fail with 413)
    const largePayload = TestDataFactory.createLargePayload(6); // 6MB

    const response = await page.request.post('/api/auth/signup', {
      data: largePayload,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(413); // Payload Too Large
  });

  test('seeded data scenarios', async () => {
    // Seed basic data
    const basicData = await TestDataSeeder.seedBasicData();
    const { getGlobalTestServer } = await import('../utils/mongodb-test-server');
    const testServer = getGlobalTestServer();
    await testServer.seedData(basicData);

    // Verify admin user exists
    await TestAssertions.assertUserExists('admin@example.com', {
      name: 'Admin User',
      role: 'admin',
    });

    // Verify regular user and their projects
    const regularUser = await DatabaseTestHelpers.findUserByEmail('user@example.com');
    expect(regularUser).toBeTruthy();

    const projects = await DatabaseTestHelpers.getUserProjects(regularUser!._id!);
    expect(projects).toHaveLength(2);
    expect(projects[0].title).toBe('The Great Adventure');
  });
});

/**
 * Example using custom test with automatic database reset
 */
import { test as resetTest } from '../utils/db-reset';

resetTest.describe('Tests with automatic reset', () => {
  // These tests automatically get database reset before each test

  resetTest('test 1 with clean database', async ({ db }) => {
    // Database is clean
    const stats = await db.getStats();
    expect(Object.values(stats).every((count) => count === 0)).toBe(true);

    // Add some data
    await db.seedData({
      collections: {
        users: [{ email: 'test1@example.com', name: 'Test 1' }],
      },
    });

    const newStats = await db.getStats();
    expect(newStats.users).toBe(1);
  });

  resetTest('test 2 also has clean database', async ({ db }) => {
    // Database is clean again (previous test data gone)
    const stats = await db.getStats();
    expect(Object.values(stats).every((count) => count === 0)).toBe(true);

    // This test has its own clean state
    await db.resetWithSeed(); // Reset and add seed data

    const newStats = await db.getStats();
    expect(newStats.users).toBeGreaterThan(0);
  });
});
