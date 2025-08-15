import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, PAGE_TITLES, NAV_LINKS } from '../../../lib/test-constants';

test.describe('Authentication - Force Parameter', () => {
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

  test.describe('Force Parameter Basic Functionality', () => {
    test('should allow authenticated users to access signup page with force parameter', async ({
      page,
    }) => {
      const user = TestUserFactory.create('force-signup');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up to create authenticated session
      await authHelper.signup(user);

      // Verify we have an auth token
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Test normal access to signup (should redirect to portal)
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      const normalUrl = page.url();
      expect(normalUrl).not.toContain('/signup');
      expect(normalUrl).toContain('/portal');

      // Test access with force parameter (should stay on signup)
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');
      const forceUrl = page.url();
      expect(forceUrl).toContain('/signup?force=true');

      // Verify the signup page actually loaded
      const signupHeading = await page.locator('h2').textContent();
      expect(signupHeading).toContain(PAGE_TITLES.SIGNUP);

      // Verify form elements are present
      await expect(page.locator(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`)).toBeVisible();
    });

    test('should allow authenticated users to access login page with force parameter', async ({
      page,
    }) => {
      const user = TestUserFactory.create('force-login');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up to create authenticated session
      await authHelper.signup(user);

      // Test normal access to login (should redirect to portal)
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const normalUrl = page.url();
      expect(normalUrl).not.toContain('/login');
      expect(normalUrl).toContain('/portal');

      // Test access with force parameter (should stay on login)
      await page.goto('/login?force=true');
      await page.waitForLoadState('networkidle');
      const forceUrl = page.url();
      expect(forceUrl).toContain('/login?force=true');

      // Verify the login page actually loaded
      const loginHeading = await page.locator('h2').textContent();
      expect(loginHeading).toContain(PAGE_TITLES.LOGIN);

      // Verify form elements are present
      await expect(page.locator(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`)).toBeVisible();
    });

    test('should not affect unauthenticated users', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Test signup without force (should work normally)
      await page.goto('/signup');
      await expect(page).toHaveURL('/signup');

      // Test signup with force (should work the same)
      await page.goto('/signup?force=true');
      await expect(page).toHaveURL('/signup?force=true');

      // Test login without force (should work normally)
      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      // Test login with force (should work the same)
      await page.goto('/login?force=true');
      await expect(page).toHaveURL('/login?force=true');
    });
  });

  test.describe('Force Parameter Navigation Links', () => {
    test('should include force parameter in navigation links when authenticated', async ({
      page,
    }) => {
      const user = TestUserFactory.create('force-nav');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up to create authenticated session
      await authHelper.signup(user);

      // Access login page with force parameter
      await page.goto('/login?force=true');
      await page.waitForLoadState('networkidle');

      // Check signup link includes force parameter
      const signupLink = await page
        .locator(`a:has-text("${NAV_LINKS.SIGNUP}")`)
        .getAttribute('href');
      expect(signupLink).toBe('/signup?force=true');

      // Navigate to signup and check login link
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');

      const loginLink = await page.locator(`a:has-text("${NAV_LINKS.LOGIN}")`).getAttribute('href');
      expect(loginLink).toBe('/login?force=true');
    });

    test('should not include force parameter in navigation links when unauthenticated', async ({
      page,
    }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Access login page without force
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check signup link does not have force parameter
      const signupLink = await page
        .locator(`a:has-text("${NAV_LINKS.SIGNUP}")`)
        .getAttribute('href');
      expect(signupLink).toBe('/signup');

      // Navigate to signup and check login link
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      const loginLink = await page.locator(`a:has-text("${NAV_LINKS.LOGIN}")`).getAttribute('href');
      expect(loginLink).toBe('/login');
    });

    test('should maintain force parameter through navigation', async ({ page }) => {
      const user = TestUserFactory.create('force-maintain');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up to create authenticated session
      await authHelper.signup(user);

      // Start with force parameter on signup page
      await page.goto('/signup?force=true');

      // Click link to login page
      await page.click(`a:has-text("${NAV_LINKS.LOGIN}")`);
      await expect(page).toHaveURL('/login?force=true');

      // Click link back to signup page
      await page.click(`a:has-text("${NAV_LINKS.SIGNUP}")`);
      await expect(page).toHaveURL('/signup?force=true');
    });
  });

  test.describe('Force Parameter Security', () => {
    test('should not bypass authentication requirements', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Force parameter should not bypass authentication for protected routes
      await page.goto('/portal?force=true');

      // Should still redirect to login
      await expect(page).toHaveURL('/login?from=%2Fportal%3Fforce%3Dtrue');
    });

    test('should not affect protected API endpoints', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Force parameter should not affect API endpoints
      const response = await page.request.get('/api/auth/me?force=true');
      expect(response.status()).toBe(401);
    });

    test('should prevent force parameter abuse', async ({ page }) => {
      const user = TestUserFactory.create('force-abuse');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Force parameter should not work for unauthenticated users on protected routes
      await page.goto('/portal?force=true');
      await expect(page).toHaveURL('/login?from=%2Fportal%3Fforce%3Dtrue');
    });
  });

  test.describe('Force Parameter Integration', () => {
    test('should work with complete authentication workflow', async ({ page }) => {
      const user = TestUserFactory.create('force-workflow');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up user first
      await authHelper.signup(user);

      // Test complete workflow with force parameter:
      // 1. Access signup with force
      await page.goto('/signup?force=true');
      await expect(page).toHaveURL(/\/signup\?force=true/);

      // 2. Navigate to login with force (via link)
      await page.click(`a:has-text("${NAV_LINKS.LOGIN}")`);
      await expect(page).toHaveURL(/\/login\?force=true/);

      // 3. Navigate back to signup with force (via link)
      await page.click(`a:has-text("${NAV_LINKS.SIGNUP}")`);
      await expect(page).toHaveURL(/\/signup\?force=true/);

      // 4. Go to portal (remove force)
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');

      // 5. Try to access auth pages without force (should redirect)
      await page.goto('/signup');
      expect(page.url()).toContain('/portal');

      await page.goto('/login');
      expect(page.url()).toContain('/portal');
    });

    test('should work correctly after logout and re-login', async ({ page }) => {
      const user = TestUserFactory.create('force-relogin');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Sign up, use force parameter, then logout
      await authHelper.signup(user);
      await page.goto('/signup?force=true');
      await expect(page).toHaveURL(/\/signup\?force=true/);

      await authHelper.logout();

      // After logout, force parameter should not be needed
      await page.goto('/signup');
      await expect(page).toHaveURL('/signup');

      // Login again
      await authHelper.login(user);

      // Force parameter should work again
      await page.goto('/signup?force=true');
      await expect(page).toHaveURL(/\/signup\?force=true/);
    });
  });
});
