/**
 * Test Environment Configuration and Utilities
 */

export interface TestEnvironment {
  baseURL: string;
  apiURL: string;
  mongoURI: string;
  jwtSecret: string;
  isCI: boolean;
  rateLimitDisabled: boolean;
}

/**
 * Get current test environment configuration
 */
export function getTestEnvironment(): TestEnvironment {
  return {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    apiURL: process.env.API_URL || 'http://localhost:3000/api',
    mongoURI: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    isCI: !!process.env.CI,
    rateLimitDisabled: process.env.DISABLE_RATE_LIMIT === 'true',
  };
}

/**
 * Validate test environment setup
 */
export function validateTestEnvironment(): void {
  const env = getTestEnvironment();
  const errors: string[] = [];

  if (!env.mongoURI) {
    errors.push('MONGODB_URI is not set');
  }

  if (!env.jwtSecret) {
    errors.push('JWT_SECRET is not set');
  }

  if (!env.rateLimitDisabled && !env.isCI) {
    console.warn('⚠️  DISABLE_RATE_LIMIT is not set to true. Tests may fail due to rate limiting.');
  }

  if (errors.length > 0) {
    throw new Error(`Test environment validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(url: string, maxAttempts: number = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch (error) {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server at ${url} not ready after ${maxAttempts} attempts`);
}

/**
 * Test data isolation utilities
 */
export class TestDataIsolation {
  private static testRunId: string = Date.now().toString();

  static getTestRunId(): string {
    return this.testRunId;
  }

  static generateIsolatedEmail(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${this.testRunId}-${timestamp}-${random}@example.com`;
  }

  static generateIsolatedUsername(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${this.testRunId}_${timestamp}_${random}`;
  }
}

/**
 * Test retry utilities for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      console.warn(
        `Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
