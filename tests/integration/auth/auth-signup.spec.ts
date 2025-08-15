import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  FormHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { BUTTON_TEXT, ERROR_MESSAGES, PAGE_TITLES, TEST_IDS } from '../../../lib/test-constants';

test.describe('Authentication - Signup', () => {
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

  test.describe('Basic Signup Flow', () => {
    test('should successfully sign up a new user with all fields', async ({ page }) => {
      const user = TestUserFactory.create('signup-complete');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      await page.goto('/signup');
      await expect(page).toHaveTitle(/IWE Web/);

      // Fill in signup form with all fields including username
      await page.fill('input[type="text"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[placeholder="Choose a username"]', user.username!);
      await page.fill('input[type="password"]', user.password);

      // Check password strength indicator appears
      await expect(page.getByText('Password strength:')).toBeVisible();

      // Submit the form and verify API response
      const responsePromise = page.waitForResponse('/api/auth/signup');
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      expect(response.status()).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.message).toBe('User created successfully');
      expect(responseBody.user.email).toBe(user.email);
      expect(responseBody.user.name).toBe(user.name);
      expect(responseBody.user.username).toBe(user.username);

      // Should redirect to portal after successful signup
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toContainText(
        'Welcome back, ' + user.name + '!'
      );
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
      await expect(page.getByTestId(TEST_IDS.USER_EMAIL)).toContainText(user.email);
    });

    test('should successfully sign up a new user without optional username', async ({ page }) => {
      const user = TestUserFactory.create('signup-minimal', { username: undefined });
      testUsers.push(user);

      await page.goto('/signup');

      // Fill in only required fields
      await page.fill('input[type="text"]', user.name);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      const responsePromise = page.waitForResponse('/api/auth/signup');
      await page.click(`button:has-text("${BUTTON_TEXT.CREATE_ACCOUNT}")`);
      const response = await responsePromise;

      expect(response.status()).toBe(201);

      // Should redirect to portal
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId(TEST_IDS.USER_NAME)).toContainText(user.name);
    });

    test('should set authentication cookie after successful signup', async ({ page }) => {
      const user = TestUserFactory.create('signup-cookie');
      testUsers.push(user);

      const authHelper = new AuthHelper(page);

      await authHelper.signup(user);

      // Verify auth token cookie is set
      const authToken = await authHelper.getAuthToken();
      expect(authToken).toBeDefined();
      expect(authToken).toBeTruthy();

      // Verify cookie allows access to portal
      await page.goto('/portal');
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Signup Validation', () => {
    test('should show validation errors for missing required fields', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      // Try to submit without any fields
      await formHelper.submitForm();

      // Verify we're still on the signup page (form didn't submit)
      await expect(page).toHaveURL('/signup');

      // Fill fields one by one to see validation clear
      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'ValidPassword123!');

      // Now submission should work
      const user = TestUserFactory.create('validation-test', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });
      testUsers.push(user);

      const responsePromise = page.waitForResponse('/api/auth/signup');
      await formHelper.submitForm();
      const response = await responsePromise;
      expect(response.status()).toBe(201);
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'ValidPassword123!');

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.INVALID_EMAIL);
    });

    test('should show validation error for short password', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123');

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.PASSWORD_MIN_LENGTH);
    });

    test('should show validation error for short username', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[placeholder="Choose a username"]', 'ab');
      await page.fill('input[type="password"]', 'ValidPassword123!');

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.USERNAME_MIN_LENGTH);
    });
  });

  test.describe('Signup Edge Cases', () => {
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

      const responsePromise = page.waitForResponse('/api/auth/signup');
      await formHelper.submitForm();
      const response = await responsePromise;

      // Should fail with 409 Conflict
      expect(response.status()).toBe(409);
      const errorBody = await response.json();
      expect(errorBody.error).toContain('already exists');

      await formHelper.expectValidationError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    });

    test('should enforce password requirements', async ({ page }) => {
      const formHelper = new FormHelper(page);

      await page.goto('/signup');

      // Fill form with weak password
      await formHelper.fillSignupForm({
        name: 'Test User',
        email: 'test@example.com',
        password: '123',
      });

      await formHelper.submitForm();
      await formHelper.expectValidationError(ERROR_MESSAGES.PASSWORD_MIN_LENGTH);
    });

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
      const user = TestUserFactory.create('security-test', {
        name: maliciousInput,
        email: 'security@example.com',
      });

      await page.goto('/signup');

      const formHelper = new FormHelper(page);
      await formHelper.fillSignupForm(user);

      // Verify malicious script is not executed
      const nameInput = page.locator('input[placeholder="Enter your full name"]');
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toBe(maliciousInput); // Should be treated as plain text

      // Verify no alert dialogs were triggered
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });

      await page.waitForTimeout(1000);
      expect(alertTriggered).toBe(false);
    });
  });

  test.describe('Signup UI/UX', () => {
    test('should display password strength indicator', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('input[type="text"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'StrongPassword123!');

      // Check password strength indicator appears
      await expect(page.getByText('Password strength:')).toBeVisible();
      await expect(page.getByText('Strong')).toBeVisible();
    });

    test('should have proper form accessibility', async ({ page }) => {
      await page.goto('/signup');

      // Check for proper form labels
      await expect(page.locator('text=Full Name')).toBeVisible();
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Password')).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus first input
      await page.keyboard.press('Tab'); // Should focus second input
      await page.keyboard.press('Tab'); // Should focus third input
      await page.keyboard.press('Tab'); // Should focus fourth input (if username present)
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
        await page.goto('/signup');

        // Verify page is functional at this viewport
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
    });
  });

  test.describe('Signup Performance', () => {
    test('should load signup page within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
    });

    test('should complete signup API request within performance budget', async ({ page }) => {
      const user = TestUserFactory.create('perf-test');
      testUsers.push(user);

      const formHelper = new FormHelper(page);

      await page.goto('/signup');
      await formHelper.fillSignupForm(user);

      const startTime = Date.now();
      const responsePromise = page.waitForResponse('/api/auth/signup');
      await formHelper.submitForm();
      const response = await responsePromise;
      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(201);
      expect(responseTime).toBeLessThan(2000); // 2 second budget for API response
    });
  });
});
