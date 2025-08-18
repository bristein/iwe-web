import { beforeEach, afterEach } from 'vitest';
import { cleanupTestUsers } from '../../utils/db-cleanup';
import { getGlobalTestServer } from '../../utils/mongodb-test-server';

/**
 * Test setup file that runs before each test file in Vitest
 * This handles per-test isolation and cleanup
 */

// Track test users for cleanup
const testUsers: string[] = [];

// Global test user tracking and database cleanup
beforeEach(async () => {
  // Clear the test users array for each test
  testUsers.length = 0;

  // Clean the entire database before each test to ensure isolation
  try {
    const testServer = getGlobalTestServer();
    if (testServer.isRunning()) {
      await testServer.clearDatabase();
    }
  } catch (error) {
    console.warn('Warning: Failed to clear database before test:', error);
  }
});

afterEach(async () => {
  // Clean up any test users created during the test (backup cleanup)
  if (testUsers.length > 0) {
    try {
      await cleanupTestUsers({ emails: testUsers });
    } catch (error) {
      console.warn('Warning: Failed to clean up test users:', error);
    }
  }

  // Also do a final database clear to ensure no test data leaks
  try {
    const testServer = getGlobalTestServer();
    if (testServer.isRunning()) {
      await testServer.clearDatabase();
    }
  } catch (error) {
    console.warn('Warning: Failed to clear database after test:', error);
  }
});

/**
 * Helper function to register a test user for cleanup
 * Call this when creating test users to ensure they're cleaned up
 */
export function registerTestUser(email: string): void {
  if (!testUsers.includes(email)) {
    testUsers.push(email);
  }
}

/**
 * Helper function to get the current list of registered test users
 */
export function getRegisteredTestUsers(): string[] {
  return [...testUsers];
}

/**
 * Helper function to manually clean up specific users
 */
export async function cleanupSpecificUsers(emails: string[]): Promise<void> {
  await cleanupTestUsers({ emails });
  // Remove cleaned users from tracking
  emails.forEach((email) => {
    const index = testUsers.indexOf(email);
    if (index > -1) {
      testUsers.splice(index, 1);
    }
  });
}
