import { expect } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { TestUser, TestDataFactory, ApiAssertions } from './test-factories';
import { jsonRequest, extractAuthToken, createAuthHeaders } from './api-client';
import { API_ROUTES } from '../../../lib/test-constants';

/**
 * Authentication helper for API tests
 * Provides reusable auth flows for testing
 */
export class ApiAuthHelper {
  constructor(private client: SuperTest<Test>) {}

  /**
   * Sign up a user and return the auth token
   */
  async signup(user: TestUser): Promise<string> {
    const payload = TestDataFactory.createSignupPayload(user);
    
    const response = await jsonRequest(this.client, 'post', API_ROUTES.SIGNUP, payload);
    
    ApiAssertions.assertUserCreated(response, user);
    
    const authToken = extractAuthToken(response);
    if (!authToken) {
      throw new Error('No auth token returned from signup');
    }
    
    return authToken;
  }

  /**
   * Log in a user and return the auth token
   */
  async login(user: TestUser): Promise<string> {
    const payload = TestDataFactory.createLoginPayload(user);
    
    const response = await jsonRequest(this.client, 'post', API_ROUTES.LOGIN, payload);
    
    ApiAssertions.assertLoginSuccess(response, user);
    
    const authToken = extractAuthToken(response);
    if (!authToken) {
      throw new Error('No auth token returned from login');
    }
    
    return authToken;
  }

  /**
   * Create a user account first, then log in and return auth token
   */
  async signupAndLogin(user: TestUser): Promise<string> {
    // First signup
    await this.signup(user);
    
    // Then login to get a fresh token
    return this.login(user);
  }

  /**
   * Verify user profile endpoint with auth token
   */
  async verifyProfile(authToken: string, expectedUser: TestUser): Promise<void> {
    const response = await this.client
      .get(API_ROUTES.ME)
      .set(createAuthHeaders(authToken));
    
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(expectedUser.email);
    expect(response.body.user.name).toBe(expectedUser.name);
    
    if (expectedUser.username) {
      expect(response.body.user.username).toBe(expectedUser.username);
    }
  }

  /**
   * Logout user with auth token
   */
  async logout(authToken: string): Promise<void> {
    const response = await this.client
      .post(API_ROUTES.LOGOUT)
      .set(createAuthHeaders(authToken));
    
    expect(response.status).toBe(200);
  }

  /**
   * Verify that an endpoint requires authentication
   */
  async verifyRequiresAuth(method: 'get' | 'post' | 'put' | 'delete', url: string): Promise<void> {
    const response = await this.client[method](url);
    ApiAssertions.assertUnauthorized(response);
  }

  /**
   * Verify that an invalid auth token is rejected
   */
  async verifyInvalidTokenRejected(method: 'get' | 'post' | 'put' | 'delete', url: string): Promise<void> {
    const response = await this.client[method](url)
      .set(createAuthHeaders('invalid-token'));
    
    ApiAssertions.assertUnauthorized(response);
  }

  /**
   * Test complete auth flow: signup -> verify profile -> logout -> login -> verify profile
   */
  async testCompleteAuthFlow(user: TestUser): Promise<void> {
    // 1. Signup
    const signupToken = await this.signup(user);
    
    // 2. Verify profile after signup
    await this.verifyProfile(signupToken, user);
    
    // 3. Logout
    await this.logout(signupToken);
    
    // 4. Verify logout worked (profile should be unauthorized)
    await this.verifyRequiresAuth('get', API_ROUTES.ME);
    
    // 5. Login
    const loginToken = await this.login(user);
    
    // 6. Verify profile after login
    await this.verifyProfile(loginToken, user);
  }
}

/**
 * Helper function to create an authenticated API helper instance
 */
export async function createAuthenticatedHelper(
  client: SuperTest<Test>,
  user: TestUser
): Promise<{ helper: ApiAuthHelper; authToken: string }> {
  const helper = new ApiAuthHelper(client);
  const authToken = await helper.signup(user);
  
  return { helper, authToken };
}

/**
 * Helper function to test JWT token properties
 */
export class JwtTestHelper {
  /**
   * Verify that JWT tokens are stateless (remain valid after logout)
   */
  static async verifyStatelessBehavior(
    client: SuperTest<Test>,
    user: TestUser
  ): Promise<void> {
    const helper = new ApiAuthHelper(client);
    
    // Get auth token
    const authToken = await helper.signup(user);
    
    // Verify token works
    await helper.verifyProfile(authToken, user);
    
    // Logout (clears server-side cookie)
    await helper.logout(authToken);
    
    // Manually use the old token - should still work because JWTs are stateless
    const response = await client
      .get(API_ROUTES.ME)
      .set(createAuthHeaders(authToken));
    
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(user.email);
  }

  /**
   * Test that corrupted tokens are properly rejected
   */
  static async verifyCorruptedTokenRejection(client: SuperTest<Test>): Promise<void> {
    const corruptedTokens = [
      'corrupted-token',
      'Bearer invalid-token',
      '!!!@#$%^&*()',
      '',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted-payload.signature',
    ];
    
    for (const token of corruptedTokens) {
      const response = await client
        .get(API_ROUTES.ME)
        .set(createAuthHeaders(token));
      
      expect(response.status).toBe(401);
    }
  }
}