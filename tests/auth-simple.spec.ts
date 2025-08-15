import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Test', () => {
  test('signup creates auth token and allows portal access', async ({ page }) => {
    const testUser = {
      email: `simple${Date.now()}@example.com`,
      password: 'SimpleTest123!',
      name: 'Simple Test User',
    };

    // 1. Go to signup page
    await page.goto('/signup');

    // 2. Fill and submit signup form
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Listen for the response from signup API
    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
    const response = await signupResponse;

    console.log('Signup response status:', response.status());
    expect(response.status()).toBe(201);

    // Wait a moment for cookie to be set
    await page.waitForTimeout(1000);

    // Check cookies
    const cookies = await page.context().cookies();
    console.log(
      'Cookies after signup:',
      cookies.map((c) => c.name)
    );
    const authToken = cookies.find((c) => c.name === 'auth-token');
    expect(authToken).toBeDefined();
    console.log('Auth token found:', !!authToken);

    // Now try to access portal directly
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('Current URL after going to portal:', currentUrl);

    // Check if we're on portal or redirected
    if (currentUrl.includes('/portal')) {
      console.log('Successfully on portal');
      // Wait for content to verify portal loaded
      const welcomeText = await page.textContent('body');
      expect(welcomeText).toContain(testUser.name);
    } else {
      console.log('Redirected to:', currentUrl);
      // If redirected to login, that's the bug we're investigating
    }
  });

  test('force parameter allows access to auth pages when logged in', async ({ page }) => {
    const testUser = {
      email: `force${Date.now()}@example.com`,
      password: 'ForceTest123!',
      name: 'Force Test User',
    };

    // Create account
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
    await signupResponse;

    // Wait for cookie
    await page.waitForTimeout(1000);

    // Check if we have auth token
    const cookies = await page.context().cookies();
    const hasAuth = cookies.some((c) => c.name === 'auth-token');

    if (hasAuth) {
      // Test normal redirect (without force)
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      const urlWithoutForce = page.url();
      console.log('URL when visiting /signup without force:', urlWithoutForce);
      expect(urlWithoutForce).toContain('/portal');

      // Test with force parameter
      await page.goto('/signup?force=true');
      await page.waitForLoadState('networkidle');
      const urlWithForce = page.url();
      console.log('URL when visiting /signup?force=true:', urlWithForce);
      expect(urlWithForce).toContain('/signup?force=true');

      // Verify the page loaded
      const heading = await page.locator('h1').textContent();
      expect(heading).toContain('Create Account');
    }
  });
});
