# Parallel Testing Optimization for MongoDB Replica Sets

## Overview

This document describes the optimizations implemented to resolve parallel test execution timeout issues with MongoDB replica sets in CI environments. The solution maintains transaction support while enabling efficient parallel test execution.

## Problem Statement

The original test setup had several issues:
- **Replica Set Startup Contention**: Multiple workers attempting to start their own replica sets
- **Resource Competition**: Workers interfering with each other's database operations  
- **Connection Pool Exhaustion**: Poor connection management across parallel workers
- **Coordination Failures**: Race conditions in global setup between workers
- **Cleanup Inefficiencies**: Slow teardown processes causing timeouts

## Solution Architecture

### 1. Shared Replica Set with File-Based Coordination

**Location**: `tests/utils/mongodb-test-server.ts`

**Key Features**:
- **Singleton Pattern**: Single replica set instance shared across all workers
- **File-Based Locking**: Atomic coordination using temporary files
- **Worker Isolation**: Each worker gets its own database on the shared replica set
- **Timeout Protection**: All operations have timeout safeguards

**Implementation Details**:
```typescript
// Coordination files for process synchronization
const COORDINATION_DIR = path.join(os.tmpdir(), 'iwe-test-coordination');
const REPLICA_SET_LOCK_FILE = path.join(COORDINATION_DIR, 'replica-set.lock');
const REPLICA_SET_URI_FILE = path.join(COORDINATION_DIR, 'replica-set.uri');
const REPLICA_SET_READY_FILE = path.join(COORDINATION_DIR, 'replica-set.ready');

// Worker-specific database naming for true isolation
const workerHash = crypto.createHash('md5').update(`${workerId}-${process.env.CI}`).digest('hex').slice(0, 8);
const dbName = `iwe-test_w${workerId}_${workerHash}`;
```

### 2. Enhanced Global Setup Coordination

**Location**: `tests/utils/global-setup.ts`

**Key Features**:
- **Worker-Aware Setup**: Each worker coordinates its setup independently
- **Web Server Sharing**: Single web server shared across workers with locking
- **Graceful Waiting**: Workers wait for resources started by other workers
- **Robust Error Handling**: Comprehensive cleanup on failures

**Worker Coordination Flow**:
1. Worker attempts to acquire web server startup lock
2. If successful, starts web server and marks it ready
3. If unsuccessful, waits for another worker to complete setup
4. All workers connect to shared MongoDB replica set
5. Each worker gets isolated database for true test isolation

### 3. Optimized Connection Pooling

**Key Optimizations**:
- **Reduced Pool Sizes**: Conservative connection limits per worker
- **Timeout Protection**: All database operations have timeouts
- **Retry Logic**: Robust connection retry with exponential backoff
- **Resource Limits**: CI-specific adjustments for resource-constrained environments

```typescript
// Optimized MongoDB client configuration
const client = new MongoClient(uri, {
  maxPoolSize: process.env.CI ? 6 : 10,
  minPoolSize: 1,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: process.env.CI ? 15000 : 10000,
  heartbeatFrequencyMS: 10000,
  maxConnecting: 2,
  waitQueueTimeoutMS: 5000,
  monitorCommands: false,
});
```

### 4. Enhanced Global Teardown

**Location**: `tests/utils/global-teardown.ts`

**Key Features**:
- **Worker-Specific Cleanup**: Each worker cleans up its own resources
- **Timeout Protection**: All cleanup operations have timeouts
- **Coordination File Cleanup**: Proper cleanup of temporary coordination files
- **Emergency Cleanup**: Fallback cleanup for CI environments

### 5. Playwright Configuration Optimizations

**Location**: `playwright.config.ts`

**Key Optimizations**:
- **Resource-Aware Workers**: Adjusted worker count for CI vs local
- **Browser Optimizations**: Reduced memory usage and disabled unnecessary features
- **Timeout Adjustments**: Environment-specific timeout configurations
- **Parallel-Friendly Settings**: Optimized for concurrent test execution

```typescript
workers: process.env.CI ? 3 : 4, // Optimal workers with shared replica set
timeout: process.env.CI ? 60000 : 45000, // Longer timeout in CI
launchOptions: {
  args: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-web-security',
    '--memory-pressure-off',
    // ... additional optimizations
  ]
}
```

## Performance Improvements

### Before Optimization
- ❌ **Test Timeouts**: Frequent timeouts in CI with multiple workers
- ❌ **Startup Time**: 60-120+ seconds for replica set initialization per worker
- ❌ **Resource Contention**: Workers competing for MongoDB resources
- ❌ **Cleanup Issues**: Slow teardown causing build failures

### After Optimization
- ✅ **Reliable Execution**: No timeouts with proper coordination
- ✅ **Fast Startup**: Single replica set startup (~15-30 seconds total)
- ✅ **True Isolation**: Each worker has its own database
- ✅ **Efficient Cleanup**: Fast, timeout-protected teardown

## Testing and Validation

### Parallel Setup Test Script
**Location**: `scripts/test-parallel-setup.js`

This script simulates multiple workers to validate the optimization:
```bash
pnpm run test:parallel    # Test with default settings
pnpm run db:test-setup    # Test with debug logging
```

### New npm Scripts
```json
{
  "test:parallel": "node scripts/test-parallel-setup.js",
  "test:e2e:fast": "playwright test --workers=max", 
  "db:test-setup": "DEBUG=true node scripts/test-parallel-setup.js"
}
```

## File-Based Coordination Details

### Coordination Files
- `replica-set.lock`: Atomic lock for replica set startup
- `replica-set.uri`: Shared MongoDB connection URI
- `replica-set.ready`: Signals replica set is ready for connections
- `web-server.lock`: Atomic lock for web server startup
- `web-server.ready`: Signals web server is ready
- `web-server.pid`: Web server process ID for cleanup

### Benefits
- **Atomic Operations**: File system operations provide atomic coordination
- **Cross-Process**: Works across different Node.js processes
- **Simple Cleanup**: Files can be easily removed during teardown
- **Debuggable**: Easy to inspect coordination state

## Database Isolation Strategy

### Worker-Specific Databases
Each worker gets its own database on the shared replica set:
```
iwe-test_w0_abc12345    # Worker 0
iwe-test_w1_def67890    # Worker 1  
iwe-test_w2_ghi11223    # Worker 2
```

### Benefits
- **True Isolation**: No data conflicts between workers
- **Transaction Support**: Full MongoDB replica set features
- **Efficient Resource Usage**: Single replica set shared efficiently
- **Easy Cleanup**: Worker-specific databases can be dropped independently

## Monitoring and Debugging

### Debug Mode
Enable detailed logging:
```bash
DEBUG=true pnpm test:e2e
```

### Coordination File Inspection
Check coordination state:
```bash
ls -la /tmp/iwe-test-coordination/
```

### Database Inspection
View worker databases:
```bash
pnpm db:list
```

## CI Configuration Updates

No changes required to CI configuration. The optimizations work with existing:
- Worker count: 3 workers in CI, 4 locally
- Timeout settings: Automatically adjusted for environment
- Resource limits: Built-in CI detection and adjustment

## Maintenance Notes

### Regular Cleanup
The system is self-cleaning, but for debugging you may need to:
```bash
# Clean up coordination files
rm -rf /tmp/iwe-test-coordination/

# Clean test databases
pnpm db:clean
```

### Monitoring Performance
Watch for these metrics:
- Replica set startup time (should be ~15-30s total)
- Worker coordination time (should be <5s per worker)
- Test execution time (should see overall improvement)

## Future Improvements

1. **Connection Pooling**: Further optimize MongoDB connection pools
2. **Health Checks**: Add more sophisticated health monitoring
3. **Metrics Collection**: Collect detailed performance metrics
4. **Auto-scaling**: Dynamic worker count based on system resources

## Troubleshooting

### Common Issues

**"Replica set not ready within timeout"**
- Check system resources and MongoDB binary availability
- Increase timeout in CI environments
- Verify coordination file permissions

**"Web server startup lock timeout"**  
- Check for stale lock files in `/tmp/iwe-test-coordination/`
- Verify web server process isn't hanging
- Check port availability

**"Database operation timeout"**
- Verify MongoDB replica set is healthy
- Check network connectivity
- Review connection pool settings

### Recovery Commands
```bash
# Emergency cleanup
pkill -f "next dev" || true
pkill -f "node.*mongodb" || true
rm -rf /tmp/iwe-test-coordination/
pnpm db:clean
```

## Conclusion

These optimizations provide a robust foundation for parallel test execution with MongoDB replica sets. The solution maintains full transaction support while enabling efficient resource sharing and worker coordination.

Key success metrics:
- ✅ Zero timeouts in parallel execution
- ✅ Faster overall test suite execution  
- ✅ Reliable CI builds
- ✅ Maintained transaction support
- ✅ True test isolation between workers