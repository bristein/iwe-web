import { test, expect } from '@playwright/test';
import { TestUserFactory, DatabaseHelper, type TestUser } from '../../utils/test-fixtures';
import { createParameterizedTests, type ResponseTestCase } from '../../utils/parameterized-tests';
import { API_ROUTES } from '../../../lib/test-constants';

test.describe('API Testing', () => {
  let testUsers: TestUser[] = [];

  test.beforeEach(async () => {
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
  });

  test.afterEach(async () => {
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
  });

  test.describe('Authentication API Endpoints', () => {
    test('POST /api/auth/signup - successful user creation', async ({ request }) => {
      const user = TestUserFactory.create('api-signup');
      testUsers.push(user);

      const response = await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          username: user.username,
        },
      });

      expect(response.status()).toBe(201);

      const responseBody = await response.json();
      expect(responseBody.message).toBe('User created successfully');
      expect(responseBody.user.email).toBe(user.email);
      expect(responseBody.user.name).toBe(user.name);
      expect(responseBody.user.username).toBe(user.username);
      expect(responseBody.user.role).toBe('user');
      expect(responseBody.user.password).toBeUndefined(); // Password should not be returned
    });

    test('POST /api/auth/signup - duplicate email returns 409', async ({ request }) => {
      const user = TestUserFactory.create('api-duplicate');
      testUsers.push(user);

      // Create user first time
      const firstResponse = await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });
      expect(firstResponse.status()).toBe(201);

      // Try to create user with same email
      const secondResponse = await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Different Name',
          email: user.email,
          password: 'DifferentPassword123!',
        },
      });

      expect(secondResponse.status()).toBe(409);
      const errorBody = await secondResponse.json();
      expect(errorBody.error).toContain('already exists');
    });

    test('POST /api/auth/login - successful authentication', async ({ request }) => {
      const user = TestUserFactory.create('api-login');
      testUsers.push(user);

      // Create user first
      await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      // Login with credentials
      const loginResponse = await request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      expect(loginResponse.status()).toBe(200);

      const responseBody = await loginResponse.json();
      expect(responseBody.message).toBe('Login successful');
      expect(responseBody.user.email).toBe(user.email);
      expect(responseBody.user.name).toBe(user.name);

      // Verify auth cookie is set
      const headers = loginResponse.headers();
      const setCookieHeader = headers['set-cookie'];
      expect(setCookieHeader).toContain('auth-token');
    });

    test('POST /api/auth/login - invalid credentials returns 401', async ({ request }) => {
      const response = await request.post(API_ROUTES.LOGIN, {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
      const errorBody = await response.json();
      expect(errorBody.error).toContain('Invalid');
    });

    test('GET /api/auth/me - returns user data when authenticated', async ({ request }) => {
      const user = TestUserFactory.create('api-me');
      testUsers.push(user);

      // Create and login user
      await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      const loginResponse = await request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      // Extract auth cookie
      const setCookieHeader = loginResponse.headers()['set-cookie'];
      const authToken = setCookieHeader?.match(/auth-token=([^;]+)/)?.[1];
      expect(authToken).toBeDefined();

      // Get user data
      const meResponse = await request.get(API_ROUTES.ME, {
        headers: {
          Cookie: `auth-token=${authToken}`,
        },
      });

      expect(meResponse.status()).toBe(200);
      const userData = await meResponse.json();
      expect(userData.user.email).toBe(user.email);
      expect(userData.user.name).toBe(user.name);
    });

    test('GET /api/auth/me - returns 401 when not authenticated', async ({ request }) => {
      const response = await request.get(API_ROUTES.ME);
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/logout - clears authentication', async ({ request }) => {
      const user = TestUserFactory.create('api-logout');
      testUsers.push(user);

      // Create and login user
      await request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      const loginResponse = await request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      const setCookieHeader = loginResponse.headers()['set-cookie'];
      const authToken = setCookieHeader?.match(/auth-token=([^;]+)/)?.[1];

      // Logout
      const logoutResponse = await request.post(API_ROUTES.LOGOUT, {
        headers: {
          Cookie: `auth-token=${authToken}`,
        },
      });

      expect(logoutResponse.status()).toBe(200);

      // Verify auth cookie is cleared
      const logoutHeaders = logoutResponse.headers();
      const logoutSetCookie = logoutHeaders['set-cookie'];
      expect(logoutSetCookie).toContain('auth-token=;');
    });
  });

  test.describe('Input Validation', () => {
    const validationTests: ResponseTestCase[] = [
      {
        name: 'rejects empty name',
        endpoint: API_ROUTES.SIGNUP,
        method: 'POST',
        payload: {
          name: '',
          email: 'test@example.com',
          password: 'password123',
        },
        expectedStatus: 400,
        expectedResponseContains: 'Name is required',
      },
      {
        name: 'rejects invalid email format',
        endpoint: API_ROUTES.SIGNUP,
        method: 'POST',
        payload: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        },
        expectedStatus: 400,
        expectedResponseContains: 'valid email',
      },
      {
        name: 'rejects short password',
        endpoint: API_ROUTES.SIGNUP,
        method: 'POST',
        payload: {
          name: 'Test User',
          email: 'test@example.com',
          password: '123',
        },
        expectedStatus: 400,
        expectedResponseContains: 'at least 8 characters',
      },
    ];

    validationTests.forEach((testCase) => {
      test(testCase.name, async ({ request }) => {
        const response = await request.fetch(testCase.endpoint, {
          method: testCase.method,
          data: testCase.payload,
        });

        expect(response.status()).toBe(testCase.expectedStatus);

        if (testCase.expectedResponseContains) {
          const responseBody = await response.text();
          expect(responseBody).toContain(testCase.expectedResponseContains);
        }
      });
    });
  });

  test.describe('Rate Limiting', () => {
    test.skip('login endpoint respects rate limits', async ({ request }) => {
      // Skip in test environment where rate limiting is disabled
      // This test would be enabled for integration testing with rate limits on

      const attempts = [];
      for (let i = 0; i < 12; i++) {
        attempts.push(
          request.post(API_ROUTES.LOGIN, {
            data: {
              email: 'test@example.com',
              password: 'wrongpassword',
            },
          })
        );
      }

      const responses = await Promise.all(attempts);

      // First few attempts should return 401 (invalid credentials)
      expect(responses[0].status()).toBe(401);
      expect(responses[4].status()).toBe(401);

      // After rate limit is hit, should return 429
      expect(responses[10].status()).toBe(429);
      expect(responses[11].status()).toBe(429);
    });
  });

  test.describe('Security Headers', () => {
    test('API endpoints include security headers', async ({ request }) => {
      const response = await request.get(API_ROUTES.ME);
      const headers = response.headers();

      // Check for common security headers
      expect(headers).toHaveProperty('x-content-type-options');
      expect(headers['x-content-type-options']).toBe('nosniff');

      // Additional security headers could be tested here
    });
  });

  test.describe('Content-Type Handling', () => {
    test('endpoints properly handle JSON content type', async ({ request }) => {
      const user = TestUserFactory.create('content-type');
      testUsers.push(user);

      const response = await request.post(API_ROUTES.SIGNUP, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
        }),
      });

      expect(response.status()).toBe(201);
    });

    test('endpoints reject non-JSON content type', async ({ request }) => {
      const response = await request.post(API_ROUTES.SIGNUP, {
        headers: {
          'Content-Type': 'text/plain',
        },
        data: 'plain text data',
      });

      expect(response.status()).toBe(400);
    });
  });
});
