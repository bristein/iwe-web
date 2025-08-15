import { test, expect } from '@playwright/test';

test.describe('Force Parameter Implementation', () => {
  test('verifies force parameter allows authenticated users to access auth pages', async ({
    page,
  }) => {
    // Step 1: Create and authenticate a user
    const testUser = {
      email: `verify${Date.now()}@example.com`,
      password: 'Verify123!',
      name: 'Verify User',
    };

    console.log('Step 1: Creating user account...');
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
    const response = await signupResponse;
    expect(response.status()).toBe(201);
    console.log('✓ User created successfully');

    // Wait for auth to be established
    await page.waitForTimeout(2000);

    // Step 2: Verify authentication
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'auth-token');
    expect(authCookie).toBeDefined();
    console.log('✓ Authentication token present');

    // Step 3: Test redirect WITHOUT force parameter
    console.log('\nStep 2: Testing normal redirect behavior...');
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    const normalUrl = page.url();
    console.log(`- Navigated to /signup`);
    console.log(`- Redirected to: ${normalUrl}`);
    expect(normalUrl).not.toContain('/signup');
    console.log('✓ Correctly redirected away from signup when authenticated');

    // Step 4: Test access WITH force parameter
    console.log('\nStep 3: Testing force parameter...');
    await page.goto('/signup?force=true');
    await page.waitForLoadState('networkidle');
    const forceUrl = page.url();
    console.log(`- Navigated to /signup?force=true`);
    console.log(`- Current URL: ${forceUrl}`);
    expect(forceUrl).toContain('/signup?force=true');
    console.log('✓ Force parameter allows access to signup page');

    // Step 5: Verify signup page content loaded
    const pageTitle = await page.title();
    console.log(`- Page title: ${pageTitle}`);

    // Look for signup-specific elements
    const createAccountButton = await page.locator('button:has-text("Create Account")').isVisible();
    expect(createAccountButton).toBe(true);
    console.log('✓ Signup page content loaded correctly');

    // Step 6: Test login page with force parameter
    console.log('\nStep 4: Testing login page with force...');
    await page.goto('/login?force=true');
    await page.waitForLoadState('networkidle');
    const loginUrl = page.url();
    expect(loginUrl).toContain('/login?force=true');

    const signInButton = await page.locator('button:has-text("Sign In")').isVisible();
    expect(signInButton).toBe(true);
    console.log('✓ Login page accessible with force parameter');

    // Step 7: Verify link behavior
    console.log('\nStep 5: Testing navigation links...');
    const signupLink = await page.locator('a:has-text("Sign up")').getAttribute('href');
    expect(signupLink).toBe('/signup?force=true');
    console.log('✓ Signup link includes force parameter when authenticated');

    await page.goto('/signup?force=true');
    const loginLink = await page.locator('a:has-text("Sign in")').getAttribute('href');
    expect(loginLink).toBe('/login?force=true');
    console.log('✓ Login link includes force parameter when authenticated');

    console.log('\n✅ All force parameter features working correctly!');
  });
});
