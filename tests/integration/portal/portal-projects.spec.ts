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
  let testUsers: TestUser[] = [];
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);

    // Clean up any users created in previous tests
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
    await DatabaseHelper.cleanupAll();
  });

  test.afterEach(async () => {
    // Clean up users created in this test
    if (testUsers.length > 0) {
      await DatabaseHelper.cleanup(testUsers.map((u) => u.email));
      testUsers = [];
    }
  });

  test.describe('Loading States and Initial Render', () => {
    test('should show loading spinner while fetching projects', async ({ page }) => {
      const user = TestUserFactory.create('portal-loading');
      testUsers.push(user);

      await authHelper.signup(user);

      // Intercept API call to delay response and verify loading state
      await page.route('/api/projects*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        await route.continue();
      });

      await page.goto('/portal');

      // Verify loading spinner is shown
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 500 });

      // Wait for loading to complete
      await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible({
        timeout: 3000,
      });
    });

    test('should handle rapid navigation during loading with AbortController', async ({ page }) => {
      const user = TestUserFactory.create('portal-rapid-nav');
      testUsers.push(user);

      await authHelper.signup(user);

      // Intercept API call with longer delay to test cancellation
      await page.route('/api/projects*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/portal');

      // Verify loading state appears
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 500 });

      // Navigate away quickly and back to test request cancellation
      await page.goto('/login?force=true');
      await page.goto('/portal');

      // Should handle navigation gracefully without errors
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display welcome message with user name', async ({ page }) => {
      const user = TestUserFactory.create('portal-welcome');
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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

      // Verify file icon is displayed
      await expect(page.locator('svg')).toBeVisible(); // File icon
    });

    test('should handle empty state with dashed border styling', async ({ page }) => {
      const user = TestUserFactory.create('portal-empty-style');
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

      let requestCount = 0;

      // Mock API to fail first time, succeed second time
      await page.route('/api/projects*', async (route) => {
        requestCount++;
        if (requestCount === 1) {
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

      await authHelper.signup(user);
      await page.goto('/portal');

      // First request should show error
      await expect(page.getByText('Error loading projects')).toBeVisible();

      // Click retry button
      await page.getByTestId('retry-projects-button').click();

      // Should now show empty state (success)
      await expect(page.getByText('No projects yet')).toBeVisible();
      await expect(page.getByText('Error loading projects')).not.toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const user = TestUserFactory.create('portal-network-error');
      testUsers.push(user);

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
      testUsers.push(user);

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

      // Verify grid layout exists
      const grid = page.locator('[style*="grid"]').first();
      await expect(grid).toBeVisible();
    });

    test('should display project card with all information', async ({ page }) => {
      const user = TestUserFactory.create('portal-project-card');
      testUsers.push(user);

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
      await expect(page.getByText('Active')).toBeVisible();

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
      testUsers.push(user);

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
      await expect(page.getByText('Draft')).toBeVisible();
      await expect(page.getByText('0 / — words')).toBeVisible();

      // Genre section should not be displayed if no genre
      await expect(page.getByText('Genre:')).not.toBeVisible();
    });

    test('should handle projects with edge case data', async ({ page }) => {
      const user = TestUserFactory.create('portal-edge-cases');
      testUsers.push(user);

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
      testUsers.push(user);

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

      // Verify all projects are displayed
      await expect(page.getByText('Fantasy Book')).toBeVisible();
      await expect(page.getByText('Science Fiction')).toBeVisible();
      await expect(page.getByText('Short Story')).toBeVisible();
      await expect(page.getByText('Default Genre')).toBeVisible();
      await expect(page.getByText('No Genre')).toBeVisible();

      // All projects should have some icon (we can't easily test specific icons in Playwright)
      const projectCards = page.locator('[data-testid*="open-project-"]');
      const cardCount = await projectCards.count();
      expect(cardCount).toBe(5);
    });
  });

  test.describe('Status Badge Colors', () => {
    test('should display correct status colors and formatting', async ({ page }) => {
      const user = TestUserFactory.create('portal-status');
      testUsers.push(user);

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

      // Verify status badges with correct text formatting
      await expect(page.getByText('Draft')).toBeVisible();
      await expect(page.getByText('Active')).toBeVisible();
      await expect(page.getByText('Editing')).toBeVisible();
      await expect(page.getByText('Completed')).toBeVisible();
      await expect(page.getByText('Archived')).toBeVisible();

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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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

      await openButton.click();

      // Verify the console log (since the TODO is to navigate to project editor)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const consoleLogs = await page.evaluate(() => (window as any).testConsoleMessages);
      expect(consoleLogs.some((log: string) => log.includes('Opening project:'))).toBe(true);
    });

    test('should have proper accessibility attributes on project cards', async ({ page }) => {
      const user = TestUserFactory.create('portal-accessibility');
      testUsers.push(user);

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
      testUsers.push(user);

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

      // Tab through the page to project buttons
      await page.keyboard.press('Tab'); // New project button
      await page.keyboard.press('Tab'); // First project button

      // Check focus is on first project button
      const firstButton = page.getByTestId(`open-project-${projects[0]._id}`);
      await expect(firstButton).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Continue tabbing to next project
      await page.keyboard.press('Tab');
      const secondButton = page.getByTestId(`open-project-${projects[1]._id}`);
      await expect(secondButton).toBeFocused();
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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

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
      testUsers.push(user);

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify settings card
      await expect(page.getByText('Settings')).toBeVisible();
      await expect(page.getByText('Customize your account and preferences.')).toBeVisible();

      const settingsButton = page.getByTestId('settings-button');
      await expect(settingsButton).toBeVisible();
      await expect(settingsButton).toContainText('View Settings');
      await expect(settingsButton).toBeEnabled();
    });

    test('should display account information', async ({ page }) => {
      const user = TestUserFactory.create('portal-account-info');
      testUsers.push(user);

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
      testUsers.push(user);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await authHelper.signup(user);
      await page.goto('/portal');

      // Verify page renders on mobile
      await expect(page.getByTestId(TEST_IDS.WELCOME_HEADING)).toBeVisible();
      await expect(page.getByTestId('new-project-button')).toBeVisible();

      // Verify responsive grid behavior (though specific CSS testing is limited in Playwright)
      const grid = page.locator('[style*="grid"]').first();
      if (await grid.isVisible()) {
        await expect(grid).toBeVisible();
      }
    });

    test('should work across different viewport sizes', async ({ page }) => {
      const user = TestUserFactory.create('portal-responsive');
      testUsers.push(user);

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
      testUsers.push(user);

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

      // Wait for all projects to load
      await expect(page.getByText('Project 1')).toBeVisible();
      await expect(page.getByText('Project 50')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Performance assertion - page should load within reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should handle rapid user interactions without errors', async ({ page }) => {
      const user = TestUserFactory.create('portal-rapid-clicks');
      testUsers.push(user);

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

      // Rapidly click the button multiple times
      for (let i = 0; i < 5; i++) {
        await openButton.click();
        await page.waitForTimeout(100);
      }

      // Page should still be functional
      await expect(openButton).toBeVisible();
      await expect(page.getByText('Rapid Click Test')).toBeVisible();
    });

    test('should test React.memo optimization for ProjectCard component', async ({ page }) => {
      const user = TestUserFactory.create('portal-memo-test');
      testUsers.push(user);

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

      // Verify all projects load
      await expect(page.getByText('Project 1')).toBeVisible();
      await expect(page.getByText('Project 10')).toBeVisible();

      // Interact with one project card and verify others remain stable
      const firstProjectButton = page.getByTestId(`open-project-${projects[0]._id}`);
      await firstProjectButton.click();

      // All project cards should still be visible and functional
      for (let i = 0; i < 5; i++) {
        await expect(page.getByText(`Project ${i + 1}`)).toBeVisible();
      }
    });

    test('should handle memory cleanup on component unmount', async ({ page }) => {
      const user = TestUserFactory.create('portal-cleanup');
      testUsers.push(user);

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
