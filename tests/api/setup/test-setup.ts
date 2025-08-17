import { beforeEach, afterEach } from 'vitest';
import { cleanupTestUsers } from '../../utils/db-cleanup';

/**
 * Test setup file that runs before each test file in Vitest
 * This handles per-test isolation and cleanup
 */

// Track test users for cleanup
const testUsers: string[] = [];

// Global test user tracking
beforeEach(() => {
  // Clear the test users array for each test
  testUsers.length = 0;
});

afterEach(async () => {
  // Clean up any test users created during the test
  if (testUsers.length > 0) {
    try {
      await cleanupTestUsers({ emails: testUsers });
    } catch (error) {
      console.warn('Warning: Failed to clean up test users:', error);
    }
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
  emails.forEach(email => {
    const index = testUsers.indexOf(email);
    if (index > -1) {
      testUsers.splice(index, 1);
    }
  });
}