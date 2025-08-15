import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, TEST_IDS, PAGE_TITLES } from '../../../lib/test-constants';

test.describe('Authentication - End-to-End Workflows', () => {
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

  test.describe('Complete User Journey', () => {
    test('should complete full authentication lifecycle', async ({ page }) => {
      const user = TestUserFactory.create('e2e-complete');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      console.log('=== Testing Complete Authentication Lifecycle ===\n');

      // 1. SIGNUP
      console.log('1. Testing Signup...');
      await page.goto('/signup');
      await expect(page).toHaveTitle(/IWE Web/);

      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[placeholder="Choose a username"]', user.username!);
      await page.fill('input[type="password"]', user.password);

      const signupResponse = page.waitForResponse('/api/auth/signup');
      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      const response = await signupResponse;
      expect(response.status()).toBe(201);
      console.log('✓ Signup successful');

      // Wait for navigation
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 2. CHECK PORTAL ACCESS
      console.log('\n2. Testing Portal Access...');
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      const portalUrl = page.url();
      console.log(`- Portal URL: ${portalUrl}`);
      expect(portalUrl).toContain('/portal');

      // Check for user content
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain(user.name);
      console.log('✓ Portal accessible and shows user name');

      // Verify all portal elements are present
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toContainText(
        'Welcome back, ' + user.name + '!'
      );
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user.email);
      await expect(page.getByTestId('account-email')).toContainText(user.email);
      await expect(page.getByTestId('account-role')).toContainText('user');
      await expect(page.getByTestId('account-username')).toContainText(user.username!);
      await expect(page.getByTestId('account-created')).toBeVisible();

      // Check portal functionality cards
      await expect(page.getByTestId('projects-button')).toBeVisible();
      await expect(page.getByTestId('characters-button')).toBeVisible();
      await expect(page.getByTestId('settings-button')).toBeVisible();

      // 3. TEST AUTH REDIRECTS
      console.log('\n3. Testing Auth Redirects...');
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');
      console.log('✓ Login page redirects to portal when authenticated');

      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');
      console.log('✓ Signup page redirects to portal when authenticated');

      // 4. TEST FORCE PARAMETER
      console.log('\n4. Testing Force Parameter...');
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/signup?force=true');

      const signupHeading = await page.locator('h2').textContent();
      expect(signupHeading).toContain(PAGE_TITLES.SIGNUP);
      console.log('✓ Force parameter allows access to auth pages');

      await page.goto('/login?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/login?force=true');

      const loginHeading = await page.locator('h2').textContent();
      expect(loginHeading).toContain(PAGE_TITLES.LOGIN);
      console.log('✓ Force parameter works for login page');

      // 5. TEST LOGOUT
      console.log('\n5. Testing Logout...');
      await page.goto('/portal');
      await page.waitForSelector('[data-testid="logout-button"]');
      await page.click('[data-testid="logout-button"]');

      await page.waitForURL(/\/login/);
      console.log('✓ Logout successful, redirected to login');

      // Verify logout worked
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
      console.log('✓ Portal access requires authentication after logout');

      // 6. TEST LOGIN
      console.log('\n6. Testing Login...');
      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const loginResponse = page.waitForResponse('/api/auth/login');
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      const loginResp = await loginResponse;
      expect(loginResp.status()).toBe(200);
      console.log('✓ Login successful');

      // Wait for navigation
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 7. VERIFY PORTAL ACCESS AFTER LOGIN
      console.log('\n7. Testing Portal After Login...');
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');

      const finalUrl = page.url();
      expect(finalUrl).toContain('/portal');

      const finalContent = await page.textContent('body');
      expect(finalContent).toContain(user.name);
      console.log('✓ Portal accessible after login');

      console.log('\n=== ✅ All Authentication Tests Passed! ===');
    });

    test('should handle complete user workflow with protected route access', async ({ page }) => {
      const user = TestUserFactory.create('e2e-protected');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Try to access protected route while unauthenticated
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Sign up and should redirect to intended page
      await page.goto('/signup');
      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await expect(page).toHaveURL('/portal');

      // Test accessing different protected routes
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Logout and test login flow with redirect
      await authHelper.logout();

      // Try to access protected route again
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login should redirect to intended page
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
    });

    test('should maintain session across browser navigation', async ({ page }) => {
      const user = TestUserFactory.create('e2e-navigation');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Test navigation between different parts of the app
      await page.goto('/');
      await page.goto('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Test browser back/forward
      await page.goBack(); // Go to home
      await page.goForward(); // Go to portal
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Test page reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });
  });

  test.describe('Multi-User Scenarios', () => {
    test('should handle multiple user accounts properly', async ({ page }) => {
      const user1 = TestUserFactory.create('e2e-multi-1');
      const user2 = TestUserFactory.create('e2e-multi-2');
      testUsers.push(user1, user2);

      const authHelper = new AuthHelper(page);

      // Create first user
      await authHelper.signup(user1);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user1.name);
      await authHelper.logout();

      // Create second user
      await authHelper.signup(user2);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user2.name);
      await authHelper.logout();

      // Login as first user
      await authHelper.login(user1);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user1.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user1.email);
      await authHelper.logout();

      // Login as second user
      await authHelper.login(user2);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user2.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user2.email);
    });

    test('should prevent session mixing between users', async ({ page, context }) => {
      const user1 = TestUserFactory.create('e2e-session-1');
      const user2 = TestUserFactory.create('e2e-session-2');
      testUsers.push(user1, user2);

      const authHelper = new AuthHelper(page);

      // Create first user
      await authHelper.signup(user1);

      // Open second tab/page
      const page2 = await context.newPage();
      const authHelper2 = new AuthHelper(page2);

      // Create second user in second tab
      await authHelper2.signup(user2);

      // Verify each tab shows correct user
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user1.name);
      await expect(page2.getByTestId(TEST_IDS.USER_NAME)).toContainText(user2.name);

      // Logout from first tab
      await authHelper.logout();

      // Second tab should still be logged in as user2
      await page2.reload();
      await expect(page2.getByTestId(TEST_IDS.USER_NAME)).toContainText(user2.name);

      await page2.close();
    });
  });

  test.describe('Error Recovery Scenarios', () => {
    test('should recover from network interruptions', async ({ page }) => {
      const user = TestUserFactory.create('e2e-network');
      testUsers.push(user);

      // Start signup process
      await page.goto('/signup');
      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      // Simulate network error on first attempt
      await page.route('/api/auth/signup', (route) => route.abort('internetdisconnected'));
      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);

      // Wait for error handling
      await page.waitForTimeout(2000);

      // Remove network block and retry
      await page.unroute('/api/auth/signup');

      const signupResponse = page.waitForResponse('/api/auth/signup');
      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      const response = await signupResponse;

      expect(response.status()).toBe(201);
      await expect(page).toHaveURL('/portal');
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      const user = TestUserFactory.create('e2e-expiry');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and verify authenticated
      await authHelper.signup(user);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Simulate session expiration by clearing cookies
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login should restore access
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should handle corrupted session data', async ({ page }) => {
      const user = TestUserFactory.create('e2e-corrupt');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up
      await authHelper.signup(user);

      // Corrupt session data
      await page.context().addCookies([
        {
          name: 'auth-token',
          value: 'corrupted-session-data',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Should redirect to login
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Should be able to login normally
      await authHelper.login(user);
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work with different viewport sizes', async ({ page }) => {
      const user = TestUserFactory.create('e2e-viewport');
      testUsers.push(user);

      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Test signup flow at this viewport
        await page.goto('/signup');
        await page.fill('input[placeholder="Enter your full name"]', user.name);
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);

        await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
        await expect(page).toHaveURL('/portal');

        // Verify portal works at this viewport
        await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

        // Logout for next iteration (if not last)
        if (viewport !== viewports[viewports.length - 1]) {
          await page.click('[data-testid="logout-button"]');
          await expect(page).toHaveURL('/login');
        }
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      const user = TestUserFactory.create('e2e-keyboard');
      testUsers.push(user);

      // Test keyboard navigation on signup
      await page.goto('/signup');

      // Tab through form fields
      await page.keyboard.press('Tab'); // First input (name)
      await page.keyboard.type(user.name);

      await page.keyboard.press('Tab'); // Email input
      await page.keyboard.type(user.email);

      await page.keyboard.press('Tab'); // Username input (optional)
      await page.keyboard.type(user.username!);

      await page.keyboard.press('Tab'); // Password input
      await page.keyboard.type(user.password);

      await page.keyboard.press('Tab'); // Submit button
      await page.keyboard.press('Enter'); // Submit

      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });
  });

  test.describe('Performance and Stress Testing', () => {
    test('should complete authentication flow within performance budget', async ({ page }) => {
      const user = TestUserFactory.create('e2e-performance');
      testUsers.push(user);

      // Measure complete signup flow
      const signupStart = Date.now();

      await page.goto('/signup');
      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const signupResponse = page.waitForResponse('/api/auth/signup');
      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await signupResponse;
      await page.waitForLoadState('networkidle');

      const signupTime = Date.now() - signupStart;
      expect(signupTime).toBeLessThan(5000); // 5 second budget

      // Measure logout/login flow
      const loginStart = Date.now();

      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('/login');

      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const loginResponse = page.waitForResponse('/api/auth/login');
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      await loginResponse;
      await page.waitForLoadState('networkidle');

      const loginTime = Date.now() - loginStart;
      expect(loginTime).toBeLessThan(5000); // 5 second budget
    });

    test('should handle rapid navigation between auth pages', async ({ page }) => {
      const user = TestUserFactory.create('e2e-rapid');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create authenticated session
      await authHelper.signup(user);

      // Rapidly navigate between auth pages with force parameter
      for (let i = 0; i < 5; i++) {
        await page.goto('/signup?force=true');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/signup');

        await page.goto('/login?force=true');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/login');
      }

      // Should still be authenticated
      await page.goto('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });
  });
});
