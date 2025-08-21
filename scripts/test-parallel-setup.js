#!/usr/bin/env node

/**
 * Test script to verify parallel MongoDB setup works correctly
 * This simulates multiple workers trying to use the shared replica set
 */

const { spawn } = require('child_process');
const path = require('path');

// Number of simulated workers
const WORKER_COUNT = 4;
const WORKER_TIMEOUT = 60000; // 60 seconds

console.log(`🧪 Testing parallel MongoDB setup with ${WORKER_COUNT} simulated workers...`);

// Worker test script
const workerScript = `
const { getGlobalTestServer } = require('./tests/utils/mongodb-test-server');

async function testWorker() {
  const workerId = process.env.TEST_WORKER_INDEX;
  console.log(\`🔧 Worker \${workerId} starting...\`);
  
  try {
    const startTime = Date.now();
    
    // Get worker-specific test server
    const testServer = getGlobalTestServer({
      workerId: \`test-worker-\${workerId}\`,
      enableLogging: true,
    });
    
    // Start the server (connects to shared replica set)
    const uri = await testServer.start();
    console.log(\`✅ Worker \${workerId} connected to MongoDB in \${Date.now() - startTime}ms: \${uri}\`);
    
    // Test database operations
    const db = await testServer.getDatabase();
    const collection = db.collection('test');
    
    // Insert a test document
    await collection.insertOne({ 
      workerId, 
      timestamp: new Date(),
      test: true 
    });
    
    // Count documents
    const count = await collection.countDocuments({ workerId });
    console.log(\`📊 Worker \${workerId} has \${count} document(s)\`);
    
    // Clean up
    await testServer.clearDatabase();
    console.log(\`🧹 Worker \${workerId} cleaned up database\`);
    
    // Stop worker-specific server
    await testServer.stop();
    console.log(\`🛑 Worker \${workerId} stopped successfully\`);
    
  } catch (error) {
    console.error(\`❌ Worker \${workerId} failed:\`, error);
    process.exit(1);
  }
}

testWorker();
`;

// Write worker script to temp file
const fs = require('fs');
const os = require('os');
const workerScriptPath = path.join(os.tmpdir(), 'test-worker.js');
fs.writeFileSync(workerScriptPath, workerScript);

// Spawn workers
const workers = [];
const startTime = Date.now();

console.log('🚀 Starting workers...');

for (let i = 0; i < WORKER_COUNT; i++) {
  const worker = spawn('node', [workerScriptPath], {
    env: {
      ...process.env,
      TEST_WORKER_INDEX: i.toString(),
      NODE_ENV: 'test',
      DEBUG: 'false', // Reduce noise unless needed
    },
    stdio: 'pipe',
  });

  worker.workerId = i;
  workers.push(worker);

  worker.stdout.on('data', (data) => {
    console.log(`Worker ${i}: ${data.toString().trim()}`);
  });

  worker.stderr.on('data', (data) => {
    console.error(`Worker ${i} ERROR: ${data.toString().trim()}`);
  });

  worker.on('exit', (code) => {
    console.log(`Worker ${i} exited with code ${code}`);
  });
}

// Wait for all workers to complete
Promise.all(
  workers.map(worker => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.kill('SIGTERM');
      reject(new Error(`Worker ${worker.workerId} timed out`));
    }, WORKER_TIMEOUT);

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Worker ${worker.workerId} failed with code ${code}`));
      }
    });
  }))
).then(() => {
  const totalTime = Date.now() - startTime;
  console.log(`✅ All ${WORKER_COUNT} workers completed successfully in ${totalTime}ms`);
  console.log(`📊 Average time per worker: ${Math.round(totalTime / WORKER_COUNT)}ms`);
  
  // Clean up temp file
  fs.unlinkSync(workerScriptPath);
  
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  
  // Kill any remaining workers
  workers.forEach(worker => {
    try {
      worker.kill('SIGTERM');
    } catch {}
  });
  
  // Clean up temp file
  try {
    fs.unlinkSync(workerScriptPath);
  } catch {}
  
  process.exit(1);
});