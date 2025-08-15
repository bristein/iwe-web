import { test, expect } from '@playwright/test';

test.describe('Authentication with Force Parameter', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    username: `testuser${Date.now()}`,
  };

  test('should allow signup, login, and force parameter navigation', async ({ page }) => {
    // 1. Go to signup page
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');

    // 2. Fill signup form
    await page.fill('input[type="text"][placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder="Choose a username"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);

    // 3. Submit signup form
    await page.click('button:has-text("Create Account")');

    // 4. Wait for navigation (could be portal or login)
    await page.waitForLoadState('networkidle');

    // Check if we have an auth token cookie
    const cookies = await page.context().cookies();
    const hasAuthToken = cookies.some((cookie) => cookie.name === 'auth-token');

    if (hasAuthToken) {
      // If we have a token, wait for portal or check current URL
      const currentUrl = page.url();

      // If not on portal yet, navigate to it
      if (!currentUrl.includes('/portal')) {
        await page.goto('/portal');
      }

      // Wait for portal content to load
      await page.waitForSelector('[data-testid="welcome-heading"]', { timeout: 10000 });

      // 5. Try to access signup page while logged in (should redirect to portal)
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      // Should be redirected to portal
      expect(page.url()).toContain('/portal');

      // 6. Access signup page with force parameter (should stay on signup)
      await page.goto('/signup?force=true');
      await expect(page).toHaveURL(/\/signup\?force=true/);
      await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();

      // 7. Navigate to login page using the link (should include force parameter)
      const signInLink = page.locator('a:has-text("Sign in")');
      const href = await signInLink.getAttribute('href');
      expect(href).toBe('/login?force=true');
      await signInLink.click();

      // 8. Should be on login page with force parameter
      await expect(page).toHaveURL(/\/login\?force=true/);
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();

      // 9. Navigate back to signup using the link (should include force parameter)
      const signUpLink = page.locator('a:has-text("Sign up")');
      const signupHref = await signUpLink.getAttribute('href');
      expect(signupHref).toBe('/signup?force=true');

      // 10. Test logout functionality
      await page.goto('/portal');
      await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 5000 });

      // Open user menu and logout
      await page.click('[data-testid="user-menu-trigger"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login after logout
      await page.waitForURL(/\/login/, { timeout: 5000 });

      // 11. After logout, accessing signup should work normally
      await page.goto('/signup');
      await expect(page).toHaveURL('/signup');

      // 12. Links should not have force parameter when not authenticated
      const signInLinkAfterLogout = page.locator('a:has-text("Sign in")');
      const hrefAfterLogout = await signInLinkAfterLogout.getAttribute('href');
      expect(hrefAfterLogout).toBe('/login');
    } else {
      // If signup failed, fail the test
      throw new Error('Signup failed - no auth token found');
    }
  });

  test('should handle login flow with force parameter', async ({ page }) => {
    // Create a new user first
    const loginTestUser = {
      email: `logintest${Date.now()}@example.com`,
      password: 'LoginTest123!',
      name: 'Login Test User',
    };

    // Sign up
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', loginTestUser.name);
    await page.fill('input[type="email"]', loginTestUser.email);
    await page.fill('input[type="password"]', loginTestUser.password);
    await page.click('button:has-text("Create Account")');

    // Wait for signup to complete
    await page.waitForLoadState('networkidle');

    // Logout using API
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });

    // Go to login page
    await page.goto('/login');
    await page.fill('input[type="email"]', loginTestUser.email);
    await page.fill('input[type="password"]', loginTestUser.password);
    await page.click('button:has-text("Sign In")');

    // Wait for login to complete
    await page.waitForLoadState('networkidle');

    // Check if we're logged in
    const cookies = await page.context().cookies();
    const hasAuthToken = cookies.some((cookie) => cookie.name === 'auth-token');

    if (hasAuthToken) {
      // Navigate to portal if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/portal')) {
        await page.goto('/portal');
      }

      // Test force parameter on login page
      await page.goto('/login?force=true');
      await expect(page).toHaveURL(/\/login\?force=true/);
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
    } else {
      throw new Error('Login failed - no auth token found');
    }
  });

  test('should redirect to portal without force parameter when authenticated', async ({ page }) => {
    // Create and login a user
    const redirectTestUser = {
      email: `redirect${Date.now()}@example.com`,
      password: 'RedirectTest123!',
      name: 'Redirect Test User',
    };

    // Sign up
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', redirectTestUser.name);
    await page.fill('input[type="email"]', redirectTestUser.email);
    await page.fill('input[type="password"]', redirectTestUser.password);
    await page.click('button:has-text("Create Account")');

    // Wait for signup to complete
    await page.waitForLoadState('networkidle');

    // Check if we have an auth token
    const cookies = await page.context().cookies();
    const hasAuthToken = cookies.some((cookie) => cookie.name === 'auth-token');

    if (hasAuthToken) {
      // Test redirects without force parameter
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');

      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/portal');
    } else {
      throw new Error('Signup failed - no auth token found');
    }
  });
});
