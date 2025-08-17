import { Page, expect } from '@playwright/test';
import { cleanupTestUsers } from './db-cleanup';

// Helper function to get worker ID for test isolation
function getWorkerId(): string {
  return process.env.TEST_WORKER_INDEX || process.env.VITEST_WORKER_ID || '0';
}

// Helper function to generate worker-scoped test email to prevent conflicts
function generateWorkerScopedEmail(prefix: string): string {
  const workerId = getWorkerId();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-w${workerId}-${timestamp}-${random}@example.com`;
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
      password: options.password || 'TestPassword123!',
      username: 'username' in options ? options.username : `${prefix}user`,
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

  async signup(user: TestUser): Promise<void> {
    await this.page.goto('/signup');
    await this.page.fill('input[placeholder="Enter your full name"]', user.name);
    await this.page.fill('input[type="email"]', user.email);
    if (user.username) {
      await this.page.fill('input[placeholder="Choose a username"]', user.username);
    }
    await this.page.fill('input[type="password"]', user.password);

    const responsePromise = this.page.waitForResponse('/api/auth/signup');
    await this.page.click('button:has-text("Create Account")');
    const response = await responsePromise;

    expect(response.status()).toBe(201);
    await expect(this.page).toHaveURL('/portal');
  }

  async login(user: TestUser): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', user.email);
    await this.page.fill('input[type="password"]', user.password);

    const responsePromise = this.page.waitForResponse('/api/auth/login');
    await this.page.click('button:has-text("Sign In")');
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    await expect(this.page).toHaveURL('/portal');
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
 * Database state helper with parallel test isolation
 */
export class DatabaseHelper {
  static async cleanup(emails: string[]): Promise<void> {
    await cleanupTestUsers({ emails });
  }

  static async cleanupAll(): Promise<void> {
    await cleanupTestUsers({ deleteAll: true });
  }

  // Worker-specific cleanup for better isolation
  static async cleanupWorkerTests(): Promise<void> {
    const workerId = getWorkerId();
    await cleanupTestUsers({
      emails: [], // Empty emails array triggers general cleanup
    });

    // Additional cleanup for worker-scoped test data
    try {
      await cleanupTestUsers({
        deleteAll: false,
        emails: [], // Will be handled by pattern matching in db-cleanup
      });
    } catch (error) {
      console.warn(`Worker ${workerId} cleanup warning:`, error);
    }
  }
}
