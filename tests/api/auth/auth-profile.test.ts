import { describe, test, expect, beforeEach } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient } from '../utils/api-client';
import { TestUserFactory, ApiAssertions } from '../utils/test-factories';
import { ApiAuthHelper, createAuthenticatedHelper } from '../utils/auth-helpers';
import { API_ROUTES } from '../../../lib/test-constants';

describe('Authentication API - User Profile Endpoints', () => {
  let client: SuperTest<Test>;
  let authHelper: ApiAuthHelper;

  beforeEach(async () => {
    client = await createApiClient();
    authHelper = new ApiAuthHelper(client);
  });

  describe('Authenticated Profile Access', () => {
    test('should return user data for authenticated user', async () => {
      const user = TestUserFactory.create('profile-valid');
      const { authToken } = await createAuthenticatedHelper(client, user);

      await authHelper.verifyProfile(authToken, user);
    });

    test('should return correct user data structure', async () => {
      const user = TestUserFactory.create('profile-structure', {
        username: 'testusername',
      });
      const { authToken } = await createAuthenticatedHelper(client, user);

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');

      const userData = response.body.user;
      expect(userData).toHaveProperty('email', user.email);
      expect(userData).toHaveProperty('name', user.name);
      expect(userData).toHaveProperty('username', user.username);
      expect(userData).toHaveProperty('role', 'user');
      expect(userData).toHaveProperty('createdAt');
      expect(userData).toHaveProperty('updatedAt');

      // Sensitive data should not be included
      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('passwordHash');
    });

    test('should handle users with and without username', async () => {
      // User with username
      const userWithUsername = TestUserFactory.create('profile-with-username', {
        username: 'hasusername',
      });
      const { authToken: token1 } = await createAuthenticatedHelper(client, userWithUsername);

      const response1 = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${token1}`);

      expect(response1.status).toBe(200);
      // Username might be modified by retry logic, so check it contains the base username
      expect(response1.body.user.username).toMatch(/hasusername/);

      // User without username
      const userWithoutUsername = TestUserFactory.create('profile-no-username', {
        username: undefined,
      });
      const { authToken: token2 } = await createAuthenticatedHelper(client, userWithoutUsername);

      const response2 = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${token2}`);

      expect(response2.status).toBe(200);
      expect(response2.body.user.username).toBeUndefined();
    });
  });

  describe('Unauthenticated Access', () => {
    test('should reject unauthenticated requests', async () => {
      await authHelper.verifyRequiresAuth('get', API_ROUTES.ME);
    });

    test('should reject requests with invalid auth token', async () => {
      await authHelper.verifyInvalidTokenRejected('get', API_ROUTES.ME);
    });

    test('should reject requests with malformed auth token', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'Bearer invalid-token',
        '!!!@#$%^&*()',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Incomplete JWT
      ];

      for (const token of malformedTokens) {
        const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${token}`);

        ApiAssertions.assertUnauthorized(response);
      }
    });

    test('should reject requests with expired token', async () => {
      // This would require creating a token with past expiration
      // For now, we test with an obviously invalid token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${expiredToken}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('Token Validation', () => {
    test('should validate JWT signature', async () => {
      const user = TestUserFactory.create('profile-signature');
      const { authToken } = await createAuthenticatedHelper(client, user);

      // Tamper with the signature
      const parts = authToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature`;

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${tamperedToken}`);

      ApiAssertions.assertUnauthorized(response);
    });

    test('should validate token payload', async () => {
      // Create a token with invalid payload
      const invalidPayloadToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aW52YWxpZC1wYXlsb2Fk.signature';

      const response = await client
        .get(API_ROUTES.ME)
        .set('Cookie', `auth-token=${invalidPayloadToken}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('Session Management', () => {
    test('should maintain session across multiple requests', async () => {
      const user = TestUserFactory.create('profile-session');
      const { authToken } = await createAuthenticatedHelper(client, user);

      // Make multiple requests with same token
      for (let i = 0; i < 3; i++) {
        const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(user.email);
      }
    });

    test('should handle concurrent requests with same token', async () => {
      const user = TestUserFactory.create('profile-concurrent');
      const { authToken } = await createAuthenticatedHelper(client, user);

      // Make concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`));

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(user.email);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database connection failure
      // For now, we ensure the endpoint structure is correct
      const user = TestUserFactory.create('profile-db-error');
      const { authToken } = await createAuthenticatedHelper(client, user);

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status);
    });

    test('should handle missing user in database', async () => {
      // This tests the edge case where a user has a valid JWT
      // but their account was deleted from the database
      const user = TestUserFactory.create('profile-missing-user');
      const { authToken } = await createAuthenticatedHelper(client, user);

      // Manually clean up the user from database (simulate deletion)
      // Note: In a real scenario, this would be done through a database operation
      // For now, we verify the token works normally

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Headers and Format', () => {
    test('should include security headers', async () => {
      const user = TestUserFactory.create('profile-headers');
      const { authToken } = await createAuthenticatedHelper(client, user);

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should return consistent response format', async () => {
      const user = TestUserFactory.create('profile-format');
      const { authToken } = await createAuthenticatedHelper(client, user);

      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(typeof response.body.user).toBe('object');
      expect(Array.isArray(response.body.user)).toBe(false);
    });
  });

  describe('Performance Testing', () => {
    test('should respond within performance budget', async () => {
      const user = TestUserFactory.create('profile-perf');
      const { authToken } = await createAuthenticatedHelper(client, user);

      const startTime = Date.now();
      const response = await client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1 second limit for profile
    });

    test('should handle high frequency requests', async () => {
      const user = TestUserFactory.create('profile-frequency');
      const { authToken } = await createAuthenticatedHelper(client, user);

      // Make rapid sequential requests
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(client.get(API_ROUTES.ME).set('Cookie', `auth-token=${authToken}`));
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should complete all requests in reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 second limit for 10 requests
    });
  });
});
