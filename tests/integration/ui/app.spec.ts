import { test, expect } from '@playwright/test';

test('homepage renders correctly', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/IWE Web - Modern Web Development Platform/i);

  // Check for main content area - use a more flexible selector
  const content = page.locator('[class*="container"], main, #__next').first();
  await expect(content).toBeVisible();

  const logo = page.locator('text=IW').first();
  await expect(logo).toBeVisible();

  console.log('✅ Page loaded successfully');
  console.log('✅ Main content is visible');
  console.log('✅ Logo is present');
});

test('page has expected text content', async ({ page }) => {
  await page.goto('/');

  const heroText = page.locator('text=/Build modern, scalable/i');
  await expect(heroText).toBeVisible();

  // Be more specific about which "Get Started" button
  const ctaButton = page.locator('button:has-text("Get Started")').first();
  await expect(ctaButton).toBeVisible();

  console.log('✅ Page contains expected text content');
});

test('page is responsive', async ({ page }) => {
  await page.goto('/');

  const viewportSizes = [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' },
  ];

  for (const size of viewportSizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.waitForTimeout(500);

    // Use a more flexible selector for content area
    const content = page.locator('[class*="container"], main, #__next').first();
    await expect(content).toBeVisible();

    console.log(`✅ Page renders correctly at ${size.name} size (${size.width}x${size.height})`);
  }
});
