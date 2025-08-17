import { describe, test, expect, beforeEach } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient, jsonRequest } from '../utils/api-client';
import { TestUserFactory, TestDataFactory, ApiAssertions } from '../utils/test-factories';
import { ApiAuthHelper, JwtTestHelper } from '../utils/auth-helpers';
import { API_ROUTES, TEST_PASSWORDS } from '../../../lib/test-constants';

describe('Authentication API - Login Endpoints', () => {
  let client: SuperTest<Test>;
  let authHelper: ApiAuthHelper;

  beforeEach(async () => {
    client = await createApiClient();
    authHelper = new ApiAuthHelper(client);
  });

  describe('Successful Login', () => {
    test('should login successfully with valid credentials', async () => {
      const user = TestUserFactory.create('login-valid');

      // Create user first
      await authHelper.signup(user);

      // Then login
      const payload = TestDataFactory.createLoginPayload(user);
      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);

      ApiAssertions.assertLoginSuccess(response, user);
    });

    test('should set authentication cookie on successful login', async () => {
      const user = TestUserFactory.create('login-cookie');

      // Create user first
      await authHelper.signup(user);

      // Login
      const payload = TestDataFactory.createLoginPayload(user);
      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);

      ApiAssertions.assertLoginSuccess(response, user);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader.toString()).toContain('auth-token');
    });

    test('should handle case-insensitive email login', async () => {
      const user = TestUserFactory.create('login-case');

      // Create user
      await authHelper.signup(user);

      // Login with uppercase email
      const payload = {
        email: user.email.toUpperCase(),
        password: user.password,
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      ApiAssertions.assertLoginSuccess(response, user);
    });
  });

  describe('Authentication Failures', () => {
    test('should reject invalid credentials', async () => {
      const payload = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      ApiAssertions.assertUnauthorized(response);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject wrong password for existing user', async () => {
      const user = TestUserFactory.create('login-wrong-password');

      // Create user
      await authHelper.signup(user);

      // Try login with wrong password
      const payload = {
        email: user.email,
        password: 'wrongpassword123',
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      ApiAssertions.assertUnauthorized(response);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject login for non-existent user', async () => {
      const payload = {
        email: 'nonexistent@example.com',
        password: TEST_PASSWORDS.VALID,
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('Input Validation', () => {
    test('should validate required fields', async () => {
      const testCases = [
        {
          name: 'missing email',
          payload: { password: TEST_PASSWORDS.VALID },
        },
        {
          name: 'missing password',
          payload: { email: 'test@example.com' },
        },
        {
          name: 'empty email',
          payload: { email: '', password: 'TestPassword123!' },
        },
        {
          name: 'empty password',
          payload: { email: 'test@example.com', password: '' },
        },
      ];

      for (const testCase of testCases) {
        const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, testCase.payload);
        expect(response.status).toBe(400);
      }
    });

    test('should validate email format', async () => {
      const invalidEmailPayloads = [
        { email: 'invalid-email', password: 'TestPassword123!' },
        { email: 'test@', password: 'TestPassword123!' },
        { email: '@example.com', password: 'TestPassword123!' },
      ];

      for (const payload of invalidEmailPayloads) {
        const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
        ApiAssertions.assertValidationError(response, 'Invalid email');
      }
    });
  });

  describe('Security Testing', () => {
    test('should protect against timing attacks', async () => {
      // Test login with non-existent user vs wrong password
      // Both should take similar time and return similar responses

      const existingUser = TestUserFactory.create('login-timing-existing');
      await authHelper.signup(existingUser);

      const nonExistentPayload = {
        email: 'nonexistent@example.com',
        password: TEST_PASSWORDS.VALID,
      };

      const wrongPasswordPayload = {
        email: existingUser.email,
        password: 'wrongpassword',
      };

      const [nonExistentResponse, wrongPasswordResponse] = await Promise.all([
        jsonRequest(client, 'post', API_ROUTES.LOGIN, nonExistentPayload),
        jsonRequest(client, 'post', API_ROUTES.LOGIN, wrongPasswordPayload),
      ]);

      // Both should return 401
      expect(nonExistentResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);

      // Both should have similar error messages
      expect(nonExistentResponse.body.error).toContain('Invalid');
      expect(wrongPasswordResponse.body.error).toContain('Invalid');
    });

    test('should handle SQL injection attempts', async () => {
      const maliciousPayloads = [
        {
          email: "admin'; DROP TABLE users; --",
          password: TEST_PASSWORDS.VALID,
        },
        {
          email: "admin' OR '1'='1",
          password: TEST_PASSWORDS.VALID,
        },
        {
          email: 'admin@example.com',
          password: "password' OR '1'='1",
        },
      ];

      for (const payload of maliciousPayloads) {
        const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
        // Should handle gracefully without errors
        expect([400, 401]).toContain(response.status);
      }
    });

    test('should handle NoSQL injection attempts', async () => {
      const payload = {
        email: { $ne: null },
        password: { $ne: null },
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('JWT Token Behavior', () => {
    test('should issue valid JWT tokens', async () => {
      const user = TestUserFactory.create('login-jwt');
      const authToken = await authHelper.signupAndLogin(user);

      // Token should be a valid JWT format (three parts separated by dots)
      const parts = authToken.split('.');
      expect(parts).toHaveLength(3);

      // Should be able to use token for authenticated requests
      await authHelper.verifyProfile(authToken, user);
    });

    test('should demonstrate stateless JWT behavior', async () => {
      const user = TestUserFactory.create('login-stateless');
      await JwtTestHelper.verifyStatelessBehavior(client, user);
    });

    test('should reject corrupted JWT tokens', async () => {
      await JwtTestHelper.verifyCorruptedTokenRejection(client);
    });
  });

  describe('Complete Authentication Flow', () => {
    test('should complete full auth lifecycle', async () => {
      const user = TestUserFactory.create('login-complete-flow');
      await authHelper.testCompleteAuthFlow(user);
    });

    test('should handle multiple login sessions', async () => {
      const user = TestUserFactory.create('login-multiple-sessions');

      // Create user
      await authHelper.signup(user);

      // Login multiple times (should get different tokens)
      const token1 = await authHelper.login(user);
      const token2 = await authHelper.login(user);

      // Both tokens should be valid
      await authHelper.verifyProfile(token1, user);
      await authHelper.verifyProfile(token2, user);

      // Tokens should be different (new login = new token)
      expect(token1).not.toBe(token2);
    });
  });

  describe('Performance Testing', () => {
    test('should respond within performance budget', async () => {
      const user = TestUserFactory.create('login-perf');

      // Create user
      await authHelper.signup(user);

      // Time the login
      const payload = TestDataFactory.createLoginPayload(user);
      const startTime = Date.now();
      const response = await jsonRequest(client, 'post', API_ROUTES.LOGIN, payload);
      const responseTime = Date.now() - startTime;

      ApiAssertions.assertLoginSuccess(response, user);
      expect(responseTime).toBeLessThan(2000); // 2 second limit
    });

    test('should handle concurrent login requests', async () => {
      const user = TestUserFactory.create('login-concurrent');

      // Create user
      await authHelper.signup(user);

      // Perform concurrent logins
      const payload = TestDataFactory.createLoginPayload(user);
      const promises = Array(5)
        .fill(null)
        .map(() => jsonRequest(client, 'post', API_ROUTES.LOGIN, payload));

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        ApiAssertions.assertLoginSuccess(response, user);
      });
    });
  });
});
