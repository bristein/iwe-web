#!/usr/bin/env node

/**
 * Script to set up MongoDB indexes
 * Run this script after setting up the database or as part of deployment
 * Usage: npx tsx scripts/setup-db-indexes.ts
 */

import { createIndexes, listIndexes } from '../lib/mongodb-indexes';

async function main() {
  console.log('🚀 Setting up MongoDB indexes...');

  try {
    // Create indexes
    await createIndexes();

    // List all indexes for verification
    const indexes = await listIndexes();

    console.log('\n📋 Current indexes:');
    for (const [collection, collectionIndexes] of Object.entries(indexes)) {
      console.log(`\n${collection} collection:`);
      for (const index of collectionIndexes) {
        const indexData = index as { name: string; key: Record<string, unknown> };
        console.log(`  - ${indexData.name}: ${JSON.stringify(indexData.key)}`);
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
