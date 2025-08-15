import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, TEST_IDS } from '../../../lib/test-constants';

test.describe('Authentication - Session Management', () => {
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

  test.describe('Logout Functionality', () => {
    test('should successfully log out a user', async ({ page }) => {
      const user = TestUserFactory.create('logout-basic');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and verify logged in
      await authHelper.signup(user);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login page
      await expect(page).toHaveURL('/login');

      // Verify user is actually logged out by trying to access portal
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should clear authentication cookie on logout', async ({ page }) => {
      const user = TestUserFactory.create('logout-cookie');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and verify auth token exists
      await authHelper.signup(user);
      let authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Logout
      await authHelper.logout();

      // Verify auth token is cleared
      authToken = await authHelper.getAuthToken();
      expect(authToken).toBeUndefined();
    });

    test('should handle logout from different pages', async ({ page }) => {
      const user = TestUserFactory.create('logout-pages');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Test logout from portal
      await page.goto('/portal');
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL('/login');

      // Login again and test logout from other pages if they exist
      await authHelper.login(user);
      await page.goto('/portal');
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL('/login');
    });

    test('should handle multiple logout attempts gracefully', async ({ page }) => {
      const user = TestUserFactory.create('logout-multiple');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to logout again via API (should not cause errors)
      const logoutResponse = await page.evaluate(async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        return {
          status: response.status,
          ok: response.ok,
        };
      });

      // Should handle gracefully (not throw errors)
      expect([200, 401]).toContain(logoutResponse.status); // Either success or unauthorized
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      const user = TestUserFactory.create('session-reload');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be logged in
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should maintain session across navigation', async ({ page }) => {
      const user = TestUserFactory.create('session-nav');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Navigate to different pages and back
      await page.goto('/');
      await page.goto('/portal');

      // Should still be logged in
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      const user = TestUserFactory.create('session-history');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Start at home, then signup
      await page.goto('/');
      await authHelper.signup(user);

      // Go back and forward
      await page.goBack();
      await page.goForward();

      // Should still be on portal and logged in
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate session on explicit logout', async ({ page }) => {
      const user = TestUserFactory.create('session-invalidate');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and get auth token
      await authHelper.signup(user);
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Logout
      await authHelper.logout();

      // Try to use the old token to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should handle session timeout gracefully', async ({ page }) => {
      // Note: This test would require implementing session timeout in the app
      // For now, we'll test the concept by manually expiring cookies
      const user = TestUserFactory.create('session-timeout');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Manually expire the auth cookie to simulate timeout
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should prevent session fixation attacks', async ({ page, context }) => {
      const user = TestUserFactory.create('session-fixation');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Get initial cookies before authentication
      const initialCookies = await page.context().cookies();
      const initialAuthCookie = initialCookies.find((c) => c.name === 'auth-token');

      // Sign up (this should create a new session)
      await authHelper.signup(user);

      // Get cookies after authentication
      const postAuthCookies = await page.context().cookies();
      const postAuthCookie = postAuthCookies.find((c) => c.name === 'auth-token');

      // Session ID should change after authentication
      if (initialAuthCookie && postAuthCookie) {
        expect(postAuthCookie.value).not.toBe(initialAuthCookie.value);
      } else {
        // If no initial auth cookie, that's also secure
        expect(postAuthCookie).toBeDefined();
      }
    });
  });

  test.describe('Cross-Tab Session Management', () => {
    test('should maintain session across multiple tabs', async ({ page, context }) => {
      const user = TestUserFactory.create('session-tabs');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up in first tab
      await authHelper.signup(user);

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/portal');

      // Should be logged in in second tab
      await expect(page2).toHaveURL('/portal');
      await expect(page2.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      await page2.close();
    });

    test('should sync logout across tabs', async ({ page, context }) => {
      const user = TestUserFactory.create('session-sync');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up in first tab
      await authHelper.signup(user);

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/portal');
      await expect(page2).toHaveURL('/portal');

      // Logout from first tab
      await authHelper.logout();

      // Check if second tab is also logged out
      await page2.reload();
      await expect(page2).toHaveURL('/login?from=%2Fportal');

      await page2.close();
    });
  });

  test.describe('Session API Integration', () => {
    test('should verify session status via API', async ({ page }) => {
      const user = TestUserFactory.create('session-api');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Check session via API
      const meResponse = await page.request.get('/api/auth/me');
      expect(meResponse.status()).toBe(200);

      const userData = await meResponse.json();
      expect(userData.user.email).toBe(user.email);
      expect(userData.user.name).toBe(user.name);

      // Logout
      await authHelper.logout();

      // Check session after logout
      const meResponse2 = await page.request.get('/api/auth/me');
      expect(meResponse2.status()).toBe(401);
    });

    test('should handle API session validation', async ({ page }) => {
      const user = TestUserFactory.create('session-validation');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Make authenticated API call
      const protectedResponse = await page.request.get('/api/auth/me');
      expect(protectedResponse.status()).toBe(200);

      // Clear session
      await page.context().clearCookies();

      // Make same API call without session
      const unprotectedResponse = await page.request.get('/api/auth/me');
      expect(unprotectedResponse.status()).toBe(401);
    });
  });

  test.describe('Session Recovery', () => {
    test('should handle invalid session gracefully', async ({ page }) => {
      const user = TestUserFactory.create('session-invalid');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Manually set invalid auth token
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'invalid-token-value',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should handle corrupted session data', async ({ page }) => {
      const user = TestUserFactory.create('session-corrupted');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Manually corrupt auth token
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'corrupted!!!@#$%^&*()',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Should redirect to login
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should handle missing session cookie', async ({ page }) => {
      const user = TestUserFactory.create('session-missing');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Start without any session
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login should work normally
      await authHelper.signup(user);
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Session Performance', () => {
    test('should handle session validation efficiently', async ({ page }) => {
      const user = TestUserFactory.create('session-performance');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Measure performance of session-protected page loads
      const startTime = Date.now();
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should minimize session validation overhead', async ({ page }) => {
      const user = TestUserFactory.create('session-overhead');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Monitor network requests during navigation
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/auth/')) {
          requests.push(request.url());
        }
      });

      // Navigate to portal
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      // Should not make excessive auth API calls
      const authCalls = requests.filter((url) => url.includes('/api/auth/me'));
      expect(authCalls.length).toBeLessThanOrEqual(1); // At most one validation call
    });
  });
});
