import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { PAGE_ROUTES } from '../../../lib/test-constants';

test.describe('Authentication - Route Protection', () => {
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

  test.describe('Unauthenticated Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Try to access protected portal route
      await page.goto('/portal');

      // Should redirect to login with return URL
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should redirect with correct return URL for different protected routes', async ({
      page,
    }) => {
      // Clear any existing session
      await page.context().clearCookies();

      const protectedRoutes = [
        { route: '/portal', expectedRedirect: '/login?from=%2Fportal' },
        // Add other protected routes as they are implemented
        // { route: '/settings', expectedRedirect: '/login?from=%2Fsettings' },
        // { route: '/profile', expectedRedirect: '/login?from=%2Fprofile' },
      ];

      for (const { route, expectedRedirect } of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(expectedRedirect);
      }
    });

    test('should allow access to public routes without authentication', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      const publicRoutes = ['/', '/login', '/signup'];

      for (const route of publicRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);

        // Verify page loads properly (not just redirects)
        await page.waitForLoadState('networkidle');
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
        expect(content!.length).toBeGreaterThan(10); // Has actual content
      }
    });

    test('should handle deep linking to protected routes', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Try to access a deep protected route with query parameters
      const deepRoute = '/portal?tab=settings&view=profile';
      await page.goto(deepRoute);

      // Should redirect to login with encoded return URL
      const expectedRedirect = '/login?from=' + encodeURIComponent(deepRoute);
      await expect(page).toHaveURL(expectedRedirect);
    });

    test('should handle protected route access via direct navigation', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Navigate to home first, then try protected route
      await page.goto('/');
      await page.goto('/portal');

      await expect(page).toHaveURL('/login?from=%2Fportal');
    });
  });

  test.describe('Authenticated Access', () => {
    test('should allow authenticated users to access protected routes', async ({ page }) => {
      const user = TestUserFactory.create('route-access');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up (creates authenticated session)
      await authHelper.signup(user);

      // Should be able to access portal
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');

      // Verify page content loads
      const content = await page.textContent('body');
      expect(content).toContain(user.name);
    });

    test('should redirect authenticated users away from auth pages', async ({ page }) => {
      const user = TestUserFactory.create('route-redirect');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up (creates authenticated session)
      await authHelper.signup(user);

      // Try to access login page (should redirect to portal)
      await page.goto('/login');
      await expect(page).toHaveURL('/portal');

      // Try to access signup page (should redirect to portal)
      await page.goto('/signup');
      await expect(page).toHaveURL('/portal');
    });

    test('should handle authenticated access to public routes', async ({ page }) => {
      const user = TestUserFactory.create('route-public');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up (creates authenticated session)
      await authHelper.signup(user);

      // Should still be able to access home page
      await page.goto('/');
      await expect(page).toHaveURL('/');

      // Verify content loads
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should maintain route protection after page reload', async ({ page }) => {
      const user = TestUserFactory.create('route-reload');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and go to portal
      await authHelper.signup(user);
      await page.goto('/portal');

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be on portal (authenticated)
      await expect(page).toHaveURL('/portal');
      const content = await page.textContent('body');
      expect(content).toContain(user.name);
    });
  });

  test.describe('Post-Login Redirects', () => {
    test('should redirect to intended page after login', async ({ page }) => {
      const user = TestUserFactory.create('redirect-login');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user first
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to access portal (should redirect to login with return URL)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login should redirect back to portal
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
    });

    test('should redirect to portal if no return URL specified', async ({ page }) => {
      const user = TestUserFactory.create('redirect-default');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Go to login directly (no return URL)
      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      // Login should redirect to default portal
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
    });

    test('should handle complex return URLs with query parameters', async ({ page }) => {
      const user = TestUserFactory.create('redirect-complex');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to access complex protected URL
      const complexUrl = '/portal?tab=projects&filter=active&sort=date';
      await page.goto(complexUrl);

      // Should redirect to login with encoded return URL
      const expectedRedirect = '/login?from=' + encodeURIComponent(complexUrl);
      await expect(page).toHaveURL(expectedRedirect);

      // Login should redirect back to original URL
      await authHelper.login(user);
      await expect(page).toHaveURL(complexUrl);
    });

    test('should prevent open redirect vulnerabilities', async ({ page }) => {
      const user = TestUserFactory.create('redirect-security');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to use external URL as return parameter
      const maliciousUrl = '/login?from=https://evil.com/steal-tokens';
      await page.goto(maliciousUrl);

      // Login
      await authHelper.login(user);

      // Should not redirect to external site, should go to safe default
      await expect(page).toHaveURL('/portal');
      expect(page.url()).not.toContain('evil.com');
    });
  });

  test.describe('Route Protection Edge Cases', () => {
    test('should handle invalid return URLs gracefully', async ({ page }) => {
      const user = TestUserFactory.create('redirect-invalid');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Use malformed return URL
      const invalidUrl = '/login?from=%invalid-url%';
      await page.goto(invalidUrl);

      // Login should still work and redirect to safe default
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
    });

    test('should handle concurrent access to protected routes', async ({ page, context }) => {
      const user = TestUserFactory.create('route-concurrent');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Open multiple tabs trying to access protected routes
      const page2 = await context.newPage();

      await page.goto('/portal');
      await page2.goto('/portal');

      // Both should redirect to login
      await expect(page).toHaveURL('/login?from=%2Fportal');
      await expect(page2).toHaveURL('/login?from=%2Fportal');

      // Login in one tab
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');

      // Other tab should now also have access due to shared session
      await page2.goto('/portal');
      await expect(page2).toHaveURL('/portal');

      await page2.close();
    });

    test('should handle route protection with expired sessions', async ({ page }) => {
      const user = TestUserFactory.create('route-expired');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Manually expire session by clearing cookies
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should handle route protection with corrupted sessions', async ({ page }) => {
      const user = TestUserFactory.create('route-corrupted');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Corrupt the session cookie
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'corrupted-token-value',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should handle browser back/forward with route protection', async ({ page }) => {
      const user = TestUserFactory.create('route-history');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Start on home page
      await page.goto('/');

      // Try to go to protected route (will redirect to login)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Create user and login
      await authHelper.signup(user);

      // Go back in history
      await page.goBack(); // Should go to login page
      await page.goBack(); // Should go to home page
      await expect(page).toHaveURL('/');

      // Go forward to protected route
      await page.goForward(); // login page
      await page.goForward(); // portal (should work since authenticated)
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Route Protection Performance', () => {
    test('should perform route protection checks efficiently', async ({ page }) => {
      const user = TestUserFactory.create('route-performance');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create authenticated session
      await authHelper.signup(user);

      // Measure time to access protected route
      const startTime = Date.now();
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should complete within reasonable time
      expect(loadTime).toBeLessThan(3000);
      await expect(page).toHaveURL('/portal');
    });

    test('should minimize redirect overhead for authenticated users', async ({ page }) => {
      const user = TestUserFactory.create('route-overhead');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create authenticated session
      await authHelper.signup(user);

      // Monitor redirects
      let redirectCount = 0;
      page.on('response', (response) => {
        if ([301, 302, 307, 308].includes(response.status())) {
          redirectCount++;
        }
      });

      // Access protected route
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      // Should not have excessive redirects for authenticated access
      expect(redirectCount).toBeLessThanOrEqual(1); // At most one redirect
    });
  });

  test.describe('Route Protection API Integration', () => {
    test('should protect API routes consistently with page routes', async ({ page }) => {
      const user = TestUserFactory.create('route-api');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Test unauthenticated API access
      await page.context().clearCookies();
      const unauthResponse = await page.request.get('/api/auth/me');
      expect(unauthResponse.status()).toBe(401);

      // Sign up and test authenticated API access
      await authHelper.signup(user);
      const authResponse = await page.request.get('/api/auth/me');
      expect(authResponse.status()).toBe(200);
    });

    test('should handle API route protection with invalid tokens', async ({ page }) => {
      // Set invalid auth token
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'invalid-token',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Try to access protected API
      const response = await page.request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });
  });
});
