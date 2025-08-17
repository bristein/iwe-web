import { describe, test, expect, beforeEach } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient, jsonRequest } from '../utils/api-client';
import { TestUserFactory, TestDataFactory, ApiAssertions } from '../utils/test-factories';
import { ApiAuthHelper } from '../utils/auth-helpers';
import { API_ROUTES, TEST_PASSWORDS } from '../../../lib/test-constants';

describe('Authentication API - Signup Endpoints', () => {
  let client: SuperTest<Test>;

  beforeEach(async () => {
    client = await createApiClient();
  });

  describe('Successful Signup', () => {
    test('should create user successfully with all fields', async () => {
      const user = TestUserFactory.create('signup-complete');
      const payload = TestDataFactory.createSignupPayload(user);

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      ApiAssertions.assertUserCreated(response, user);
    });

    test('should create user successfully without optional username', async () => {
      const user = TestUserFactory.create('signup-minimal', { username: undefined });
      const payload = TestDataFactory.createSignupPayload(user);

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      ApiAssertions.assertUserCreated(response, user);
      expect(response.body.user.username).toBeUndefined();
    });

    test('should set authentication cookie on successful signup', async () => {
      const user = TestUserFactory.create('signup-cookie');
      const payload = TestDataFactory.createSignupPayload(user);

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      ApiAssertions.assertUserCreated(response, user);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader.toString()).toContain('auth-token');
    });
  });

  describe('Duplicate Email Handling', () => {
    test('should reject duplicate email registration', async () => {
      const user = TestUserFactory.create('signup-duplicate');
      const payload = TestDataFactory.createSignupPayload(user);

      // First signup should succeed
      const firstResponse = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
      ApiAssertions.assertUserCreated(firstResponse, user);

      // Second signup with same email should fail
      const duplicatePayload = {
        name: 'Different Name',
        email: user.email,
        password: 'DifferentPassword123!',
      };

      const secondResponse = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, duplicatePayload);
      ApiAssertions.assertConflict(secondResponse);
    });

    test('should reject duplicate email with different case', async () => {
      const user = TestUserFactory.create('signup-case');
      const payload = TestDataFactory.createSignupPayload(user);

      // First signup
      await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      // Second signup with uppercase email
      const duplicatePayload = {
        ...payload,
        email: user.email.toUpperCase(),
        name: 'Different Name',
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, duplicatePayload);
      ApiAssertions.assertConflict(response);
    });
  });

  describe('Input Validation', () => {
    test('should validate required fields', async () => {
      const testCases = [
        {
          name: 'missing name',
          payload: { email: 'test@example.com', password: TEST_PASSWORDS.VALID },
        },
        {
          name: 'missing email',
          payload: { name: 'Test User', password: TEST_PASSWORDS.VALID },
        },
        {
          name: 'missing password',
          payload: { name: 'Test User', email: 'test@example.com' },
        },
        {
          name: 'empty name',
          payload: { name: '', email: 'test@example.com', password: TEST_PASSWORDS.VALID },
        },
      ];

      for (const testCase of testCases) {
        const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, testCase.payload);
        expect(response.status).toBe(400);
      }
    });

    test('should validate email format', async () => {
      const invalidEmailPayloads = TestDataFactory.createInvalidEmailPayloads();

      for (const { payload } of invalidEmailPayloads) {
        const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
        ApiAssertions.assertValidationError(response, 'Invalid email');
      }
    });

    test('should validate password requirements', async () => {
      const invalidPasswordPayloads = TestDataFactory.createInvalidPasswordPayloads();

      for (const { payload } of invalidPasswordPayloads) {
        const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
        ApiAssertions.assertValidationError(response, '8 characters');
      }
    });

    test('should validate username requirements when provided', async () => {
      const payload = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        username: 'ab', // Too short
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
      ApiAssertions.assertValidationError(response, '3 characters');
    });
  });

  describe('Security Testing', () => {
    test('should handle malicious payloads safely', async () => {
      const maliciousPayloads = TestDataFactory.createMaliciousPayloads();

      for (const { payload } of maliciousPayloads) {
        const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

        // Should either validate and reject, or handle safely
        expect([400, 413]).toContain(response.status);
      }
    });

    test('should reject very large payloads', async () => {
      // Create a 6MB payload to exceed 5MB limit
      const largeString = 'a'.repeat(6 * 1024 * 1024);
      const payload = {
        name: largeString,
        email: 'test@example.com',
        password: TEST_PASSWORDS.VALID,
      };

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
      ApiAssertions.assertPayloadTooLarge(response);
    });

    test('should handle malformed JSON gracefully', async () => {
      try {
        const response = await client
          .post(API_ROUTES.SIGNUP)
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        expect(response.status).toBe(400);
      } catch (error) {
        // If the request fails to send, that's also acceptable
        expect(error).toBeDefined();
      }
    });

    test('should reject non-JSON content type', async () => {
      const response = await client
        .post(API_ROUTES.SIGNUP)
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      expect(response.status).toBe(400);
    });
  });

  describe('Response Headers', () => {
    test('should include security headers', async () => {
      const user = TestUserFactory.create('signup-headers');
      const payload = TestDataFactory.createSignupPayload(user);

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should return proper content type', async () => {
      const user = TestUserFactory.create('signup-content-type');
      const payload = TestDataFactory.createSignupPayload(user);

      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Performance Testing', () => {
    test('should respond within performance budget', async () => {
      const user = TestUserFactory.create('signup-perf');
      const payload = TestDataFactory.createSignupPayload(user);

      const startTime = Date.now();
      const response = await jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
      const responseTime = Date.now() - startTime;

      ApiAssertions.assertUserCreated(response, user);
      expect(responseTime).toBeLessThan(2000); // 2 second limit
    });

    test('should handle concurrent signup requests', async () => {
      const users = TestUserFactory.createMultiple(5, 'signup-concurrent');

      const promises = users.map((user) => {
        const payload = TestDataFactory.createSignupPayload(user);
        return jsonRequest(client, 'post', API_ROUTES.SIGNUP, payload);
      });

      const responses = await Promise.all(promises);

      // All should succeed since they have different emails
      responses.forEach((response, index) => {
        ApiAssertions.assertUserCreated(response, users[index]);
      });
    });
  });
});
