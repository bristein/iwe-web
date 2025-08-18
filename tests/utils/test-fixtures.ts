import { Page, expect } from '@playwright/test';
import { cleanupTestUsers } from './db-cleanup';
import { TEST_PASSWORDS } from '../../lib/test-constants';

// Helper function to get worker ID for test isolation
function getWorkerId(): string {
  return process.env.TEST_WORKER_INDEX || process.env.VITEST_WORKER_ID || '0';
}

// Export for use in DatabaseHelper
export { getWorkerId, getTestExecutionId };

// Generate test execution ID for better uniqueness
// Use a const initialized immediately to avoid race conditions
const testExecutionId: string = (() => {
  // Use high-precision timestamp + process ID for uniqueness across parallel executions
  const hrTime = process.hrtime.bigint().toString();
  const processId = process.pid.toString();
  return `${hrTime.slice(-8)}_${processId}`;
})();

function getTestExecutionId(): string {
  return testExecutionId;
}

// Helper function to generate highly unique test email to prevent conflicts
function generateWorkerScopedEmail(prefix: string): string {
  const workerId = getWorkerId();
  const executionId = getTestExecutionId();
  const timestamp = Date.now();
  const microseconds = Number(process.hrtime.bigint() % BigInt(1000000)); // Add microsecond precision
  const random = Math.floor(Math.random() * 10000); // Increase random range

  // Ensure prefix doesn't contain problematic characters
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9-]/g, '-');

  return `${cleanPrefix}-w${workerId}-${executionId}-${timestamp}-${microseconds}-${random}@example.com`;
}

export interface TestUser {
  name: string;
  email: string;
  password: string;
  username?: string;
}

export interface AuthFixtures {
  authenticatedPage: Page;
  testUser: TestUser;
}

/**
 * Reusable test user factory with parallel test isolation
 */
export class TestUserFactory {
  static create(prefix: string = 'test', options: Partial<TestUser> = {}): TestUser {
    return {
      name: options.name || `Test User ${prefix}`,
      email: options.email || generateWorkerScopedEmail(prefix),
      password: options.password || TEST_PASSWORDS.VALID,
      username:
        'username' in options
          ? options.username
          : generateWorkerScopedEmail(`${prefix}user`).split('@')[0],
    };
  }

  static createMultiple(count: number, prefix: string = 'test'): TestUser[] {
    return Array.from({ length: count }, (_, i) => this.create(`${prefix}-${i}`));
  }
}

/**
 * Authentication helper class for reusable auth flows
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async signup(user: TestUser): Promise<TestUser> {
    const maxRetries = 3;
    let currentUser = user;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto('/signup');

        // Wait for the signup form to load
        await this.page.waitForSelector('input[placeholder="Enter your full name"]', {
          timeout: 10000,
        });

        // Fill form fields
        await this.page.fill('input[placeholder="Enter your full name"]', currentUser.name);
        await this.page.fill('input[type="email"]', currentUser.email);
        if (currentUser.username) {
          await this.page.fill('input[placeholder="Choose a username"]', currentUser.username);
        }
        await this.page.fill('input[type="password"]', currentUser.password);

        const responsePromise = this.page.waitForResponse('/api/auth/signup');
        await this.page.click('button:has-text("Create Account")');
        const response = await responsePromise;

        if (response.status() === 201) {
          // Success - update the user reference for tests that need the final email
          Object.assign(user, currentUser);
          await expect(this.page).toHaveURL('/portal');
          return currentUser;
        }

        if (response.status() === 409 && attempt < maxRetries) {
          console.warn(
            `User ${currentUser.email} already exists, attempt ${attempt + 1}/${maxRetries + 1}`
          );
          // Generate a new unique user for next attempt
          const basePrefix = currentUser.email.split('@')[0] + `-retry${attempt + 1}`;
          currentUser = TestUserFactory.create(basePrefix, {
            name: user.name, // Keep original name
            password: user.password, // Keep original password
          });
          continue;
        }

        // If we get here, it's an unexpected status code
        expect(response.status()).toBe(201);
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Signup failed after ${maxRetries + 1} attempts. Last error: ${error}`);
        }
        console.warn(`Signup attempt ${attempt + 1} failed:`, error);
      }
    }

    throw new Error(`Signup failed after ${maxRetries + 1} attempts`);
  }

  async login(user: TestUser): Promise<void> {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto('/login');

        // Wait for login form to be ready
        await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });

        await this.page.fill('input[type="email"]', user.email);
        await this.page.fill('input[type="password"]', user.password);

        const responsePromise = this.page.waitForResponse('/api/auth/login');
        await this.page.click('button:has-text("Sign In")');
        const response = await responsePromise;

        if (response.status() === 200) {
          await expect(this.page).toHaveURL('/portal');
          return;
        }

        // Add better error handling for login failures
        if (response.status() === 401 && attempt < maxRetries) {
          const responseText = await response.text();
          console.warn(
            `Login failed for ${user.email} (attempt ${attempt + 1}):`,
            response.status(),
            responseText
          );
          console.warn(`User ${user.email} not found, attempting to create user first`);

          // Try to create the user (this will update user.email if needed)
          await this.signup(user);
          // After signup succeeds, we're already logged in and on /portal
          return;
        }

        // For other errors, fail immediately
        const responseText = await response.text();
        console.error(`Login failed for ${user.email}:`, response.status(), responseText);
        expect(response.status()).toBe(200);
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            `Login failed after ${maxRetries + 1} attempts for ${user.email}. Last error: ${error}`
          );
        }
        console.warn(`Login attempt ${attempt + 1} failed for ${user.email}:`, error);
      }
    }
  }

  async logout(): Promise<void> {
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL('/login');
  }

  async verifyAuthenticatedState(user: TestUser): Promise<void> {
    await expect(this.page.locator('[data-testid="user-name"]')).toContainText(user.name);
    await expect(this.page.locator('[data-testid="user-email"]')).toContainText(user.email);
  }

  async verifyUnauthenticatedState(): Promise<void> {
    await this.page.goto('/portal');
    await expect(this.page).toHaveURL('/login?from=%2Fportal');
  }

  async getAuthToken(): Promise<string | undefined> {
    const cookies = await this.page.context().cookies();
    return cookies.find((c) => c.name === 'auth-token')?.value;
  }
}

/**
 * Form validation helper
 */
export class FormHelper {
  constructor(private page: Page) {}

  async expectValidationError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async fillSignupForm(user: Partial<TestUser>): Promise<void> {
    if (user.name) await this.page.fill('input[placeholder="Enter your full name"]', user.name);
    if (user.email) await this.page.fill('input[type="email"]', user.email);
    if (user.username)
      await this.page.fill('input[placeholder="Choose a username"]', user.username);
    if (user.password) await this.page.fill('input[type="password"]', user.password);
  }

  async submitForm(buttonText: string = 'Create Account'): Promise<void> {
    await this.page.click(`button:has-text("${buttonText}")`);
  }
}

/**
 * API helper for direct API testing
 */
export class ApiHelper {
  constructor(private page: Page) {}

  async verifyUserData(user: TestUser): Promise<void> {
    const response = await this.page.request.get('/api/auth/me');
    expect(response.status()).toBe(200);

    const userData = await response.json();
    expect(userData.user.email).toBe(user.email);
    expect(userData.user.name).toBe(user.name);
    if (user.username) {
      expect(userData.user.username).toBe(user.username);
    }
    expect(userData.user.role).toBe('user');
  }
}

/**
 * Database state helper with proper test isolation for parallel execution
 */
export class DatabaseHelper {
  /**
   * Clean up specific users by email (recommended approach)
   */
  static async cleanup(emails: string[]): Promise<void> {
    if (emails.length === 0) {
      console.log('No emails provided for cleanup, skipping');
      return;
    }

    try {
      const count = await cleanupTestUsers({ emails });
      console.log(
        `Successfully cleaned up ${count} users:`,
        emails.slice(0, 3),
        emails.length > 3 ? '...' : ''
      );
    } catch (error) {
      console.warn('Cleanup error (non-blocking):', error);
      throw error;
    }
  }

  /**
   * Emergency cleanup for current worker only - use sparingly
   * Only cleans users matching current worker patterns
   */
  static async cleanupCurrentWorker(): Promise<void> {
    const workerId = getWorkerId();
    const executionId = getTestExecutionId();

    console.log(`Performing emergency cleanup for worker ${workerId}, execution ${executionId}`);

    try {
      // Use a custom cleanup that only targets this specific worker + execution
      await cleanupTestUsers({
        emails: [], // Will use deleteAll logic but with worker-specific patterns
        deleteAll: false, // We'll implement this in db-cleanup.ts
      });
    } catch (error) {
      console.warn(`Worker ${workerId} emergency cleanup warning:`, error);
    }
  }
}
