import { test, expect } from '@playwright/test';

test.describe('Complete Authentication Flow', () => {
  const testUser = {
    email: `complete${Date.now()}@example.com`,
    password: 'CompleteTest123!',
    name: 'Complete Test User',
  };

  test('full authentication flow works correctly', async ({ page }) => {
    console.log('=== Testing Complete Authentication Flow ===\n');

    // 1. SIGNUP
    console.log('1. Testing Signup...');
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
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
    expect(pageContent).toContain(testUser.name);
    console.log('✓ Portal accessible and shows user name');

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

    // 4. TEST LOGOUT
    console.log('\n4. Testing Logout...');
    await page.goto('/portal');
    await page.waitForSelector('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="user-menu-trigger"]');
    await page.click('[data-testid="logout-button"]');

    await page.waitForURL(/\/login/);
    console.log('✓ Logout successful, redirected to login');

    // 5. TEST LOGIN
    console.log('\n5. Testing Login...');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const loginResponse = page.waitForResponse('/api/auth/login');
    await page.click('button:has-text("Sign In")');
    const loginResp = await loginResponse;
    expect(loginResp.status()).toBe(200);
    console.log('✓ Login successful');

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 6. VERIFY PORTAL ACCESS AFTER LOGIN
    console.log('\n6. Testing Portal After Login...');
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    const finalUrl = page.url();
    expect(finalUrl).toContain('/portal');

    const finalContent = await page.textContent('body');
    expect(finalContent).toContain(testUser.name);
    console.log('✓ Portal accessible after login');

    // 7. TEST FORCE PARAMETER
    console.log('\n7. Testing Force Parameter...');
    await page.goto('/signup?force=true');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/signup?force=true');
    console.log('✓ Force parameter works');

    console.log('\n=== ✅ All Authentication Tests Passed! ===');
  });
});
