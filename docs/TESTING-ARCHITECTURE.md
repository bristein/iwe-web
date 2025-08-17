# Testing Architecture Guide

This document outlines the dual testing framework architecture implemented for the IWE Web project, separating API testing from browser-based end-to-end testing for optimal performance and maintainability.

## Overview

The project now uses two complementary testing frameworks:

1. **Vitest** - Lightweight, fast API and backend testing
2. **Playwright** - Browser-based integration and E2E testing

## Framework Selection Rationale

### Vitest for API Testing
- **Superior TypeScript support** out of the box
- **Fast test execution** with intelligent watch mode
- **Excellent Node.js API testing** capabilities  
- **Built-in coverage reporting**
- **Instant feedback** during development
- **Lighter resource usage** than browser-based testing

### Playwright for E2E Testing
- **Browser automation** for UI workflows
- **Cross-browser testing** capabilities
- **Visual testing** and screenshot comparison
- **Network interception** and mocking
- **Mobile testing** support

## Directory Structure

```
tests/
├── api/                          # Vitest API tests
│   ├── setup/
│   │   ├── global-setup.ts       # MongoDB + web server setup
│   │   └── test-setup.ts         # Per-test cleanup
│   ├── utils/
│   │   ├── api-client.ts         # HTTP client wrapper
│   │   ├── test-factories.ts     # Test data creation
│   │   └── auth-helpers.ts       # Authentication utilities
│   ├── auth/
│   │   ├── auth-signup.test.ts   # User registration API tests
│   │   ├── auth-login.test.ts    # Authentication API tests
│   │   └── auth-profile.test.ts  # User profile API tests
│   └── health/
│       └── health-check.test.ts  # Health endpoint tests
├── integration/                  # Playwright E2E tests
│   ├── auth/
│   │   ├── auth-e2e.spec.ts     # Full browser workflows
│   │   ├── auth-login.spec.ts   # Login UI testing
│   │   └── auth-signup.spec.ts  # Signup UI testing
│   └── ui/
│       └── app.spec.ts          # UI component testing
└── utils/                       # Shared utilities
    ├── mongodb-test-server.ts   # MongoDB test infrastructure
    ├── test-fixtures.ts         # Shared test data
    └── db-cleanup.ts           # Database cleanup
```

## Test Categories

### API Tests (Vitest)
Run API-only tests that don't require a browser:

```bash
# Run all API tests
pnpm run test:api

# Watch mode for development
pnpm run test:api:watch

# With coverage report
pnpm run test:api:coverage

# Interactive UI
pnpm run test:api:ui
```

**What to test with Vitest:**
- Authentication endpoints
- Data validation
- Security testing
- Performance testing
- Error handling
- Database operations
- Business logic

### E2E Tests (Playwright)
Run browser-based integration tests:

```bash
# Run all E2E tests
pnpm run test:e2e

# Specific test suites
pnpm run test:e2e:auth
pnpm run test:e2e:ui
pnpm run test:e2e:mobile

# Debug mode
pnpm run test:e2e:debug

# Headed mode (visible browser)
pnpm run test:e2e:headed

# Interactive mode
pnpm run test:e2e:watch
```

**What to test with Playwright:**
- User workflows and journeys
- UI interactions and behaviors
- Form submissions with validation
- Navigation and routing
- Session management
- Cross-browser compatibility
- Mobile responsiveness
- Visual regression testing

### Combined Testing
Run both test suites:

```bash
# Run all tests (API + E2E)
pnpm run test
# or
pnpm run test:all
```

## Writing API Tests

### Basic Structure

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient } from '../utils/api-client';
import { TestUserFactory, ApiAssertions } from '../utils/test-factories';

describe('My API Feature', () => {
  let client: SuperTest<Test>;

  beforeEach(async () => {
    client = await createApiClient();
  });

  test('should handle valid request', async () => {
    const user = TestUserFactory.create('test-case');
    
    const response = await client
      .post('/api/endpoint')
      .send({ data: user });
    
    ApiAssertions.assertUserCreated(response, user);
  });
});
```

### Test Utilities

#### TestUserFactory
Creates test users with automatic cleanup:

```typescript
// Basic user
const user = TestUserFactory.create('signup-test');

// User with specific attributes
const user = TestUserFactory.create('admin-test', {
  email: 'admin@example.com',
  username: 'adminuser'
});

// Multiple users
const users = TestUserFactory.createMultiple(5, 'batch-test');
```

#### ApiAssertions
Provides common response assertions:

```typescript
ApiAssertions.assertUserCreated(response, expectedUser);
ApiAssertions.assertLoginSuccess(response, user);
ApiAssertions.assertValidationError(response, 'Email is required');
ApiAssertions.assertUnauthorized(response);
```

#### ApiAuthHelper
Handles authentication flows:

```typescript
const authHelper = new ApiAuthHelper(client);

// Complete auth flow
await authHelper.testCompleteAuthFlow(user);

// Individual operations
const authToken = await authHelper.signup(user);
await authHelper.verifyProfile(authToken, user);
await authHelper.logout(authToken);
```

## Writing E2E Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';
import { TestUserFactory, AuthHelper } from '../../utils/test-fixtures';

test.describe('User Journey', () => {
  test('should complete signup workflow', async ({ page }) => {
    const user = TestUserFactory.create('e2e-signup');
    const authHelper = new AuthHelper(page);
    
    await authHelper.signup(user);
    await expect(page).toHaveURL('/portal');
  });
});
```

## MongoDB Test Infrastructure

Both frameworks share the same MongoDB test infrastructure:

### Automatic Setup
- MongoDB test server starts before tests
- Database indexes are created
- Test data is cleared between runs

### Cleanup
- Test users are automatically tracked and cleaned
- Database state is reset between test files
- Connections are properly closed

### Manual Database Operations

```bash
# List test databases
pnpm run db:list

# Clean all test data
pnpm run db:clean

# Run cleanup utility
pnpm run test:cleanup
```

## Performance Benefits

### API Testing Performance
- **~95% faster** than browser-based API tests
- **Parallel execution** without browser overhead
- **Instant startup** with no browser initialization
- **Lower resource usage** for CI/CD pipelines

### Separation Benefits
- API tests run in **seconds**, not minutes
- E2E tests focus on **actual user interactions**
- **Faster feedback loops** during development
- **More reliable** test execution

## Test Isolation

### Database Isolation
- Each test gets a clean database state
- User data is automatically tracked and cleaned
- MongoDB indexes are optimized for test performance

### Process Isolation
- Vitest runs in Node.js processes
- Playwright runs in separate browser contexts
- No interference between test frameworks

## CI/CD Integration

### Environment Variables
```bash
# Test configuration
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
DISABLE_RATE_LIMIT=true

# Optional
DEBUG=true                    # Enable debug logging
USE_DOCKER_MONGODB=true      # Use Docker for MongoDB (CI)
```

### GitHub Actions Integration
```yaml
- name: Run API Tests
  run: pnpm run test:api

- name: Run E2E Tests  
  run: pnpm run test:e2e
```

## Migration Guide

### From Playwright API Tests
1. **Identify API-only tests** - tests that don't use browser features
2. **Create equivalent Vitest test** in `tests/api/`
3. **Use API client utilities** instead of `page.request`
4. **Update assertions** to use ApiAssertions helpers
5. **Remove from Playwright config** testIgnore patterns

### Example Migration

**Before (Playwright):**
```typescript
test('should login user', async ({ page }) => {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'user@example.com', password: 'password' }
  });
  expect(response.status()).toBe(200);
});
```

**After (Vitest):**
```typescript
test('should login user', async () => {
  const user = TestUserFactory.create('login-test');
  const response = await client
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  
  ApiAssertions.assertLoginSuccess(response, user);
});
```

## Best Practices

### API Testing
1. **Use test factories** for consistent data creation
2. **Leverage auto-cleanup** for test isolation
3. **Test edge cases** and error scenarios
4. **Validate response structure** and security
5. **Performance test** critical endpoints

### E2E Testing
1. **Focus on user workflows** not individual API calls
2. **Test cross-browser compatibility** when needed
3. **Use visual testing** for UI regression
4. **Keep tests independent** and parallelizable
5. **Mock external services** when possible

### General
1. **Descriptive test names** that explain behavior
2. **Proper error handling** and cleanup
3. **Consistent test structure** across files
4. **Document complex test scenarios**
5. **Regular test maintenance** and updates

## Troubleshooting

### Common Issues

#### API Tests Not Finding Server
```bash
# Ensure dev server is running
pnpm run dev

# Or let Vitest start it automatically
pnpm run test:api
```

#### Database Connection Issues
```bash
# Clean up any stuck test databases
pnpm run db:clean

# Check MongoDB test server logs
DEBUG=true pnpm run test:api
```

#### Port Conflicts
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
BASE_URL=http://localhost:3001 pnpm run test:api
```

### Debug Mode

```bash
# Vitest debug
DEBUG=true pnpm run test:api:watch

# Playwright debug
pnpm run test:e2e:debug
```

## Future Enhancements

1. **Visual regression testing** with Playwright
2. **Contract testing** between API and frontend
3. **Load testing** integration with k6
4. **Test report aggregation** across frameworks
5. **Automated test generation** from OpenAPI specs