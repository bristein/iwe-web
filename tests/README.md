# Authentication Test Suite

## Overview

This test suite implements comprehensive CRUD (Create, Read, Update, Delete) operations testing for the authentication system with automatic database cleanup.

## Test Structure

### CRUD Test Sequence (`auth-crud.spec.ts`)

Tests run **sequentially** in the following order:

1. **CREATE** - Sign up a new user
2. **READ** - Verify user data via API
3. **UPDATE** - Update user profile (placeholder for future implementation)
4. **READ** - Verify updated user data
5. **DELETE** - Logout and cleanup user from database
6. **VERIFY** - Ensure user is successfully deleted

### Database Cleanup

- **Before All Tests**: Attempts to delete test user(s) to ensure clean state
- **After All Tests**: Final cleanup as backup
- **Automatic Cleanup**: Each test includes cleanup in teardown

## Running Tests

### Authentication CRUD Tests

```bash
# Run the full CRUD test suite
pnpm test:auth

# Run with specific reporter
pnpm test:auth --reporter=list
```

### Database Management

```bash
# List all test users in database
pnpm db:list

# Clean all test users from database
pnpm db:clean

# Clean specific user (via ts-node)
ts-node --project tests/tsconfig.json -r dotenv/config tests/utils/db-cleanup.ts clean test@example.com
```

### All Tests

```bash
# Run entire test suite
pnpm test

# Run specific test file
pnpm playwright test tests/auth-crud.spec.ts
```

## Test User Pattern

Test users are identified by:

- Email starting with `test` (case-insensitive)
- Email ending with `@example.com`

## Utility Scripts

### `tests/utils/db-cleanup.ts`

Database cleanup utility with the following commands:

- `list` - List all test users in database
- `clean [emails...]` - Delete specific users by email
- `clean-all` - Delete all test users

### Usage Examples

```bash
# List test users
npx ts-node --project tests/tsconfig.json tests/utils/db-cleanup.ts list

# Clean specific user
npx ts-node --project tests/tsconfig.json tests/utils/db-cleanup.ts clean test@example.com

# Clean all test users
npx ts-node --project tests/tsconfig.json tests/utils/db-cleanup.ts clean-all
```

## Environment Variables

Tests require the following environment variables:

- `MONGODB_URI` - MongoDB connection string (loaded from `.env`)

## Test Results

### ✅ Passing Tests (Core CRUD Operations)

1. CREATE - User signup with validation
2. READ - User data retrieval via API
3. UPDATE - User profile update (placeholder)
4. READ - Verify data after update
5. DELETE - User logout and database cleanup
6. VERIFY - Confirm user deletion

### Additional Tests

- Protected route authentication
- Auth page redirects for logged-in users
- Rate limiting (5 login attempts/15min, 3 signups/hour)
- Password strength validation
- Duplicate email prevention

## Best Practices

1. **Always Clean Before Tests**: The test suite automatically cleans up test data before running
2. **Use Unique Emails**: Tests use timestamps to generate unique emails
3. **Sequential Execution**: CRUD tests run in order to maintain state consistency
4. **Verify Cleanup**: Use `pnpm db:list` to verify database is clean after tests

## Troubleshooting

### Tests Failing Due to Existing Data

```bash
# Clean all test users
pnpm db:clean

# Verify cleanup
pnpm db:list

# Re-run tests
pnpm test:auth
```

### Rate Limiting Issues

Rate limiting uses in-memory storage. If tests fail due to rate limiting:

1. Wait 15 minutes for rate limit to reset
2. Or restart the dev server to clear rate limit cache

### MongoDB Connection Issues

Ensure:

1. `.env` file contains valid `MONGODB_URI`
2. MongoDB service is accessible
3. Database name is `iwe-backend`
