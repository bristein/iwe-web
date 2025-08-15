import { test, expect } from '@playwright/test';

test.describe('Portal Debug', () => {
  test('inspect portal rendering error', async ({ page }) => {
    // Create and authenticate a user first
    const testUser = {
      email: `debug${Date.now()}@example.com`,
      password: 'Debug123!',
      name: 'Debug User',
    };

    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Enable page error logging
    page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
      console.log('Stack:', error.stack);
    });

    // Sign up first
    console.log('Creating test user...');
    await page.goto('/signup');
    await page.fill('input[placeholder="Enter your full name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    const signupResponse = page.waitForResponse('/api/auth/signup');
    await page.click('button:has-text("Create Account")');
    const response = await signupResponse;
    expect(response.status()).toBe(201);
    console.log('✓ User created');

    // Wait for auth to be established
    await page.waitForTimeout(2000);

    // Now try to access portal
    console.log('\nAccessing portal...');
    await page.goto('/portal', { waitUntil: 'domcontentloaded' });

    // Wait a bit to see what loads
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ path: 'portal-error.png', fullPage: true });
    console.log('Screenshot saved as portal-error.png');

    // Get the page HTML
    const html = await page.content();
    console.log('\n=== Page HTML (first 2000 chars) ===');
    console.log(html.substring(0, 2000));

    // Check for error messages
    const errorElement = await page.locator('text=/error|Error|failed|Failed/i').first();
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log('\n=== Error found on page ===');
      console.log('Error text:', errorText);
    }

    // Check for React error boundary
    const reactError = await page.locator('[data-nextjs-error], #__next-build-error').first();
    if (await reactError.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorContent = await reactError.textContent();
      console.log('\n=== React Error Boundary ===');
      console.log('Error:', errorContent);
    }

    // Try to get more specific error info
    const pageTitle = await page.title();
    console.log('\nPage title:', pageTitle);

    // Check if the portal layout is loading
    const portalLayout = await page.locator('[data-testid="user-menu-trigger"]');
    if (await portalLayout.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Portal layout loaded successfully');

      // Check portal content
      const welcomeHeading = await page.locator('[data-testid="welcome-heading"]');
      if (await welcomeHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        const welcomeText = await welcomeHeading.textContent();
        console.log('Welcome text:', welcomeText);
      } else {
        console.log('⚠ Welcome heading not found');
      }
    } else {
      console.log('⚠ Portal layout not loaded');

      // Check for loading state
      const skeleton = await page.locator('.chakra-skeleton, [data-loading]').first();
      if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Loading skeleton detected - auth might be loading');
      }
    }

    // Check network requests
    console.log('\n=== Checking API calls ===');
    const apiResponses = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    // Reload to capture API calls
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('API responses:', apiResponses);
  });
});
