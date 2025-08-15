# MongoDB Test Server Infrastructure

## Overview

This project uses an advanced MongoDB test server infrastructure that automatically manages database instances for testing, providing complete isolation, fast execution, and seamless CI/CD integration.

## Key Features

- 🚀 **Zero Configuration**: Works out of the box with automatic server management
- 🏃 **Fast Local Testing**: In-memory MongoDB for lightning-fast tests
- 🐳 **Production-like CI**: Docker-based MongoDB in CI environments
- 🔒 **Complete Isolation**: Each test suite gets a clean database
- 🛠️ **Rich Utilities**: Comprehensive helpers and debugging tools
- 📊 **Performance Monitoring**: Built-in performance measurement tools

## Quick Start

```bash
# Install dependencies (already done if you ran pnpm install)
pnpm install

# Run all tests (MongoDB starts automatically)
pnpm test

# Run specific test suites
pnpm test:auth
pnpm test:api
pnpm test:ui

# Debug MongoDB test server
npx ts-node tests/utils/mongodb-debug.ts
```

## Architecture

### MongoDB Test Server (`mongodb-test-server.ts`)

The core component that manages MongoDB instances:

```typescript
import { getGlobalTestServer } from './tests/utils/mongodb-test-server';

// Server starts automatically in global setup
const testServer = getGlobalTestServer();

// Get database instance
const db = await testServer.getDatabase();

// Clear all data
await testServer.clearDatabase();

// Seed test data
await testServer.seedData(testData);
```

### Test Data Factory (`test-data-factory.ts`)

Generate consistent test data:

```typescript
import { TestDataFactory } from './tests/utils/test-data-factory';

// Create test user
const user = await TestDataFactory.createUser({
  email: 'test@example.com',
  role: 'admin',
});

// Create test scenario
const scenario = await TestDataFactory.createScenario({
  userCount: 5,
  projectsPerUser: 3,
});
```

### Database Reset Utilities (`db-reset.ts`)

Control database state during tests:

```typescript
import { DatabaseReset } from './tests/utils/db-reset';

// Reset to clean state
await DatabaseReset.resetToCleanState();

// Reset with seed data
await DatabaseReset.resetWithSeedData();

// Transaction-like execution
await DatabaseReset.runInTransaction(async () => {
  // Changes will be rolled back
});
```

## Writing Tests

### Basic Example

```typescript
import { test, expect } from '@playwright/test';
import { DatabaseTestHelpers } from '../utils/test-helpers';

test('should create user', async ({ page }) => {
  // Insert test user directly
  const user = await DatabaseTestHelpers.insertUser({
    email: 'test@example.com',
    name: 'Test User',
  });

  // Perform API call
  const response = await page.request.get('/api/users/' + user._id);
  expect(response.status()).toBe(200);

  // Verify in database
  const dbUser = await DatabaseTestHelpers.findUserByEmail('test@example.com');
  expect(dbUser).toBeTruthy();
});
```

### With Automatic Reset

```typescript
import { test } from '../utils/db-reset';

test.describe('With DB Reset', () => {
  // Database automatically resets before each test

  test('isolated test 1', async ({ db }) => {
    await db.seedData(testData);
    // Test runs with seeded data
  });

  test('isolated test 2', async ({ db }) => {
    // Starts with clean database
    const stats = await db.getStats();
    expect(stats.users).toBe(0);
  });
});
```

## Configuration

### Environment Variables

```bash
# Use Docker MongoDB instead of in-memory (default: false)
USE_DOCKER_MONGODB=true

# Enable debug logging (default: false)
DEBUG=true

# Custom MongoDB URI (overrides automatic server)
MONGODB_TEST_URI=mongodb://localhost:27017/custom-test

# CI environment (automatically detected)
CI=true
```

### Local vs CI Behavior

| Environment | MongoDB Type     | Port   | Persistence | Speed  |
| ----------- | ---------------- | ------ | ----------- | ------ |
| Local Dev   | Memory Server    | 27017  | No          | Fast   |
| CI/CD       | Docker Container | Random | No          | Medium |
| Custom      | External         | Custom | Yes         | Varies |

## Debugging Tools

### Interactive Debug CLI

```bash
npx ts-node tests/utils/mongodb-debug.ts
```

Available commands:

- `status` - Server status
- `stats` - Database statistics
- `list` - List collections
- `show <name>` - Show collection documents
- `clear` - Clear all data
- `seed [type]` - Seed test data
- `find <col> <query>` - Find documents
- `export <file>` - Export to JSON
- `import <file>` - Import from JSON

### In-Test Debugging

```typescript
import { DebugHelpers } from '../utils/test-helpers';

test('debug example', async () => {
  // Dump database state
  await DebugHelpers.dumpDatabase('Before');

  // Perform operations
  await doSomething();

  // Dump specific collection
  await DebugHelpers.dumpCollection('users', 5);

  // Watch for changes
  await DebugHelpers.watchCollection('projects', 3000);
});
```

## Performance Testing

```typescript
import { PerformanceHelpers } from '../utils/test-helpers';

test('performance test', async () => {
  // Measure operation time
  const { result, duration } = await PerformanceHelpers.measureOperation(
    async () => await createManyUsers(100),
    'Create 100 users'
  );

  expect(duration).toBeLessThan(1000);

  // Run concurrent operations
  const results = await PerformanceHelpers.runConcurrent(
    Array(10).fill(() => createUser()),
    'Create 10 users concurrently'
  );
});
```

## CI/CD Integration

### GitHub Actions

The test workflow automatically:

1. Detects CI environment
2. Uses Docker MongoDB
3. Runs tests in parallel
4. Uploads test artifacts

```yaml
# .github/workflows/test.yml
env:
  USE_DOCKER_MONGODB: true # Use Docker in CI
  CI: true # Detected automatically
```

### Running CI Tests Locally

```bash
# Simulate CI environment
CI=true USE_DOCKER_MONGODB=true pnpm test
```

## Troubleshooting

### Common Issues

#### Tests Hanging on Startup

```bash
# Check MongoDB binary download
MONGOMS_DEBUG=1 pnpm test

# Use system MongoDB
MONGOMS_SYSTEM_BINARY=/usr/bin/mongod pnpm test
```

#### Port Conflicts

```bash
# Check what's using port 27017
lsof -ti:27017

# Use different port
MONGOMS_PORT=27018 pnpm test
```

#### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm test
```

#### Docker Issues (CI)

```bash
# Test with Docker locally
docker run -d -p 27017:27017 mongo:7
MONGODB_TEST_URI=mongodb://localhost:27017 pnpm test
```

### Verification Commands

```bash
# Check test server status
npx ts-node tests/utils/mongodb-debug.ts
> status

# List test users
pnpm db:list

# Clean test data
pnpm db:clean

# Verify MongoDB connection
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"
```

## Best Practices

1. **Use Test Factories**: Always use `TestDataFactory` for consistent data
2. **Verify Database State**: Check database after operations in integration tests
3. **Isolate Tests**: Each test should be independent
4. **Clean State**: Use `DatabaseReset` for predictable test state
5. **Performance**: Keep test data minimal for speed
6. **Debugging**: Use debug utilities when tests fail

## Migration Guide

### From Old Setup

1. **Remove hardcoded MongoDB URI**:

   ```diff
   - MONGODB_URI=mongodb://localhost:27017/test
   + # MONGODB_URI set automatically by test server
   ```

2. **Update imports**:

   ```diff
   - import { cleanupTestUsers } from './db-cleanup';
   + import { DatabaseReset } from './db-reset';
   ```

3. **Update test setup**:

   ```diff
   - beforeAll(async () => {
   -   await cleanupTestUsers({ deleteAll: true });
   - });
   + // Automatic cleanup with test.describe
   ```

4. **Use new helpers**:
   ```diff
   - const client = new MongoClient(uri);
   - const db = client.db('test');
   + const { db } = await DatabaseTestHelpers.getDirectAccess();
   ```

## Advanced Usage

### Custom Test Server Configuration

```typescript
const testServer = new MongoDBTestServer({
  useDocker: true,
  dbName: 'custom-test',
  port: 27018,
  mongoVersion: '7.0.14',
  enableLogging: true,
});

await testServer.start();
```

### Database Snapshots

```typescript
// Create snapshot before test
const snapshot = await DatabaseReset.createSnapshot();

// Run destructive test
await runDestructiveTest();

// Restore to snapshot
await DatabaseReset.restoreSnapshot(snapshot);
```

### Custom Seed Data

```typescript
const customSeed = {
  collections: {
    users: [
      { email: 'admin@test.com', role: 'admin' },
      { email: 'user@test.com', role: 'user' },
    ],
    projects: [{ title: 'Test Project', status: 'active' }],
  },
};

await testServer.seedData(customSeed);
```

## Support

For issues:

1. Check debug CLI: `npx ts-node tests/utils/mongodb-debug.ts`
2. Enable logging: `DEBUG=true pnpm test`
3. Review CI artifacts in GitHub Actions
4. File an issue with reproduction steps
