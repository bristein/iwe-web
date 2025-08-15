import { test, expect } from '@playwright/test';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  username: 'testuser',
};

const testUser2 = {
  email: 'test2@example.com',
  password: 'TestPassword456!',
  name: 'Test User 2',
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean state
    await page.goto('/');
  });

  test.describe('Signup Flow', () => {
    test('should successfully sign up a new user', async ({ page }) => {
      await page.goto('/signup');

      // Fill in signup form
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill('input[placeholder="Choose a username"]', testUser.username);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );

      // Check password strength indicator appears
      await expect(page.getByText('Password strength:')).toBeVisible();
      await expect(page.getByText('Strong')).toBeVisible();

      // Submit the form
      await page.click('button[type="submit"]');

      // Should redirect to portal after successful signup
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId('welcome-heading')).toContainText('Welcome back, Test User!');
      await expect(page.getByTestId('user-name')).toContainText('Test User');
      await expect(page.getByTestId('user-email')).toContainText('test@example.com');
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/signup');

      // Try to submit with empty form
      await page.click('button[type="submit"]');

      await expect(page.getByText('Name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();

      // Test invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();

      // Test short password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123');
      await page.click('button[type="submit"]');
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

      // Test short username
      await page.fill('input[placeholder="Choose a username"]', 'ab');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
    });

    test('should handle duplicate email error', async ({ page }) => {
      // First, create a user
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser2.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser2.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser2.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Logout
      await page.getByTestId('user-menu-trigger').click();
      await page.getByTestId('logout-button').click();
      await expect(page).toHaveURL('/login');

      // Try to signup with same email
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', 'Another User');
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser2.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        'AnotherPassword123!'
      );
      await page.click('button[type="submit"]');

      await expect(page.getByText('A user with this email already exists')).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test('should successfully log in an existing user', async ({ page }) => {
      // First create a user by signing up
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Logout
      await page.getByTestId('user-menu-trigger').click();
      await page.getByTestId('logout-button').click();
      await expect(page).toHaveURL('/login');

      // Now login with the same credentials
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');

      // Should redirect to portal after successful login
      await expect(page).toHaveURL('/portal');
      await expect(page.getByTestId('welcome-heading')).toContainText('Welcome back, Test User!');
      await expect(page.getByTestId('user-name')).toContainText('Test User');
      await expect(page.getByTestId('user-email')).toContainText('test@example.com');
    });

    test('should show validation errors for invalid login', async ({ page }) => {
      await page.goto('/login');

      // Try to submit with empty form
      await page.click('button[type="submit"]');

      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();

      // Test invalid email format
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Try to login with non-existent credentials
      await page.fill(
        'input[type="email"][placeholder="Enter your email"]',
        'nonexistent@example.com'
      );
      await page.fill('input[type="password"][placeholder="Enter your password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access portal directly (should redirect to login with 'from' parameter)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Create a user first
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Logout
      await page.getByTestId('user-menu-trigger').click();
      await page.getByTestId('logout-button').click();
      await expect(page).toHaveURL('/login');

      // Try to access portal again (should redirect to login with 'from' parameter)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');

      // Login and should redirect back to portal
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully log out a user', async ({ page }) => {
      // First sign up a user
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Verify user is logged in
      await expect(page.getByTestId('user-name')).toContainText('Test User');

      // Logout
      await page.getByTestId('user-menu-trigger').click();
      await page.getByTestId('logout-button').click();

      // Should redirect to login page
      await expect(page).toHaveURL('/login');

      // Try to access portal again (should redirect to login)
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });
  });

  test.describe('Route Protection', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/portal');
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should redirect authenticated users away from auth pages', async ({ page }) => {
      // First sign up a user
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Try to access login page (should redirect to portal)
      await page.goto('/login');
      await expect(page).toHaveURL('/portal');

      // Try to access signup page (should redirect to portal)
      await page.goto('/signup');
      await expect(page).toHaveURL('/portal');
    });
  });

  test.describe('Portal Features', () => {
    test('should display user information in portal', async ({ page }) => {
      // Sign up a user with all fields
      await page.goto('/signup');
      await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
      await page.fill('input[type="email"][placeholder="Enter your email"]', testUser.email);
      await page.fill('input[placeholder="Choose a username"]', testUser.username);
      await page.fill(
        'input[type="password"][placeholder="Enter your password"]',
        testUser.password
      );
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/portal');

      // Check portal displays correct information
      await expect(page.getByTestId('welcome-heading')).toContainText('Welcome back, Test User!');
      await expect(page.getByTestId('user-name')).toContainText('Test User');
      await expect(page.getByTestId('user-email')).toContainText('test@example.com');
      await expect(page.getByTestId('account-email')).toContainText('test@example.com');
      await expect(page.getByTestId('account-role')).toContainText('user');
      await expect(page.getByTestId('account-username')).toContainText('testuser');
      await expect(page.getByTestId('account-created')).toBeVisible();

      // Check portal cards are present
      await expect(page.getByTestId('projects-button')).toBeVisible();
      await expect(page.getByTestId('characters-button')).toBeVisible();
      await expect(page.getByTestId('settings-button')).toBeVisible();
    });
  });
});
