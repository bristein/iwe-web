import { expect } from 'vitest';
import { generateTestEmail, TEST_PASSWORDS } from '../../../lib/test-constants';
import { registerTestUser } from '../setup/test-setup';

// Type definitions for API responses
interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

interface AuthResponse extends ApiResponse {
  body: {
    message: string;
    user: {
      email: string;
      name: string;
      username?: string;
      role: string;
    };
  } & Record<string, unknown>;
}

/**
 * Test user interface for API tests
 */
export interface TestUser {
  name: string;
  email: string;
  password: string;
  username?: string;
}

/**
 * Test user factory for creating test users in API tests
 * Automatically registers users for cleanup
 */
export class TestUserFactory {
  /**
   * Create a single test user with automatic cleanup registration
   */
  static create(prefix: string = 'api-test', options: Partial<TestUser> = {}): TestUser {
    // Add extra randomness to ensure uniqueness even in rapid test execution
    const extraRandom = Math.floor(Math.random() * 100000);
    const timestamp = Date.now();
    const uniquePrefix = `${prefix}-${timestamp}-${extraRandom}`;

    const user: TestUser = {
      name: options.name || `API Test User ${uniquePrefix}`,
      email: options.email || generateTestEmail(uniquePrefix),
      password: options.password || TEST_PASSWORDS.VALID,
      username: 'username' in options ? options.username : `${uniquePrefix}user`,
    };

    // Register for automatic cleanup
    registerTestUser(user.email);

    return user;
  }

  /**
   * Create multiple test users with automatic cleanup registration
   */
  static createMultiple(count: number, prefix: string = 'api-test'): TestUser[] {
    return Array.from({ length: count }, (_, i) => this.create(`${prefix}-${i}`));
  }

  /**
   * Create a test user without automatic cleanup (for manual management)
   */
  static createManual(prefix: string = 'api-manual', options: Partial<TestUser> = {}): TestUser {
    return {
      name: options.name || `API Manual User ${prefix}`,
      email: options.email || generateTestEmail(prefix),
      password: options.password || TEST_PASSWORDS.VALID,
      username: options.username || `${prefix}user`,
    };
  }
}

/**
 * Test data factory for creating various test data structures
 */
export class TestDataFactory {
  /**
   * Create valid signup payload
   */
  static createSignupPayload(user: TestUser): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: user.name,
      email: user.email,
      password: user.password,
    };

    if (user.username) {
      payload.username = user.username;
    }

    return payload;
  }

  /**
   * Create valid login payload
   */
  static createLoginPayload(user: TestUser): Record<string, unknown> {
    return {
      email: user.email,
      password: user.password,
    };
  }

  /**
   * Create invalid email payloads for testing validation
   */
  static createInvalidEmailPayloads(): Array<{ name: string; payload: Record<string, unknown> }> {
    const timestamp = Date.now();
    return [
      {
        name: 'missing @ symbol',
        payload: {
          name: 'Test User',
          email: `invalid-email-${timestamp}`,
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'missing domain',
        payload: {
          name: 'Test User',
          email: `test-${timestamp}@`,
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'missing local part',
        payload: {
          name: 'Test User',
          email: '@example.com',
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'empty email',
        payload: {
          name: 'Test User',
          email: '',
          password: TEST_PASSWORDS.VALID,
        },
      },
    ];
  }

  /**
   * Create invalid password payloads for testing validation
   */
  static createInvalidPasswordPayloads(): Array<{
    name: string;
    payload: Record<string, unknown>;
  }> {
    return [
      {
        name: 'too short (< 8 chars)',
        payload: {
          name: 'Test User',
          email: generateTestEmail('invalid-pwd-short'),
          password: '123',
        },
      },
      {
        name: 'empty password',
        payload: {
          name: 'Test User',
          email: generateTestEmail('invalid-pwd-empty'),
          password: '',
        },
      },
      {
        name: 'only spaces',
        payload: {
          name: 'Test User',
          email: generateTestEmail('invalid-pwd-spaces'),
          password: '        ',
        },
      },
    ];
  }

  /**
   * Create malicious payloads for security testing
   */
  static createMaliciousPayloads(): Array<{ name: string; payload: Record<string, unknown> }> {
    return [
      {
        name: 'SQL injection in email',
        payload: {
          name: 'Test User',
          email: "test@example.com'; DROP TABLE users; --",
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'XSS in name',
        payload: {
          name: '<script>alert("xss")</script>',
          email: generateTestEmail('malicious-xss'),
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'NoSQL injection',
        payload: {
          name: 'Test User',
          email: { $ne: null },
          password: TEST_PASSWORDS.VALID,
        },
      },
      {
        name: 'very long payload',
        payload: {
          name: 'a'.repeat(10000),
          email: generateTestEmail('malicious-long'),
          password: TEST_PASSWORDS.VALID,
        },
      },
    ];
  }
}

/**
 * Response assertion helpers
 */
export class ApiAssertions {
  /**
   * Assert successful user creation response
   */
  static assertUserCreated(response: AuthResponse, expectedUser: TestUser): void {
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created successfully');
    expect(response.body.user.email).toBe(expectedUser.email);
    expect(response.body.user.name).toBe(expectedUser.name);
    expect(response.body.user.role).toBe('user');
    expect('password' in response.body.user).toBe(false);

    if (expectedUser.username) {
      expect(response.body.user.username).toBe(expectedUser.username);
    }
  }

  /**
   * Assert successful login response
   */
  static assertLoginSuccess(response: AuthResponse, expectedUser: TestUser): void {
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.user.email).toBe(expectedUser.email);
    expect(response.body.user.name).toBe(expectedUser.name);
    expect('password' in response.body.user).toBe(false);
  }

  /**
   * Assert validation error response
   */
  static assertValidationError(response: ApiResponse, expectedMessage?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');

    if (expectedMessage) {
      expect(response.body.details).toBeDefined();
      const hasExpectedMessage =
        Array.isArray(response.body.details) &&
        response.body.details.some(
          (detail: unknown) =>
            typeof detail === 'object' &&
            detail !== null &&
            'message' in detail &&
            typeof (detail as { message: string }).message === 'string' &&
            (detail as { message: string }).message.includes(expectedMessage)
        );
      expect(hasExpectedMessage).toBe(true);
    }
  }

  /**
   * Assert unauthorized response
   */
  static assertUnauthorized(response: ApiResponse): void {
    expect(response.status).toBe(401);
  }

  /**
   * Assert conflict response (duplicate email or username)
   */
  static assertConflict(response: ApiResponse): void {
    expect(response.status).toBe(409);
    // Accept either email or username conflict messages
    expect(response.body.error).toMatch(/already (exists|taken)/);
  }

  /**
   * Assert payload too large response
   */
  static assertPayloadTooLarge(response: ApiResponse): void {
    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Payload too large');
    expect(response.body.maxSize).toBe('5MB');
  }
}
