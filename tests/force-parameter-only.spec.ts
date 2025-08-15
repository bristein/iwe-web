import { test, expect } from '@playwright/test';

test.describe('Force Parameter Feature', () => {
  test('force parameter bypasses auth redirect', async ({ page }) => {
    // First, create a user and get authenticated
    const testUser = {
      email: `forcetest${Date.now()}@example.com`,
      password: 'ForceParam123!',
      name: 'Force Param User',
    };

    // Sign up
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
    const response = await signupResponse;
    expect(response.status()).toBe(201);

    // Wait for auth cookie to be set
    await page.waitForTimeout(1000);

    // Verify we have an auth token
    const cookies = await page.context().cookies();
    const hasAuth = cookies.some((c) => c.name === 'auth-token');
    expect(hasAuth).toBe(true);

    // Test 1: Access signup WITHOUT force parameter (should redirect)
    console.log('Testing /signup without force parameter...');
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    const urlWithoutForce = page.url();
    console.log('URL without force:', urlWithoutForce);
    // Should NOT be on signup page
    expect(urlWithoutForce).not.toContain('/signup');

    // Test 2: Access signup WITH force parameter (should stay)
    console.log('Testing /signup?force=true...');
    await page.goto('/signup?force=true');
    await page.waitForLoadState('networkidle');
    const urlWithForce = page.url();
    console.log('URL with force:', urlWithForce);
    // Should stay on signup page
    expect(urlWithForce).toContain('/signup?force=true');

    // Verify the signup page actually loaded
    const signupHeading = await page.locator('h1').textContent();
    expect(signupHeading).toContain('Create Account');

    // Test 3: Access login WITH force parameter
    console.log('Testing /login?force=true...');
    await page.goto('/login?force=true');
    await page.waitForLoadState('networkidle');
    const loginUrl = page.url();
    console.log('Login URL with force:', loginUrl);
    expect(loginUrl).toContain('/login?force=true');

    // Verify the login page actually loaded
    const loginHeading = await page.locator('h1').textContent();
    expect(loginHeading).toContain('Welcome Back');

    // Test 4: Verify links have force parameter when authenticated
    console.log('Testing signup link from login page...');
    const signupLink = await page.locator('a:has-text("Sign up")').getAttribute('href');
    console.log('Signup link href:', signupLink);
    expect(signupLink).toBe('/signup?force=true');

    // Navigate to signup and check login link
    await page.goto('/signup?force=true');
    const loginLink = await page.locator('a:has-text("Sign in")').getAttribute('href');
    console.log('Login link href:', loginLink);
    expect(loginLink).toBe('/login?force=true');
  });
});
