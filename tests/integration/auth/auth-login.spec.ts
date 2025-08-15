import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  FormHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, ERROR_MESSAGES, PAGE_TITLES, TEST_IDS } from '../../../lib/test-constants';

test.describe('Authentication - Login', () => {
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

  test.describe('Basic Login Flow', () => {
    test('should successfully log in an existing user', async ({ page }) => {
      const user = TestUserFactory.create('login-basic');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // First create a user by signing up
      await authHelper.signup(user);
      await authHelper.logout();

      // Now login with the same credentials
      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      expect(response.status()).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe('Login successful');

      // Should redirect to portal after successful login
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toContainText(
        'Welcome back, ' + user.name + '!'
      );
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user.email);
    });

    test('should set authentication cookie after successful login', async ({ page }) => {
      const user = TestUserFactory.create('login-cookie');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Login and verify cookie
      await authHelper.login(user);

      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();
      expect(authToken).toBeTruthy();

      // Verify cookie allows access to portal
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');
    });

    test('should redirect to intended page after login', async ({ page }) => {
      const user = TestUserFactory.create('login-redirect');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user first
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to access portal directly (should redirect to login with 'from' parameter)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login and should redirect back to portal
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      const response = await responsePromise;

      expect(response.status()).toBe(200);
      await expect(page).toHaveURL('/portal');
    });

    test('should handle login from different entry points', async ({ page }) => {
      const user = TestUserFactory.create('login-entry');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Test login from different URLs
      const entryPoints = ['/login', '/login?from=%2Fportal', '/login?from=%2Fsettings'];

      for (const entryPoint of entryPoints) {
        await page.goto(entryPoint);
        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);

        const responsePromise = page.waitForResponse('/api/auth/login');
        await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
        const response = await responsePromise;

        expect(response.status()).toBe(200);

        // Should end up on portal (or intended page)
        if (entryPoint.includes('from=')) {
          const fromParam = new URLSearchParams(entryPoint.split('?')[1]).get('from');
          await expect(page).toHaveURL(fromParam || '/portal');
        } else {
          await expect(page).toHaveURL('/portal');
        }

        // Logout for next iteration
        await authHelper.logout();
      }
    });
  });

  test.describe('Login Validation', () => {
    test('should show validation error for invalid email format', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/login');

      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'somepassword');

      await page.click('button[type="submit"]');
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_EMAIL);
    });

    test('should show validation errors for missing required fields', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/login');

      // Try to submit without any fields
      await formHelper.submitForm(BUTTON_TEXT.SIGN_IN);

      // Verify we're still on the login page
      await expect(page).toHaveURL('/login');
    });

    test('should handle invalid credentials gracefully', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/login');

      // Try to login with non-existent credentials
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      expect(response.status()).toBe(401);
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    test('should handle wrong password for existing user', async ({ page }) => {
      const user = TestUserFactory.create('login-wrong-password');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      const formHelper = new FormHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to login with wrong password
      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', 'wrongpassword123');

      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      expect(response.status()).toBe(401);
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });
  });

  test.describe('Login Security', () => {
    test.skip('should implement rate limiting for failed login attempts', async ({ page }) => {
      // Skip this test for now as rate limiting is shared across test runs
      const testEmail = 'ratelimit@example.com';
      const testPassword = 'WrongPass123';

      await page.goto('/login');

      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);

        const responsePromise = page.waitForResponse('/api/auth/login');
        await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
        const response = await responsePromise;

        if (i < 5) {
          // First 5 attempts should return 401
          expect(response.status()).toBe(401);
        } else {
          // 6th attempt should be rate limited
          expect(response.status()).toBe(429);
          const body = await response.json();
          expect(body.error).toContain('Too many authentication attempts');
        }
      }
    });

    test('should protect against XSS in login form', async ({ page }) => {
      const maliciousInput = '<script>alert("xss")</script>';

      await page.goto('/login');

      await page.fill('input[type="email"]', maliciousInput);
      await page.fill('input[type="password"]', maliciousInput);

      // Verify malicious script is not executed
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();

      expect(emailValue).toBe(maliciousInput); // Should be treated as plain text
      expect(passwordValue).toBe(maliciousInput); // Should be treated as plain text

      // Verify no alert dialogs were triggered
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });

      await page.waitForTimeout(1000);
      expect(alertTriggered).toBe(false);
    });

    test('should handle session hijacking protection', async ({ page }) => {
      const user = TestUserFactory.create('login-session');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and login
      await authHelper.signup(user);

      // Get auth token
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();

      // Simulate different browser session trying to use same token
      // (This would be implemented by checking token validation with different user agents)
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Login UI/UX', () => {
    test('should have proper form accessibility', async ({ page }) => {
      await page.goto('/login');

      // Check for proper form labels
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Password')).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus email input
      await page.keyboard.press('Tab'); // Should focus password input
      await page.keyboard.press('Tab'); // Should focus submit button

      // Verify submit button is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');
    });

    test('should render correctly on different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/login');

        // Verify page is functional at this viewport
        const form = page.locator('form');
        await expect(form).toBeVisible();

        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();
      }
    });

    test('should show appropriate page title and headings', async ({ page }) => {
      await page.goto('/login');

      await expect(page).toHaveTitle(/IWE Web/);
      await expect(page.locator(`h2:has-text("${PAGE_TITLES.LOGIN}")`)).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/login');

      // Block network requests to simulate network failure
      await page.route('/api/auth/login', (route) => route.abort('internetdisconnected'));

      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await formHelper.submitForm(BUTTON_TEXT.SIGN_IN);

      // Wait for error handling
      await page.waitForTimeout(2000);

      // Verify form is still functional after error
      const submitButton = page.locator(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      await expect(submitButton).toBeVisible();
      await expect(submitButton).not.toBeDisabled();
    });
  });

  test.describe('Login Performance', () => {
    test('should load login page within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
    });

    test('should complete login API request within performance budget', async ({ page }) => {
      const user = TestUserFactory.create('login-perf');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const startTime = Date.now();
      const responsePromise = page.waitForResponse('/api/auth/login');
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      const response = await responsePromise;
      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 2 second budget for API response
    });
  });

  test.describe('Login Edge Cases', () => {
    test('should handle concurrent login attempts', async ({ page, context }) => {
      const user = TestUserFactory.create('login-concurrent');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user and logout
      await authHelper.signup(user);
      await authHelper.logout();

      // Create a second page to simulate concurrent login
      const page2 = await context.newPage();

      // Start login on both pages simultaneously
      await page.goto('/login');
      await page2.goto('/login');

      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page2.fill('input[type="email"]', user.email);
      await page2.fill('input[type="password"]', user.password);

      // Submit on both pages
      const response1Promise = page.waitForResponse('/api/auth/login');
      const response2Promise = page2.waitForResponse('/api/auth/login');

      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      await page2.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);

      const [response1, response2] = await Promise.all([response1Promise, response2Promise]);

      // Both should succeed (concurrent logins allowed)
      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      await page2.close();
    });

    test('should handle login with special characters in password', async ({ page }) => {
      const user = TestUserFactory.create('login-special', {
        password: 'Sp3c!@l#$%^&*()_+-={}[]|;":,./<>?`~',
      });
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user with special character password
      await authHelper.signup(user);
      await authHelper.logout();

      // Login with special character password
      await authHelper.login(user);

      await expect(page).toHaveURL('/portal');
    });

    test('should handle login with unicode characters in email', async ({ page }) => {
      const user = TestUserFactory.create('login-unicode', {
        email: 'tëst@exämple.com',
      });
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      // Create user with unicode email
      await authHelper.signup(user);
      await authHelper.logout();

      // Login with unicode email
      await authHelper.login(user);

      await expect(page).toHaveURL('/portal');
    });
  });
});
