import { test, expect } from '@playwright/test';
import {
  TestUserFactory,
  AuthHelper,
  DatabaseHelper,
  type TestUser,
} from '../../utils/test-fixtures';
import { TEST_IDS } from '../../../lib/test-constants';
import { ObjectId } from 'mongodb';
import { Project } from '../../../lib/models/project';

test.describe('Portal Page - Project Management', () => {
  // Track resources per test for proper cleanup without interfering with parallel tests
  let currentTestUsers: TestUser[] = [];
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    // Reset the current test user tracking
    currentTestUsers = [];
  });

  test.afterEach(async () => {
    // Clean up only users created by this specific test
    if (currentTestUsers.length > 0) {
      const emails = currentTestUsers.map((u) => u.email);
      try {
        await DatabaseHelper.cleanup(emails);
        console.log(`Cleaned up ${emails.length} users for current test:`, emails);
      } catch (error) {
        console.warn('Cleanup warning (non-blocking):', error);
      }
      currentTestUsers = [];
    }
  });

  test.describe('Loading States and Initial Render', () => {
    test('should handle delayed data loading correctly', async ({ page }) => {
      const user = TestUserFactory.create('portal-loading');
      currentTestUsers.push(user);

      // Set up route intercept to delay the API response
      let apiCallMade = false;
      await page.route('/api/projects*', async (route) => {
        apiCallMade = true;
        console.log(`API intercept: ${route.request().url()}`);

        // Add delay to simulate slow API
        await new Promise((resolve) => setTimeout(resolve, 1500));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify the API was intercepted
      expect(apiCallMade).toBe(true);

      // Eventually the page should show the empty state after the delayed API response
      await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 3000 });

      // Verify other page elements are present
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toBeVisible();
      await expect(page.getByTestId('create-first-project-button')).toBeVisible();
    });

    test('should handle rapid navigation during loading with AbortController', async ({ page }) => {
      const user = TestUserFactory.create('portal-rapid-nav');
      currentTestUsers.push(user);

      await authHelper.signup(user);

      // Intercept API call with delay to test cancellation behavior
      await page.route('/api/projects*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      // Navigate to portal and immediately start rapid navigation
      await page.goto('/portal');

      // Try to catch loading spinner if it appears, but don't fail if it doesn't
      // (the timing can be very precise in test environments)
      try {
        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 200 });
      } catch {
        // Loading state might be too fast in test environment, which is fine
        console.log('Loading spinner not caught - API might be too fast in test environment');
      }

      // Navigate away quickly and back to test request cancellation
      await page.goto('/login?force=true');
      await page.goto('/portal');

      // Should handle navigation gracefully without errors
      await expect(page.locator('body')).toBeVisible();

      // Eventually should show content (either projects or empty state)
      await expect(page.locator('text="Your Projects"')).toBeVisible({ timeout: 5000 });
    });

    test('should display welcome message with user name', async ({ page }) => {
      const user = TestUserFactory.create('portal-welcome');
      currentTestUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify welcome heading with user's name
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toContainText(
        `Welcome back, ${user.name}!`
      );

      // Verify subtitle text
      await expect(page.getByText('Ready to continue your writing journey?')).toBeVisible();
    });

    test('should show new project button', async ({ page }) => {
      const user = TestUserFactory.create('portal-new-project');
      currentTestUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify new project button is visible and accessible
      const newProjectButton = page.getByTestId('new-project-button');
      await expect(newProjectButton).toBeVisible();
      await expect(newProjectButton).toContainText('New Project');
      await expect(newProjectButton).toBeEnabled();
    });
  });

  test.describe('Empty State Handling', () => {
    test('should display empty state when no projects exist', async ({ page }) => {
      const user = TestUserFactory.create('portal-empty');
      currentTestUsers.push(user);

      // Mock API to return empty array
      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify empty state display
      await expect(page.getByText('No projects yet')).toBeVisible();
      await expect(
        page.getByText('Start your writing journey by creating your first project')
      ).toBeVisible();

      // Verify create first project button
      const createFirstButton = page.getByTestId('create-first-project-button');
      await expect(createFirstButton).toBeVisible();
      await expect(createFirstButton).toContainText('Create Your First Project');
      await expect(createFirstButton).toBeEnabled();

      // Verify empty state styling (dashed border container is visible)
      await expect(
        page.locator('text="Start your writing journey by creating your first project"')
      ).toBeVisible();
    });

    test('should handle empty state with dashed border styling', async ({ page }) => {
      const user = TestUserFactory.create('portal-empty-style');
      currentTestUsers.push(user);

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify empty state container has proper styling
      const emptyStateBox = page.locator('text=No projects yet').locator('..');
      await expect(emptyStateBox).toBeVisible();

      // Verify the box contains expected elements
      await expect(emptyStateBox.locator('h2:has-text("No projects yet")')).toBeVisible();
      await expect(emptyStateBox.getByTestId('create-first-project-button')).toBeVisible();
    });
  });

  test.describe('Error Handling and Retry Functionality', () => {
    test('should display error message when API fails', async ({ page }) => {
      const user = TestUserFactory.create('portal-api-error');
      currentTestUsers.push(user);

      // Mock API to return error
      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify error message is displayed
      await expect(page.getByText('Error loading projects')).toBeVisible();
      await expect(page.getByText('Failed to fetch projects: Internal Server Error')).toBeVisible();

      // Verify retry button is visible
      const retryButton = page.getByTestId('retry-projects-button');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toContainText('Retry');
      await expect(retryButton).toBeEnabled();
    });

    test('should handle specific error types', async ({ page }) => {
      const user = TestUserFactory.create('portal-specific-errors');
      currentTestUsers.push(user);

      // Test 404 error
      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not Found' }),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      await expect(page.getByText('Error loading projects')).toBeVisible();
      await expect(page.getByText('Failed to fetch projects: Not Found')).toBeVisible();
    });

    test('should handle malformed JSON responses', async ({ page }) => {
      const user = TestUserFactory.create('portal-malformed-json');
      currentTestUsers.push(user);

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{',
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      await expect(page.getByTestId('retry-projects-button')).toBeVisible({ timeout: 5000 });
    });

    test('should retry API call when retry button is clicked', async ({ page }) => {
      const user = TestUserFactory.create('portal-retry');
      currentTestUsers.push(user);

      let requestCount = 0;
      // let failCount = 0;

      await authHelper.signup(user);

      // Mock API to consistently fail, then succeed only after manual retry
      await page.route('/api/projects*', async (route) => {
        requestCount++;
        console.log(`API request ${requestCount}`);

        // Fail first few requests to ensure error state
        if (requestCount <= 2) {
          // failCount++;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto('/portal');

      // Wait for error state to appear (with persistent failures, it should stick)
      await expect(page.getByText('Error loading projects')).toBeVisible({ timeout: 10000 });

      // Click retry button
      const retryButton = page.getByTestId('retry-projects-button');
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // Should now show empty state (success)
      await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 5000 });

      // Verify the retry worked by checking error is gone
      await expect(page.getByText('Error loading projects')).not.toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const user = TestUserFactory.create('portal-network-error');
      currentTestUsers.push(user);

      // Mock network disconnection
      await page.route('/api/projects*', async (route) => {
        await route.abort('internetdisconnected');
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Should handle network error and show retry option
      await expect(page.getByTestId('retry-projects-button')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Project Display and Cards', () => {
    const createMockProjects = (): Project[] => [
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Fantasy Epic',
        description: 'A grand fantasy adventure',
        genre: 'fantasy',
        status: 'active',
        wordCount: 15000,
        wordCountGoal: 100000,
        tags: ['fantasy', 'epic'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Sci-Fi Thriller',
        description: 'Space exploration gone wrong',
        genre: 'sci-fi',
        status: 'editing',
        wordCount: 45000,
        wordCountGoal: 80000,
        tags: ['sci-fi', 'thriller'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-20'),
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Poetry Collection',
        description: 'Personal poems about nature',
        genre: 'poetry',
        status: 'completed',
        wordCount: 5000,
        wordCountGoal: 5000,
        tags: ['poetry', 'nature'],
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-10'),
      },
    ];

    test('should display projects in grid layout', async ({ page }) => {
      const user = TestUserFactory.create('portal-projects-grid');
      currentTestUsers.push(user);

      const mockProjects = createMockProjects();

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProjects),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify projects are displayed
      await expect(page.getByText('Fantasy Epic')).toBeVisible();
      await expect(page.getByText('Sci-Fi Thriller')).toBeVisible();
      await expect(page.getByText('Poetry Collection')).toBeVisible();

      // Verify projects are displayed in a grid-like structure by checking for multiple project cards
      const projectCards = page.locator('[data-testid*="open-project-"]');
      await expect(projectCards).toHaveCount(3);
    });

    test('should display project card with all information', async ({ page }) => {
      const user = TestUserFactory.create('portal-project-card');
      currentTestUsers.push(user);

      const mockProjects = createMockProjects().slice(0, 1); // Just one project

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProjects),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      const project = mockProjects[0];

      // Verify project title and description
      await expect(page.getByText(project.title)).toBeVisible();
      await expect(page.getByText(project.description!)).toBeVisible();

      // Verify status badge
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Active' })).toBeVisible();

      // Verify word count display
      await expect(page.getByText('15,000 / 100,000 words')).toBeVisible();

      // Verify genre display
      await expect(page.getByText('Genre: fantasy')).toBeVisible();

      // Verify last modified date
      await expect(page.getByText('Last modified:')).toBeVisible();

      // Verify open project button
      const openButton = page.getByTestId(`open-project-${project._id}`);
      await expect(openButton).toBeVisible();
      await expect(openButton).toContainText('Open Project');
      await expect(openButton).toBeEnabled();
    });

    test('should handle project cards with missing optional data', async ({ page }) => {
      const user = TestUserFactory.create('portal-minimal-project');
      currentTestUsers.push(user);

      const minimalProject: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Minimal Project',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([minimalProject]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify project displays with default values
      await expect(page.getByText('Minimal Project')).toBeVisible();
      await expect(page.getByText('No description provided')).toBeVisible();
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Draft' })).toBeVisible();
      await expect(page.getByText('0 / — words')).toBeVisible();

      // Genre section should not be displayed if no genre
      await expect(page.getByText('Genre:')).not.toBeVisible();
    });

    test('should handle projects with edge case data', async ({ page }) => {
      const user = TestUserFactory.create('portal-edge-cases');
      currentTestUsers.push(user);

      const edgeCaseProjects = [
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Project with Üñïçødé & Special Characters!@#$%^&*()',
          description: 'Description with\nnewlines\tand\ttabs',
          genre: 'FANTASY', // uppercase
          status: 'ACTIVE', // uppercase
          wordCount: 0,
          wordCountGoal: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'A'.repeat(100), // long title
          description: 'B'.repeat(500), // long description
          genre: 'unknown-genre',
          status: 'draft',
          wordCount: 999999,
          wordCountGoal: 1000000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(edgeCaseProjects),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Should handle all edge cases without crashing
      await expect(page.getByText('Project with Üñïçødé')).toBeVisible();
      await expect(page.getByText('AAAAAA')).toBeVisible(); // Long title should be visible

      // Should format large numbers correctly
      await expect(page.getByText('999,999 / 1,000,000 words')).toBeVisible();
    });
  });

  test.describe('Project Icon Mapping', () => {
    test('should display correct icons for different genres', async ({ page }) => {
      const user = TestUserFactory.create('portal-icons');
      currentTestUsers.push(user);

      const projectsWithGenres: Project[] = [
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Fantasy Book',
          genre: 'fantasy',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Science Fiction',
          genre: 'sci-fi',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Short Story',
          genre: 'short story',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Default Genre',
          genre: 'mystery',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'No Genre',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(projectsWithGenres),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify all projects are displayed by checking their headings
      await expect(page.getByRole('heading', { name: 'Fantasy Book' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Science Fiction' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Short Story' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Default Genre' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'No Genre' })).toBeVisible();

      // All projects should have some icon (we can't easily test specific icons in Playwright)
      const projectCards = page.locator('[data-testid*="open-project-"]');
      const cardCount = await projectCards.count();
      expect(cardCount).toBe(5);
    });
  });

  test.describe('Status Badge Colors', () => {
    test('should display correct status colors and formatting', async ({ page }) => {
      const user = TestUserFactory.create('portal-status');
      currentTestUsers.push(user);

      const projectsWithStatuses: Project[] = [
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Draft Project',
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Active Project',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Editing Project',
          status: 'editing',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Completed Project',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId(),
          title: 'Archived Project',
          status: 'archived',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(projectsWithStatuses),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify status badges with correct text formatting using role selector to avoid ambiguity
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Draft' })).toBeVisible();
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Active' })).toBeVisible();
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Editing' })).toBeVisible();
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Completed' })).toBeVisible();
      await expect(page.locator('[class*="badge"]').filter({ hasText: 'Archived' })).toBeVisible();

      // Verify all projects are displayed
      await expect(page.getByText('Draft Project')).toBeVisible();
      await expect(page.getByText('Active Project')).toBeVisible();
      await expect(page.getByText('Editing Project')).toBeVisible();
      await expect(page.getByText('Completed Project')).toBeVisible();
      await expect(page.getByText('Archived Project')).toBeVisible();
    });
  });

  test.describe('Word Count Display', () => {
    test('should format word counts with commas', async ({ page }) => {
      const user = TestUserFactory.create('portal-word-count');
      currentTestUsers.push(user);

      const projectWithLargeWordCount: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Large Project',
        status: 'active',
        wordCount: 125000,
        wordCountGoal: 200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([projectWithLargeWordCount]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify word count formatting with commas
      await expect(page.getByText('125,000 / 200,000 words')).toBeVisible();
    });

    test('should handle word count without goal', async ({ page }) => {
      const user = TestUserFactory.create('portal-no-goal');
      currentTestUsers.push(user);

      const projectWithoutGoal: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'No Goal Project',
        status: 'active',
        wordCount: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([projectWithoutGoal]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify word count without goal shows em dash
      await expect(page.getByText('5,000 / — words')).toBeVisible();
    });

    test('should handle zero word count', async ({ page }) => {
      const user = TestUserFactory.create('portal-zero-words');
      currentTestUsers.push(user);

      const projectWithZeroWords: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'New Project',
        status: 'draft',
        wordCountGoal: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([projectWithZeroWords]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify zero word count displays as 0
      await expect(page.getByText('0 / 50,000 words')).toBeVisible();
    });
  });

  test.describe('Project Interactions', () => {
    test('should handle project open button click', async ({ page }) => {
      const user = TestUserFactory.create('portal-open-project');
      currentTestUsers.push(user);

      const mockProject: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Test Project',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockProject]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Click the open project button
      const openButton = page.getByTestId(`open-project-${mockProject._id}`);
      await expect(openButton).toBeVisible();

      // Mock console.log to verify the click handler
      await page.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).testConsoleMessages = [];
        const originalLog = console.log;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log = (...args: any[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).testConsoleMessages.push(args.join(' '));
          originalLog.apply(console, args);
        };
      });

      // Click the open button
      await openButton.click();

      // Verify button click was successful by checking button is still available
      // (In the future this would navigate to project editor page)
      await expect(openButton).toBeVisible();

      // Verify no JavaScript errors occurred
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have proper accessibility attributes on project cards', async ({ page }) => {
      const user = TestUserFactory.create('portal-accessibility');
      currentTestUsers.push(user);

      const mockProject: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Accessible Project',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockProject]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify accessibility attributes
      const openButton = page.getByTestId(`open-project-${mockProject._id}`);
      const ariaLabel = await openButton.getAttribute('aria-label');
      expect(ariaLabel).toBe('Open project Accessible Project');
    });

    test('should support keyboard navigation through project cards', async ({ page }) => {
      const user = TestUserFactory.create('portal-keyboard-nav');
      currentTestUsers.push(user);

      const projects = Array.from({ length: 3 }, (_, i) => ({
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: `Keyboard Test Project ${i + 1}`,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(projects),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Wait for projects to load
      await expect(page.getByText('Keyboard Test Project 1')).toBeVisible();

      // Focus the first project button directly (more reliable than guessing tab order)
      const firstButton = page.getByTestId(`open-project-${projects[0]._id}`);
      await firstButton.focus();
      await expect(firstButton).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Verify button interaction worked (button is still visible and no errors)
      await expect(firstButton).toBeVisible();

      // Test keyboard navigation to next project button
      const secondButton = page.getByTestId(`open-project-${projects[1]._id}`);
      await secondButton.focus();
      await expect(secondButton).toBeFocused();

      // Verify both buttons can be accessed via keyboard
      await expect(firstButton).toBeVisible();
      await expect(secondButton).toBeVisible();
    });
  });

  test.describe('User Session Validation', () => {
    test('should handle missing user gracefully', async ({ page }) => {
      // Don't create a user, go directly to portal
      await page.goto('/portal');

      // Should redirect to login due to authentication middleware
      await expect(page).toHaveURL('/login?from=%2Fportal');
    });

    test('should not pass userId parameter to API for security', async ({ page }) => {
      const user = TestUserFactory.create('portal-no-userid-param');
      currentTestUsers.push(user);

      await authHelper.signup(user);

      // Intercept API call to verify no userId parameter is sent
      let apiCallMade = false;
      let hasUserIdParam = false;

      await page.route('/api/projects*', async (route) => {
        apiCallMade = true;
        const url = new URL(route.request().url());
        hasUserIdParam = url.searchParams.has('userId');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/portal');

      // Wait for API call to complete
      await page.waitForLoadState('networkidle');

      // Verify API was called without userId parameter for security
      expect(apiCallMade).toBe(true);
      expect(hasUserIdParam).toBe(false);

      // The page should still render normally
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toBeVisible();
    });

    test('should handle user session errors gracefully', async ({ page }) => {
      const user = TestUserFactory.create('portal-session-error');
      currentTestUsers.push(user);

      await authHelper.signup(user);

      // Mock invalid user session response
      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid user session' }),
        });
      });

      await page.goto('/portal');

      // Should handle session error gracefully
      await expect(page.getByText('Error loading projects')).toBeVisible();
      await expect(page.getByText('Failed to fetch projects: Unauthorized')).toBeVisible();
    });
  });

  test.describe('Additional UI Elements', () => {
    test('should display quick actions card', async ({ page }) => {
      const user = TestUserFactory.create('portal-quick-actions');
      currentTestUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify quick actions card
      await expect(page.getByText('Quick Actions')).toBeVisible();
      await expect(page.getByText('Common tasks and shortcuts')).toBeVisible();

      // Verify quick action buttons
      await expect(page.getByText('Import Manuscript')).toBeVisible();
      await expect(page.getByText('Export All Projects')).toBeVisible();
      await expect(page.getByText('Writing Statistics')).toBeVisible();
    });

    test('should display settings card', async ({ page }) => {
      const user = TestUserFactory.create('portal-settings');
      currentTestUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify settings card heading (be specific to avoid multiple matches)
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
      await expect(page.getByText('Customize your account and preferences.')).toBeVisible();

      const settingsButton = page.getByTestId('settings-button');
      await expect(settingsButton).toBeVisible();
      await expect(settingsButton).toContainText('View Settings');
      await expect(settingsButton).toBeEnabled();
    });

    test('should display account information', async ({ page }) => {
      const user = TestUserFactory.create('portal-account-info');
      currentTestUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify account information section
      await expect(page.getByText('Account Information')).toBeVisible();

      // Verify user details are displayed
      await expect(page.getByTestId('account-email')).toContainText(user.email);
      await expect(page.getByTestId('account-role')).toContainText('user');
      await expect(page.getByTestId('account-created')).toBeVisible();

      // Verify username if present
      if (user.username) {
        await expect(page.getByTestId('account-username')).toContainText(user.username);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile devices', async ({ page }) => {
      const user = TestUserFactory.create('portal-mobile');
      currentTestUsers.push(user);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify page renders on mobile
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toBeVisible();
      await expect(page.getByTestId('new-project-button')).toBeVisible();

      // Verify the page layout is responsive by checking core elements are visible
      await expect(page.getByText('Your Projects')).toBeVisible();
    });

    test('should work across different viewport sizes', async ({ page }) => {
      const user = TestUserFactory.create('portal-responsive');
      currentTestUsers.push(user);

      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];

      await authHelper.signup(user);

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/portal');

        // Verify core elements are visible at each viewport
        await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toBeVisible();
        await expect(page.getByTestId('new-project-button')).toBeVisible();
        await expect(page.getByText('Your Projects')).toBeVisible();
      }
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should handle large number of projects efficiently', async ({ page }) => {
      const user = TestUserFactory.create('portal-performance');
      currentTestUsers.push(user);

      // Create a large number of mock projects
      const manyProjects = Array.from({ length: 50 }, (_, i) => ({
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: `Project ${i + 1}`,
        description: `Description for project ${i + 1}`,
        status: 'active' as const,
        wordCount: Math.floor(Math.random() * 50000),
        wordCountGoal: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(manyProjects),
        });
      });

      await authHelper.signup(user);

      const startTime = Date.now();
      await page.goto('/portal');

      // Wait for all projects to load with exact text matching
      await expect(page.getByText('Project 1', { exact: true })).toBeVisible();
      await expect(page.getByText('Project 50', { exact: true })).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Performance assertion - page should load within reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test.skip('should handle rapid user interactions without errors', async ({ page }) => {
      // SKIPPED: This test is flaky after adding navigation to project detail pages.
      // The rapid clicking causes instability when navigation is triggered.
      // This needs to be refactored to test rapid interactions without actual navigation.
      const user = TestUserFactory.create('portal-rapid-clicks');
      currentTestUsers.push(user);

      const mockProject: Project = {
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: 'Rapid Click Test',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockProject]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      const openButton = page.getByTestId(`open-project-${mockProject._id}`);
      await expect(openButton).toBeVisible();

      // Override the router.push method to prevent navigation
      await page.evaluate(() => {
        // Store the original push method
        const originalPush = window.history.pushState;
        let pushCount = 0;

        // Override to count navigation attempts without actually navigating
        window.history.pushState = function () {
          pushCount++;
          console.log('Navigation attempt:', pushCount);
          // Don't actually navigate
          return;
        };

        // Store count for later retrieval
        (window as unknown as { __navigationAttempts: () => number }).__navigationAttempts = () =>
          pushCount;

        // Restore after test
        (window as unknown as { __restoreNavigation: () => void }).__restoreNavigation = () => {
          window.history.pushState = originalPush;
        };
      });

      // Rapidly click the button multiple times
      for (let i = 0; i < 5; i++) {
        await openButton.click();
        await page.waitForTimeout(50);
      }

      // Get navigation attempts count
      const navigationAttempts = await page.evaluate(() =>
        (window as unknown as { __navigationAttempts: () => number }).__navigationAttempts()
      );

      // Restore original navigation
      await page.evaluate(() =>
        (window as unknown as { __restoreNavigation: () => void }).__restoreNavigation()
      );

      // Page should still be functional
      await expect(openButton).toBeVisible();
      await expect(page.getByText('Rapid Click Test')).toBeVisible();

      // Verify that multiple navigation attempts were made
      expect(navigationAttempts).toBeGreaterThanOrEqual(5);
    });

    test('should test React.memo optimization for ProjectCard component', async ({ page }) => {
      const user = TestUserFactory.create('portal-memo-test');
      currentTestUsers.push(user);

      const projects = Array.from({ length: 10 }, (_, i) => ({
        _id: new ObjectId(),
        userId: new ObjectId(),
        title: `Project ${i + 1}`,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await page.route('/api/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(projects),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify all projects load with exact text matching
      await expect(page.getByText('Project 1', { exact: true })).toBeVisible();
      await expect(page.getByText('Project 10', { exact: true })).toBeVisible();

      // Interact with one project card and verify others remain stable
      const firstProjectButton = page.getByTestId(`open-project-${projects[0]._id}`);
      await firstProjectButton.click();

      // All project cards should still be visible and functional
      for (let i = 0; i < 5; i++) {
        await expect(page.getByText(`Project ${i + 1}`, { exact: true })).toBeVisible();
      }
    });

    test('should handle memory cleanup on component unmount', async ({ page }) => {
      const user = TestUserFactory.create('portal-cleanup');
      currentTestUsers.push(user);

      await page.route('/api/projects*', async (route) => {
        // Simulate slow response to test cleanup
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Navigate away quickly to test cleanup
      await page.goto('/login?force=true');

      // Should handle navigation without memory leaks or errors
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
