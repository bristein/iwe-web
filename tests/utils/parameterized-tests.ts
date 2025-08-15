import { test } from '@playwright/test';

/**
 * Test case data structure for parameterized tests
 */
export interface TestCase<T = unknown> {
  name: string;
  data: T;
  skip?: boolean;
  only?: boolean;
}

/**
 * Validation test case structure
 */
export interface ValidationTestCase {
  name: string;
  input: {
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  };
  expectedError: string;
  field?: 'name' | 'email' | 'username' | 'password';
}

/**
 * Response test case structure
 */
export interface ResponseTestCase {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: unknown;
  expectedStatus: number;
  expectedResponseContains?: string;
}

/**
 * Viewport test case structure
 */
export interface ViewportTestCase {
  name: string;
  width: number;
  height: number;
  expectations?: string[];
}

/**
 * Creates parameterized tests from an array of test cases
 */
export function createParameterizedTests<T>(
  testCases: TestCase<T>[],
  testFunction: (testCase: TestCase<T>) => Promise<void>
): void {
  testCases.forEach((testCase) => {
    const testFn = testCase.skip ? test.skip : testCase.only ? test.only : test;
    testFn(testCase.name, async () => {
      await testFunction(testCase);
    });
  });
}

/**
 * Common validation test cases for forms
 */
export const VALIDATION_TEST_CASES: ValidationTestCase[] = [
  {
    name: 'should reject empty name',
    input: { name: '', email: 'test@example.com', password: 'password123' },
    expectedError: 'Name is required',
    field: 'name',
  },
  {
    name: 'should reject empty email',
    input: { name: 'Test User', email: '', password: 'password123' },
    expectedError: 'Email is required',
    field: 'email',
  },
  {
    name: 'should reject invalid email format',
    input: { name: 'Test User', email: 'invalid-email', password: 'password123' },
    expectedError: 'Please enter a valid email address',
    field: 'email',
  },
  {
    name: 'should reject short password',
    input: { name: 'Test User', email: 'test@example.com', password: '123' },
    expectedError: 'Password must be at least 8 characters',
    field: 'password',
  },
  {
    name: 'should reject short username',
    input: {
      name: 'Test User',
      email: 'test@example.com',
      username: 'ab',
      password: 'password123',
    },
    expectedError: 'Username must be at least 3 characters',
    field: 'username',
  },
];

/**
 * Common viewport test cases for responsive testing
 */
export const VIEWPORT_TEST_CASES: ViewportTestCase[] = [
  {
    name: 'Desktop - Large (1920x1080)',
    width: 1920,
    height: 1080,
    expectations: ['desktop-layout-visible'],
  },
  {
    name: 'Desktop - Standard (1366x768)',
    width: 1366,
    height: 768,
    expectations: ['desktop-layout-visible'],
  },
  {
    name: 'Tablet - Landscape (1024x768)',
    width: 1024,
    height: 768,
    expectations: ['tablet-layout-visible'],
  },
  {
    name: 'Tablet - Portrait (768x1024)',
    width: 768,
    height: 1024,
    expectations: ['tablet-layout-visible'],
  },
  {
    name: 'Mobile - Large (414x896)',
    width: 414,
    height: 896,
    expectations: ['mobile-layout-visible'],
  },
  {
    name: 'Mobile - Standard (375x667)',
    width: 375,
    height: 667,
    expectations: ['mobile-layout-visible'],
  },
  {
    name: 'Mobile - Small (320x568)',
    width: 320,
    height: 568,
    expectations: ['mobile-layout-visible'],
  },
];

/**
 * Browser compatibility test cases
 */
export const BROWSER_TEST_CASES = [
  { name: 'Chromium', browser: 'chromium' },
  { name: 'Firefox', browser: 'firefox' },
  { name: 'WebKit (Safari)', browser: 'webkit' },
] as const;

/**
 * Performance test thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000, // 3 seconds
  apiResponse: 1000, // 1 second
  formSubmission: 2000, // 2 seconds
  navigation: 1500, // 1.5 seconds
} as const;
