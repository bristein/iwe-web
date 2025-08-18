import supertest from 'supertest';

/**
 * API client for testing Next.js API routes with Vitest
 * This creates a test instance of the Next.js app without starting a full server
 */

export class ApiClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static instance: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static app: any = null;

  /**
   * Get the shared API client instance
   * This creates the Next.js app in test mode and wraps it with supertest
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getInstance(): Promise<any> {
    if (!this.instance) {
      // For API testing, we'll use the running development server
      // This is more reliable than trying to create a Next.js app instance
      const baseURL = process.env.BASE_URL || 'http://localhost:3000';

      // Create supertest instance pointing to the running server
      this.instance = supertest(baseURL);
    }

    return this.instance;
  }

  /**
   * Clean up the API client instance
   */
  static async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
    this.instance = null;
  }

  /**
   * Helper method to make authenticated requests
   */
  static async authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    authToken: string,
    data?: Record<string, unknown>
  ): Promise<supertest.Response> {
    const client = await this.getInstance();
    const request = client[method](url).set('Cookie', `auth-token=${authToken}`);

    if (data && (method === 'post' || method === 'put')) {
      return request.send(data);
    }

    return request;
  }
}

/**
 * Helper function to create API client for individual tests
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createApiClient(): Promise<any> {
  return ApiClient.getInstance();
}

/**
 * Helper function to extract auth token from response cookies
 */
export function extractAuthToken(response: supertest.Response): string | null {
  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader) return null;

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  for (const cookie of cookieArray) {
    const match = cookie.match(/auth-token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Helper function to create headers with auth token
 */
export function createAuthHeaders(authToken: string): Record<string, string> {
  return {
    Cookie: `auth-token=${authToken}`,
  };
}

/**
 * Helper function to make requests with JSON content type
 */
export async function jsonRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<supertest.Response> {
  const request = client[method](url)
    .set('Content-Type', 'application/json')
    .set(headers || {});

  if (data && (method === 'post' || method === 'put')) {
    return request.send(data);
  }

  return request;
}
