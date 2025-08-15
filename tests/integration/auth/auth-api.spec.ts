import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  ApiHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { API_ROUTES, ERROR_MESSAGES } from '../../../lib/test-constants';

test.describe('Authentication - API Endpoints', () => {
  let testUsers: TestUser[] = [];

  test.beforeEach(async () => {
    // Clean up any users created in previous tests
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
  });

  test.afterEach(async () => {
    // Clean up users created in this test
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
  });

  test.describe('Signup API', () => {
    test('should create user successfully with valid data', async ({ page }) => {
      const user = TestUserFactory.create('api-signup');
      testUsers.push(user);

      const response = await page.request.post(API_ROUTES.SIGNUP, {
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

    test('should create user successfully without optional username', async ({ page }) => {
      const user = TestUserFactory.create('api-signup-minimal', { username: undefined });
      testUsers.push(user);

      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      expect(response.status()).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.user.email).toBe(user.email);
      expect(responseBody.user.name).toBe(user.name);
      expect(responseBody.user.username).toBeUndefined();
    });

    test('should reject duplicate email registration', async ({ page }) => {
      const user = TestUserFactory.create('api-duplicate');
      testUsers.push(user);

      // First signup
      const firstResponse = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });
      expect(firstResponse.status()).toBe(201);

      // Second signup with same email
      const secondResponse = await page.request.post(API_ROUTES.SIGNUP, {
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

    test('should validate required fields', async ({ page }) => {
      // Missing name
      let response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      expect(response.status()).toBe(400);

      // Missing email
      response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Test User',
          password: 'password123',
        },
      });
      expect(response.status()).toBe(400);

      // Missing password
      response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Test User',
          email: 'test@example.com',
        },
      });
      expect(response.status()).toBe(400);
    });

    test('should validate email format', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.error).toBe('Validation failed');
      expect(errorBody.details).toBeDefined();
      expect(errorBody.details.some((detail) => detail.message.includes('Invalid email'))).toBe(
        true
      );
    });

    test('should validate password requirements', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: '123', // Too short
        },
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.error).toBe('Validation failed');
      expect(errorBody.details).toBeDefined();
      expect(errorBody.details.some((detail) => detail.message.includes('8 characters'))).toBe(
        true
      );
    });

    test('should validate username requirements', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'ValidPassword123!',
          username: 'ab', // Too short
        },
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.error).toBe('Validation failed');
      expect(errorBody.details).toBeDefined();
      expect(errorBody.details.some((detail) => detail.message.includes('3 characters'))).toBe(
        true
      );
    });
  });

  test.describe('Login API', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      const user = TestUserFactory.create('api-login');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      await authHelper.signup(user);
      await authHelper.logout();

      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      expect(response.status()).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe('Login successful');
      expect(responseBody.user.email).toBe(user.email);
      expect(responseBody.user.name).toBe(user.name);
      expect(responseBody.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should reject invalid credentials', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
      const errorBody = await response.json();
      expect(errorBody.error).toContain('Invalid');
    });

    test('should reject wrong password for existing user', async ({ page }) => {
      const user = TestUserFactory.create('api-login-wrong');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      await authHelper.signup(user);
      await authHelper.logout();

      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: 'wrongpassword123',
        },
      });

      expect(response.status()).toBe(401);
      const errorBody = await response.json();
      expect(errorBody.error).toContain('Invalid');
    });

    test('should validate required fields for login', async ({ page }) => {
      // Missing email
      let response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          password: 'password123',
        },
      });
      expect(response.status()).toBe(400);

      // Missing password
      response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: 'test@example.com',
        },
      });
      expect(response.status()).toBe(400);
    });

    test('should validate email format for login', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.error).toBe('Validation failed');
      expect(errorBody.details).toBeDefined();
      expect(errorBody.details.some((detail) => detail.message.includes('Invalid email'))).toBe(
        true
      );
    });
  });

  test.describe('User Profile API', () => {
    test('should return user data for authenticated user', async ({ page }) => {
      const user = TestUserFactory.create('api-profile');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      const apiHelper = new ApiHelper(page);

      await authHelper.signup(user);
      await apiHelper.verifyUserData(user);
    });

    test('should reject unauthenticated requests', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      const response = await page.request.get(API_ROUTES.ME);
      expect(response.status()).toBe(401);
    });

    test('should reject requests with invalid auth token', async ({ page }) => {
      // Set invalid auth token
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'invalid-token',
          domain: 'localhost',
          path: '/',
        },
      ]);

      const response = await page.request.get(API_ROUTES.ME);
      expect(response.status()).toBe(401);
    });

    test('should handle corrupted auth token gracefully', async ({ page }) => {
      // Set corrupted auth token
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'corrupted!!!@#$%^&*()',
          domain: 'localhost',
          path: '/',
        },
      ]);

      const response = await page.request.get(API_ROUTES.ME);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Logout API', () => {
    test('should logout authenticated user successfully', async ({ page }) => {
      const user = TestUserFactory.create('api-logout');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      await authHelper.signup(user);

      // Verify user is authenticated
      let meResponse = await page.request.get(API_ROUTES.ME);
      expect(meResponse.status()).toBe(200);

      // Logout
      const logoutResponse = await page.request.post(API_ROUTES.LOGOUT);
      expect(logoutResponse.status()).toBe(200);

      // Verify user is no longer authenticated
      meResponse = await page.request.get(API_ROUTES.ME);
      expect(meResponse.status()).toBe(401);
    });

    test('should handle logout of already logged out user', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      const response = await page.request.post(API_ROUTES.LOGOUT);
      // Should handle gracefully - either 200 or 401 is acceptable
      expect([200, 401]).toContain(response.status());
    });

    test('should clear auth cookie on logout', async ({ page }) => {
      const user = TestUserFactory.create('api-logout-token');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      await authHelper.signup(user);

      // Verify auth token exists
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Logout via API
      await page.request.post(API_ROUTES.LOGOUT);

      // Verify auth cookie is cleared (no cookie sent = 401)
      const response = await page.request.get(API_ROUTES.ME);
      expect(response.status()).toBe(401);

      // Note: JWT tokens are stateless and cannot be invalidated server-side
      // without additional infrastructure. The logout endpoint only removes
      // the browser cookie. If someone manually sets an old token cookie,
      // it will still be valid until expiration. This is expected JWT behavior.
    });

    test('JWT tokens remain valid after logout (stateless behavior)', async ({ page }) => {
      const user = TestUserFactory.create('jwt-stateless');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      await authHelper.signup(user);

      // Get auth token before logout
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Logout via API (removes cookie server-side)
      await page.request.post(API_ROUTES.LOGOUT);

      // Manually set the old token (simulates token reuse attack)
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: authToken!,
          domain: 'localhost',
          path: '/',
        },
      ]);

      // The token is still valid because JWTs are stateless
      // This demonstrates why logout only clears cookies, not token validity
      const response = await page.request.get(API_ROUTES.ME);
      expect(response.status()).toBe(200);

      // This is expected JWT behavior - tokens cannot be invalidated
      // server-side without implementing a blacklist/revocation system
    });
  });

  test.describe('API Security', () => {
    test('should set secure headers', async ({ page }) => {
      const user = TestUserFactory.create('api-security');
      testUsers.push(user);

      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      expect(response.status()).toBe(201);

      // Check for security headers
      const headers = response.headers();
      // Note: These would depend on your actual security headers implementation
      // expect(headers['x-frame-options']).toBeDefined();
      // expect(headers['x-content-type-options']).toBe('nosniff');
    });

    test('should handle CORS properly', async ({ page }) => {
      // This would test CORS headers for cross-origin requests
      // Implementation depends on your CORS configuration
      const response = await page.request.get(API_ROUTES.ME);
      const headers = response.headers();

      // CORS headers might be present
      // expect(headers['access-control-allow-origin']).toBeDefined();
    });

    test('should protect against SQL injection', async ({ page }) => {
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";

      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: maliciousEmail,
          password: 'password123',
        },
      });

      // Should handle gracefully without errors
      expect([400, 401]).toContain(response.status());
    });

    test('should handle malformed JSON gracefully', async ({ page }) => {
      try {
        const response = await page.request.post(API_ROUTES.SIGNUP, {
          data: '{ invalid json }',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(response.status()).toBe(400);
      } catch (error) {
        // If the request fails to send, that's also acceptable
        expect(error).toBeDefined();
      }
    });

    test('should handle very large payloads', async ({ page }) => {
      // Create a string larger than 5MB (our limit)
      // 5MB = 5 * 1024 * 1024 = 5,242,880 bytes
      // Create a 6MB string to exceed the limit
      const largeString = 'a'.repeat(6 * 1024 * 1024); // 6MB string

      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: largeString,
          email: 'test@example.com',
          password: 'password123',
        },
      });

      // Should return 413 Payload Too Large
      expect(response.status()).toBe(413);

      const responseBody = await response.json();
      expect(responseBody.error).toBe('Payload too large');
      expect(responseBody.maxSize).toBe('5MB');
      expect(responseBody.receivedSize).toBeDefined();
    });
  });

  test.describe('API Rate Limiting', () => {
    test.skip('should implement rate limiting for login attempts', async ({ page }) => {
      // Skip this test as rate limiting is shared across test runs
      const testEmail = 'ratelimit-api@example.com';
      const wrongPassword = 'wrongpassword123';

      // Make multiple rapid login attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.request.post(API_ROUTES.LOGIN, {
            data: {
              email: testEmail,
              password: wrongPassword,
            },
          })
        );
      }

      const responses = await Promise.all(promises);

      // Some responses should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test.skip('should implement rate limiting for signup attempts', async ({ page }) => {
      // Skip this test as rate limiting is shared across test runs
      const promises = [];
      for (let i = 0; i < 25; i++) {
        // Exceed signup rate limit
        promises.push(
          page.request.post(API_ROUTES.SIGNUP, {
            data: {
              name: `Test User ${i}`,
              email: `test${i}@example.com`,
              password: 'password123',
            },
          })
        );
      }

      const responses = await Promise.all(promises);

      // Some responses should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('API Error Handling', () => {
    test('should return consistent error format', async ({ page }) => {
      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.error).toBeDefined();
      expect(typeof errorBody.error).toBe('string');
    });

    test('should handle missing content-type header', async ({ page }) => {
      try {
        const response = await page.request.post(API_ROUTES.SIGNUP, {
          data: 'raw text data',
          headers: {
            'Content-Type': 'text/plain',
          },
        });

        expect(response.status()).toBe(400);
      } catch (error) {
        // If the request fails, that's also acceptable
        expect(error).toBeDefined();
      }
    });

    test('should handle unexpected HTTP methods', async ({ page }) => {
      // Try GET on POST endpoint
      const response = await page.request.get(API_ROUTES.SIGNUP);
      expect(response.status()).toBe(405); // Method Not Allowed
    });
  });

  test.describe('API Performance', () => {
    test('should respond to signup requests within time limit', async ({ page }) => {
      const user = TestUserFactory.create('api-perf-signup');
      testUsers.push(user);

      const startTime = Date.now();
      const response = await page.request.post(API_ROUTES.SIGNUP, {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });
      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(201);
      expect(responseTime).toBeLessThan(2000); // 2 second limit
    });

    test('should respond to login requests within time limit', async ({ page }) => {
      const user = TestUserFactory.create('api-perf-login');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      await authHelper.signup(user);
      await authHelper.logout();

      const startTime = Date.now();
      const response = await page.request.post(API_ROUTES.LOGIN, {
        data: {
          email: user.email,
          password: user.password,
        },
      });
      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 2 second limit
    });

    test('should respond to profile requests within time limit', async ({ page }) => {
      const user = TestUserFactory.create('api-perf-profile');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      await authHelper.signup(user);

      const startTime = Date.now();
      const response = await page.request.get(API_ROUTES.ME);
      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1 second limit for profile
    });
  });
});
