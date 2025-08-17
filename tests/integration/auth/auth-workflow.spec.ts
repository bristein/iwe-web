import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  FormHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, ERROR_MESSAGES, TEST_IDS, NAV_LINKS } from '../../../lib/test-constants';

test.describe('Authentication - E2E Workflows', () => {
  let testUsers: TestUser[] = [];

  test.beforeEach(async () => {
    // Clean up any users created in previous tests
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
    // Also clean up any leftover test users from previous runs
    await DatabaseHelper.cleanupAll();
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

      // 1. SIGNUP - Browser interaction test (not API)
      await page.goto('/signup');
      await expect(page).toHaveTitle(/IWE Web/);

      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[placeholder="Choose a username"]', user.username!);
      await page.fill('input[type="password"]', user.password);

      // Test password strength indicator (UI behavior)
      await expect(page.getByText('Password strength:')).toBeVisible();

      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await expect(page).toHaveURL('/portal');

      // 2. VERIFY PORTAL ACCESS AND UI STATE
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toContainText(
        'Welcome back, ' + user.name + '!'
      );
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user.email);

      // 3. TEST AUTHENTICATED USER REDIRECTS
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');

      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');

      // 4. TEST FORCE PARAMETER BEHAVIOR
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/signup?force=true');

      // Verify force parameter navigation links
      const loginLink = await page.locator(`a:has-text("${NAV_LINKS.LOGIN}")`).getAttribute('href');
      expect(loginLink).toBe('/login?force=true');

      await page.goto('/login?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/login?force=true');

      const signupLink = await page
        .locator(`a:has-text("${NAV_LINKS.SIGNUP}")`)
        .getAttribute('href');
      expect(signupLink).toBe('/signup?force=true');

      // 5. TEST LOGOUT WORKFLOW
      await page.goto('/portal');
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL(/\/login/);

      // Verify logout cleared session
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // 6. TEST LOGIN WITH REDIRECT
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);

      // Should redirect to originally intended page
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should handle user workflow with protected route access', async ({ page }) => {
      const user = TestUserFactory.create('e2e-protected');
      testUsers.push(user);

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

      // Test route protection still works after authentication
      const authHelper = new AuthHelper(page);
      await authHelper.logout();

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
      await authHelper.signup(user);

      // Test navigation between different parts of the app
      await page.goto('/');
      await page.goto('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Test browser back/forward
      await page.goBack();
      await page.goForward();
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);

      // Test page reload maintains session
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });
  });

  test.describe('Form Validation and UI Behavior', () => {
    test('should show validation errors for signup form', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      // Test invalid email format
      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'ValidPassword123!');

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_EMAIL);

      // Test short password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123');
      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.PASSWORD_MIN_LENGTH);
    });

    test('should show validation errors for login form', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/login');

      // Test invalid email format
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'somepassword');
      await page.click('button[type="submit"]');
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_EMAIL);

      // Test invalid credentials
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    test('should handle duplicate email registration', async ({ page }) => {
      const user = TestUserFactory.create('duplicate-test');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      const formHelper = new FormHelper(page);

      // First signup
      await authHelper.signup(user);
      await authHelper.logout();

      // Try to signup with same email
      await page.goto('/signup');
      await formHelper.fillSignupForm({
        name: 'Another User',
        email: user.email,
        password: 'AnotherPassword123!',
      });

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    });
  });

  test.describe('Multi-User and Session Management', () => {
    test('should handle multiple user accounts properly', async ({ page }) => {
      const user1 = TestUserFactory.create('e2e-multi-1');
      const user2 = TestUserFactory.create('e2e-multi-2');
      testUsers.push(user1, user2);

      const authHelper = new AuthHelper(page);

      // Create and verify first user
      await authHelper.signup(user1);
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user1.name);
      await authHelper.logout();

      // Create and verify second user
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

  test.describe('Force Parameter Behavior', () => {
    test('should allow authenticated users to access auth pages with force parameter', async ({
      page,
    }) => {
      const user = TestUserFactory.create('force-auth');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
      await authHelper.signup(user);

      // Verify normal behavior (redirects)
      await page.goto('/signup');
      expect(page.url()).toContain('/portal');

      await page.goto('/login');
      expect(page.url()).toContain('/portal');

      // Verify force parameter allows access
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/signup?force=true');

      await page.goto('/login?force=true');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/login?force=true');
    });

    test('should not affect unauthenticated users', async ({ page }) => {
      await page.context().clearCookies();

      // Both should work the same way for unauthenticated users
      await page.goto('/signup');
      await expect(page).toHaveURL('/signup');

      await page.goto('/signup?force=true');
      await expect(page).toHaveURL('/signup?force=true');

      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      await page.goto('/login?force=true');
      await expect(page).toHaveURL('/login?force=true');
    });

    test('should not bypass authentication requirements', async ({ page }) => {
      await page.context().clearCookies();

      // Force parameter should not bypass authentication for protected routes
      await page.goto('/portal?force=true');
      await expect(page).toHaveURL('/login?from=%2Fportal%3Fforce%3Dtrue');
    });

    test('should maintain force parameter through navigation', async ({ page }) => {
      const user = TestUserFactory.create('force-maintain');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);
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

  test.describe('Error Handling and Security', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      const user = TestUserFactory.create('network-error');
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      // Block network requests to simulate network failure
      await page.route('/api/auth/signup', (route) => route.abort('internetdisconnected'));

      await formHelper.fillSignupForm(user);
      await formHelper.submitForm();

      // Wait for error handling
      await page.waitForTimeout(2000);

      // Verify form is still functional after error
      const submitButton = page.locator(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await expect(submitButton).toBeVisible();
      await expect(submitButton).not.toBeDisabled();
    });

    test('should protect against XSS in form inputs', async ({ page }) => {
      const maliciousInput = '<script>alert("xss")</script>';

      await page.goto('/signup');

      await page.fill('input[placeholder="Enter your full name"]', maliciousInput);
      await page.fill('input[type="email"]', 'security@example.com');

      // Verify malicious script is not executed and treated as plain text
      const nameInput = page.locator('input[placeholder="Enter your full name"]');
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toBe(maliciousInput);

      // Verify no alert dialogs were triggered
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });

      await page.waitForTimeout(1000);
      expect(alertTriggered).toBe(false);
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should have proper form accessibility', async ({ page }) => {
      await page.goto('/signup');

      // Check for proper form labels
      await expect(page.locator('text=Full Name')).toBeVisible();
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Password')).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // First input
      await page.keyboard.press('Tab'); // Second input
      await page.keyboard.press('Tab'); // Third input
      await page.keyboard.press('Tab'); // Fourth input (username)
      await page.keyboard.press('Tab'); // Submit button

      // Verify submit button is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');
    });

    test('should work across different viewport sizes', async ({ page }) => {
      const user = TestUserFactory.create('e2e-viewport');
      testUsers.push(user);

      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Test signup form is functional at this viewport
        await page.goto('/signup');
        const form = page.locator('form');
        await expect(form).toBeVisible();

        const nameInput = page.locator('input[placeholder="Enter your full name"]');
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);

        await expect(nameInput).toBeVisible();
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();
      }

      // Test complete signup flow at mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/signup');
      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should handle keyboard-only navigation', async ({ page }) => {
      const user = TestUserFactory.create('e2e-keyboard');
      testUsers.push(user);

      // Test keyboard navigation on signup
      await page.goto('/signup');

      // Tab through form fields and fill using keyboard
      await page.keyboard.press('Tab'); // Name input
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

  test.describe('Performance', () => {
    test('should complete authentication flow within performance budget', async ({ page }) => {
      const user = TestUserFactory.create('e2e-performance');
      testUsers.push(user);

      // Measure complete signup flow
      const signupStart = Date.now();

      await page.goto('/signup');
      await page.fill('input[placeholder="Enter your full name"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      await page.waitForLoadState('networkidle');

      const signupTime = Date.now() - signupStart;
      expect(signupTime).toBeLessThan(5000); // 5 second budget

      // Measure logout/login flow
      const loginStart = Date.now();

      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('/login');

      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click(`button:has-text("${BUTTON_TEXT.SIGN_IN}")`);
      await page.waitForLoadState('networkidle');

      const loginTime = Date.now() - loginStart;
      expect(loginTime).toBeLessThan(5000); // 5 second budget
    });
  });
});
